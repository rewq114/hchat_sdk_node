// Claude 관련 타입 정의
export interface ClaudeRequestParams {
  model: string;
  system: string;
  messages: any[];
  max_tokens?: number;
  temperature?: number;
  tools?: any[];
  tool_choice?: { type: string };
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  };
  stream?: boolean;
}

export interface ClaudeContentBlock {
  type: "text" | "thinking" | "tool_use";
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: any;
}

export interface ClaudeResponse {
  id: string;
  content: ClaudeContentBlock[];
  stop_reason: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    thinking_tokens?: number;
  };
}

export interface ClaudeStreamEvent {
  type: string;
  content_block?: any;
  delta?: any;
}