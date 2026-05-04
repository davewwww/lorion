# @lorion-org/nuxt

## 1.0.0-beta.2

### Minor Changes

- ac3c152: Prefer explicitly selected provider descriptors over descriptor-level provider preferences and defaults, and expose a Lorion source export condition for workspace playground development.
- ac3c152: Expose runtime-safe extension discovery, catalog, entry map, and bootstrap helpers through `@lorion-org/nuxt/extensions`.
- ac3c152: Add shared capability selection seed defaults for framework adapters.

### Patch Changes

- ac3c152: Expose extension helpers through documented subpaths, register selected extensions as Nuxt layers instead of hand-mounting individual folders, and point public package entries directly at the structured source entrypoints.

  This keeps Nuxt extension activation aligned with descriptor selection while preserving public imports for runtime config and extension helpers.

- ac3c152: Respect host Nuxt import scanning for generated runtime-config composables and add typed explicit import paths for hosts with auto-import scanning disabled.
- Updated dependencies [ac3c152]
- Updated dependencies [ac3c152]
- Updated dependencies [ac3c152]
  - @lorion-org/composition-graph@1.0.0-beta.2
  - @lorion-org/descriptor-discovery@1.0.0-beta.2
  - @lorion-org/provider-selection@1.0.0-beta.2
  - @lorion-org/runtime-config@1.0.0-beta.1
  - @lorion-org/runtime-config-node@1.0.0-beta.1

## 1.0.0

### Minor Changes

- 23a50f0: Add the initial Nuxt module with runtime-config support and layer-extension bootstrap.

  The module discovers local extension descriptors, resolves selected and base descriptors through LORION package primitives, loads selected Nuxt layers, and documents public examples for runtime config and extension composition.

### Patch Changes

- 23a50f0: Expose extension helpers through documented subpaths, register selected extensions as Nuxt layers instead of hand-mounting individual folders, and point public package entries directly at the structured source entrypoints.

  This keeps Nuxt extension activation aligned with descriptor selection while preserving public imports for runtime config and extension helpers.

- Updated dependencies [23a50f0]
- Updated dependencies [23a50f0]
- Updated dependencies [23a50f0]
  - @lorion-org/composition-graph@1.0.0
  - @lorion-org/descriptor-discovery@1.0.0
  - @lorion-org/provider-selection@1.0.0

## 1.0.0-beta.0

- Initial beta package.
