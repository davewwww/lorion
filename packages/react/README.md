# @lorion-org/react

React capability runtime and Vite helpers for LORION descriptor-based applications.

Use this package when a React application is assembled from local capability packages that expose a `capability.json` descriptor and a `./capability` activation export.

## Install

```shell
pnpm add @lorion-org/react react
```

Add Vite, TanStack Router, or another router in the host application as needed.
The runtime helpers do not own routing; the Vite entry point only prepares
capability discovery and TanStack-compatible virtual route config.

## What It Is

- a small React binding for immutable capability contributions
- a Vite virtual module helper for active capability activation exports
- a TanStack virtual route config helper for capability-owned route folders
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
const capabilityComposition = {
  selected: ['default'],
};
const lorion = lorionReact({
  workspaceRoot,
  routesDirectory,
  ...capabilityComposition,
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

Route config generation stays TanStack-focused and only includes enabled, selected capability route directories. If no `selected` or `baseDescriptors` are provided, every enabled local capability remains active. Use `indexRouteFile: false` when `/` is owned by a capability route.

## Provider Selection

Capabilities that implement another capability can declare `providesFor`:

```json
{
  "id": "payment-provider-stripe",
  "version": "1.0.0",
  "providesFor": "payment-checkout"
}
```

Any active descriptor can declare preferences with `providerPreferences`:

```json
{
  "id": "web",
  "version": "1.0.0",
  "providerPreferences": {
    "payment-checkout": "payment-provider-stripe"
  }
}
```

Read the resolved provider selection from the runtime:

```ts
import { getCapabilityProviderSelection } from '@lorion-org/react';

const selection = getCapabilityProviderSelection(capabilityRuntime);
```

Explicit `configuredProviders` passed to `getCapabilityProviderSelection()` override descriptor preferences. `fallbackProviders` are only used when no configured provider exists.

## API

The package exposes two public entry points:

- `@lorion-org/react` for runtime, contribution contracts, provider selection, and React context helpers
- `@lorion-org/react/vite` for capability discovery, the Vite virtual module, and TanStack-compatible route config

## Playground

The package includes a React playground that mirrors the Nuxt package playground with a demo shop, checkout providers, and a tech monitor.

```sh
pnpm --filter @lorion-org/react dev:playground
```

The playground runs on `http://localhost:3200` and uses local demo capabilities under `playground/capabilities`.

## Local Commands

```shell
cd packages/react
pnpm build
pnpm test
pnpm typecheck
pnpm package:check
```
