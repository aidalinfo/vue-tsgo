# Release Guide

CI and releases of this repository run on Sève (`.seve/workflows/`), not on GitHub Actions.

| Workflow | Runs on | Does |
|---|---|---|
| `.seve/workflows/ci.yml` | PR to `main`, `seve test`, `seve land` gate, push to `main` | Go tests, launcher/installer tests, `go vet`, `gofmt`, cross-compiled `tsgo`, VSIX package |
| `.seve/workflows/parity.yml` | PR to `main`, `seve test`, push to `main`, nightly (04:00 UTC) | Diagnostics parity with `vue-tsc` (`scripts/parity-check.mjs`) |
| `.seve/workflows/release.yml` | push to `main` that bumps `cli/package.json`, or `seve ci dispatch release.yml` | Binaries, VSIX, GitHub release, npm publish |

## Cutting a release

1. Open a Sève task titled `chore(release): vX.Y.Z` (`seve task new …`).
2. Bump the version in `cli/package.json` and `editors/vscode/package.json` (same version), and add a
   `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md`:
   ```bash
   (cd cli && npm version X.Y.Z --no-git-tag-version)
   (cd editors/vscode && npm version X.Y.Z --no-git-tag-version)
   ```
3. `seve test`, then `seve land`. The push to `main` changes the `version` of `cli/package.json`, which starts
   `release.yml`:
   - builds `tsgo` for linux/darwin/windows × amd64/arm64 (`CGO_ENABLED=0`, cross-compiled on Linux);
   - packages one VSIX per platform (`vue-tsgo-X.Y.Z@<platform>.vsix`);
   - creates the GitHub release `vX.Y.Z` (the tag is created on the landed commit) with the binaries and VSIX;
   - publishes `vue-go-tsc@X.Y.Z` to npm (`latest`, or `next` for a prerelease such as `X.Y.Z-beta.0`).
4. Follow it with `seve ci runs` / `seve ci watch <run>`.

The GitHub release must exist before the npm package: `cli/install.js` (the package's `postinstall`) downloads
`https://github.com/aidalinfo/vue-tsgo/releases/download/vX.Y.Z/tsgo-<os>-<arch>`. Never rename the binaries.

The workflow refuses a version whose tag already exists on another commit: bump again instead of re-releasing.
Re-running it after a partial failure is safe (release assets are replaced, npm publish is skipped when the
version is already there).

The VS Code Marketplace is not published: the `NikhilVerma.vue-tsgo` extension belongs to the upstream author.
The VSIX files are attached to the GitHub release for manual install.

## Secrets (one-time)

Repository secrets, `livraison` usage (only release runs on `main` receive them):

```bash
seve secrets set GH_RELEASE_TOKEN --repo vue-tsgo --usage livraison   # GitHub token, aidalinfo/vue-tsgo, Contents: read & write
seve secrets set NPM_TOKEN --repo vue-tsgo --usage livraison          # npmjs.com token allowed to publish vue-go-tsc
seve secrets list --repo vue-tsgo
```

## Rollback

```bash
npm deprecate vue-go-tsc@X.Y.Z "broken release, use X.Y.Z+1"   # unpublish only within 72 hours
gh release delete vX.Y.Z --yes --cleanup-tag
```

Deleting a release breaks `npm install vue-go-tsc@X.Y.Z` (the binary is downloaded from it): prefer deprecating
and releasing a fix.

## Versioning

[Semantic Versioning](https://semver.org/): patch for fixes, minor for new Vue features, major for breaking
changes. See [CHANGELOG.md](./CHANGELOG.md).
