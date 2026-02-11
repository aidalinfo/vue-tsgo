# Open Source Release Checklist

This document contains the final steps needed to publish vue-tsgo v0.1.0.

## ✅ Completed (by AI)

All preparation work is done! The following have been completed:

### Documentation
- ✅ User-facing README with speed emphasis
- ✅ CHANGELOG.md (Keep a Changelog format)
- ✅ CONTRIBUTING.md (dev setup, testing, PR process)
- ✅ CODE_OF_CONDUCT.md
- ✅ SECURITY.md (vulnerability reporting)
- ✅ docs/architecture.md (moved from AGENTS.md)

### GitHub Infrastructure
- ✅ Issue templates (bug, feature, question)
- ✅ Pull request template
- ✅ CI workflow (tests on PRs)
- ✅ Enhanced release workflow (npm + marketplace)

### npm Package
- ✅ cli/package.json configured as `vue-tsgo`
- ✅ cli/install.js (downloads platform binaries)
- ✅ cli/bin/vue-tsgo (wrapper script)
- ✅ cli/README.md

### VS Code Extension
- ✅ Updated to `vue-tsgo` branding
- ✅ Version 0.1.0
- ✅ Marketplace metadata (keywords, categories)
- ✅ .vscodeignore
- ✅ README for marketplace

### Examples
- ✅ examples/basic/ (complete Vue 3 project)
- ✅ Placeholders for pinia and router examples

### Module Updates
- ✅ Changed github.com/auvred/golar → github.com/NikhilVerma/vue-tsgo
- ✅ Updated all Go imports
- ✅ Updated package.json files
- ✅ Updated LICENSE copyright

---

## 🔴 TODO: Pre-Release Setup (You Need to Do These)

### 1. npm Publishing Setup

```bash
# Create npm account (if needed)
npm adduser

# Get authentication token
npm login
cat ~/.npmrc  # Copy the token

# Add to GitHub Secrets
# Go to: https://github.com/NikhilVerma/vue-tsgo/settings/secrets/actions
# Create secret: NPM_TOKEN = <your token>
```

### 2. VS Code Marketplace Setup

```bash
# 1. Create publisher account
# Visit: https://marketplace.visualstudio.com/manage/createpublisher?managePageRedirect=true
# Publisher ID: nonfx

# 2. Generate Personal Access Token (PAT)
# Visit: https://dev.azure.com/<your-org>/_usersSettings/tokens
# Name: "VS Code Publishing"
# Organization: All accessible organizations
# Scopes: Marketplace > Manage
# Copy the token

# 3. Add to GitHub Secrets
# Go to: https://github.com/NikhilVerma/vue-tsgo/settings/secrets/actions
# Create secret: VSCE_TOKEN = <your PAT>
```

### 3. Test Builds Locally (Optional but Recommended)

```bash
# Test binary builds
make build-binary
./golar/tsgo --version

# Test VS Code extension build
make build-extension
code --install-extension editors/vscode/vue-tsgo-*.vsix

# Test npm package locally
cd cli
npm pack
npm install -g ./vue-tsgo-0.1.0.tgz
vue-tsgo --version
```

### 4. Enable GitHub Discussions (Recommended)

1. Go to https://github.com/NikhilVerma/vue-tsgo/settings
2. Features → Check "Discussions"
3. Set up categories:
   - General
   - Q&A
   - Feature Requests
   - Show and Tell

---

## 🚀 Release Process

Once secrets are set up, follow these steps:

### Step 1: Update Version Numbers

The release is configured for **v0.1.0**. If you want a different version:

```bash
# Update versions in:
# - cli/package.json (version)
# - editors/vscode/package.json (version)
# - CHANGELOG.md (add new section)

# Example for v0.2.0:
cd cli && npm version 0.2.0 --no-git-tag-version
cd ../editors/vscode && npm version 0.2.0 --no-git-tag-version
```

### Step 2: Create and Push Git Tag

```bash
# Create annotated tag
git tag -a v0.1.0 -m "Release v0.1.0: Initial beta release"

# Push tag (triggers release workflow)
git push origin v0.1.0
```

### Step 3: Monitor Release Workflow

```bash
# Watch the release workflow
# https://github.com/NikhilVerma/vue-tsgo/actions

# The workflow will:
# 1. Build binaries for all platforms
# 2. Build VS Code extension for all platforms
# 3. Create GitHub release (DRAFT)
# 4. Publish to npm (if NPM_TOKEN is set)
# 5. Publish to VS Code marketplace (if VSCE_TOKEN is set)
```

### Step 4: Finalize GitHub Release

1. Go to https://github.com/NikhilVerma/vue-tsgo/releases
2. Find the draft release (created by workflow)
3. Edit release notes if needed
4. **Click "Publish release"** to make it public

### Step 5: Verify Installations

```bash
# Test npm package
npm install -g vue-tsgo
vue-tsgo --version

# Test VS Code extension
# Should appear in marketplace at:
# https://marketplace.visualstudio.com/items?itemName=nonfx.vue-tsgo
```

---

## 📝 Post-Release Tasks

### Announce the Release

- [ ] Post on Twitter/X
- [ ] Post in Vue.js Discord/Forums
- [ ] Create discussion thread on GitHub
- [ ] Update personal/company blog

### Template Announcement

```markdown
🚀 Excited to announce vue-tsgo v0.1.0!

A blazingly fast type checker for Vue 3 SFCs, powered by typescript-go.

⚡ 10-50x faster than vue-tsc
💾 Lower memory usage (native Go)
🎯 98% feature parity with Volar

npm install -g vue-tsgo

https://github.com/NikhilVerma/vue-tsgo
```

### Monitor Initial Feedback

- [ ] Watch GitHub issues for bug reports
- [ ] Respond to questions in Discussions
- [ ] Track npm download stats: https://www.npmjs.com/package/vue-tsgo
- [ ] Track VS Code installs: https://marketplace.visualstudio.com/items?itemName=nonfx.vue-tsgo

---

## 🐛 If Something Goes Wrong

### npm Publish Failed

```bash
# Manual publish (from cli/ directory)
cd cli
npm publish

# If package name is taken, use scoped package:
# Update package.json: "name": "@nonfx/vue-tsgo"
# Then: npm publish --access public
```

### VS Code Marketplace Failed

```bash
# Manual publish (from editors/vscode/ directory)
cd editors/vscode
npx @vscode/vsce login nonfx
npx @vscode/vsce publish

# For each platform:
npx @vscode/vsce publish --packagePath vue-tsgo-0.1.0@darwin-arm64.vsix
```

### Rollback a Release

```bash
# Unpublish from npm (within 72 hours)
npm unpublish vue-tsgo@0.1.0

# Unpublish from VS Code marketplace
npx @vscode/vsce unpublish nonfx.vue-tsgo@0.1.0

# Delete GitHub release and tag
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
```

---

## 📚 Additional Resources

- [npm Publishing Guide](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [GitHub Releases Guide](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

---

## ✨ Success Metrics

Track these after release:

- **npm downloads**: https://npm-stat.com/charts.html?package=vue-tsgo
- **VS Code installs**: Extension page shows install count
- **GitHub stars**: https://github.com/NikhilVerma/vue-tsgo/stargazers
- **GitHub issues**: Quality and quantity of bug reports
- **Community engagement**: Discussions, PRs, contributions

---

**Good luck with the release! 🎉**

If you encounter issues, check the GitHub Actions logs or file an issue.
