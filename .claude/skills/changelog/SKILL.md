---
name: changelog
description: Auto-analyzes changes and generates commits/releases. Just accept or reject.
disable-model-invocation: true
argument-hint: [commit|release|full|status]
---

# Changelog Workflow Helper - FULLY AUTOMATED

This skill automates the entire changelog workflow from analyzing changes to creating commits and releases. Claude makes ALL decisions automatically - you just approve or reject.

## How to use

Invoke with: `/changelog [action]`

**Available actions:**

- `commit` - Analyze changes, auto-generate commit message, and create commit
- `release` - Analyze commits, auto-detect version bump, and create release
- `full` - Do both commit AND release in one flow (complete automation)
- `status` - Show git status, recent commits, current version, and suggested actions
- (no action) - Show this help message

---

## Auto-Commit Workflow

When user requests `/changelog commit`:

1. Check if there are staged changes (`git diff --cached --stat`)
   - If no staged changes: automatically stage all changes (`git add .`)
2. Run `git diff --cached` to analyze actual changes
3. **Intelligently auto-detect commit type**:
   - **feat**: New files with significant logic, new API endpoints, new components, new features
   - **fix**: Error handling added, bug-related keywords (fix, error, bug, issue, prevent, handle), corrections, typos
   - **docs**: Changes to .md files, README, comments only (no code logic)
   - **style**: Formatting, indentation, imports reorganization (no logic changes)
   - **refactor**: Code restructuring without behavior change, extracting functions, renaming
   - **test**: Changes to test files, **tests** directories, jest.config
   - **build**: Changes to build config (next.config, webpack, tsconfig)
   - **ci**: CI/CD config files, github actions, workflow files
   - **perf**: Performance optimizations, lazy loading, caching improvements
   - **chore**: Dependencies update, config files, maintenance tasks
4. **Auto-generate scope** from the most common path in changed files:
   - `app/components/map/*` → "map"
   - `app/api/geocode/*` → "api" or "geocode"
   - `app/store/slices/*` → "store" or specific slice name
   - `app/components/search/*` → "search"
   - Root files or mixed paths → no scope (empty)
5. **Auto-generate subject** - Keep it SHORT and SIMPLE:
   - Use imperative mood (add, fix, update, remove, refactor)
   - Keep under 40 characters
   - Use lowercase
   - Be concise - no elaborate explanations
6. **Present to user** for accept/reject ONLY:

   ```
   => Proposed commit:

   ╭──────────────────────────────────────╮
   │  feat(map): add marker clustering     │
   ╰──────────────────────────────────────╯

   => Files: 5 changed  ↕ +200, -15

   => Changed Files:
   - app/components/map/MapContainer.tsx
   - app/store/slices/mapSlice.ts
   - app/hooks/useMapCluster.ts

   Accept this commit? (y/n/s to suggest changes)
   ```

7. If yes: run `git commit -m "generated message"` with proper formatting
8. If no: ask what to change - show options:
   - 1. Change type (feat/fix/docs/etc.)
   - 2. Change scope
   - 3. Edit subject
   - User picks one, make ONE adjustment, then present again
9. After commit: show the commit hash and offer to proceed with release

**CRITICAL: Auto-generate EVERYTHING. Only ask for final confirmation. NEVER ask user to provide type, scope, or subject.**

---

## Auto-Release Workflow

When user requests `/changelog release`:

1. Run `git status` to check for uncommitted changes
   - If uncommitted changes exist: warn and ask to commit first (`/changelog commit`)
2. Get current version from `package.json`
3. Run `git log --oneline $(git describe --tags --abbrev=0)..HEAD` to see commits since last release
4. **Intelligently auto-detect version bump type**:
   - Check commit messages for "BREAKING CHANGE" or '!' after scope → **MAJOR**
   - Check for `feat:` commits → **MINOR**
   - Check for `fix:`, `perf:`, `refactor:` commits → **PATCH**
   - If only `docs:`, `test:`, `chore:`, `style:` → warn user, suggest patch or skip
5. **Present to user** for accept/reject ONLY:

   ```
   => Proposed Release

   ╭──────────────────────────────────────╮
   │  Version: 2.6.0 → 2.7.0 (minor bump)  │
   ╰──────────────────────────────────────╯

   => Commits since last release:
   [OK] abc1234 feat(map): add marker clustering
   [OK] def5678 fix(api): handle timeout errors
   [OK] efa8901 docs(readme): update examples

   ───────────────────────────────────
   CHANGELOG preview (new entries):

   ### Features
   * add marker clustering (abc1234)

   ### Bug Fixes
   * handle timeout errors (def5678)

   ### Documentation
   * update installation examples (efa8901)

   Accept this release? (y/n/v to change version type)
   ```

6. If yes: run `npm run release` and show the results (new version, tag, changelog)
7. If no: offer quick options:
   - 1. Force major bump
   - 2. Force minor bump
   - 3. Force patch bump
   - User picks one, execute immediately
