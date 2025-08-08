// 기본 설정
export interface HChatConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
}

// 모델 프로바이더
export type ModelProvider = 'openai' | 'claude' | 'gemini';

// 토큰 사용량
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  // 확장 필드
  prompt_cache_tokens?: number;  // Claude
  thinking_tokens?: number;      // Gemini/Claude
}

// 완료 이유
export type FinishReason = 
  | 'stop'           // 정상 완료
  | 'length'         // max_tokens 도달
  | 'tool_calls'     // Tool 호출
  | 'content_filter' // 콘텐츠 필터
  | 'refusal';       // 거부