# MASTER RULES FOR CHURNPULSE — ALWAYS FOLLOW

Stack: SvelteKit 5 (runes mode), Vite, TypeScript (strict), NO React, NO Next.js.
Runtime: Node 20+, Bun preferred for installs.
Styling: Tailwind CSS v4 (CSS-first config, no tailwind.config.js), custom CSS vars for brand tokens.
DB: Supabase (Postgres + RLS + realtime). Use @supabase/ssr for server-side auth.
Auth: Clerk (SvelteKit SDK). Never roll custom auth.
Payments: Stripe SDK v14+. Always verify webhook signatures with stripe.webhooks.constructEvent().
Email: Resend SDK. Never use nodemailer.
Jobs: Trigger.dev v3 SDK.
AI: Anthropic SDK (@anthropic-ai/sdk). Model: claude-sonnet-4-5.
SMS: Twilio SDK (only on Growth/Pro plan checks).

TypeScript rules:

- strict: true in tsconfig. No `any` ever — use `unknown` and narrow.
- All Supabase queries must use generated types from `src/lib/types/supabase.ts`.
- All env vars accessed only through `src/lib/env.ts` — never `import.meta.env.VITE_*` inline.
- All server-only secrets in `$env/static/private` — never in `$env/static/public`.

Security rules:

- Every API route (+server.ts) must validate request body with Zod before touching DB.
- Every Stripe webhook endpoint must verify signature before processing.
- Row-Level Security on EVERY Supabase table — no exceptions.
- Never log secrets, tokens, or PII to console.
- CSRF protection via SvelteKit's built-in form actions where applicable.
- Rate-limit all public API endpoints (use upstash/ratelimit or simple in-memory for MVP).
- Sanitize all user-facing strings — never dangerously set innerHTML.

File structure rules:

- Routes: src/routes/(app)/ for auth-required, src/routes/(marketing)/ for public.
- Server logic: src/lib/server/ — never import server modules in client components.
- Shared types: src/lib/types/
- Utilities: src/lib/utils/
- Constants: src/lib/constants.ts
- Brand/theme: src/lib/theme.ts

SEO rules:

- Every page exports `const metadata` with title, description, og:image.
- Use SvelteKit's <svelte:head> for per-page meta.
- Sitemap at /sitemap.xml via +server.ts.
- robots.txt at /robots.txt.
- Core Web Vitals: no layout shift, images with explicit width/height, fonts preloaded.

Never output placeholder comments like "// TODO" or "// implement later".
Every function must be fully implemented. No stubs.