8. After release: show new version, tag, and offer to push (`git push origin main --follow-tags`)

**CRITICAL: Auto-detect version from commits. Only ask for confirmation.**

---

## Full Workflow (Commit + Release)

When user requests `/changelog full`:

This is the complete hands-off workflow. Claude does everything, user just approves at each stage.

1. **Stage 1: Commit**

   - Check for changes (staged and unstaged)
   - If unstaged changes exist: automatically stage all changes (`git add .`)
   - Analyze changes and auto-generate commit message
   - Present commit for approval
   - If approved: create commit
   - If rejected: allow adjustment, then present again

2. **Stage 2: Release** (only after commit is done)

   - Get current version and analyze all commits since last release
   - Auto-detect version bump type
   - Present release with changelog preview
   - If approved: create release (version bump, changelog update, tag)
   - If rejected: allow version type change

3. **Stage 3: Push** (optional, only after release)
   - Offer to push commits and tags to remote
   - If approved: `git push origin main --follow-tags`

**Flow example:**

```
=> Proposed commit:

╭──────────────────────────────────────╮
│  feat(map): add marker clustering     │
╰──────────────────────────────────────╯

=> Files: 5 changed  ↕ +200, -15

Accept commit? (y/n) > y

[OK] Commit created: abc1234

=> Proposed Release

╭──────────────────────────────────────╮
│  Version: 2.6.0 → 2.7.0 (minor bump)  │
╰──────────────────────────────────────╯

=> Commits since last release:
[OK] abc1234 feat(map): add marker clustering

Accept release? (y/n) > y

[OK] Release created: v2.7.0
[OK] Changelog updated
[OK] Tag created: v2.7.0

Push to remote? (y/n) > y

[OK] Pushed to origin/main with tags
```

**CRITICAL: This is FULLY AUTOMATED. Claude makes ALL decisions, user only confirms.**

---

## Status Check

When user requests `/changelog status`:

1. Run `git status` (show branch, staged, unstaged, untracked files)
2. Get current version from `package.json`
3. Get latest tag from git
4. Run `git log --oneline -10` to show recent commits
5. **Show comprehensive summary**:

   ```
   => Repository Status

   Branch: main
   Version: 2.6.0
   Latest Tag: v2.6.0

   => Working Directory:
   - 5 files staged
   - 2 files unstaged
   - 1 untracked file

   => Recent Commits (last 10):
   - abc1234 feat(map): add clustering (2 hours ago)
   - def5678 fix(api): timeout handling (5 hours ago)
   - efa8901 docs(readme): update examples (1 day ago)

   => Suggested Action:
   -> Run /changelog commit to create a commit from staged changes
   ```

**If uncommitted changes**: suggest `/changelog commit`
**If unpushed commits**: suggest `/changelog release`
**If everything clean**: suggest "Ready for new work"

---

## Advanced Commit Detection Rules

When analyzing changes, use these intelligent patterns:

### Type Detection Priority Order

1. **Check for breaking changes**:

   - '!' after scope in any commit → 'feat!' or 'fix!'
   - "BREAKING CHANGE:" in commit body
   - Removal of deprecated APIs, major rewrites

2. **Check for new features**:

   - New component files (`*.tsx`, `*.jsx`)
   - New API routes (`app/api/*/route.ts`)
   - New Redux slices
   - New hooks with significant logic
   - Functionality that didn't exist before

3. **Check for bug fixes**:

   - Keywords: fix, error, bug, issue, prevent, handle, catch, resolve, correct
   - Error handling additions (try/catch blocks)
   - Bug fix related variable names (bug, fix, issue)
   - Reverting problematic changes

4. **Check for documentation**:

   - Only `.md` files changed
   - Only comments changed (no code logic)
   - README, CONTRIBUTING, CHANGELOG updates

5. **Check for style changes**:

   - Only formatting changes (indentation, spacing)
   - Import reorganization (no logic changes)
   - Semicolon, quote style changes
   - Prettier/eslint auto-format

6. **Check for refactoring**:

   - Code restructuring without behavior change
   - Function extraction/renaming
   - Variable renaming across files
   - File moves/reorganization

7. **Check for performance**:

   - Keywords: optimize, performance, lazy, cache, memo, defer, async
   - Code splitting, lazy loading
   - Memoization additions
   - Performance-related improvements

8. **Check for tests**:

   - `__tests__` directories
   - `*.test.*`, `*.spec.*` files
   - `jest.config.js`, `vitest.config.ts`
   - Test utility files

9. **Check for build**:

   - `next.config.*`, `webpack.config.*`, `vite.config.*`
   - `tsconfig.json`, `.d.ts` files
   - Build scripts in `package.json`

