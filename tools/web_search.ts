import { tool } from "ai"
import { z } from "zod"

// Provider-native web search (openai.tools.webSearch / anthropic.tools.webSearch)
// is not available through Ploy's OpenAI-compatible chat completions gateway,
// so web search is a normal server-executed tool here. It is only registered
// when TAVILY_API_KEY is set; without it the model just answers without search.
export const webSearch = tool({
  description:
    "Search the web for current information. Use this when the answer depends on recent events or facts you are unsure about.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  outputSchema: z.union([
    z.object({ error: z.string() }),
    z.object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
        })
      ),
    }),
  ]),
  execute: async ({ query }, { abortSignal }) => {
    const timeout = AbortSignal.timeout(10000)
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, timeout])
      : timeout

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({ query, max_results: 5 }),
        signal,
      })

      if (!res.ok) {
        return { error: `Web search failed with status ${res.status}.` }
      }

      const data = (await res.json()) as {
        results?: { title?: string; url?: string; content?: string }[]
      }

      return {
        results: (data.results ?? []).map((result) => ({
          title: String(result.title ?? ""),
          url: String(result.url ?? ""),
          content: String(result.content ?? ""),
        })),
      }
    } catch {
      return { error: `Could not search the web for "${query}".` }
    }
  },
})

export function getWebSearch() {
  return process.env.TAVILY_API_KEY ? webSearch : undefined
}
