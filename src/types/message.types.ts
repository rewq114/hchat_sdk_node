// 메시지 역할
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

// 콘텐츠 타입들
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  image_url: {
    url: string;  // URL or base64
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface DocumentContent {
  type: 'document';
  document: {
    source: string;
    content?: string;
  };
}

export type MessageContent = string | TextContent | ImageContent | DocumentContent;

// 메시지
export interface Message {
  role: MessageRole;
  content: MessageContent | MessageContent[];
  name?: string;         // Tool calling에서 사용
  tool_call_id?: string; // Tool response에서 사용
}

// Tool 정의
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;  // JSON Schema
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON string
  };
}