10. **Check for CI**:

    - `.github/workflows/*`
    - `.gitlab-ci.yml`, `Dockerfile`
    - CI/CD configuration files

11. **Default to chore**:
    - Dependencies update
    - Config file changes
    - Maintenance tasks

### Smart Scope Detection

Extract scope from file paths with this priority:

| File Pattern              | Scope                                 |
| ------------------------- | ------------------------------------- |
| `app/components/map/*`    | `map`                                 |
| `app/components/search/*` | `search`                              |
| `app/api/*`               | `api` or subdirectory name            |
| `app/store/slices/*`      | Slice name (e.g., `mapSlice` → `map`) |
| `app/hooks/*`             | `hooks`                               |
| `app/lib/*`               | `lib`                                 |
| `app/utils/*`             | `utils`                               |
| `app/types/*`             | `types`                               |
| `public/*`                | `assets`                              |
| Root config files         | no scope                              |

**Mixed paths**: Use the most common path, or no scope if evenly distributed

### Subject Generation Patterns

Keep commits SHORT - under 40 characters:

| Change Type | Simple Verbs       |
| ----------- | ------------------ |
| New feature | add, create        |
| Bug fix     | fix, resolve       |
| Update      | update, improve    |
| Removal     | remove, delete     |
| Refactor    | refactor, simplify |
| Style       | format, clean      |
| Docs        | update, add        |

**Subject templates:**

- New component: "add [ComponentName]"
- Bug fix: "fix [issue]"
- Update: "update [feature]"
- Remove: "remove [feature]"
- Refactor: "refactor [module]"

**Keep under 40 chars, lowercase, simple.**

---

## Troubleshooting

### Commit hooks not running

```bash
npx husky init
chmod +x .husky/commit-msg
chmod +x .husky/pre-commit
```

### No changes to commit

- Run `/changelog status` to check git state
- `/changelog commit` will automatically stage unstaged changes

### Wrong version detected

- Use manual override: `/changelog release:major` or `/changelog release:minor`
- Or adjust with option v when prompted

### Commitizen/Husky errors

```bash
npm install -D commitizen cz-conventional-changelog standard-version husky
npx husky init
```

---

## Example Workflows

### Example 1: New Feature + Release

```bash
# User: /changelog commit

=> Proposed commit:

╭──────────────────────────────────────╮
│  feat(map): add marker clustering     │
╰──────────────────────────────────────╯

=> Files: 3 changed  ↕ +120, -15

=> Changed Files:
- app/components/map/MapContainer.tsx
- app/hooks/useMapCluster.ts
- app/store/slices/mapSlice.ts

Accept this commit? (y/n) > y

[OK] Commit created: abc1234 feat(map): add marker clustering
```

Then run `/changelog release` to create the release.

### Example 2: Bug Fix

```bash
# User: /changelog commit

=> Proposed commit:

╭──────────────────────────────────────╮
│  fix(api): handle timeout errors      │
╰──────────────────────────────────────╯

=> Files: 2 changed  ↕ +25, -5

=> Changed Files:
- app/api/geocode/route.ts
- app/lib/apiClient.ts

Accept this commit? (y/n) > y

[OK] Commit created: def5678 fix(api): handle timeout errors
```

### Example 3: Full Workflow (One Command)

```bash
# User: /changelog full

=> Proposed commit:

╭──────────────────────────────────────╮
│  docs(readme): update installation     │
╰──────────────────────────────────────╯

=> Files: 1 changed  ↕ +15, -3

Accept commit? (y/n) > y

[OK] Commit created: xyz1234 docs(readme): update installation

=> Proposed Release

╭──────────────────────────────────────╮
│  Version: 2.6.0 → 2.6.1 (patch bump)  │
╰──────────────────────────────────────╯

=> Commits since last release:
[OK] xyz1234 docs(readme): update installation

Accept release? (y/n) > y

[OK] Release created: v2.6.1
[OK] Changelog updated
[OK] Tag created: v2.6.1

Push to remote? (y/n) > y

[OK] Pushed to origin/main with tags
```

---

## Quick Reference

| Command              | What It Does                              |
| -------------------- | ----------------------------------------- |
| `/changelog`         | Show help message                         |
| `/changelog status`  | Show git status, version, recent commits  |
| `/changelog commit`  | Auto-generate commit from changes         |
| `/changelog release` | Auto-detect version and create release    |
| `/changelog full`    | Commit + Release + Push (full automation) |

---

## Pro Tips

1. **Trust Claude's decisions** - It analyzes changes intelligently
2. **Use `/changelog full`** for complete hands-off workflow
3. **Check `/changelog status`** before starting work
4. **Release frequently** - Small, frequent releases are better
5. **Keep commits short** - Under 40 characters, be concise
6. **Review before accepting** - You always see what will be committed/released

---

**Remember**: Claude makes ALL the decisions automatically. You just approve or reject. No need to specify commit types, scopes, or versions manually!
