# @lorion-org/react

React capability runtime and Vite helpers for LORION descriptor-based applications.

Use this package when a React application is assembled from local capability packages that expose a `capability.json` descriptor and a `./capability` activation export.

## Install

```shell
pnpm add @lorion-org/react react
```

Host configs that import selection helpers from `@lorion-org/composition-graph`
should declare that package directly too.

Add Vite, TanStack Router, or another router in the host application as needed.
The runtime helpers do not own routing; the Vite entry point only prepares
capability discovery and TanStack-compatible virtual route config.

## What It Is

- a small React binding for immutable capability contributions
- a Vite virtual module helper for active capability activation exports
- a TanStack virtual route config helper for capability-owned route folders
- scoped public runtime config for active capabilities
- a React adapter over LORION descriptor discovery and composition graph packages

## What It Is Not

- not a UI component library
- not a router
- not a package manager
- not an application naming convention

## Basic Runtime

```ts
import { CapabilityRuntimeProvider, createCapabilityRuntime } from '@lorion-org/react';
import { capabilityModules } from 'virtual:capabilities';

const capabilityRuntime = createCapabilityRuntime(capabilityModules);
```

Render the provider once around the application tree:

```tsx
import { CapabilityRuntimeProvider } from '@lorion-org/react';

root.render(
  <CapabilityRuntimeProvider runtime={capabilityRuntime}>
    <App />
  </CapabilityRuntimeProvider>,
);
```

Capability contracts can define extension points and read contributions:

```ts
import { createContributionContract } from '@lorion-org/react';

type Tool = {
  id: string;
  label: string;
};

const toolContract = createContributionContract<Tool>('tools');

export function defineTools(tools: readonly Tool[]) {
  return toolContract.define(tools);
}

export function useTools(): Tool[] {
  return toolContract.use();
}
```

## Capability Packages

Each local capability package needs a descriptor and an activation export:

```text
capabilities/
  my-capability/
    capability.json
    package.json
    src/
      capability.ts
      routes/
        index.tsx
```

```json
{
  "id": "my-capability",
  "version": "1.0.0",
  "dependencies": {
    "other-capability": "^1.0.0"
  }
}
```

```json
{
  "name": "@my-app/my-capability",
  "type": "module",
  "exports": {
    "./capability": "./src/capability.ts"
  }
}
```

The `src/routes` folder is optional. If present, `lorionReact()` can expose it
to TanStack Router as a capability-owned route subtree.

## Vite

```ts
import { lorionReact } from '@lorion-org/react/vite';
```

The Vite helper discovers `capabilities/*/capability.json`, validates the descriptor shape with LORION, resolves selected descriptors through the LORION composition graph, resolves each package `./capability` export, and exposes `virtual:capabilities`.

```ts
const lorion = lorionReact({
  workspaceRoot,
  routesDirectory,
  defaultSelection: ['default'],
});

export default defineConfig({
  plugins: [
    lorion.capabilityLoader,
    tanstackStart({
      router: {
        virtualRouteConfig: lorion.routeConfig,
      },
    }),
  ],
});
```

By default the Vite helper reads the shared capability seed from
`--capabilities`, `npm_config_capabilities`, and `LORION_CAPABILITIES` before it
falls back to `defaultSelection`. No `selectionSeed.key` option is required for
that default. Pass `selectionSeed` only to override the seed names, inject custom
`argv`/`env` for tests, or set `selectionSeed: false` to disable CLI/env lookup.

Route config generation stays TanStack-focused and only includes enabled,
selected capability route directories. If no `selected`, seed value,
`defaultSelection`, or `baseDescriptors` are provided, every enabled local
capability remains active.
Use `indexRouteFile: false` when `/` is owned by a capability route.

The virtual module exports `capabilityModules`, `selectedCapabilityIds`, and
`resolvedCapabilityIds` so host code can distinguish the seed from the final
graph resolution.

## Runtime Config

React runtime config follows the same LORION ownership model as other
capability data: a capability owns its config contract, deployment inputs provide
values, and the framework adapter exposes only the safe runtime view.

By default the React Vite adapter looks for:

```text
capabilities/<capability>/capability.schema.json
.data/runtime-config/<capability>/capability.runtime.json
```

Hosts can configure the convention once:

```ts
const lorion = lorionReact({
  workspaceRoot,
  routesDirectory,
  runtimeConfig: {
    configFileName: 'capability.runtime.json',
    schemaFileName: 'capability.schema.json',
  },
});
```

