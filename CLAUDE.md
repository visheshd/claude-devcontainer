# Project notes for agents

- The `claude-base:latest` image tag is built from `dockerfiles/claude-base/Dockerfile`
  (via `dockerfiles/claude-base/build.sh` or `build-all-images.sh`) - **not**
  the repo-root `Dockerfile`, which builds a separate, differently-purposed
  image. `dockerfiles/{nextjs,python-ml,rust-tauri}/Dockerfile` all build
  `FROM claude-base:latest`.
- claude-code's own `engines` constraint has moved past Node 20; the base
  image must track that (currently `node:22-slim`) or an unpinned `npm
  install -g @anthropic-ai/claude-code` will silently resolve to an older
  compatible version instead of erroring - see
  `docs/architecture/adr/ADR-0001-claude-base-image-freshness.md`.
- `claude-code`'s own binary entry point has changed shape between releases
  (`cli.js` under the package dir, then a standalone `bin/claude.exe` ELF
  executable). `scripts/claude-wrapper.sh` (installed as `/usr/local/bin/claude`,
  shadowing npm's own bin) must never hardcode that internal path - it execs
  `/usr/local/bin/claude-real`, which the Dockerfile preserves from npm's own
  generated symlink before installing the wrapper over it.
