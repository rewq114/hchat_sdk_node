import {
  HChatConfig, 
  ChatRequest, 
  ChatResponse, 
  StreamChunk,
  ModelProvider 
} from './types';
import { BaseProvider } from './providers/base.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { getModelProvider } from './utils/model';

export class HChat {
  private providers: Map<ModelProvider, BaseProvider>;
  private config: HChatConfig;

  constructor(config: HChatConfig) {
    this.config = config;
    this.providers = new Map();
    this.initProviders();
  }

  private initProviders() {
    this.providers.set('openai', new OpenAIProvider(this.config));
    this.providers.set('claude', new ClaudeProvider(this.config));
    this.providers.set('gemini', new GeminiProvider(this.config));
  }

  /**
   * 채팅 완성 생성
   */
  async generate(request: ChatRequest): Promise<ChatResponse> {
    const provider = this.getProvider(request.model);
    return provider.chat(request);
  }

  /**
   * 스트리밍 채팅
   */
  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const provider = this.getProvider(request.model);
    request.stream = true;
    
    for await (const chunk of provider.stream(request)) {
      yield chunk;
    }
  }

  /**
   * 간단한 텍스트 완성 (편의 메서드)
   */
  async complete(
    prompt: string, 
    options: Partial<ChatRequest> = {}
  ): Promise<string> {
    const request: ChatRequest = {
      model: options.model || 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      ...options
    };
    
    const response = await this.generate(request);
    return response.choices[0].message.content || '';
  }

  /**
   * 대화 계속하기 (편의 메서드)
   */
  async continue(
    messages: Array<any>,
    options: Partial<ChatRequest> = {}
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      model: options.model || 'gpt-4.1-mini',
      messages,
      ...options
    };
    
    return this.generate(request);
  }

  private getProvider(model: string): BaseProvider {
    const providerName = getModelProvider(model);
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider not found for model: ${model}`);
    }
    
    return provider;
  }
}