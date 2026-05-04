import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import {
  createCompositionSelection,
  createDescriptorCatalog,
  resolveDescriptorSelectionSeed,
  type CompositionPolicy,
  type Descriptor,
  type DescriptorId,
  type DescriptorSelectionSeedInput,
  type RelationDescriptor,
} from '@lorion-org/composition-graph';
import {
  descriptorSchema,
  discoverDescriptors,
  type DiscoveredDescriptor,
} from '@lorion-org/descriptor-discovery';
import {
  collectSelectedProviderPreferences,
  resolveSelectedProviderRelationPreferences,
  type ProviderPreferenceMap,
} from '@lorion-org/provider-selection';
import {
  createCapabilityCompositionPolicy,
  defaultCapabilityRelationDescriptors,
} from './relations';

const virtualModuleId = 'virtual:capabilities';
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

export type CapabilityLoaderOptions = {
  capabilitiesDir?: string;
  baseDescriptors?: readonly DescriptorId[];
  defaultSelection?: readonly DescriptorId[];
  policy?: Partial<CompositionPolicy>;
  relationDescriptors?: readonly RelationDescriptor[];
  selected?: readonly DescriptorId[];
  selectionSeed?: false | CapabilitySelectionSeedOptions;
  workspaceRoot?: string;
};

export type CapabilitySelectionSeedOptions = Omit<DescriptorSelectionSeedInput, 'defaultValue'>;

export type CapabilityRouteConfigOptions = CapabilityLoaderOptions & {
  indexRouteFile?: false | string;
  routesDirectory: string;
  workspaceRoot: string;
};

export type LorionReactViteOptions = CapabilityRouteConfigOptions;

export type LorionReactViteSetup = {
  capabilityLoader: VitePlugin;
  routeConfig: VirtualRootRoute;
};

export type DiscoveredCapability = {
  disabled: boolean;
  entryFile: string;
  id: string;
  importSpecifier: string;
  manifest: Descriptor;
  packageName: string;
  routesDirectory?: string;
  variableName: string;
};

export type VirtualIndexRoute = {
  file: string;
  type: 'index';
};

export type VirtualPhysicalRouteSubtree = {
  directory: string;
  pathPrefix: string;
  type: 'physical';
};

export type VirtualRootRoute = {
  children: Array<VirtualIndexRoute | VirtualPhysicalRouteSubtree>;
  file: string;
  type: 'root';
};

export type ViteResolvedConfig = {
  root: string;
};

export type VitePlugin = {
  configResolved: (resolvedConfig: ViteResolvedConfig) => void;
  enforce: 'pre';
  load: (id: string) => string | null;
  name: string;
  resolveId: (id: string) => string | undefined;
};

export function capabilityLoader(options: CapabilityLoaderOptions = {}): VitePlugin {
  let config: ViteResolvedConfig;
  let capabilities: DiscoveredCapability[] = [];

  return {
    name: 'lorion-react-capability-loader',
    enforce: 'pre',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      capabilities = discoverSelectedCapabilities(
        resolveWorkspaceRoot(config.root, options),
        options,
      );
    },
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;

      return capabilities.find((capability) => capability.importSpecifier === id)?.entryFile;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return null;

      return renderCapabilityModule(capabilities, resolveSelectionSeed(options));
    },
  };
}

export function lorionReact(options: LorionReactViteOptions): LorionReactViteSetup {
  return {
    capabilityLoader: capabilityLoader(options),
    routeConfig: createCapabilityRouteConfig(options),
  };
}

