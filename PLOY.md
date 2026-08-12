# Porting this template from the Vercel AI Gateway to Ploy

This fork runs [shadcn-ui/chatbot-template](https://github.com/shadcn-ui/chatbot-template)
on [Ploy](https://meetploy.com) with [Ploy AI](https://docs.meetploy.com/features/ai)
instead of the Vercel AI Gateway.

The app code is **unchanged**. Ploy registers its own gateway as the AI SDK
default provider, so bare model ids (`streamText({ model: "anthropic/claude-sonnet-5" })`)
resolve through Ploy, and provider-native web search keeps working. What is left
below is configuration plus two workarounds that have nothing to do with AI.

## 1. `ploy.yaml`

```yaml
kind: nextjs
ai: true
```

`kind: nextjs` tells Ploy to build the app with `opennextjs-cloudflare` and run
it on Ploy's workerd runtime. `ai: true` injects `PLOY_AI_URL` and
`PLOY_AI_TOKEN` into the deployment and wires Ploy's gateway in as the AI SDK
default provider, so no provider API keys live in the app.

No build command is set, so Ploy runs the Next.js build itself.

## 2. Model ids

Ploy AI resolves models in `provider/model` form, plus `auto`. The template's two
models (`anthropic/claude-sonnet-5`, `openai/gpt-5.6-terra`) are valid as-is;
`auto` was added to the list. The full catalog is at
<https://api.llmgateway.io/v1/models>.

Note that `auto` gets no web search: [`tools/web_search.ts`](tools/web_search.ts)
keys the provider-native search tool off the `openai/` and `anthropic/` id
prefixes.

## 3. Local development

`pnpm dev` runs `ploy dev`, which injects the same AI credentials locally.
`pnpm dev:next` still runs plain `next dev` if you'd rather set `PLOY_AI_URL` /
`PLOY_AI_TOKEN` yourself. `@meetploy/cli` was added as a dev dependency.

## 4. GitHub tool: send a `User-Agent`

Not an AI change — a runtime difference. `fetch()` in workerd sends no
`User-Agent` header at all, while Node's `fetch` always sends one. GitHub rejects
UA-less requests with a 403, so the `github_repo` tool returned "Could not find
repository" for every lookup on Ploy while working fine on Vercel.

[`tools/github_repo.ts`](tools/github_repo.ts) now sends a `User-Agent`, reports
the upstream status instead of assuming 404, and honours an optional
`GITHUB_TOKEN` to lift the unauthenticated rate limit.

## 5. `__name is not defined` workaround

Ploy builds the Next.js server with `opennextjs-cloudflare` + `wrangler`, and
wrangler's esbuild step runs with `keepNames: true`. That rewrites function
bodies to call `__name(...)`. `next-themes` inlines its no-flash theme script by
stringifying a function (`fn.toString()`), so those `__name(...)` calls get
serialized into the HTML and throw `ReferenceError: __name is not defined` in
the browser — the pre-hydration theme never applies and the page flashes the
wrong theme.

[`app/layout.tsx`](app/layout.tsx) defines a no-op `window.__name` in `<head>`
before that script runs. This is a bundler-level issue affecting any
`opennextjs-cloudflare` app that inlines stringified functions, not something
specific to this template.

## Not changed

- `app/api/chat/route.ts` — apart from one comment, identical to upstream.
- The model resolution, the tools, all UI components, the message-part
  rendering, and the `ask_user` human-in-the-loop flow.
- Dependencies: same AI SDK packages as upstream.

## Requirements

Ploy AI requires a **Pro plan** on the organization; requests from free-plan
organizations are rejected with a 403.
