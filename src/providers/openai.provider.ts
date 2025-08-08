import { AzureOpenAI } from 'openai';
import { BaseProvider } from './base.provider';
import { 
  ChatRequest, 
  ChatResponse, 
  StreamChunk, 
  HChatAPIError 
} from '../types';

export class OpenAIProvider extends BaseProvider {
  private client: AzureOpenAI;

  constructor(config: any) {
    super(config);
    
    this.client = new AzureOpenAI({
      endpoint: this.baseUrl,
      apiKey: this.config.apiKey,
      apiVersion: '2024-10-21'
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.log('Chat request:', request.model);
    
    try {
      const openAIParams = this.convertToOpenAIFormat(request);
      const response = await this.client.chat.completions.create(openAIParams);
      
      return this.normalizeResponse(response, request.model);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.log('Stream request:', request.model);
    
    try {
      const openAIParams = this.convertToOpenAIFormat(request);
      openAIParams.stream = true;
      
      const stream = await this.client.chat.completions.create(openAIParams);
      
      for await (const chunk of stream) {
        yield this.normalizeChunk(chunk);
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private convertToOpenAIFormat(request: ChatRequest): any {
    const params: any = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stop: request.stop,
      stream: false,
      tools: request.tools,
      tool_choice: request.tool_choice,
      response_format: request.response_format,
    };

    // 고급 설정 적용
    if (request.advanced?.openai) {
      Object.assign(params, request.advanced.openai);
    }

    // undefined 제거
    return Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined)
    );
  }

  private normalizeResponse(response: any, model: string): ChatResponse {
    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created,
      model: model,
      choices: response.choices,
      usage: response.usage,
      metadata: {
        provider: 'openai'
      }
    };
  }

  private normalizeChunk(chunk: any): StreamChunk {
    return chunk as StreamChunk;
  }

  private handleError(error: any): HChatAPIError {
    const status = error.status || 500;
    let code: any = 'server_error';
    
    if (status === 401) code = 'invalid_api_key';
    else if (status === 429) code = 'rate_limit_exceeded';
    else if (status === 400) code = 'invalid_request';
    
    return new HChatAPIError(
      code,
      error.message,
      status,
      'openai',
      error
    );
  }
}