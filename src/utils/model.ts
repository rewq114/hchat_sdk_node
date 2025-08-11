export type ModelProvider = "openai" | "claude" | "gemini";

export function getModelProvider(model: string): ModelProvider {
  const lowerModel = model.toLowerCase();

  if (lowerModel.startsWith("gpt-")) {
    return "openai";
  } else if (lowerModel.startsWith("claude-")) {
    return "claude";
    // return "openai";
  } else if (lowerModel.startsWith("gemini-")) {
    return "gemini";
  }

  throw new Error(`Unknown model provider for: ${model}`);
}
