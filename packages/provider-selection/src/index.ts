export type CapabilityId = string;
export type ProviderId = string;

export type ProviderSelectionMode = 'configured' | 'selected' | 'fallback' | 'first';
export type ProviderPreferenceMap = Partial<Record<CapabilityId, ProviderId>>;
export type ProviderPreferenceCollectionInput<T> = {
  items: Iterable<T>;
  getProviderPreferences: (item: T) => unknown;
};
export type ProviderDefaultCollectionInput<T> = {
  items: Iterable<T>;
  getDefaultFor: (item: T) => unknown;
  getProviderId: (item: T) => ProviderId;
};
export type SelectedProviderPreferenceCollectionInput<T> = ProviderCollectionInput<T> & {
  selectedProviderIds: Iterable<ProviderId>;
};
export type SelectedProviderRelationPreferenceInput = {
  defaultFor?: CapabilityId | CapabilityId[] | undefined;
  providerId: ProviderId;
  providerPreferences?: ProviderPreferenceMap | undefined;
  selectedProviders?: ProviderPreferenceMap;
};

export type SelectedProviderRelationPreferences = {
  defaultFor?: CapabilityId | CapabilityId[];
  providerPreferences?: ProviderPreferenceMap;
};

export type ProviderSelection = {
  capabilityId: CapabilityId;
  selectedProviderId: ProviderId;
  candidateProviderIds: ProviderId[];
  mode: ProviderSelectionMode;
};

export type ProviderMismatch = {
  capabilityId: CapabilityId;
  configuredProviderId: ProviderId;
};

export type ProvidersByCapability = Map<CapabilityId, ProviderId[]>;

export type ProviderSelectionResolution = {
  selections: Map<CapabilityId, ProviderSelection>;
  mismatches: ProviderMismatch[];
  excludedProviderIds: ProviderId[];
};
export type ItemProviderSelectionResolution = ProviderSelectionResolution & {
  providersByCapability: ProvidersByCapability;
};

type ProviderCollectionInput<T> = {
  items: Iterable<T>;
  getCapabilityId: (item: T) => CapabilityId | CapabilityId[] | undefined;
  getProviderId: (item: T) => ProviderId;
};

export type ResolveProviderSelectionInput = {
  providersByCapability: ProvidersByCapability;
  configuredProviders?: ProviderPreferenceMap;
  fallbackProviders?: ProviderPreferenceMap;
  selectedProviders?: ProviderPreferenceMap;
};

export type ResolveItemProviderSelectionInput<T> = ProviderCollectionInput<T> & {
  configuredProviders?: ProviderPreferenceMap;
  fallbackProviders?: ProviderPreferenceMap;
  selectedProviders?: ProviderPreferenceMap;
};

function toSortedUniqueProviderIds(providerIds: Iterable<ProviderId>): ProviderId[] {
  return Array.from(new Set(Array.from(providerIds).filter(Boolean))).sort();
}

function toCapabilityIds(value: CapabilityId | CapabilityId[] | undefined): CapabilityId[] {
  const entries = Array.isArray(value) ? value : [value];

  return entries.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSelectedProvider(input: {
  capabilityId: CapabilityId;
  candidateProviderIds: ProviderId[];
  configuredProviders?: ProviderPreferenceMap;
  fallbackProviders?: ProviderPreferenceMap;
  selectedProviders?: ProviderPreferenceMap;
}): { selectedProviderId: ProviderId; mode: ProviderSelectionMode } | undefined {
  const firstProviderId = input.candidateProviderIds[0];
  if (!firstProviderId) {
    return undefined;
  }

  const configuredProviderId = input.configuredProviders?.[input.capabilityId];
  if (configuredProviderId) {
    if (input.candidateProviderIds.includes(configuredProviderId)) {
      return {
        selectedProviderId: configuredProviderId,
        mode: 'configured',
      };
    }

    return undefined;
  }

  const selectedProviderId = input.selectedProviders?.[input.capabilityId];
  if (selectedProviderId && input.candidateProviderIds.includes(selectedProviderId)) {
    return {
      selectedProviderId,
      mode: 'selected',
    };
  }

  const fallbackProviderId = input.fallbackProviders?.[input.capabilityId];
  if (fallbackProviderId && input.candidateProviderIds.includes(fallbackProviderId)) {
    return {
      selectedProviderId: fallbackProviderId,
      mode: 'fallback',
    };
  }

  return {
    selectedProviderId: firstProviderId,
    mode: 'first',
  };
}

function selectProviders(
  input: ResolveProviderSelectionInput,
): Map<CapabilityId, ProviderSelection> {
  const selections: Map<CapabilityId, ProviderSelection> = new Map();

  for (const [capabilityId, candidateProviderIds] of Array.from(
    input.providersByCapability.entries(),
  ).sort(([left], [right]) => left.localeCompare(right))) {
    const normalizedCandidateProviderIds = toSortedUniqueProviderIds(candidateProviderIds);
    const selected = getSelectedProvider({
      capabilityId,
      candidateProviderIds: normalizedCandidateProviderIds,
      ...(input.configuredProviders ? { configuredProviders: input.configuredProviders } : {}),
      ...(input.fallbackProviders ? { fallbackProviders: input.fallbackProviders } : {}),
      ...(input.selectedProviders ? { selectedProviders: input.selectedProviders } : {}),
    });

    if (!selected) {
      continue;
    }

    selections.set(capabilityId, {
      capabilityId,
      selectedProviderId: selected.selectedProviderId,
      candidateProviderIds: normalizedCandidateProviderIds,
      mode: selected.mode,
    });
  }

  return selections;
}

function findConfiguredProviderMismatches(
  input: ResolveProviderSelectionInput,
): ProviderMismatch[] {
  const mismatches: ProviderMismatch[] = [];

  for (const [capabilityId, configuredProviderId] of Object.entries(
    input.configuredProviders ?? {},
  ).sort(([left], [right]) => left.localeCompare(right))) {
    if (!configuredProviderId) {
      continue;
    }

    const candidateProviderIds = toSortedUniqueProviderIds(
      input.providersByCapability.get(capabilityId) ?? [],
    );
    if (!candidateProviderIds.length) {
      continue;
    }

    if (candidateProviderIds.includes(configuredProviderId)) {
      continue;
    }

    mismatches.push({
      capabilityId,
      configuredProviderId,
    });
  }

  return mismatches;
}

function getExcludedProviders(selections: Iterable<ProviderSelection>): ProviderId[] {
  const excludedProviderIds: ProviderId[] = [];

  for (const selection of selections) {
    if (selection.candidateProviderIds.length <= 1) {
      continue;
    }

    for (const candidateProviderId of selection.candidateProviderIds) {
      if (candidateProviderId !== selection.selectedProviderId) {
        excludedProviderIds.push(candidateProviderId);
      }
    }
  }

  return toSortedUniqueProviderIds(excludedProviderIds);
}

export function collectProvidersByCapability<T>(
  input: ProviderCollectionInput<T>,
): ProvidersByCapability {
  const providersByCapability: ProvidersByCapability = new Map();

  for (const item of input.items) {
    const providerId = input.getProviderId(item);
    const capabilityIds = toCapabilityIds(input.getCapabilityId(item));

    for (const capabilityId of capabilityIds) {
      const currentProviderIds = providersByCapability.get(capabilityId) ?? [];
      currentProviderIds.push(providerId);
      providersByCapability.set(capabilityId, toSortedUniqueProviderIds(currentProviderIds));
    }
  }

  return providersByCapability;
}

export function collectProviderPreferences<T>(
  input: ProviderPreferenceCollectionInput<T>,
): ProviderPreferenceMap {
  let preferences: ProviderPreferenceMap = {};

  for (const item of input.items) {
    const value = input.getProviderPreferences(item);

    if (!isRecord(value)) continue;

    preferences = {
      ...preferences,
      ...Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0,
        ),
      ),
    };
  }

  return preferences;
}

