import {
  ProviderChatRequest,
  StreamChunk,
  HChatConfig,
  ChatCompletion,
} from "../types";

export abstract class BaseProvider {
  protected config: HChatConfig;
  protected baseUrl: string;

  constructor(config: HChatConfig) {
    this.config = config;
    this.baseUrl = "https://h-chat-api.autoever.com/v2/api";
  }
  abstract chat(request: ProviderChatRequest): Promise<ChatCompletion>;

  // stream으로 응답할 줄 알아야 함
  abstract stream(request: ProviderChatRequest): AsyncIterable<StreamChunk>;

  // 입력된 값을 Provider에 맞게 변형해야함
  protected abstract convertToProviderInputformat(
    request: ProviderChatRequest
  ): any;

  // 출력된 값을 Abstract 가능하게 변형해야함

  protected log(...args: any[]) {
    if (this.config.debug) {
      console.log(`[${this.constructor.name}]`, ...args);
    }
  }

  protected createId(): string {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}
