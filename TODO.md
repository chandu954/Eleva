## Eleva: OpenRouter FREE-only + centralized AIProvider

### Step 0 — Repo audit (done)
- Located direct OpenRouter calls and provider bypasses.

### Step 1 — Enforce FREE-only model selection in centralized provider
- File: `src/lib/eleva-ai-provider.ts`
- Remove/disable any Pro model selection (`plan: 'pro'`, `forcePro`, `PRO_MODEL_CHAIN`)
- Ensure model chain only uses `FREE_MODEL_CHAIN` and rejects/normalizes any non-free model IDs
- (If missing) add explicit timeout handling and keep retry(3), caching, structured output, streaming, logging.

### Step 2 — Fix `/api/chat` to be free-only
- File: `src/app/api/chat/route.ts`
- Remove duplicate `AIProvider` import
- Force `aiConfig` to `plan: 'free'` always

### Step 3 — Remove direct OpenRouter streaming from tool routes
- File: `src/app/eleva/api/tool/draft/route.ts`
- File: `src/app/eleva/api/tool/rewrite/route.ts`
- Replace `createOpenAI/streamText` usage with `AIProvider.stream()`

### Step 4 — Remove direct OpenRouter fetch from prompt optimization
- File: `src/app/eleva/prompt-studio/api/optimize/route.ts`
- Replace `fetch('openrouter.ai/...')` with `AIProvider.generateObject()` returning JSON

### Step 5 — Replace prompt-studio `_lib/actions.ts` OpenRouter fetch
- File: `src/app/eleva/prompt-studio/_lib/actions.ts`
- Replace `fetch('openrouter.ai/...')` in `runPrompt()` and `optimizePrompt()` with centralized provider calls
- Remove hardcoded Anthropic model defaults that may not be free

### Step 6 — Re-audit for any remaining OpenRouter direct calls
- Re-run regex search for:
  - `openrouter.ai/api/v1/chat/completions`
  - `createOpenAI(`
  - `model: '...` where models include non-free variants
- Fix any remaining violations.

### Step 7 — Test & smoke check
- Run lint/test
- Smoke test streaming + JSON endpoints:
  - `/api/chat`
  - `/eleva/api/tool/draft`
  - `/eleva/api/tool/rewrite`
  - `/eleva/prompt-studio/api/optimize`
