import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// Ploy injects these into the deployment when `ai: true` is set in ploy.yaml.
// They point at Ploy's OpenAI-compatible gateway, so no provider keys are
// needed in the app itself. `ploy dev` injects them locally too.
function getGatewayCredentials() {
  const baseURL = process.env.PLOY_AI_URL
  const apiKey = process.env.PLOY_AI_TOKEN

  if (!baseURL || !apiKey) {
    throw new Error(
      "Ploy AI is not configured: PLOY_AI_URL / PLOY_AI_TOKEN are missing. " +
        "Set `ai: true` in ploy.yaml and run the app with `ploy dev` locally."
    )
  }

  return { baseURL, apiKey }
}

// Built per request: `process.env` is only populated once a request enters the
// worker, so a module-scope provider would capture undefined credentials.
export function ployAI(modelId: string) {
  const { baseURL, apiKey } = getGatewayCredentials()

  return createOpenAICompatible({
    name: "ploy",
    baseURL,
    apiKey,
  }).chatModel(modelId)
}
