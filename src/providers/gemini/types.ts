// Gemini 관련 타입 정의
export interface GeminiRequestParams {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
  };
  tools?: GeminiTool[];
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
    thoughtContent?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    functionCalls?: Array<{
      name: string;
      args: any;
    }>;
    finishReason?: string;
  }>;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    thinkingTokenCount?: number;
  };
}