# Contributing to Eleva

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/eleva.git`
3. Install dependencies: `pnpm install`
4. Copy `.env.example` to `.env.local` and fill in required values
5. Start the dev server: `pnpm dev`

## Development Guidelines

### Code Style

- TypeScript strict mode is enabled — use proper types
- Server Components by default; `'use client'` only when interactivity is needed
- Use `async/await` over `.then()`
- Import types with `type` prefix: `import type { Foo } from './bar'`
- Prefer `interface` over `type` for object types
- Avoid enums; use `const` objects or string unions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes nor adds
- `chore:` — build process, tooling, dependencies
- `docs:` — documentation only
- `perf:` — performance improvement
- `security:` — security fix

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm lint` and `pnpm typecheck` — both must pass
4. Run `pnpm build` — must succeed
5. If you added tests, run `pnpm test`
6. Submit a PR with a clear description of the change

### Architecture Notes

- AI provider routing lives in `src/lib/ai/provider/`
- All AI operations must go through `AIProvider` in `src/lib/eleva-ai-provider.ts`
- Server actions go in `src/utils/actions/`
- API routes go in `src/app/api/` or `src/app/eleva/api/`
- Database migrations go in `supabase/migrations/`
