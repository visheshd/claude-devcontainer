# ADR-0001: pin claude-code, bump to Node 22, fix the wrapper's binary path - keep the auth wrapper

**Status:** Accepted
**Date:** 2026-08-14

## Context

`claude-base:latest` was built 2025-09-09 and never rebuilt since. It baked
`@anthropic-ai/claude-code 1.0.109`, eleven months stale, while the host ran
2.1.232. The version gap meant the old CLI could not parse settings shapes
written by anything current, surfacing downstream (in the `vanillacrm`
project, which consumes this image) as:

```
RangeError: Maximum call stack size exceeded
TypeError: B.allowedTools is not iterable
```

`dockerfiles/claude-base/Dockerfile` is the actual build source for the
`claude-base:latest` tag (wired through `dockerfiles/claude-base/build.sh`
and `build-all-images.sh`) - not the repo-root `Dockerfile`, which builds an
unrelated, differently-purposed image. Its `npm install -g
@anthropic-ai/claude-code` (line 43) was unpinned, floating to "latest" at
build time.

Investigating why a plain rebuild wouldn't just self-heal surfaced two
compounding bugs, not one:

1. **The base image can no longer resolve true latest.** The Dockerfile
   used `FROM node:20-slim`. claude-code 2.1.223+ declares `engines: {node:
   ">=22.0.0"}`. Against Node 20, `npm install -g @anthropic-ai/claude-code`
   does not error - it silently resolves the newest version still
   compatible with the *running* Node (2.1.197, engines `>=18.0.0`,
   published 2026-06-30) instead of the registry's actual `latest` dist-tag
   (2.1.232, published 2026-08-13). Verified by installing on both
   `node:20-slim` and `node:22-slim` with an identical unpinned command;
   only the Node 22 base landed on 2.1.232. An unpinned install is not a
   guarantee of freshness if the base image's engine constraint has fallen
   behind the package's own requirement - it fails silently, six weeks
   behind, with no warning in the build log.

