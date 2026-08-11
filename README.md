# Chatbot Template

A minimal chatbot template built with Next.js, the [AI SDK](https://ai-sdk.dev), [shadcn/ui](https://ui.shadcn.com), [shadcn/react](https://ui.shadcn.com/docs/react/message-scroller), [shadcn/typeset](https://ui.shadcn.com/docs/typeset) and [Ploy AI](https://docs.meetploy.com/features/ai).

This is a fork of [shadcn-ui/chatbot-template](https://github.com/shadcn-ui/chatbot-template) ported from the Vercel AI Gateway to [Ploy](https://meetploy.com). See [PLOY.md](PLOY.md) for exactly what changed.

## Features

- Streaming chat with markdown rendering and shadcn/typeset
- Tool calling example
- Optional web search tool (needs a Tavily API key — see Configuration)
- Human-in-the-loop questionnaire. The model can ask clarifying questions, answered with the shadcn questionnaire component

## Deploy

Push the repository to GitHub and create a project from it in the [Ploy dashboard](https://meetploy.com). The [`ploy.yaml`](ploy.yaml) in the repo root is all the configuration needed:

```yaml
kind: nextjs
ai: true
```

`ai: true` injects `PLOY_AI_URL` and `PLOY_AI_TOKEN` into the deployment, so the app talks to Ploy's OpenAI-compatible AI gateway without carrying any provider API keys. Usage is billed to your Ploy organization, which needs a Pro plan for AI access.

## Local development

```bash
pnpm install
```

Ploy injects the AI credentials in development too, so run the app through the Ploy CLI:

```bash
pnpm ploy login
pnpm dev
```

`pnpm dev` runs `ploy dev`, which starts Next.js with the Ploy bindings attached. If your checkout is not linked to a deployed project and you belong to multiple organizations, set `PLOY_DEV_AI_PROJECT_ID` to a project in the target organization.

To run plain `next dev` instead, use `pnpm dev:next` and set `PLOY_AI_URL` / `PLOY_AI_TOKEN` yourself in `.env.local`.

## Configuration

| Env var             | Required | Description                                                                             |
| ------------------- | -------- | --------------------------------------------------------------------------------------- |
| `PLOY_AI_URL`       | Injected | Ploy AI gateway base URL. Injected automatically by `ai: true`.                          |
| `PLOY_AI_TOKEN`     | Injected | Per-deployment Ploy AI token. Injected automatically by `ai: true`.                      |
| `TAVILY_API_KEY`    | No       | Enables the `web_search` tool. Without it the tool is not registered and search is off.  |

The model list lives in [lib/models.ts](lib/models.ts) — the first entry is the default model. Model ids use the gateway's `provider/model` format (e.g. `anthropic/claude-sonnet-5`), plus `auto` to let the gateway pick.

## Security

The `/api/chat` route is **public and unauthenticated** — every request spends your Ploy AI credits. That's fine for a personal demo, but before putting it in front of real traffic you should:

- **Rate limit it.** Add a rate limiter (e.g. [`@upstash/ratelimit`](https://github.com/upstash/ratelimit-js), or Ploy's cache binding) so a single client can't drain your credits (denial-of-wallet).
- **Cap spend.** Watch AI usage in the Ploy dashboard and keep organization credits bounded as a backstop.
- **Add auth** if the chatbot isn't meant to be public. [Ploy Auth](https://docs.meetploy.com/features/auth) is one option.

The route already validates the request body, restricts models to [lib/models.ts](lib/models.ts), caps output tokens and step count, and aborts generation on client disconnect — but those bound a single request, not overall volume.

## How it works

- [app/api/chat/route.ts](app/api/chat/route.ts) streams responses with `streamText`
- [components/chat.tsx](components/chat.tsx) renders the conversation with `useChat` and shadcn chat primitives.
- [tools/](tools) defines the tools — one file per tool (the filename is the model-facing tool name), composed in [tools/index.ts](tools/index.ts): a server-executed GitHub repo lookup, the interactive `ask_user` questionnaire, and an optional server-executed web search.

## Tool parts

Assistant messages are a list of typed parts. [components/chat-message.tsx](components/chat-message.tsx) switches on `part.type` and delegates each one to a component in [components/parts/](components/parts):

| Part type          | Component                                                          | Renders                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`             | [text-part.tsx](components/parts/text-part.tsx)                   | Markdown via react-markdown and shadcn/typeset.                                                                                                |
| `tool-github_repo` | [github-repo-part.tsx](components/parts/github-repo-part.tsx)     | A spinner while the lookup runs, then a linked stat line (stars, forks, language).                                                             |
| `tool-web_search`  | [web-search-part.tsx](components/parts/web-search-part.tsx)       | A "Searching the web…" status while the search runs, then a persistent "Searched the web" line per search.                                     |
| `tool-ask_user`    | [ask-user-part.tsx](components/parts/ask-user-part.tsx)           | The answered questions inline. Pending questions render in [question-card.tsx](components/question-card.tsx), pinned to the scroller bottom.   |
| `source-url`       | [sources-part.tsx](components/parts/sources-part.tsx)             | Web search citations, deduped into a "Searched N websites" drawer once the message finishes streaming.                                         |

Tool parts move through states as the stream progresses — `input-streaming` → `input-available` → `output-available` (or `output-error`) — and each component switches on `part.state` to show progress, results, and failures.

### Adding your own tool

1. Create `tools/<name>.ts` (the filename is the model-facing tool name) exporting a `tool()` with a `description`, an `inputSchema`, and an `execute` function (omit `execute` for tools the user answers in the UI, like `ask_user`), then register it in [tools/index.ts](tools/index.ts).
2. Add a part component in [components/parts/](components/parts) and a `case "tool-<name>"` in [chat-message.tsx](components/chat-message.tsx).

Message types are inferred from the tool definitions via `InferUITools`, so `part.input` and `part.output` are fully typed in your part component — renaming a tool field is a build error, not a silent `undefined`.

## Adding components

```bash
npx shadcn@latest add button
```

## License

MIT — see [LICENSE](LICENSE).
