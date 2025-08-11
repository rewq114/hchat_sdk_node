// src/providers/claude.provider.ts
import { BaseProvider } from "./base.provider";
import {
  ProviderChatRequest,
  StreamChunk,
  ChatCompletion,
  RequestMessage,
  FinishReason,
} from "../types";
import { parseSSEStream } from "../utils/sse-parser";

export class ClaudeProvider extends BaseProvider {
  // TODO : 다듬기 필요
  private isInThinkingBlock = false;
  private thinkingStarted = false;

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
      const data = await response.json();

      // 디버깅
      if (this.config.debug) {
        if (request.thinking) {
          this.log("Claude thinking response:", JSON.stringify(data, null, 2));
        }
        if (request.tools) {
          this.log("Claude tool response:", JSON.stringify(data, null, 2));
        }
      }

      return this.convertAnthropicCompletion(data, request.model);
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
        // this.log("", data);
        const chunk = this.convertAnthropicChunk(data, request.model);

        if (chunk) yield chunk;
      }
    } catch (error: any) {
      this.log("Error in Claude stream:", error);
      throw this.handleError(error);
    }
  }

  protected convertToProviderInputformat(request: ProviderChatRequest): any {
    const params: any = {
      model: request.model,
      system: request.system,
      messages: this.convertMessages(request.content),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
    };

    // Tool 처리
    if (request.tools && request.tools.length > 0) {
      params.tools = this.convertTools(request.tools);
      // Claude는 tool_choice를 통해 tool 사용을 유도할 수 있음
      params.tool_choice = { type: "auto" };
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
  private convertMessages(messages: RequestMessage[]): any[] {
    return messages.map((msg) => {
      // Claude는 tool response를 user role로 받음
      if (msg.role === "tool" && msg.tool_call_id) {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.tool_call_id,
              content:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content),
            },
          ],
        };
      }

      // Assistant 메시지에 tool_calls가 있는 경우 Claude 형식으로 변환
      if (msg.role === "assistant" && msg.tool_calls) {
        const content: any[] = [];

        // 텍스트 컨텐츠가 있다면 추가
        if (msg.content) {
          content.push({
            type: "text",
            text: msg.content,
          });
        }

        // tool_calls를 tool_use 블록으로 변환
        for (const toolCall of msg.tool_calls) {
          content.push({
            type: "tool_use",
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          });
        }

        return {
          role: "assistant",
          content: content,
        };
      }

      // 일반 메시지
      return {
        role: msg.role,
        content: this.convertContent(msg.content),
      };
    });
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
  private convertAnthropicCompletion(
    response: any,
    model: string
  ): ChatCompletion {
    // response.content 배열에서 텍스트 추출
    let content = "";
    let thinking = "";
    const toolCalls: any[] = [];

    if (Array.isArray(response.content)) {
      for (const block of response.content) {
        if (block.type === "text") {
          content += block.text;
        } else if (block.type === "thinking") {
          // thinking 블록은 'thinking' 필드에 내용이 있음
          thinking = block.thinking || "";
        } else if (block.type === "tool_use") {
          // Claude의 tool_use 블록을 표준 tool_calls 형식으로 변환
          toolCalls.push({
            id: block.id,
            type: "function" as const,
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }
    }

    const message: any = {
      role: "assistant" as const,
      content: content,
    };

    // thinking이 있으면 추가
    if (thinking) {
      message.thinking = thinking;
    }

    // tool calls가 있으면 추가
    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }
    const finishReason = this.convertFinishReason(response.stop_reason);

    return {
      id: response.id || crypto.randomUUID(),
      object: "chat.completion" as const,
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: finishReason,
        },
      ],
      usage: response.usage
        ? {
            prompt_tokens: response.usage.input_tokens || 0,
            completion_tokens: response.usage.output_tokens || 0,
            total_tokens:
              (response.usage.input_tokens || 0) +
              (response.usage.output_tokens || 0),
            thinking_tokens: response.usage.thinking_tokens,
          }
        : undefined,
      // Shortcuts
      message: message,
      content: content,
      thinking: thinking || undefined,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      finish_reason: finishReason,
    };
  }

  private convertFinishReason(stopReason: string): FinishReason {
    const reasonMap: Record<string, FinishReason> = {
      end_turn: "stop",
      max_tokens: "length",
      stop_sequence: "stop",
      tool_use: "tool_calls",
    };
    return reasonMap[stopReason] || "stop";
  }

  private convertTools(tools: any[]): any[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters || {
        type: "object",
        properties: {},
      },
    }));
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
      } else if (event.content_block?.type === "tool_use") {
        // Tool use 시작 - tool call 정보 초기화
        delta.tool_calls = [
          {
            index: 0,
            id: event.content_block.id,
            type: "function",
            function: {
              name: event.content_block.name,
              arguments: "",
            },
          },
        ];
        return {
          id: crypto.randomUUID(),
          object: "chat.completion.chunk" as const,
          created: Date.now(),
          model,
          choices: [{ index: 0, delta, finish_reason: null }],
        };
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
      } else if (
        event.delta?.type === "input_json_delta" &&
        event.delta?.partial_json
      ) {
        // Tool use arguments 스트리밍
        delta.tool_calls = [
          {
            index: 0,
            function: {
              arguments: event.delta.partial_json,
            },
          },
        ];
      } else {
        return null;
      }
    }

    if (event.type === "message_stop") {
      return {
        id: crypto.randomUUID(),
        object: "chat.completion.chunk" as const,
        created: Date.now(),
        model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      };
    }

    if (!delta.content && !delta.tool_calls) return null;

    return {
      id: crypto.randomUUID(),
      object: "chat.completion.chunk" as const,
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
