import { ChatCompletion, StreamChunk, FinishReason } from "../../types";
import { ClaudeResponse, ClaudeStreamEvent } from "./types";

export class ClaudeOutputConverter {
  // 스트림 처리를 위한 상태 (인스턴스별로 관리)
  private isInThinkingBlock = false;
  private thinkingStarted = false;

  /**
   * Claude 응답을 ChatCompletion 형식으로 변환
   */
  static toCompletion(response: ClaudeResponse, model: string): ChatCompletion {
    // response.content 배열에서 텍스트 추출
    let content = "";
    let thinking = "";
    const toolCalls: any[] = [];

    if (Array.isArray(response.content)) {
      for (const block of response.content) {
        if (block.type === "text") {
          content += block.text;
        } else if (block.type === "thinking") {
          thinking = block.thinking || "";
        } else if (block.type === "tool_use") {
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

    if (thinking) {
      message.thinking = thinking;
    }

    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    const finishReason = ClaudeOutputConverter.convertFinishReason(response.stop_reason);
    
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

  /**
   * Claude 스트림 이벤트를 StreamChunk로 변환
   */
  toStreamChunk(event: ClaudeStreamEvent, model: string): StreamChunk | null {
    const delta: any = {};

    if (event.type === "content_block_start") {
      if (event.content_block?.type === "thinking") {
        this.isInThinkingBlock = true;
        this.thinkingStarted = false;
        return null;
      } else if (event.content_block?.type === "tool_use") {
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
        delta.content = "</thinking>\n";
      } else {
        return null;
      }
    }

    if (event.type === "content_block_delta") {
      if (event.delta?.type === "thinking_delta" && event.delta?.thinking) {
        if (!this.thinkingStarted) {
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

  /**
   * Claude finish reason을 표준 형식으로 변환
   */
  private static convertFinishReason(stopReason: string): FinishReason {
    const reasonMap: Record<string, FinishReason> = {
      end_turn: "stop",
      max_tokens: "length",
      stop_sequence: "stop",
      tool_use: "tool_calls",
    };
    return reasonMap[stopReason] || "stop";
  }
}