export function discoverCapabilities(
  workspaceRoot: string,
  options: Pick<CapabilityLoaderOptions, 'capabilitiesDir'> = {},
): DiscoveredCapability[] {
  const capabilitiesRoot = resolve(workspaceRoot, options.capabilitiesDir ?? 'capabilities');

  if (!existsSync(capabilitiesRoot)) {
    throw new Error(`Capabilities directory not found: ${capabilitiesRoot}`);
  }

  return discoverCapabilityDescriptors(workspaceRoot, options)
    .map(discoverCapability)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function discoverSelectedCapabilities(
  workspaceRoot: string,
  options: CapabilityLoaderOptions = {},
): DiscoveredCapability[] {
  return selectCapabilities(discoverCapabilities(workspaceRoot, options), options);
}

function selectCapabilities(
  capabilities: readonly DiscoveredCapability[],
  options: Pick<
    CapabilityLoaderOptions,
    | 'baseDescriptors'
    | 'defaultSelection'
    | 'policy'
    | 'relationDescriptors'
    | 'selected'
    | 'selectionSeed'
  > = {},
): DiscoveredCapability[] {
  const enabledCapabilities = capabilities.filter((capability) => capability.disabled !== true);
  const selected = resolveCapabilitySelectionSeed(options);

  if (!selected.length && !options.baseDescriptors?.length) {
    return [...enabledCapabilities];
  }

  const selectedProviders = collectSelectedProviderPreferences({
    items: enabledCapabilities,
    getCapabilityId: (capability) => capability.manifest.providesFor,
    getProviderId: (capability) => capability.id,
    selectedProviderIds: selected,
  });
  const selectionCapabilities = createProviderSelectionAwareCapabilities(
    enabledCapabilities,
    selectedProviders,
  );
  const catalog = createDescriptorCatalog({
    descriptors: selectionCapabilities.map((capability) => capability.manifest),
    relationDescriptors: [
      ...defaultCapabilityRelationDescriptors,
      ...(options.relationDescriptors ?? []),
    ],
  });
  const selection = createCompositionSelection({
    catalog,
    selected: [...selected],
    baseDescriptors: [...(options.baseDescriptors ?? [])],
    policy: createCapabilityCompositionPolicy(options.policy),
  });
  const selectedIds = new Set(selection.getResolved());

  return selectionCapabilities.filter((capability) => selectedIds.has(capability.id));
}

function createProviderSelectionAwareCapabilities(
  capabilities: readonly DiscoveredCapability[],
  selectedProviders: ProviderPreferenceMap,
): DiscoveredCapability[] {
  if (!Object.keys(selectedProviders).length) return [...capabilities];

  return capabilities.map((capability) => {
    const manifest = { ...capability.manifest };
    const preferences = resolveSelectedProviderRelationPreferences({
      providerId: capability.id,
      defaultFor: manifest.defaultFor,
      providerPreferences: manifest.providerPreferences as ProviderPreferenceMap | undefined,
      selectedProviders,
    });

    delete manifest.defaultFor;
    delete manifest.providerPreferences;

    return {
      ...capability,
      manifest: {
        ...manifest,
        ...preferences,
      },
    };
  });
}

function resolveSelectionSeed(
  options: Pick<CapabilityLoaderOptions, 'defaultSelection' | 'selected' | 'selectionSeed'>,
): DescriptorId[] {
  return resolveCapabilitySelectionSeed(options);
}

function resolveCapabilitySelectionSeed(
  options: Pick<CapabilityLoaderOptions, 'defaultSelection' | 'selected' | 'selectionSeed'>,
): DescriptorId[] {
  if (options.selected?.length) return [...options.selected];

  if (options.selectionSeed === false) return [...(options.defaultSelection ?? [])];

  const seedOptions = options.selectionSeed ?? {};
  const selected = resolveDescriptorSelectionSeed({
    argv: seedOptions.argv ?? process.argv,
    env: seedOptions.env ?? process.env,
    key: seedOptions.key ?? 'capability',
    ...(seedOptions.cliKeys ? { cliKeys: seedOptions.cliKeys } : {}),
    ...(seedOptions.envKeys ? { envKeys: seedOptions.envKeys } : {}),
  });

  return selected.length ? selected : [...(options.defaultSelection ?? [])];
}

export function renderCapabilityModule(
  capabilities: readonly DiscoveredCapability[],
  selected: readonly DescriptorId[] = [],
): string {
  const imports = capabilities
    .map(
      (capability) =>
        `import { capability as ${capability.variableName} } from '${capability.importSpecifier}'`,
    )
    .join('\n');
  const variables = capabilities.map((capability) => `  ${capability.variableName},`).join('\n');
  const capabilityIds = capabilities.map((capability) => capability.id);

  return `${imports}

export const selectedCapabilityIds = ${JSON.stringify([...selected])}

export const resolvedCapabilityIds = ${JSON.stringify(capabilityIds)}

export const capabilityModules = [
${variables}
]
`;
}

export function createCapabilityRouteConfig(
  options: CapabilityRouteConfigOptions,
): VirtualRootRoute {
  if (!options?.workspaceRoot) {
    throw new Error('createCapabilityRouteConfig requires a workspaceRoot option.');
  }

  if (!options?.routesDirectory) {
    throw new Error('createCapabilityRouteConfig requires a routesDirectory option.');
  }

  const routesDirectory = resolve(options.routesDirectory);
  const capabilities = discoverSelectedCapabilities(options.workspaceRoot, options);
  const capabilityRouteSubtrees = capabilities
    .filter(hasRouteDirectory)
    .filter((capability) => capability.disabled !== true)
    .map((capability) => ({
      type: 'physical' as const,
      pathPrefix: '',
      directory: toPosixPath(relative(routesDirectory, capability.routesDirectory)),
    }));

  return {
    type: 'root',
    file: '__root.tsx',
    children: [
      ...(options.indexRouteFile === false
        ? []
        : [
            {
              type: 'index' as const,
              file: options.indexRouteFile ?? 'index.tsx',
            },
          ]),
      ...capabilityRouteSubtrees,
    ],
  };
}

function discoverCapabilityDescriptors(
  workspaceRoot: string,
  options: Pick<CapabilityLoaderOptions, 'capabilitiesDir'>,
): DiscoveredDescriptor[] {
  const capabilitiesDir = options.capabilitiesDir ?? 'capabilities';

  return discoverDescriptors({
    cwd: workspaceRoot,
    descriptorPaths: [`${capabilitiesDir}/*/capability.json`],
    validation: {
      schema: descriptorSchema,
    },
  });
}

function discoverCapability(entry: DiscoveredDescriptor): DiscoveredCapability {
  const capabilityDir = entry.cwd;
  const packagePath = resolve(capabilityDir, 'package.json');

  if (!existsSync(packagePath)) {
    throw new Error(
      `Capability must define both capability.json and package.json: ${capabilityDir}`,
    );
  }

  const packageJson = readJson(packagePath);
  const packageName = packageJson.name;

  if (typeof packageName !== 'string') {
    throw new Error(`Capability package is missing "name": ${packagePath}`);
  }

  const activationEntry = resolveActivationEntry(capabilityDir, packageJson);
  const routesDirectory = resolveRouteDirectory(capabilityDir);

  return {
    id: entry.descriptor.id,
    disabled: entry.descriptor.disabled === true,
    entryFile: activationEntry.entryFile,
    importSpecifier: activationEntry.importSpecifier,
    manifest: entry.descriptor,
    packageName,
    ...(routesDirectory ? { routesDirectory } : {}),
    variableName: toVariableName(entry.descriptor.id),
  };
}

function resolveRouteDirectory(capabilityDir: string): string | undefined {
  const routesDirectory = resolve(capabilityDir, 'src', 'routes');

  return existsSync(routesDirectory) ? routesDirectory : undefined;
}

function resolveActivationEntry(
  capabilityDir: string,
  packageJson: Record<string, unknown>,
): { entryFile: string; importSpecifier: string } {
  const packageName = packageJson.name;
  const packageExports = packageJson.exports;

  if (typeof packageName !== 'string') {
    throw new Error(
      `Capability package is missing "name": ${resolve(capabilityDir, 'package.json')}`,
    );
  }

  if (!isRecord(packageExports) || typeof packageExports['./capability'] !== 'string') {
    throw new Error(`Capability package is missing a "./capability" export: ${capabilityDir}`);
  }

  return {
    entryFile: resolve(capabilityDir, packageExports['./capability']),
    importSpecifier: `${packageName}/capability`,
  };
}

function hasRouteDirectory(
  capability: DiscoveredCapability,
): capability is DiscoveredCapability & { routesDirectory: string } {
  return typeof capability.routesDirectory === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveWorkspaceRoot(configRoot: string, options: CapabilityLoaderOptions): string {
  if (options.workspaceRoot) return resolve(options.workspaceRoot);

  return findWorkspaceRoot(configRoot);
}

function findWorkspaceRoot(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    if (
      existsSync(join(current, 'pnpm-workspace.yaml')) &&
      existsSync(join(current, 'capabilities'))
    ) {
      return current;
    }

    const parent = dirname(current);

    if (parent === current) {
      throw new Error(`Could not find React workspace root from: ${startDir}`);
    }

    current = parent;
  }
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function toVariableName(name: string): string {
  return `${name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/(?:^|\s)([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase())
    .replace(/^([A-Z])/, (char) => char.toLowerCase())}Capability`;
}

function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}
