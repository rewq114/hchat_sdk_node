// src/providers/claude.provider.ts
import { BaseProvider } from "./base.provider";
import { ChatRequest, StreamChunk, Message } from "../types";
import { parseSSEStream } from "../utils/sse-parser";
export class ClaudeProvider extends BaseProvider {
  // TODO : 다듬기 필요
  private isInThinkingBlock = false;
  private thinkingStarted = false;

  async chat(request: ChatRequest): Promise<any> {
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

      const data: any = await response.json();

      return {
        content: data.content?.[0]?.text || data.message || "",
        usage: data.usage,
      };
    } catch (error: any) {
      this.log("Error in Claude chat:", error);
      throw this.handleError(error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
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
        // this.log("", data);
        const chunk = this.convertAnthropicChunk(data, request.model);

        if (chunk) yield chunk;
      }
    } catch (error: any) {
      this.log("Error in Claude stream:", error);
      throw this.handleError(error);
    }
  }

  protected convertToProviderInputformat(request: ChatRequest): any {
    const params: any = {
      model: request.model,
      system: request.system,
      messages: this.convertMessages(request.content),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
    };

    // Tool 처리
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools;
    }

    // 고급 설정 (Claude reasoning 등)
    if (request.thinking) {
      params.thinking = {
        type: "enabled",
        budget_tokens: request.max_tokens ? request.max_tokens / 2 : 4096,
      };
      params.temperature = 1;
    }

    return params;
  }

  private convertMessages(messages: Message[]): any[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: this.convertContent(msg.content),
    }));
  }

  private convertContent(content: any): any {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((item) => {
        if (item.type === "text") {
          return { type: "text", text: item.text };
        } else if (item.type === "image") {
          // base64 이미지 처리
          const base64Data = item.image_url.url.includes("base64,")
            ? item.image_url.url.split(",")[1]
            : item.image_url.url;

          return {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Data,
            },
          };
        }
        return item;
      });
    }

    return content;
  }

  private convertAnthropicChunk(event: any, model: string): StreamChunk | null {
    const delta: any = {};

    // thinking 블록 상태 추적 (클래스 변수로 선언 필요)
    if (!this.isInThinkingBlock) this.isInThinkingBlock = false;
    if (!this.thinkingStarted) this.thinkingStarted = false;

    if (event.type === "content_block_start") {
      if (event.content_block?.type === "thinking") {
        this.isInThinkingBlock = true;
        this.thinkingStarted = false;
        return null; // 시작 이벤트는 스킵
      }
      return null;
    }

    if (event.type === "content_block_stop") {
      if (this.isInThinkingBlock) {
        this.isInThinkingBlock = false;
        this.thinkingStarted = false;
        // thinking 블록 종료 마커
        delta.content = "</thinking>\n";
      } else {
        return null;
      }
    }

    if (event.type === "content_block_delta") {
      if (event.delta?.type === "thinking_delta" && event.delta?.thinking) {
        if (!this.thinkingStarted) {
          // 첫 번째 thinking 델타 - 시작 마커 추가
          delta.content = "<thinking>" + event.delta.thinking;
          this.thinkingStarted = true;
        } else {
          delta.content = event.delta.thinking;
        }
      } else if (event.delta?.type === "text_delta" && event.delta?.text) {
        delta.content = event.delta.text;
      } else {
        return null;
      }
    }

    if (event.type === "message_stop") {
      return {
        id: crypto.randomUUID(),
        object: "chat.completion.chunk",
        created: Date.now(),
        model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      };
    }

    if (!delta.content) return null;

    return {
      id: crypto.randomUUID(),
      object: "chat.completion.chunk",
      created: Date.now(),
      model,
      choices: [{ index: 0, delta, finish_reason: null }],
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

    this.log("Claude API Error:", { status, message, error });

    return new Error(`Claude API Error (${status}): ${message}`);
  }
}
