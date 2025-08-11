// src/types/response.type.ts
export interface StreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: ChunkDelta;
    finish_reason?: string | null;
  }>;
  usage?: any;
}

export interface ChunkDelta {
  role?: "assistant";
  content?: string;
  thinking?: string; // 새로 추가
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}
export interface ChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<Choice>;
  usage?: Usage;

  // 편의를 위한 shortcuts (choices[0] 접근)
  message: ResponseMessage; // choices[0].message
  content: string; // choices[0].message.content
  thinking?: string; // choices[0].message.thinking
  tool_calls?: ToolCall[]; // choices[0].message.tool_calls
  finish_reason: FinishReason | null; // choices[0].finish_reason
}
export interface Choice {
  index: number;
  message: ResponseMessage;
  finish_reason: FinishReason | null;
}

export interface ResponseMessage {
  role: "assistant";
  content: string;
  thinking?: string; // thinking 내용
  tool_calls?: Array<ToolCall>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  thinking_tokens?: number; // Gemini/Claude thinking용
}

export type FinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "function_call";
