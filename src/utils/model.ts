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

// export const MODEL_INFO = {
//   // OpenAI
//   "gpt-4.1": { provider: "openai", maxTokens: 4096 },
//   "gpt-4.1-mini": { provider: "openai", maxTokens: 4096 },
//   "gpt-4o": { provider: "openai", maxTokens: 4096 },
//   "gpt-4o-mini": { provider: "openai", maxTokens: 4096 },

//   // Claude
//   "claude-opus-4-1": { provider: "claude", maxTokens: 4096 },
//   "claude-opus-4": { provider: "claude", maxTokens: 4096 },
//   "claude-sonnet-4": { provider: "claude", maxTokens: 4096 },
//   // "claude-3-5-sonnet-v2": { provider: "claude", maxTokens: 8192 },

//   // Gemini
//   // "gemini-2.0-flash": { provider: "gemini", maxTokens: 8192 },
//   "gemini-2.5-flash": { provider: "gemini", maxTokens: 8192 },
//   "gemini-2.5-pro": { provider: "gemini", maxTokens: 8192 },
// };
