# LORION Agent Guidelines

Read the repository root `AGENTS.md` first. This file contains only
LORION-specific additions.

## Scope

- Applies to the public package workspace under `lorion/`.
- Start with `lorion/docs/index.md` for package documentation.
- For publishable package changes, read `lorion/docs/changesets.md` before
  committing or preparing staged changes.
- Package-level behavior and API notes belong in the owning
  `lorion/packages/<name>/README.md`.
- Do not copy private FUSEN migration or workplan notes into `lorion/`; keep
  boundary and extraction workflow docs under `docs/lorion/`.

## Package Boundaries

- Packages solve one focused standalone problem and can be adopted
  independently.
- Core packages stay framework-free.
- Node or file-system behavior belongs in Node packages or adapters.
- Framework behavior belongs in framework adapter packages.
- Public APIs should be small, explicit, and backed by checkable examples.
- Export only behavior with current consumers.
- Keep examples aligned with actual public exports.

## FUSEN Boundary Work

- For changes that move behavior between FUSEN and LORION, also read
  `docs/lorion/fusen-workflow.md` and
  `docs/lorion/design-and-workflow-principles.md`.
- Move behavior into LORION only when it still makes sense without Nuxt, Nitro,
  `feature.json`, or FUSEN naming.
- FUSEN owns compatibility names, defaults, environment variables, and
  app-specific wiring.

## Commands

- Run LORION commands with `pnpm --dir ./lorion <script>` from the repository
  root or plain `pnpm <script>` inside `lorion/`.
- Use `pnpm --dir ./lorion install --frozen-lockfile` for clean installs.
- For package work, prefer targeted checks first, then broader workspace checks
  when the blast radius requires them.
- The full quality gate is `pnpm --dir ./lorion check`.
- Common checks: `format:check`, `build`, `lint`, `test`, `typecheck`,
  `examples:check`, and `package:check`.

## Documentation And Release Shape

- Publishable packages should include built ESM/CJS/types output, README,
  LICENSE, and clean tarball contents.
- Public package docs live in `lorion/docs/` and package READMEs.
- Every commit that changes a publishable package's public API or runtime
  behavior must include the matching Changeset in the same commit.
- Do not publish npm packages from the private FUSEN repository; publish only
  from the public `lorion-org/lorion` repository.
