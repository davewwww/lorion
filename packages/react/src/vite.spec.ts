import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCapabilityRouteConfig,
  discoverCapabilities,
  discoverSelectedCapabilities,
  lorionReact,
  renderCapabilityModule,
} from './vite';

describe('React capability Vite helpers', () => {
  it('discovers local capabilities and renders a virtual module', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));

    writeCapability(workspaceRoot, 'data', '@react-workspace/data');
    writeCapability(workspaceRoot, 'app-launcher', '@react-workspace/app-launcher');

    const capabilities = discoverCapabilities(workspaceRoot);

    expect(capabilities.map((capability) => capability.id)).toEqual(['app-launcher', 'data']);
    expect(renderCapabilityModule(capabilities)).toContain(
      "import { capability as appLauncherCapability } from '@react-workspace/app-launcher/capability'",
    );
    expect(renderCapabilityModule(capabilities)).toContain('export const capabilityModules = [');
  });

  it('prefers the host capability export over the package root export', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));

    writeCapability(workspaceRoot, 'settings', '@react-workspace/settings', {
      '.': './src/index.ts',
      './capability': './src/capability.tsx',
    });

    const [capability] = discoverCapabilities(workspaceRoot);

    expect(capability?.entryFile).toContain(`src${sep}capability.tsx`);
    expect(capability?.importSpecifier).toBe('@react-workspace/settings/capability');
  });

  it('builds a TanStack virtual route config from enabled capability route directories', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));
    const hostRoutesDirectory = join(workspaceRoot, 'hosts', 'web', 'src', 'routes');

    mkdirSync(hostRoutesDirectory, { recursive: true });
    writeCapability(workspaceRoot, 'data', '@react-workspace/data');
    writeCapability(workspaceRoot, 'disabled', '@react-workspace/disabled', true);
    mkdirSync(join(workspaceRoot, 'capabilities', 'data', 'src', 'routes'), { recursive: true });
    mkdirSync(join(workspaceRoot, 'capabilities', 'disabled', 'src', 'routes'), {
      recursive: true,
    });

    const routeConfig = createCapabilityRouteConfig({
      workspaceRoot,
      routesDirectory: hostRoutesDirectory,
    });

    expect(routeConfig.children).toContainEqual({
      type: 'physical',
      pathPrefix: '',
      directory: '../../../../capabilities/data/src/routes',
    });
    expect(routeConfig.children).not.toContainEqual({
      type: 'physical',
      pathPrefix: '',
      directory: '../../../../capabilities/disabled/src/routes',
    });
  });

  it('resolves selected capabilities through the LORION composition graph', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));

    writeCapability(workspaceRoot, 'akten', '@react-workspace/akten', {
      dependencies: { settings: '0.1.0' },
    });
    writeCapability(workspaceRoot, 'settings', '@react-workspace/settings', {
      dependencies: { 'app-launcher': '0.1.0' },
    });
    writeCapability(workspaceRoot, 'app-launcher', '@react-workspace/app-launcher');
    writeCapability(workspaceRoot, 'data', '@react-workspace/data');

    const capabilities = discoverSelectedCapabilities(workspaceRoot, {
      selected: ['akten'],
    });

    expect(capabilities.map((capability) => capability.id)).toEqual([
      'akten',
      'app-launcher',
      'settings',
    ]);
    expect(renderCapabilityModule(capabilities)).not.toContain('@react-workspace/data/capability');
  });

  it('builds route config from selected capabilities only', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));
    const hostRoutesDirectory = join(workspaceRoot, 'hosts', 'web', 'src', 'routes');

    mkdirSync(hostRoutesDirectory, { recursive: true });
    writeCapability(workspaceRoot, 'akten', '@react-workspace/akten', {
      dependencies: { settings: '0.1.0' },
    });
    writeCapability(workspaceRoot, 'settings', '@react-workspace/settings');
    writeCapability(workspaceRoot, 'data', '@react-workspace/data');
    mkdirSync(join(workspaceRoot, 'capabilities', 'akten', 'src', 'routes'), { recursive: true });
    mkdirSync(join(workspaceRoot, 'capabilities', 'data', 'src', 'routes'), { recursive: true });

    const routeConfig = createCapabilityRouteConfig({
      workspaceRoot,
      routesDirectory: hostRoutesDirectory,
      selected: ['akten'],
    });

    expect(routeConfig.children).toContainEqual({
      type: 'physical',
      pathPrefix: '',
      directory: '../../../../capabilities/akten/src/routes',
    });
    expect(routeConfig.children).not.toContainEqual({
      type: 'physical',
      pathPrefix: '',
      directory: '../../../../capabilities/data/src/routes',
    });
  });

  it('allows hosts to omit the default index route from virtual route config', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));
    const hostRoutesDirectory = join(workspaceRoot, 'hosts', 'web', 'src', 'routes');

    mkdirSync(hostRoutesDirectory, { recursive: true });
    writeCapability(workspaceRoot, 'shops', '@react-workspace/shops');
    mkdirSync(join(workspaceRoot, 'capabilities', 'shops', 'src', 'routes'), { recursive: true });

    const routeConfig = createCapabilityRouteConfig({
      workspaceRoot,
      routesDirectory: hostRoutesDirectory,
      indexRouteFile: false,
    });

    expect(routeConfig.children).not.toContainEqual({
      type: 'index',
      file: 'index.tsx',
    });
    expect(routeConfig.children).toContainEqual({
      type: 'physical',
      pathPrefix: '',
      directory: '../../../../capabilities/shops/src/routes',
    });
  });

  it('creates the standard React Vite capability setup', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));
    const hostRoutesDirectory = join(workspaceRoot, 'hosts', 'web', 'src', 'routes');

    mkdirSync(hostRoutesDirectory, { recursive: true });
    writeCapability(workspaceRoot, 'shops', '@react-workspace/shops');
    mkdirSync(join(workspaceRoot, 'capabilities', 'shops', 'src', 'routes'), { recursive: true });

    const setup = lorionReact({
      workspaceRoot,
      routesDirectory: hostRoutesDirectory,
      indexRouteFile: false,
    });

    expect(setup.capabilityLoader.name).toBe('lorion-react-capability-loader');
    expect(setup.routeConfig.children).toContainEqual({
      type: 'physical',
      pathPrefix: '',
      directory: '../../../../capabilities/shops/src/routes',
    });
  });

  it('fails when a capability has no package manifest', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));
    const capabilityDir = join(workspaceRoot, 'capabilities', 'broken');
    mkdirSync(capabilityDir, { recursive: true });
    writeFileSync(
      join(capabilityDir, 'capability.json'),
      JSON.stringify({ id: 'broken', version: '0.1.0' }),
    );

    expect(() => discoverCapabilities(workspaceRoot)).toThrow(
      'Capability must define both capability.json and package.json',
    );
  });

  it('fails when a capability package has no host capability export', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'lorion-react-capability-loader-'));

    writeCapability(workspaceRoot, 'broken', '@react-workspace/broken', { '.': './src/index.ts' });

    expect(() => discoverCapabilities(workspaceRoot)).toThrow(
      'Capability package is missing a "./capability" export',
    );
  });
});

