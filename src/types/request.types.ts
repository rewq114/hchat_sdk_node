// 통합 요청 타입
export interface UnifiedRequest {
  model: string;
  system: string;
  content: UnifiedContent;
  mcpServers?: string[];
  thinking?: boolean;
}

export interface UnifiedContent {
  text: string;
  images?: string[]; // base64 or URLs
  files?: Array<{
    name: string;
    content: string;
  }>;
} // 사용자가 Client에 요청할 때 사용하는 타입 (편의성 제공)
export interface ChatRequest {
  model: string;
  system: string;
  content: string | RequestMessage[]; // string도 받을 수 있도록 변경
  stream?: boolean;
  thinking?: boolean;
  max_tokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  advanced?: any;
}

// Provider에 전달될 때 사용하는 타입 (명확한 타입)
export interface ProviderChatRequest {
  model: string;
  system: string;
  content: RequestMessage[]; // 반드시 RequestMessage[] 타입
  stream?: boolean;
  thinking?: boolean;
  max_tokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  advanced?: any;
}
export interface RequestMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageContent[];
  tool_call_id?: string; // tool response를 위한 ID
  tool_calls?: any[]; // assistant가 tool을 호출할 때 필요
}

export interface MessageContent {
  type: "text" | "image";
  text?: string;
  image_url?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: object;
  };
}
