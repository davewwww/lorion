# @lorion-org/provider-selection

`@lorion-org/provider-selection` is a small framework-free core for selecting one
provider per capability from multiple candidates.

It solves six things:

- collect provider candidates by capability
- collect provider preferences from descriptors or config-like records
- optionally collect and resolve in one call
- pick one provider with configured and fallback preferences
- report misconfigured provider selections
- return excluded providers that lost the selection

Selection order is always:

1. configured provider
2. fallback provider
3. first provider in deterministic sort order

If a configured provider is set but not present among the candidates, the package
does not silently fall back. It reports a mismatch and leaves that capability
unselected.

Playground examples in this repository:

- `packages/nuxt/playground/layer-extensions/payment-provider-stripe/extension.json`
- `packages/nuxt/playground/layer-extensions/payment-provider-invoice/extension.json`
- `packages/react/playground/capabilities/payment-provider-stripe/capability.json`
- `packages/react/playground/capabilities/payment-provider-invoice/capability.json`

It does not know anything about:

- framework runtime config
- feature manifests
- plugins
- filesystems
- application-specific contract names

## Install

```shell
pnpm add @lorion-org/provider-selection
```

## Example

```ts
import { resolveItemProviderSelection } from '@lorion-org/provider-selection';

const result = resolveItemProviderSelection({
  items: [
    { providesFor: 'payment-checkout', id: 'payment-provider-stripe' },
    { providesFor: 'payment-checkout', id: 'payment-provider-invoice' },
  ],
  getCapabilityId: (item) => item.providesFor,
  getProviderId: (item) => item.id,
  configuredProviders: {
    'payment-checkout': 'payment-provider-stripe',
  },
});

result.selections;
result.providersByCapability;
result.mismatches;
result.excludedProviderIds;
```

If you already have a `Map<capability, providers>`, use the lower-level
resolver directly:

```ts
import { resolveProviderSelection } from '@lorion-org/provider-selection';

const result = resolveProviderSelection({
  providersByCapability: new Map([
    ['payment-checkout', ['payment-provider-invoice', 'payment-provider-stripe']],
  ]),
  configuredProviders: {
    'payment-checkout': 'missing-provider',
  },
});

result.selections;
result.mismatches;
// => [{ capabilityId: 'payment-checkout', configuredProviderId: 'missing-provider' }]
```

If provider preferences are stored on descriptors, collect them before resolving:

```ts
import {
  collectProviderPreferences,
  resolveItemProviderSelection,
} from '@lorion-org/provider-selection';

const configuredProviders = collectProviderPreferences({
  items: descriptors,
  getProviderPreferences: (descriptor) => descriptor.providerPreferences,
});

const result = resolveItemProviderSelection({
  items: descriptors,
  getCapabilityId: (descriptor) => descriptor.providesFor,
  getProviderId: (descriptor) => descriptor.id,
  configuredProviders,
});
```

## API

```ts
type CapabilityId = string;
type ProviderId = string;
type ProviderSelectionMode = 'configured' | 'fallback' | 'first';
type ProviderPreferenceMap = Partial<Record<CapabilityId, ProviderId>>;
type ProvidersByCapability = Map<CapabilityId, ProviderId[]>;

type ProviderSelection = {
  capabilityId: CapabilityId;
  selectedProviderId: ProviderId;
  candidateProviderIds: ProviderId[];
  mode: ProviderSelectionMode;
};

type ProviderMismatch = {
  capabilityId: CapabilityId;
  configuredProviderId: ProviderId;
};

type ProviderSelectionResolution = {
  selections: Map<CapabilityId, ProviderSelection>;
  mismatches: ProviderMismatch[];
  excludedProviderIds: ProviderId[];
};

type ItemProviderSelectionResolution = ProviderSelectionResolution & {
  providersByCapability: ProvidersByCapability;
};
```

The package exposes:

- `collectProviderPreferences()`
- `collectProvidersByCapability()`
- `resolveItemProviderSelection()`
- `resolveProviderSelection()`

## Local commands

```shell
cd packages/provider-selection
pnpm build
pnpm test
pnpm coverage
pnpm typecheck
pnpm package:check
```
