import { HChatConfig, ChatRequest, ChatResponse, StreamChunk } from '../types';

export abstract class BaseProvider {
  protected config: HChatConfig;
  protected baseUrl: string;

  constructor(config: HChatConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://h-chat-api.autoever.com/v2/api';
  }

  // 추상 메서드
  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract stream(request: ChatRequest): AsyncIterable<StreamChunk>;
  
  // 공통 유틸리티
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