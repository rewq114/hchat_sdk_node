import { TokenUsage, FinishReason, ModelProvider } from './base.types';
import { ToolCall } from './message.types';

// 일반 응답
export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  
  choices: Array<{
    index: number;
    message: AssistantMessage;
    finish_reason: FinishReason;
    logprobs?: any;
  }>;
  
  usage: TokenUsage;
  
  metadata?: {
    provider: ModelProvider;
    thinking_tokens?: number;
    thinking_content?: string;
    cache_tokens?: number;
  };
}

export interface AssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
  refusal?: string;
}

// 스트리밍 응답
export interface StreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  
  choices: Array<{
    index: number;
    delta: ChunkDelta;
    finish_reason?: FinishReason | null;
  }>;
  
  usage?: TokenUsage;
}

export interface ChunkDelta {
  role?: 'assistant';
  content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: 'function';
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  refusal?: string;
}