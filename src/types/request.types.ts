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
}

export interface ChatRequest {
  model: string;
  system: string;
  content: Message[];
  stream?: boolean;
  thinking?: boolean;
  max_tokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  advanced?: any;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageContent[];
  tool_call_id?: string;
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
  name: string;
  description: string;
  parameters?: object;
}