2. **`scripts/claude-wrapper.sh` hardcoded a package-internal path that no
   longer exists.** `/usr/local/bin/claude` is symlinked to this wrapper
   (installed at higher PATH precedence than npm's own bin, so `CMD
   ["claude"]` always runs it first). The wrapper hardcoded `REAL_CLAUDE
   ="/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js"` and
   executed it via `node`. Current claude-code no longer ships a `cli.js`
   entry point - `npm install` now creates `bin/claude.exe`, a standalone
   ELF executable (confirmed via `file`/hex-dump: `7f 45 4c 46`), and the
   package's own `package.json` `bin` field points there. Every invocation
   of `claude` inside the container - regardless of the crash this mission
   was chasing - was crashing with `MODULE_NOT_FOUND` on the missing
   `cli.js`, reproduced directly:

   ```
   Error: Cannot find module '/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js'
   ```

## Decision

**Pin the claude-code version**, via `ARG CLAUDE_CODE_VERSION=2.1.232` in
`dockerfiles/claude-base/Dockerfile`, bumped in a documented one-line
process (`npm view @anthropic-ai/claude-code version`, update the ARG,
rebuild). Rejected floating-and-rebuild-on-a-schedule: this repo has no
scheduled CI (`.github/workflows/build-images.yml` triggers only on
`dockerfiles/**` pushes, no `schedule:` trigger), so adding one is new
infrastructure beyond this mission's scope; and finding #1 above shows
floating doesn't even reliably mean "latest" - it silently degrades to
whatever the base image's Node version still permits. A pin makes version
bumps an explicit, reviewable diff instead of invisible entropy, which is
the exact failure mode that caused the eleven-month staleness this mission
exists to fix.

**Bump `FROM node:20-slim` to `FROM node:22-slim`.** Required regardless of
the pinning decision above - without it, even a version-pinned install of a
claude-code release requiring Node 22 would fail to install the pinned
version cleanly (npm would refuse or silently substitute).

**Fix, don't remove, the auth wrapper (`scripts/claude-wrapper.sh`).**
Reassessed against `docs/SECURITY.md`'s documented auth model for this
image (runtime volume mount of a writable `~/.claude` for subscription
auth, `.credentials.json` never baked into the image) and against the
captain's own credential-seeding flow (`ADR-0004` in `captain-ai`, container
-local `CLAUDE_CONFIG_DIR=/captain/claude-cap` seeded over `docker exec -i`
stdin). Findings:

- The wrapper never writes settings/config files and never touches
  `allowedTools` - it only sets auth-related env vars and execs the real
  binary. It is not the source of the legacy-settings-shape crash; the
  stale claude-code binary was.
- It reads credentials only from `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.credentials.json`
  in its (currently unused, fallback-only) token path - so it is
  compatible with the captain's `CLAUDE_CONFIG_DIR` redirection by
  construction, not by luck.
- It provides real value this image's own documented model depends on:
  automatic subscription-auth env setup and an automatic
  `--dangerously-skip-permissions` for container use, for the non-captain,
  standalone use case `docs/SECURITY.md` describes (a user mounting their
  own live `~/.claude`).
- It *was*, however, actively broken by the `cli.js` path assumption
  (finding #2) - every `claude` invocation crashed before reaching any
  auth or settings logic at all. This needed a fix regardless of the
  keep/remove question.

The fix: the Dockerfile now preserves npm's own generated `/usr/local/bin/claude`
symlink under `/usr/local/bin/claude-real` *before* installing the wrapper
over `/usr/local/bin/claude`. The wrapper execs `/usr/local/bin/claude-real`
directly (no `node` prefix - the target is a native executable, not a JS
file). npm's symlink is authoritative and adapts automatically to whatever
entry point the installed version declares, so this fix does not reintroduce
a hardcoded internal path that can break again on the next claude-code
packaging change.

**CI's build-base job used the wrong context and never actually built this
image.** `.github/workflows/build-images.yml`'s `build-base` job passed
`context: dockerfiles/claude-base`, but `dockerfiles/claude-base/Dockerfile`
`COPY`s repo-root-relative paths (`scripts/git-wrapper.sh`,
`scripts/claude-wrapper.sh`, `scripts/git_utils.py`,
`dockerfiles/claude-base/startup.sh`) - none of which resolve from that
context, so every CI run of this job failed the build outright (reproduced
locally: `docker build -f dockerfiles/claude-base/Dockerfile
dockerfiles/claude-base` fails with `"/dockerfiles/claude-base/startup.sh":
not found`). This had nothing to do with the version-rot fix above - it
predates this change and is a separate, pre-existing bug that only surfaced
once this PR's build actually ran in CI. Fixed by pointing the job at
`context: .` with an explicit `file: dockerfiles/claude-base/Dockerfile`,
matching what `dockerfiles/claude-base/build.sh` (the documented local build
path) already does. Rejected making the Dockerfile self-contained instead
(copying `scripts/*` into `dockerfiles/claude-base/`): those scripts are
shared with the repo-root `Dockerfile`'s own build, and a second copy is
exactly the kind of silent-drift hazard this ADR exists to close off. The
three derived-image jobs (`nextjs`, `python-ml`, `rust-tauri`) keep their
own per-image contexts unchanged - none of their Dockerfiles have any `COPY`
instructions, so they were never affected by this bug.

**Fixing the context bug uncovered a third, previously-unreachable
pre-existing bug: `sudo` fails under CI's cross-arch QEMU emulation.**
`build-images.yml` builds `platforms: linux/amd64,linux/arm64` via buildx on
a single amd64 GitHub runner, emulating the non-native arch with QEMU. The
Dockerfile's git-delta install ran as `claude-user` (after the `USER`
switch) and used `sudo mv` to place the binary in `/usr/local/bin`. Under
QEMU user-mode emulation this failed: `sudo: effective uid is not 0, is
/usr/bin/sudo on a file system with the 'nosuid' option set or an NFS file
system without root privileges?` - a known QEMU/binfmt limitation, not an
actual permissions problem. This had never been seen before because the
`build-base` job never got past the `COPY` failure above in months of CI
runs - fixing that bug was what let the build reach this step for the first
time. Fixed by moving the delta install to run as root, before the `USER
claude-user` switch, and dropping `sudo` entirely (root never needs it to
write to `/usr/local/bin`) - sidesteps the QEMU/sudo interaction rather than
working around it. Verified directly rather than inferred: rebuilt under
real QEMU emulation locally (`docker buildx build --platform linux/amd64`
`--load` on this arm64 host, the same cross-arch situation CI hits from the
other direction) - the delta step and the full build both succeeded, and the
resulting emulated image ran `claude --version` / `delta --version` cleanly.

## Evidence

- `docker inspect claude-base:latest` before rebuild: `Created:
  2025-09-09T02:45:25Z`, baked version 1.0.109 (`package.json` inside the
  image).
- Unpinned install on `node:20-slim` (fresh, `--no-cache`) landed 2.1.197
  (published 2026-06-30); the same command on `node:22-slim` landed 2.1.232
  (published 2026-08-13, actual `latest` dist-tag at build time).
- Pre-fix wrapper crash, reproduced directly in the rebuilt (node:22, still
  broken-wrapper) image:
  `docker run --rm --entrypoint sh claude-base:latest -c 'claude --version'`
  → `Error: Cannot find module '.../cli.js'`.
- Post-fix, full end-to-end proof mimicking the captain's real flow: started
  a container, created `/captain/claude-cap` as `claude-user`, streamed a
  real OAuth credential blob over `docker exec -i ... claude-user` stdin
  into `.credentials.json` (chmod 600), then ran a live prompt with
  `CLAUDE_CONFIG_DIR=/captain/claude-cap`:
  `echo "reply with exactly: OK" | claude -p --output-format text` → `OK`,
  exit 0, no `allowedTools` error, no stack overflow.
- CI context bug reproduced locally with the exact broken invocation
  (`context: dockerfiles/claude-base`); fix re-verified by rebuilding with
  the exact CI-equivalent invocation (`context: .`, `file:
  dockerfiles/claude-base/Dockerfile`) and repeating both the version check
  (2.1.232) and the full credential-seeding end-to-end proof above - both
  passed unchanged.
- `sudo`/QEMU bug: build with the context fix alone still failed in CI at
  `[linux/arm64 19/22]` on the `sudo mv` step
  (`https://github.com/visheshd/claude-devcontainer/actions/runs/31792847706`)
  after progressing 9 steps further than before - confirming the context fix
  worked and this was a distinct, newly-reached failure. After moving the
  delta install before the `USER` switch, a local `docker buildx build
  --platform linux/amd64 --load` (genuine QEMU emulation, cross-arch from
  this arm64 host) completed successfully end to end, including the delta
  step, with no `sudo` involved.

## Consequences

- `claude-base:latest` now ships claude-code 2.1.232 on Node 22, matching
  the host.
- Future version bumps are a one-line `ARG` change instead of invisible
  drift - but this now requires a human/PR to remember to bump it. No
  automation enforces freshness; if that becomes a recurring problem, a
  scheduled rebuild workflow is the natural next step (out of scope here).
- Derived images (`dockerfiles/{nextjs,python-ml,rust-tauri}`) build `FROM
  claude-base:latest` and inherit the Node 22 bump. Not rebuilt or tested
  as part of this change (out of scope) - verify them before relying on
  this base image update in a derived-image build.
- The wrapper's `CLAUDE_USE_SUBSCRIPTION` / `CLAUDE_BYPASS_BALANCE_CHECK`
  env vars and its always-on `--dangerously-skip-permissions` injection
  were left as-is - out of scope for this mission, and not implicated in
  the crash this mission was chasing.

## Out of scope

- Adding a scheduled CI rebuild (see Decision above).
- Rebuilding/testing the derived stack images.
- Changing the wrapper's subscription-vs-API-key auth preference or its
  automatic `--dangerously-skip-permissions` behavior.
- Any change to the `vanillacrm`, `jam`, or `captain-ai` repos.
