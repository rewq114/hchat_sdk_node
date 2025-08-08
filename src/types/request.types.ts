import { Message, ToolDefinition } from './message.types';

export interface ChatRequest {
  // 필수
  model: string;
  messages: Message[];
  
  // 공통 옵션
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  
  // Tool calling
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  
  // Response format
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: Record<string, any>;
  };
  
  // 프로바이더별 고급 설정
  advanced?: {
    openai?: {
      seed?: number;
      logit_bias?: Record<string, number>;
      logprobs?: boolean;
      top_logprobs?: number;
    };
    claude?: {
      reasoning?: boolean;
      metadata?: {
        user_id?: string;
      };
    };
    gemini?: {
      thinking_mode?: boolean;
      thinking_budget?: number;
      safety_settings?: Array<{
        category: string;
        threshold: string;
      }>;
    };
  };
}