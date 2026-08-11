// Models available through Ploy AI. See https://api.llmgateway.io/v1/models for
// the full catalog — ids use the `provider/model` format, plus `auto` which
// lets the gateway pick a model.
export const MODELS = [
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5" },
  { id: "openai/gpt-5.6-terra", name: "GPT 5.6 Terra" },
  { id: "auto", name: "Auto" },
]

export const DEFAULT_MODEL = MODELS[0].id

export interface GatewayModel {
  id: string
  name: string
}

export function isModelAllowed(id: string) {
  return MODELS.some((model) => model.id === id)
}
