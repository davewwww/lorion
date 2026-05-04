---
'@lorion-org/nuxt': patch
---

Expose extension helpers through documented subpaths, register selected extensions as Nuxt layers instead of hand-mounting individual folders, and point public package entries directly at the structured source entrypoints.

This keeps Nuxt extension activation aligned with descriptor selection while preserving public imports for runtime config and extension helpers.
