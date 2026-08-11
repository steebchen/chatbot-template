# Porting this template from the Vercel AI Gateway to Ploy

This fork runs [shadcn-ui/chatbot-template](https://github.com/shadcn-ui/chatbot-template)
on [Ploy](https://meetploy.com) with [Ploy AI](https://docs.meetploy.com/features/ai)
instead of the Vercel AI Gateway. Everything below is the complete set of
changes — the UI, the chat streaming, and the tool-calling flow are untouched.

## 1. `ploy.yaml`

```yaml
kind: nextjs
ai: true
```

`kind: nextjs` tells Ploy to build the app with `opennextjs-cloudflare` and run
it on Ploy's workerd runtime. `ai: true` injects `PLOY_AI_URL` and
`PLOY_AI_TOKEN` into the deployment — per-deployment credentials for Ploy's
OpenAI-compatible AI gateway, so no provider API keys live in the app.

No build command is set, so Ploy runs the Next.js build itself.

## 2. Model resolution: gateway provider → Ploy AI provider

The original route passed a bare model id string to `streamText`:

```ts
const result = streamText({ model: modelId, ... })
```

A bare string makes the AI SDK resolve the model through its **default
provider**, which is the Vercel AI Gateway and needs `AI_GATEWAY_API_KEY` (or
Vercel OIDC). That is the one thing that cannot work off Vercel.

[`lib/ai.ts`](lib/ai.ts) replaces it with an OpenAI-compatible provider pointed
at Ploy's gateway:

```ts
createOpenAICompatible({ name: "ploy", baseURL: process.env.PLOY_AI_URL, apiKey: process.env.PLOY_AI_TOKEN })
  .chatModel(modelId)
```

The provider is constructed **per request**, not at module scope: on workerd,
`process.env` is only populated once a request enters the worker, so a
module-scope provider would capture `undefined` credentials.

Dependency changes: `@ai-sdk/gateway`, `@ai-sdk/openai` and `@ai-sdk/anthropic`
are removed; `@ai-sdk/openai-compatible` is added.

## 3. Web search: provider-native → optional server tool

The original `tools/web_search.ts` used the providers' built-in search tools
(`openai.tools.webSearch()` / `anthropic.tools.webSearch_20260209()`). Those are
provider-native features exposed through each vendor's own API surface, and they
do not exist on an OpenAI-compatible `/chat/completions` endpoint.

It is now a normal server-executed tool backed by [Tavily](https://tavily.com),
registered only when `TAVILY_API_KEY` is set. Without the key the tool is not
registered and the model simply answers without search — the rest of the app is
unaffected.

Consequence: assistant messages no longer emit `source-url` parts (those came
from provider-native search), so the "Searched N websites" drawer in
[`components/parts/sources-part.tsx`](components/parts/sources-part.tsx) stays
empty. The component is left in place for anyone wiring up their own citations.

## 4. Model ids

Ploy AI resolves models in `provider/model` form, plus `auto`. The template's
two models (`anthropic/claude-sonnet-5`, `openai/gpt-5.6-terra`) are valid as-is;
`auto` was added to the list. The full catalog is at
<https://api.llmgateway.io/v1/models>.

## 5. Local development

`pnpm dev` now runs `ploy dev`, which attaches the same AI bindings locally.
`pnpm dev:next` still runs plain `next dev` if you'd rather set `PLOY_AI_URL` /
`PLOY_AI_TOKEN` yourself. `@meetploy/cli` was added as a dev dependency.

## 6. `pnpm-workspace.yaml`

`esbuild` and `workerd` were added to `allowBuilds` — Ploy's build step installs
`@opennextjs/cloudflare` and `wrangler`, which need their postinstall scripts to
fetch platform binaries.

## Not changed

- All UI components, the message-part rendering, and the `ask_user`
  human-in-the-loop flow.
- The `github_repo` tool — tool calling works the same through Ploy AI.
- Request validation, the model allowlist, output-token and step caps.

## Requirements

Ploy AI requires a **Pro plan** on the organization; requests from free-plan
organizations are rejected with a 403.
