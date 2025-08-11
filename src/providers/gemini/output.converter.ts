import { ChatCompletion, StreamChunk, FinishReason } from "../../types";
import { GeminiResponse } from "./types";

export class GeminiOutputConverter {
  /**
   * Gemini 응답을 ChatCompletion 형식으로 변환
   */
  static toCompletion(data: GeminiResponse, model: string): ChatCompletion {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error("No candidates in Gemini response");
    }

    // Extract content and thinking
    let content = "";
    let thinking = "";

    if (candidate.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          content += part.text;
        }
        if (part.thought === true && part.text) {
          thinking += part.text;
        }
      }
    }

    // Extract thinking from thoughtContent if available
    if (candidate.thoughtContent?.parts) {
      for (const part of candidate.thoughtContent.parts) {
        if (part.text) {
          thinking += part.text;
        }
      }
    }

    const message: any = {
      role: "assistant" as const,
      content: content,
    };

    // Add thinking if present
    if (thinking) {
      message.thinking = thinking;
    }

    // Handle tool calls if present
    if (candidate.functionCalls) {
      message.tool_calls = candidate.functionCalls.map(
        (call: any, index: number) => ({
          id: `call_${index}_${Date.now()}`,
          type: "function" as const,
          function: {
            name: call.name,
            arguments: JSON.stringify(call.args),
          },
        })
      );
    }

    const finishReason = this.convertFinishReason(candidate.finishReason);
    
    return {
      id: crypto.randomUUID(),
      object: "chat.completion" as const,
      created: Math.floor(Date.now() / 1000),
      model: data.modelVersion || model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: finishReason,
        },
      ],
      usage: data.usageMetadata
        ? {
            prompt_tokens: data.usageMetadata.promptTokenCount || 0,
            completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
            total_tokens: data.usageMetadata.totalTokenCount || 0,
            thinking_tokens: data.usageMetadata.thinkingTokenCount,
          }
        : undefined,
      // Shortcuts
      message: message,
      content: content,
      thinking: thinking || undefined,
      tool_calls: message.tool_calls,
      finish_reason: finishReason,
    };
  }

  /**
   * Gemini 스트림 이벤트를 StreamChunk로 변환
   */
  static toStreamChunk(event: any, model: string): StreamChunk | null {
    if (!event.candidates?.[0]?.content?.parts?.[0]) {
      return null;
    }

    const text = event.candidates[0].content.parts[0].text || "";
    if (!text) return null;

    const chunk: StreamChunk = {
      id: crypto.randomUUID(),
      object: "chat.completion.chunk",
      created: Date.now(),
      model: model,
      choices: [
        {
          index: 0,
          delta: {
            content: text,
          },
          finish_reason: null,
        },
      ],
    };
    
    return chunk;
  }

  /**
   * Gemini finish reason을 표준 형식으로 변환
   */
  private static convertFinishReason(reason?: string): FinishReason {
    if (!reason) return "stop";
    
    const reasonMap: Record<string, FinishReason> = {
      STOP: "stop",
      MAX_TOKENS: "length",
      SAFETY: "content_filter",
      RECITATION: "content_filter",
      OTHER: "stop",
    };
    return reasonMap[reason] || "stop";
  }
}