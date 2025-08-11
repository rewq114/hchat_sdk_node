// src/providers/openai.provider.ts
import { AzureOpenAI } from "openai";
import { BaseProvider } from "./base.provider";
import {
  ProviderChatRequest,
  StreamChunk,
  RequestMessage,
  ChatCompletion,
} from "../types";

export class OpenAIProvider extends BaseProvider {
  private client: AzureOpenAI;

  constructor(config: any) {
    super(config);

    this.client = new AzureOpenAI({
      endpoint: this.baseUrl,
      apiKey: this.config.apiKey,
      apiVersion: "2024-10-21",
    });
  }
  async chat(request: ProviderChatRequest): Promise<ChatCompletion> {
    try {
      const openAIParams = this.convertToProviderInputformat(request);

      const response = await this.client.chat.completions.create({
        ...openAIParams,
        stream: false,
      });

      return this.convertOpenAICompletion(response, request.model);
    } catch (error: any) {
      this.log("Error in OpenAI chat:", error);
      throw this.handleError(error);
    }
  }

  async *stream(request: ProviderChatRequest): AsyncIterable<StreamChunk> {
    try {
      const openAIParams = this.convertToProviderInputformat(request);

      // 스트림을 명시적으로 생성
      const response = this.client.chat.completions.create({
        ...openAIParams,
        stream: true,
      });

      // response가 Stream인지 확인하고 처리
      const stream = await response; // @ts-ignore (타입 체크 우회)
      for await (const chunk of stream) {
        // OpenAI SDK는 이미 StreamChunk 형식으로 반환함
        yield chunk as StreamChunk;
      }
    } catch (error: any) {
      this.log("Error in GPT stream:", error);
      throw this.handleError(error);
    }
  }

  protected convertToProviderInputformat(request: ProviderChatRequest): any {
    const params: any = {
      model: request.model,
      instructions: request.system,
      messages: this.convertMessages(request.content),
      max_tokens: request.max_tokens || 1000,
      temperature: request.temperature || 0.7,
    };

    // Tools 처리
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools;
    }

    // 고급 설정 적용
    if (request.advanced?.openai) {
      Object.assign(params, request.advanced.openai);
    }

    // undefined 값 제거
    return Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined)
    );
  }

  private convertMessages(messages: RequestMessage[]): any[] {
    // 메시지 형식 변환 (필요한 경우)
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return msg;
      }

      // 멀티모달 메시지 처리
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.map((item: any) => {
            if (item.type === "text") {
              return { type: "text", text: item.text };
            } else if (item.type === "image") {
              return {
                type: "image_url",
                image_url: item.image_url,
              };
            }
            return item;
          }),
        };
      }

      return msg;
    });
  }

  private convertOpenAICompletion(
    response: any,
    model: string
  ): ChatCompletion {
    return {
      id: response.id,
      object: "chat.completion",
      created: response.created,
      model: model,
      choices: response.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        },
        finish_reason: choice.finish_reason,
      })),
      usage: response.usage,
    };
  }

  private handleError(error: any): Error {
    const status = error.status || 500;
    let message = error.message || "Unknown error";

    if (status === 401) {
      message = "Invalid API key";
    } else if (status === 429) {
      message = "Rate limit exceeded";
    } else if (status === 400) {
      message = "Invalid request";
    }

    this.log("OpenAI API Error:", { status, message, error });

    return new Error(`OpenAI API Error (${status}): ${message}`);
  }
}