By default, file-backed config is read from `<workspaceRoot>/.data`. Hosts that
need a deployment-controlled var dir can configure an env key:

```ts
const lorion = lorionReact({
  workspaceRoot,
  routesDirectory,
  runtimeConfig: {
    varDir: {
      envKey: 'REACT_VAR_DIR',
    },
  },
});
```

Runtime files use unprefixed capability-local sections:

```json
{
  "public": {
    "url": "https://id.example.test",
    "realm": "demo",
    "clientId": "web"
  },
  "private": {
    "clientSecret": "server-only"
  }
}
```

The adapter also reads Vite env files and process env. Public keys use the
`VITE_<CAPABILITY>_<KEY>` convention, while private keys use
`<CAPABILITY>_<KEY>`:

```text
VITE_KEYCLOAK_URL=https://id.example.test
VITE_KEYCLOAK_REALM=demo
VITE_KEYCLOAK_CLIENT_ID=web
KEYCLOAK_CLIENT_SECRET=server-only
```

Env values override runtime files. Only `public` config is emitted through
`virtual:capability-runtime-config`; server code can opt into
`virtual:capability-runtime-config/server`. The server virtual module is
SSR-only and fails during client builds to prevent private config from being
bundled.

Render the config provider near the capability runtime provider:

```tsx
import { CapabilityRuntimeConfigProvider } from '@lorion-org/react';
import { capabilityRuntimeConfig } from 'virtual:capability-runtime-config';

<CapabilityRuntimeConfigProvider runtimeConfig={capabilityRuntimeConfig}>
  <App />
</CapabilityRuntimeConfigProvider>;
```

Capability code reads scoped public config:

```ts
import { useCapabilityRuntimeConfig } from '@lorion-org/react';

const keycloak = useCapabilityRuntimeConfig('keycloak');
console.log(keycloak.public.url);
```

## Provider Selection

Capabilities that implement another capability can declare `providesFor`.
Provider-owned defaults use `defaultFor` on the provider descriptor:

```json
{
  "id": "payment-provider-stripe",
  "version": "1.0.0",
  "providesFor": "checkout",
  "defaultFor": "checkout"
}
```

`providesFor` and `defaultFor` both accept a string or string array. If a
capability descriptor exists, `defaultFor` also creates the composition relation
from that capability to the default provider.

Profiles can still declare descriptor preferences with `providerPreferences`.
Use this when the profile, not the provider package, owns the default choice:

```json
{
  "id": "web",
  "version": "1.0.0",
  "providerPreferences": {
    "checkout": "payment-provider-stripe"
  }
}
```

When a provider capability is explicitly selected through the normal selection
seed, the Vite helper removes lower-priority `defaultFor` and
`providerPreferences` relations for that capability before graph resolution.
That selected provider wins over descriptor defaults and preferences. A losing
provider is only present if another hard dependency still requires it.

Read the resolved provider selection from the runtime:

```ts
import { getCapabilityProviderSelection } from '@lorion-org/react';

const selection = getCapabilityProviderSelection(capabilityRuntime);
```

Explicit `configuredProviders` passed to `getCapabilityProviderSelection()`
override selected providers, provider-owned defaults, and descriptor
preferences. `selectedProviders` can mirror the descriptor seed at runtime, and
`fallbackProviders` are merged with descriptor defaults and only used when no
configured or selected provider exists.

The React playground uses the first variant by default: Stripe declares
`defaultFor: "checkout"` and is selected as the fallback provider. Selecting
`web payment-provider-invoice` through the seed switches checkout to Invoice and
leaves Stripe out of the resolved capabilities.

## API

The package exposes two public entry points:

- `@lorion-org/react` for runtime, contribution contracts, provider selection, runtime config, and React context helpers
- `@lorion-org/react/vite` for capability discovery, runtime-config virtual modules, and TanStack-compatible route config

## Playground

The package includes a React playground that mirrors the Nuxt package playground with a demo shop, checkout providers, and a tech monitor.

```sh
pnpm --filter @lorion-org/react dev:playground
```

The playground scripts run with Lorion's `lorion-source` export condition so
local workspace package imports resolve to `src` instead of stale `dist` output.

The playground runs on `http://localhost:3200` and uses local demo capabilities under `playground/capabilities`.
Select a different profile or provider with `--capabilities=admin`,
`--capabilities=web,payment-provider-invoice`, or `LORION_CAPABILITIES="web payment-provider-invoice"`.

## Local Commands

```shell
cd packages/react
pnpm build
pnpm test
pnpm typecheck
pnpm package:check
```