function writeCapability(
  workspaceRoot: string,
  id: string,
  packageName: string,
  exportsOrOptions:
    | Record<string, string>
    | boolean
    | {
        dependencies?: Record<string, string>;
        disabled?: boolean;
        exports?: Record<string, string>;
      } = { './capability': './src/capability.ts' },
): void {
  const capabilityDir = join(workspaceRoot, 'capabilities', id);
  const optionObject =
    typeof exportsOrOptions === 'object' &&
    ('dependencies' in exportsOrOptions ||
      'disabled' in exportsOrOptions ||
      'exports' in exportsOrOptions)
      ? exportsOrOptions
      : undefined;
  const disabled =
    typeof exportsOrOptions === 'boolean' ? exportsOrOptions : optionObject?.disabled === true;
  const exports = optionObject
    ? (optionObject.exports ?? { './capability': './src/capability.ts' })
    : typeof exportsOrOptions === 'object'
      ? exportsOrOptions
      : { './capability': './src/capability.ts' };
  const dependencies = optionObject?.dependencies;

  mkdirSync(capabilityDir, { recursive: true });
  writeFileSync(
    join(capabilityDir, 'capability.json'),
    JSON.stringify({
      id,
      version: '0.1.0',
      disabled,
      ...(dependencies ? { dependencies } : {}),
    }),
  );
  writeFileSync(
    join(capabilityDir, 'package.json'),
    JSON.stringify({ name: packageName, exports }),
  );
}
