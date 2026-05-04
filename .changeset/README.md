# Changesets

This repository uses Changesets for versioning and release notes.

Typical flow:

```shell
pnpm changeset
pnpm release:status
pnpm version-packages
```

Normal publishing is handled by the repository Release workflow. See
[`docs/release.md`](../docs/release.md).

This repository is currently in Changesets pre mode for beta releases. Keep
`.changeset/pre.json` until LORION is ready to leave beta.
