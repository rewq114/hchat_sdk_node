// OpenAI 관련 타입 정의
export interface OpenAIRequestParams {
  model: string;
  instructions: string;
  messages: any[];
  max_tokens?: number;
  temperature?: number;
  tools?: any[];
  stream?: boolean;
  [key: string]: any; // advanced 설정을 위한 추가 필드
}

export interface OpenAIError {
  status?: number;
  message?: string;
  code?: string;
  type?: string;
}