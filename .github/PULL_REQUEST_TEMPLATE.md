## Description

Describe the changes and the motivation behind them.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Performance
- [ ] Security
- [ ] Infrastructure

## Testing

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm coverage` passes (new/changed logic is covered)
- [ ] `pnpm test:e2e` passes when public routing, auth redirects, or health checks change
- [ ] `terraform fmt -check`, `validate`, TFLint, and Checkov pass when `terraform/` changes
- [ ] Manual testing completed

## Test-paired change

Every behavior change should include its co-located test file in the same
commit (for example `src/lib/foo.ts` + `src/lib/foo.test.ts`). If a test is not
practical, explain why here:

<!-- reason -->

## Related Issues

Closes #

## Screenshots (if applicable)
