// src/client.ts
import {
  ChatRequest,
  ProviderChatRequest,
  HChatConfig,
  MCPManager,
  ChatCompletion,
  RequestMessage,
} from "./types";
import { BaseProvider } from "./providers/base.provider";
import { OpenAIProvider } from "./providers/openai";
import { ClaudeProvider } from "./providers/claude";
import { GeminiProvider } from "./providers/gemini";
import { getModelProvider } from "./utils/model";

export class HChat {
  private providers: Map<string, BaseProvider> = new Map();
  private mcpManager?: MCPManager;

  constructor(private config: HChatConfig, mcpManager?: MCPManager) {
    this.config = config;
    this.mcpManager = mcpManager;
    this.initProviders();
  }

  private initProviders() {
    this.providers.set("openai", new OpenAIProvider(this.config));
    this.providers.set("claude", new ClaudeProvider(this.config));
    this.providers.set("gemini", new GeminiProvider(this.config));
  }

  async chat(request: ChatRequest): Promise<ChatCompletion> {
    const providerName = getModelProvider(request.model);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not found for model: ${request.model}`);
    }
    if (request.tools === undefined) {
      request.tools = [];
    }

    // 기능 지원 여부는 서버가 판단하도록 함
    // 클라이언트는 에러 발생 시 적절한 가이드만 제공

    // content가 string인 경우 RequestMessage[]로 변환
    const normalizedContent = this.normalizeContent(request.content);

    const providerRequest: ProviderChatRequest = {
      model: request.model,
      system: request.system,
      content: normalizedContent, // 이제 확실히 RequestMessage[] 타입
      stream: request.stream ? request.stream : false, // 기본 false
      thinking: request.thinking ? request.thinking : false, // 기본 false
      max_tokens: request.max_tokens ? request.max_tokens : 4096,
      temperature: request.temperature ? request.temperature : 0.7,
      tools: request.tools.length > 0 ? request.tools : undefined,
      advanced: request.advanced ? request.advanced : undefined,
    };
    try {
      return await provider.chat(providerRequest);
    } catch (error) {
      this.log(`Error in chat: ${error}`);
      // Provider에서 이미 처리된 에러를 그대로 전달
      throw error;
    }
  }

  /**
   * 통합 스트림 인터페이스
   */
  async *stream(request: ChatRequest): AsyncIterable<string> {
    // 1. Provider 선택
    const providerName = getModelProvider(request.model);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not found for model: ${request.model}`);
    }
    if (request.tools === undefined) {
      request.tools = [];
    }

    // 기능 지원 여부는 서버가 판단하도록 함

    // content가 string인 경우 RequestMessage[]로 변환
    const normalizedContent = this.normalizeContent(request.content);

    // 2. Provider 요청 생성
    const providerRequest: ProviderChatRequest = {
      model: request.model,
      system: request.system,
      content: normalizedContent, // 이제 확실히 RequestMessage[] 타입
      stream: request.stream ? request.stream : false, // 기본 false
      thinking: request.thinking ? request.thinking : false, // 기본 false
      max_tokens: request.max_tokens ? request.max_tokens : 4096,
      temperature: request.temperature ? request.temperature : 0.7,
      tools: request.tools.length > 0 ? request.tools : undefined,
      advanced: request.advanced ? request.advanced : undefined,
    };

    // 추후 chat이냐 stream이냐에 따라 분기 수행

    try {
      for await (const chunk of provider.stream(providerRequest)) {
        // OpenAI SDK의 chunk 형식에 맞게 처리
        if (chunk.choices?.[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }

        // Tool call 처리
        if (chunk.choices?.[0]?.delta?.tool_calls) {
          if (this.config.debug) {
            console.log(
              "Tool call detected:",
              chunk.choices[0].delta.tool_calls
            );
          }
        }
      }
    } catch (error) {
      this.log(`Error in stream: ${error}`);
      // Provider에서 이미 처리된 에러를 그대로 전달
      throw error;
    }
  }
  private log(...args: any[]) {
    if (this.config.debug) {
      console.log("[HChat]", ...args);
    }
  }
  /**
   * content를 RequestMessage[] 형식으로 정규화
   */
  private normalizeContent(
    content: string | RequestMessage[]
  ): RequestMessage[] {
    if (typeof content === "string") {
      return [
        {
          role: "user",
          content: content,
        },
      ];
    }
    return content;
  }
}
