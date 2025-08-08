import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.provider';
import { 
  ChatRequest, 
  ChatResponse, 
  StreamChunk,
  Message,
  HChatAPIError 
} from '../types';

export class ClaudeProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: any) {
    super(config);
    
    // Interceptor를 사용한 URL 재작성
    this.client = new Anthropic({
      apiKey: 'dummy', // 실제 키는 fetch interceptor에서 사용
      fetch: this.createHChatFetch()
    });
  }

  private createHChatFetch() {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      
      // Anthropic URL을 H-Chat URL로 변경
      const hChatUrl = url.replace(
        'https://api.anthropic.com/v1',
        `${this.baseUrl}/claude`
      );
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', this.config.apiKey);
      
      const newInit = {
        ...init,
        headers
      };
      
      this.log('Claude API call:', hChatUrl);
      
      return fetch(hChatUrl, newInit);
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.log('Chat request:', request.model);
    
    try {
      const claudeParams = this.convertToClaudeFormat(request);
      const response = await this.client.messages.create(claudeParams);
      
      return this.normalizeResponse(response, request.model);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.log('Stream request:', request.model);
    
    try {
      const claudeParams = this.convertToClaudeFormat(request);
      claudeParams.stream = true;
      
      const stream = await this.client.messages.create(claudeParams);
      
      for await (const chunk of stream) {
        yield this.normalizeChunk(chunk, request.model);
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private convertToClaudeFormat(request: ChatRequest): any {
    // System 메시지 분리
    const systemMessage = request.messages.find(m => m.role === 'system');
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');
    
    const params: any = {
      model: request.model,
      messages: this.convertMessages(nonSystemMessages),
      max_tokens: request.max_tokens || 1000,
      temperature: request.temperature,
      top_p: request.top_p,
      stop_sequences: Array.isArray(request.stop) ? request.stop : 
                      request.stop ? [request.stop] : undefined,
      stream: false,
    };

    // System 메시지 처리
    if (systemMessage) {
      params.system = typeof systemMessage.content === 'string' 
        ? systemMessage.content 
        : systemMessage.content[0].text;
    }

    // Tool 처리
    if (request.tools) {
      params.tools = request.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      }));
    }

    // 고급 설정
    if (request.advanced?.claude) {
      if (request.advanced.claude.reasoning) {
        // Claude의 reasoning 모드 활성화
        params.metadata = {
          ...params.metadata,
          ...request.advanced.claude.metadata
        };
      }
    }

    return params;
  }

  private convertMessages(messages: Message[]): any[] {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: this.convertContent(msg.content)
    }));
  }

  private convertContent(content: any): any {
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      return content.map(item => {
        if (item.type === 'text') {
          return { type: 'text', text: item.text };
        } else if (item.type === 'image') {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: item.image_url.url.split(',')[1]
            }
          };
        }
        return item;
      });
    }
    
    return content;
  }

  private normalizeResponse(response: any, model: string): ChatResponse {
    const content = response.content || [];
    const textContent = content.find((c: any) => c.type === 'text')?.text || '';
    const toolCalls = content
      .filter((c: any) => c.type === 'tool_use')
      .map((c: any) => ({
        id: c.id,
        type: 'function' as const,
        function: {
          name: c.name,
          arguments: JSON.stringify(c.input)
        }
      }));

    return {
      id: this.createId(),
      object: 'chat.completion',
      created: this.getCurrentTimestamp(),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: textContent,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined
        },
        finish_reason: this.mapFinishReason(response.stop_reason)
      }],
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: (response.usage?.input_tokens || 0) + 
                     (response.usage?.output_tokens || 0)
      },
      metadata: {
        provider: 'claude',
        cache_tokens: response.usage?.cache_creation_input_tokens
      }
    };
  }

  private normalizeChunk(chunk: any, model: string): StreamChunk {
    // Claude 스트림 청크 변환
    const delta: any = {};
    
    if (chunk.type === 'content_block_delta') {
      if (chunk.delta?.text) {
        delta.content = chunk.delta.text;
      }
    }

    return {
      id: this.createId(),
      object: 'chat.completion.chunk',
      created: this.getCurrentTimestamp(),
      model: model,
      choices: [{
        index: 0,
        delta,
        finish_reason: chunk.type === 'message_stop' ? 'stop' : null
      }]
    };
  }

  private mapFinishReason(stopReason: string): any {
    switch (stopReason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_calls';
      default: return 'stop';
    }
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
      'claude',
      error
    );
  }
}