function normalizeDefaultFor(value: unknown): CapabilityId[] {
  const entries = Array.isArray(value) ? value : [value];

  return entries.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export function collectProviderDefaults<T>(
  input: ProviderDefaultCollectionInput<T>,
): ProviderPreferenceMap {
  let defaults: ProviderPreferenceMap = {};

  for (const item of input.items) {
    const providerId = input.getProviderId(item);
    const capabilityIds = normalizeDefaultFor(input.getDefaultFor(item));

    defaults = {
      ...defaults,
      ...Object.fromEntries(capabilityIds.map((capabilityId) => [capabilityId, providerId])),
    };
  }

  return defaults;
}

export function collectSelectedProviderPreferences<T>(
  input: SelectedProviderPreferenceCollectionInput<T>,
): ProviderPreferenceMap {
  const selectedProviderIds = new Set(input.selectedProviderIds);
  const selectedItems = Array.from(input.items)
    .filter((item) => selectedProviderIds.has(input.getProviderId(item)))
    .sort((left, right) => input.getProviderId(left).localeCompare(input.getProviderId(right)));
  const preferences: ProviderPreferenceMap = {};

  for (const item of selectedItems) {
    const providerId = input.getProviderId(item);

    for (const capabilityId of toCapabilityIds(input.getCapabilityId(item))) {
      if (!preferences[capabilityId]) {
        preferences[capabilityId] = providerId;
      }
    }
  }

  return preferences;
}

export function resolveSelectedProviderRelationPreferences(
  input: SelectedProviderRelationPreferenceInput,
): SelectedProviderRelationPreferences {
  const selectedProviders = input.selectedProviders ?? {};
  const selectedCapabilityIds = new Set(Object.keys(selectedProviders));
  const defaultFor = toCapabilityIds(input.defaultFor).filter(
    (capabilityId) =>
      !selectedProviders[capabilityId] || selectedProviders[capabilityId] === input.providerId,
  );
  const providerPreferences = Object.fromEntries(
    Object.entries(input.providerPreferences ?? {}).filter(
      ([capabilityId]) => !selectedCapabilityIds.has(capabilityId),
    ),
  );

  return {
    ...(defaultFor.length
      ? { defaultFor: Array.isArray(input.defaultFor) ? defaultFor : defaultFor[0] }
      : {}),
    ...(Object.keys(providerPreferences).length ? { providerPreferences } : {}),
  };
}

export function resolveProviderSelection(
  input: ResolveProviderSelectionInput,
): ProviderSelectionResolution {
  const selections = selectProviders(input);
  const mismatches = findConfiguredProviderMismatches(input);
  const excludedProviderIds = getExcludedProviders(selections.values());

  return {
    selections,
    mismatches,
    excludedProviderIds,
  };
}

export function resolveItemProviderSelection<T>(
  input: ResolveItemProviderSelectionInput<T>,
): ItemProviderSelectionResolution {
  const providersByCapability = collectProvidersByCapability(input);

  const resolution = resolveProviderSelection({
    providersByCapability,
    ...(input.configuredProviders ? { configuredProviders: input.configuredProviders } : {}),
    ...(input.fallbackProviders ? { fallbackProviders: input.fallbackProviders } : {}),
    ...(input.selectedProviders ? { selectedProviders: input.selectedProviders } : {}),
  });

  return {
    providersByCapability,
    ...resolution,
  };
}
