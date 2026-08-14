# Documentation index

## Architecture

- [ADR-0001: claude-base image freshness](architecture/adr/ADR-0001-claude-base-image-freshness.md) -
  pinning `claude-code`, the Node 22 base image bump, and why the auth
  wrapper (`scripts/claude-wrapper.sh`) was fixed rather than removed.

## Other docs

- [Security](SECURITY.md) - authentication model, credential handling, and
  container isolation.
- [Migration guide](migration-guide.md)
- [Custom images](custom-images/README.md)
- [Mounting examples](examples/README.md)
