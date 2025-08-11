// src/providers/claude/index.ts
import { BaseProvider } from "../base.provider";
import { ProviderChatRequest, StreamChunk, ChatCompletion } from "../../types";
import { parseSSEStream } from "../../utils/sse-parser";
import { ClaudeInputConverter } from "./input.converter";
import { ClaudeOutputConverter } from "./output.converter";
import { ClaudeErrorHandler } from "./error.handler";
import { ClaudeResponse } from "./types";

export class ClaudeProvider extends BaseProvider {
  private outputConverter: ClaudeOutputConverter;

  constructor(config: any) {
    super(config);
    // 인스턴스별로 output converter 생성 (스트림 상태 관리를 위해)
    this.outputConverter = new ClaudeOutputConverter();
  }

  async chat(request: ProviderChatRequest): Promise<ChatCompletion> {
    try {
      const claudeParams = this.convertToProviderInputformat(request);

      const response = await fetch(`${this.baseUrl}/claude/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.config.apiKey,
        },
        body: JSON.stringify({
          ...claudeParams,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as any;

      // 디버깅
      if (this.config.debug) {
        if (request.thinking) {
          this.log("Claude thinking response:", JSON.stringify(data, null, 2));
        }
        if (request.tools) {
          this.log("Claude tool response:", JSON.stringify(data, null, 2));
        }
      }

      return ClaudeOutputConverter.toCompletion(data, request.model);
    } catch (error: any) {
      this.log("Error in Claude chat:", error);
      throw this.handleError(error);
    }
  }

  async *stream(request: ProviderChatRequest): AsyncIterable<StreamChunk> {
    try {
      const claudeParams = this.convertToProviderInputformat(request);

      const response = await fetch(`${this.baseUrl}/claude/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.config.apiKey,
        },
        body: JSON.stringify({
          ...claudeParams,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      for await (const data of parseSSEStream(response)) {
        const chunk = this.outputConverter.toStreamChunk(data, request.model);
        if (chunk) yield chunk;
      }
    } catch (error: any) {
      this.log("Error in Claude stream:", error);
      throw this.handleError(error);
    }
  }

  protected convertToProviderInputformat(request: ProviderChatRequest): any {
    return ClaudeInputConverter.toClaudeFormat(request);
  }

  private handleError(error: any): Error {
    ClaudeErrorHandler.logError(error, this.config.debug || false);
    return ClaudeErrorHandler.handle(error);
  }
}
