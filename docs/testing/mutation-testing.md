# Targeted mutation testing

Run the manual Stryker assessment with:

```bash
pnpm test:mutation
```

The current profile uses Stryker 10.1.1 with the Vitest runner and checks these
high-risk modules:

- `src/app/eleva/api/studio/pipeline/cache.ts`
- `src/app/eleva/api/studio/pipeline/helpers.ts`
- `src/lib/rateLimiter.ts`

The pipeline route tests are selected when they cover these modules, but the
route handler itself is not mutation-instrumented. Static initialization
mutants are excluded because they accounted for most of the estimated runtime;
the reported score therefore applies only to the evaluated non-static mutants.
This manual run is not a pull-request CI gate.

## Latest recorded run

Run on 2026-10-28 with 267 related Vitest tests:

| Module | Mutation score | Killed | Survived | No coverage |
| --- | ---: | ---: | ---: | ---: |
| `cache.ts` | 86.00% | 43 | 7 | 0 |
| `helpers.ts` | 71.40% | 312 | 99 | 26 |
| `rateLimiter.ts` | 84.21% | 32 | 6 | 0 |
| **Overall** | **73.71%** | **387** | **112** | **26** |

No mutants timed out or errored. The overall score includes mutants with no
coverage in the denominator. Treat this as a dated baseline; rerun the command
after changing the targeted modules or their tests.
