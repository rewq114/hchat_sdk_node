// src/providers/openai/index.ts
import { AzureOpenAI } from "openai";
import { BaseProvider } from "../base.provider";
import { ProviderChatRequest, StreamChunk, ChatCompletion } from "../../types";
import { OpenAIInputConverter } from "./input.converter";
import { OpenAIOutputConverter } from "./output.converter";
import { OpenAIErrorHandler } from "./error.handler";

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

      return OpenAIOutputConverter.toCompletion(response, request.model);
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
      const stream = await response;
      // @ts-ignore (타입 체크 우회)
      for await (const chunk of stream) {
        yield OpenAIOutputConverter.toStreamChunk(chunk);
      }
    } catch (error: any) {
      this.log("Error in OpenAI stream:", error);
      throw this.handleError(error);
    }
  }

  protected convertToProviderInputformat(request: ProviderChatRequest): any {
    return OpenAIInputConverter.toOpenAIFormat(request);
  }

  private handleError(error: any): Error {
    OpenAIErrorHandler.logError(error, this.config.debug || false);
    return OpenAIErrorHandler.handle(error);
  }
}
