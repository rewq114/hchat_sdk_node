import { BaseProvider } from './base.provider';
import { 
  ChatRequest, 
  ChatResponse, 
  StreamChunk,
  Message,
  HChatAPIError 
} from '../types';

export class GeminiProvider extends BaseProvider {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.log('Chat request:', request.model);
    
    try {
      const geminiParams = this.convertToGeminiFormat(request);
      const endpoint = `${this.baseUrl}/models/${request.model}:generateContent?key=${this.config.apiKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiParams)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return this.normalizeResponse(result, request.model);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.log('Stream request:', request.model);
    
    try {
      const geminiParams = this.convertToGeminiFormat(request);
      const endpoint = `${this.baseUrl}/models/${request.model}:streamGenerateContent?key=${this.config.apiKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiParams)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      // Gemini는 Server-Sent Events 형식
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No response body');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              yield this.normalizeChunk(parsed, request.model);
            } catch (e) {
              // JSON 파싱 에러 무시
            }
          }
        }
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private convertToGeminiFormat(request: ChatRequest): any {
    const contents = this.convertMessages(request.messages);
    const systemInstruction = this.extractSystemInstruction(request.messages);
    
    const params: any = {
      contents,
    };

    // System instruction
    if (systemInstruction) {
      params.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Generation config
    const generationConfig: any = {};
    if (request.max_tokens) generationConfig.maxOutputTokens = request.max_tokens;
    if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
    if (request.top_p !== undefined) generationConfig.topP = request.top_p;
    if (request.stop) {
      generationConfig.stopSequences = Array.isArray(request.stop) 
        ? request.stop : [request.stop];
    }

    // Thinking 모드 (Gemini 2.0)
    if (request.advanced?.gemini?.thinking_mode) {
      generationConfig.thinkingConfig = {
        thinkingBudget: request.advanced.gemini.thinking_budget || 10000
      };
    }

    if (Object.keys(generationConfig).length > 0) {
      params.generationConfig = generationConfig;
    }

    // Tools
    if (request.tools) {
      params.tools = [{
        functionDeclarations: request.tools.map(tool => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters
        }))
      }];
    }

    // Safety settings
    if (request.advanced?.gemini?.safety_settings) {
      params.safetySettings = request.advanced.gemini.safety_settings;
    }

    return params;
  }

  private convertMessages(messages: Message[]): any[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: this.convertContent(msg.content)
      }));
  }

  private convertContent(content: any): any[] {
    if (typeof content === 'string') {
      return [{ text: content }];
    }
    
    if (Array.isArray(content)) {
      return content.map(item => {
        if (item.type === 'text') {
          return { text: item.text };
        } else if (item.type === 'image') {
          return {
            inlineData: {
              mimeType: 'image/jpeg',
              data: item.image_url.url.split(',')[1]
            }
          };
        }
        return item;
      });
    }
    
    return [{ text: String(content) }];
  }

  private extractSystemInstruction(messages: Message[]): string | null {
    const systemMsg = messages.find(m => m.role === 'system');
    if (!systemMsg) return null;
    
    return typeof systemMsg.content === 'string' 
      ? systemMsg.content 
      : systemMsg.content[0].text;
  }

  private normalizeResponse(response: any, model: string): ChatResponse {
    const candidate = response.candidates?.[0];
    const content = candidate?.content?.parts?.[0];
    const functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall);
    
    const toolCalls = functionCall ? [{
      id: this.createId(),
      type: 'function' as const,
      function: {
        name: functionCall.functionCall.name,
        arguments: JSON.stringify(functionCall.functionCall.args)
      }
    }] : undefined;

    return {
      id: this.createId(),
      object: 'chat.completion',
      created: this.getCurrentTimestamp(),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content?.text || '',
          tool_calls: toolCalls
        },
        finish_reason: this.mapFinishReason(candidate?.finishReason)
      }],
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: response.usageMetadata?.totalTokenCount || 0,
        thinking_tokens: response.usageMetadata?.thinkingTokenCount
      },
      metadata: {
        provider: 'gemini',
        thinking_tokens: response.usageMetadata?.thinkingTokenCount,
        thinking_content: response.candidates?.[0]?.thinkingContent
      }
    };
  }

  private normalizeChunk(chunk: any, model: string): StreamChunk {
    const candidate = chunk.candidates?.[0];
    const content = candidate?.content?.parts?.[0];
    
    return {
      id: this.createId(),
      object: 'chat.completion.chunk',
      created: this.getCurrentTimestamp(),
      model: model,
      choices: [{
        index: 0,
        delta: {
          content: content?.text || ''
        },
        finish_reason: candidate?.finishReason ? 
          this.mapFinishReason(candidate.finishReason) : null
      }]
    };
  }

  private mapFinishReason(reason: string): any {
    switch (reason) {
      case 'STOP': return 'stop';
      case 'MAX_TOKENS': return 'length';
      case 'SAFETY': return 'content_filter';
      default: return 'stop';
    }
  }

  private handleError(error: any): HChatAPIError {
    return new HChatAPIError(
      'server_error',
      error.message,
      500,
      'gemini',
      error
    );
  }
}