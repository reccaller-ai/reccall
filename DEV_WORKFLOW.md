# Development Workflow

## Manual Review Process

This project uses a **manual review workflow** where:

- ✅ **No auto-approval** - All PRs require manual review
- ✅ **Pre-commit checks** - Run `./scripts/pre-commit.sh` before raising PRs
- ✅ **CI validation** - All CI checks must pass
- ✅ **Code quality** - TypeScript compilation and tests must pass

## Pre-commit Checklist

Before raising a PR, ensure:

1. **Type Check**: `npm run type-check`
2. **Build**: `npm run build`
3. **Tests**: `npm test`
4. **Pre-commit Script**: `./scripts/pre-commit.sh`

## Raising PRs

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Run pre-commit checks: `./scripts/pre-commit.sh`
4. Commit changes: `git add . && git commit -m "feat: your feature"`
5. Push branch: `git push origin feature/your-feature`
6. Create PR with manual review requirement
7. Wait for manual approval before merge

## Auto-merge with Manual Approval

- PRs require **manual approval** via `/approve` command from admins
- Once approved with `/approve`, PRs will be **auto-merged when all checks pass**
- **Failing checks prevent auto-merge** even with `/approve` command
- Reviewers must explicitly approve changes with `/approve` comment
- Maintainers have full control over merge process
- Auto-merge only happens when:
  - ✅ Admin has approved the PR
  - ✅ Admin has commented `/approve`
  - ✅ All CI checks are passing
  - ✅ All required status checks are green
