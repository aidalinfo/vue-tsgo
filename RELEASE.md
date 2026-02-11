# Release Guide

This document explains how to create releases for vue-tsgo.

## 🚀 Quick Release (Recommended)

### Option 1: Automated Version Bump (Easiest)

1. Go to **Actions** → **Version Bump** → **Run workflow**
2. Select bump type:
   - `patch`: Bug fixes (0.1.0 → 0.1.1)
   - `minor`: New features (0.1.0 → 0.2.0)
   - `major`: Breaking changes (0.1.0 → 1.0.0)
   - `prerelease`: Beta/alpha (0.1.0 → 0.1.1-beta.0)
3. Click **Run workflow**

This will:
- ✅ Bump version in `cli/package.json` and `editors/vscode/package.json`
- ✅ Update `CHANGELOG.md`
- ✅ Commit and push changes
- ✅ Create and push git tag
- ✅ **Automatically trigger the release workflow**

### Option 2: Manual Tag

```bash
# 1. Update versions manually
cd cli && npm version 0.2.0 --no-git-tag-version
cd ../editors/vscode && npm version 0.2.0 --no-git-tag-version

# 2. Update CHANGELOG.md (add new section)

# 3. Commit changes
git add .
git commit -m "chore: bump version to 0.2.0"
git push

# 4. Create and push tag
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

The tag push automatically triggers the release workflow.

---

## 📦 What Happens During Release

When you push a tag `v*.*.*`, the release workflow:

1. **Builds binaries** for all platforms (Linux, macOS, Windows × x64/ARM64)
2. **Builds VS Code extensions** for all platforms
3. **Creates GitHub Release** with:
   - Release notes (auto-generated + CHANGELOG)
   - All binaries
   - All VSIX files
4. **Publishes to npm** as `vue-tsgo`
5. **Publishes to VS Code Marketplace** as `NikhilVerma.vue-tsgo`

---

## ⚙️ Initial Setup (One-Time)

### 1. Set Up npm Token

```bash
# Login to npm
npm login

# Get your token
cat ~/.npmrc | grep "//registry.npmjs.org/:_authToken"

# Copy the token value
```

Add to GitHub:
1. Go to https://github.com/NikhilVerma/vue-tsgo/settings/secrets/actions
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: Your npm token (starts with `npm_`)

### 2. Set Up VS Code Marketplace Token

1. **Create a publisher** (if you haven't):
   - Go to https://marketplace.visualstudio.com/manage/createpublisher
   - Publisher ID: `NikhilVerma`

2. **Generate Personal Access Token**:
   - Go to https://dev.azure.com/ → User settings → Personal access tokens
   - Click **New Token**
   - Name: `VS Code Marketplace Publishing`
   - Organization: **All accessible organizations**
   - Scopes: **Marketplace → Manage**
   - Create and copy the token

3. **Add to GitHub**:
   - Go to https://github.com/NikhilVerma/vue-tsgo/settings/secrets/actions
   - Create secret: `VSCE_TOKEN` = your PAT

### 3. Verify Secrets

```bash
# Trigger pre-release check
git tag -a v0.0.1-test -m "Test tag"
git push origin v0.0.1-test

# Check Actions → Pre-Release Check
# It will verify NPM_TOKEN and VSCE_TOKEN are set

# Delete test tag after
git tag -d v0.0.1-test
git push origin :refs/tags/v0.0.1-test
```

---

## 🔍 Manual Release (Advanced)

If you want to trigger a release without creating a tag:

1. Go to **Actions** → **Release** → **Run workflow**
2. Enter version: `0.2.0` (without 'v' prefix)
3. Click **Run workflow**

This is useful for:
- Re-releasing a version
- Testing the release process
- Emergency releases

---

## 📋 Release Checklist

Before releasing:

- [ ] All tests pass (`make test`)
- [ ] CHANGELOG.md updated with changes
- [ ] Version bumped in `cli/package.json` and `editors/vscode/package.json`
- [ ] NPM_TOKEN and VSCE_TOKEN secrets are set
- [ ] Committed and pushed to main

After releasing:

- [ ] Verify npm package: `npm view vue-tsgo`
- [ ] Verify VS Code marketplace: https://marketplace.visualstudio.com/items?itemName=NikhilVerma.vue-tsgo
- [ ] Test installation:
  ```bash
  npm install -g vue-tsgo@latest
  vue-tsgo --version
  ```
- [ ] Announce on social media / Vue community

---

## 🐛 Troubleshooting

### Release Workflow Failed

Check the **Actions** tab for error details:

**npm publish failed**:
- Verify NPM_TOKEN is set correctly
- Check if version already exists on npm
- Ensure you have publish permissions

**VS Code marketplace failed**:
- Verify VSCE_TOKEN is set correctly
- Check publisher ID is correct (`NikhilVerma`)
- Ensure token has `Marketplace: Manage` scope

**Build failed**:
- Check if tests pass locally
- Verify Go version (1.25+)
- Check for missing dependencies

### Rollback a Release

```bash
# Unpublish from npm (within 72 hours)
npm unpublish vue-tsgo@0.2.0

# Unpublish from VS Code marketplace
npx @vscode/vsce unpublish NikhilVerma.vue-tsgo@0.2.0

# Delete GitHub release and tag
gh release delete v0.2.0 --yes
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0
```

### Version Mismatch

If `cli/package.json` and `editors/vscode/package.json` have different versions:

```bash
# Sync versions
VERSION="0.2.0"
cd cli && npm version $VERSION --no-git-tag-version
cd ../editors/vscode && npm version $VERSION --no-git-tag-version
git add . && git commit -m "chore: sync versions to $VERSION"
```

---

## 📊 Monitoring

### npm Downloads
```bash
npm view vue-tsgo
# Or: https://www.npmjs.com/package/vue-tsgo
```

### VS Code Installs
Check marketplace page:
https://marketplace.visualstudio.com/items?itemName=NikhilVerma.vue-tsgo

### GitHub Releases
https://github.com/NikhilVerma/vue-tsgo/releases

---

## 🔄 Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

### When to Bump

- **Patch**: Bug fixes, performance improvements, docs
- **Minor**: New Vue features, new directives, new LSP features
- **Major**: Breaking API changes, dropped Vue version support, major refactors

### Pre-releases

For beta/alpha releases:
```bash
# Create prerelease
npm version prerelease --preid=beta --no-git-tag-version
# Result: 0.1.0 → 0.1.1-beta.0

# Publish as beta
git tag -a v0.1.1-beta.0 -m "Beta release"
git push origin v0.1.1-beta.0
```

Users can install beta:
```bash
npm install -g vue-tsgo@beta
```

---

## 🎯 Best Practices

1. **Always test locally** before releasing
2. **Update CHANGELOG** with every release
3. **Use semantic versioning** strictly
4. **Create pre-releases** for major changes
5. **Monitor after release** for issues
6. **Keep CI green** - don't release with failing tests

---

## 📚 Related Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide
- [.github/workflows/release.yml](./.github/workflows/release.yml) - Release workflow source

---

**Questions?** Open a [Discussion](https://github.com/NikhilVerma/vue-tsgo/discussions)
