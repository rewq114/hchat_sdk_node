// src/providers/gemini/index.ts
import { BaseProvider } from "../base.provider";
import { ProviderChatRequest, StreamChunk, ChatCompletion } from "../../types";
import { parseSSEStream } from "../../utils/sse-parser";
import { GeminiInputConverter } from "./input.converter";
import { GeminiOutputConverter } from "./output.converter";
import { GeminiErrorHandler } from "./error.handler";
import { GeminiResponse } from "./types";

export class GeminiProvider extends BaseProvider {
  async chat(request: ProviderChatRequest): Promise<ChatCompletion> {
    const endpoint = `${this.baseUrl}/models/${request.model}:generateContent?key=${this.config.apiKey}`;
    const geminiBody = this.convertToProviderInputformat(request);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GeminiResponse;
      return GeminiOutputConverter.toCompletion(data, request.model);
    } catch (error: any) {
      this.log("Error in Gemini chat:", error);
      throw this.handleError(error);
    }
  }

  async *stream(request: ProviderChatRequest): AsyncIterable<StreamChunk> {
    const endpoint = `${this.baseUrl}/models/${request.model}:streamGenerateContent?key=${this.config.apiKey}`;
    const geminiBody = this.convertToProviderInputformat(request);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      for await (const data of parseSSEStream(response)) {
        // Gemini API가 'data: ' 접두사 없이 JSON을 직접 반환하는 경우
        if (typeof data === "string" && data.startsWith("{")) {
          const parsed = JSON.parse(data);
          const chunk = GeminiOutputConverter.toStreamChunk(
            parsed,
            request.model
          );
          if (chunk) yield chunk;
        } else {
          const chunk = GeminiOutputConverter.toStreamChunk(
            data,
            request.model
          );
          if (chunk) yield chunk;
        }
      }
    } catch (error: any) {
      this.log("Error in Gemini stream:", error);
      throw this.handleError(error);
    }
  }

  protected convertToProviderInputformat(request: ProviderChatRequest): any {
    return GeminiInputConverter.toGeminiFormat(request);
  }

  private handleError(error: any): Error {
    GeminiErrorHandler.logError(error, this.config.debug || false);
    return GeminiErrorHandler.handle(error);
  }
}
