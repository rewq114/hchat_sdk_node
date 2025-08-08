export interface HChatError extends Error {
  code: ErrorCode;
  status?: number;
  provider?: "openai" | "claude" | "gemini";
  details?: any;
  retry_after?: number;
}

export type ErrorCode =
  | "invalid_api_key"
  | "invalid_model"
  | "rate_limit_exceeded"
  | "context_length_exceeded"
  | "content_filter"
  | "server_error"
  | "network_error"
  | "invalid_request";

export class HChatAPIError extends Error implements HChatError {
  constructor(
    public code: ErrorCode,
    message: string,
    public status?: number,
    public provider?: "openai" | "claude" | "gemini",
    public details?: any,
    public retry_after?: number
  ) {
    super(message);
    this.name = "HChatAPIError";
  }
}
