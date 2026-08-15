# Eleva — AI Career Operating System

One workspace for an entire job search: paste a job description, and Eleva parses it, scores your resume, tailors it with an **honest-AI** constraint, shows you the diff, and tracks the application.

## Why it exists

Job search tooling either keyword-stuffs your resume or hands you a generic "AI rewrite" that fabricates experience. Eleva is built around a multi-stage pipeline that rewrites only what your real experience supports — and proves it with a structured ATS-style analysis.

## Features

- **ATS parser simulation** — weighted keyword, formatting, and recruiter-signal analysis, not a keyword-count blender.
- **Multi-stage tailoring workflow** — paste JD → match analysis → tailored resume → review diff → apply & track.
- **Honest AI constraints** — rewrites may restructure and re-emphasize *supported* facts only. Employers, titles, projects, degrees, and metrics must exist in the resume. Nothing is invented.
- **Provider-agnostic LLM routing** — requests route across providers with automatic fallback; rate limits fail over instead of failing the workflow.
- **Application kanban** — every application tracked from first touch to offer/rejection.

## Architecture

```
job description / URL
   │
   ▼
[ATS parse + match analysis]
   │
   ▼
[resume tailoring] ── grounded in real experience only
   │
   ▼
[review diff] ── every change shown with a why
   │
   ▼
[apply + track] ── kanban board
```

## Metrics

| Metric | Value |
| --- | --- |
| ATS score lift | 61 → 91 on the demo resume |
| Keyword gaps fixed | 4 |
| Facts fabricated | 0 |
| Eval coverage | every rewrite diff-reviewed for fabrication |
| Provider failover paths | 3× |

*The eval numbers above come from manual review — replace with your harness output (e.g., LLM-as-judge on fabrication + ATS score deltas).*

## Tech stack

- **Frontend**: Next.js, TypeScript, React, Tailwind CSS
- **Backend**: Next.js API routes / Supabase (auth, storage, Postgres)
- **AI**: LLM APIs with provider routing + fallback
- **Deployment**: Vercel

## Getting started

```bash
git clone https://github.com/chandu954/Eleva
cd Eleva
npm install
cp .env.example .env.local   # Supabase + LLM provider keys
npm run dev
```

## Roadmap

- [ ] LLM-as-judge eval harness for fabrication rate
- [ ] PDF resume upload (parse real layouts)
- [ ] Job tracker sync with email/linkedin exports

## Links

- Live demo: [eleva-beige.vercel.app/eleva](https://eleva-beige.vercel.app/eleva)
