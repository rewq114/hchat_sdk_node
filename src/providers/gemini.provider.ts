// src/providers/gemini.provider.ts
import { BaseProvider } from "./base.provider";
import {
  ProviderChatRequest,
  StreamChunk,
  ChatCompletion,
  RequestMessage,
  FinishReason,
} from "../types";
import { parseSSEStream } from "../utils/sse-parser";

export class GeminiProvider extends BaseProvider {
  // TODO : 다듬기 필요
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

      const data: any = await response.json();
      return this.convertGeminiCompletion(data, request.model);
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

      // 응답 상태가 'ok'가 아니면 에러를 발생시킴
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      // SSE 스트림을 파싱하고 각 데이터 청크를 변환하여 반환
      for await (const data of parseSSEStream(response)) {
        // this.log("", JSON.stringify(data, null, 2));
        const chunk = this.convertGeminiChunk(data, request.model);
        if (chunk) {
          yield chunk;
        }
      }
    } catch (error) {
      this.log("Error in Gemini stream:", error);
      throw this.handleError(error);
    }
  }

  protected convertToProviderInputformat(request: ProviderChatRequest): any {
    const contents = this.convertMessages(request.content);
    const systemInstruction = {
      parts: [
        {
          text: request.system,
        },
      ],
    };

    const generationConfig: any = {
      maxOutputTokens: request.max_tokens || 4096,
      temperature: request.temperature || 0.7,
    };

    // Thinking mode 지원
    if (request.thinking) {
      // generationConfig.responseModalities = ["TEXT"];
      generationConfig.thinkingConfig = {
        thinkingBudget: -1,
        includeThoughts: true,
      };
      generationConfig.temperature = 1;
    }

    const geminiBody: any = {
      contents,
      generationConfig,
    };

    // System instruction
    if (systemInstruction) {
      geminiBody.systemInstruction = systemInstruction;
    } // Tools
    if (request.tools && request.tools.length > 0) {
      const convertedTools = this.convertTools(request.tools);
      if (convertedTools) {
        geminiBody.tools = convertedTools;
      }
    }
    // if (this.config.debug) {
    //   this.log("gemini body:", JSON.stringify(geminiBody, null, 2));
    // }

    return geminiBody;
  }

  private convertMessages(messages: RequestMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: this.convertContent(msg.content),
    }));
  }

  private convertContent(content: any): any[] {
    if (typeof content === "string") {
      return [{ text: content }];
    }

    if (Array.isArray(content)) {
      return content.map((item: any) => {
        if (item.type === "text") {
          return { text: item.text };
        } else if (item.type === "image") {
          const base64Data = item.image_url.url.includes("base64,")
            ? item.image_url.url.split(",")[1]
            : item.image_url.url;

          return {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          };
        }
        return item;
      });
    }

    return [{ text: String(content) }];
  }
  private convertTools(tools?: any[]): any {
    if (!tools || tools.length === 0) return undefined;

    const functionDeclarations = tools.map((tool) => {
      // Gemini는 parameters가 JSON Schema 형식이어야 함
      const parameters = tool.function.parameters || {
        type: "object",
        properties: {},
      };

      return {
        name: tool.function.name,
        description: tool.function.description,
        parameters: parameters,
      };
    });

    // functionDeclarations가 비어있으면 tools 자체를 반환하지 않음
    if (functionDeclarations.length === 0) {
      return undefined;
    }

    return [
      {
        functionDeclarations: functionDeclarations,
      },
    ];
  }

  private convertGeminiChunk(data: any, model: string): StreamChunk | null {
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts?.[0];
    let content = parts.text;

    if (!content) return null;

    // 그러나 현재 LLM에서 thought 값을 주지 않으므로 이 코드가 동작하지 않음.
    if (parts && parts.thought === true) {
      content = `\n<thinking>\n${content}\n</thinking>\n`;
    }

    const chunk: StreamChunk = {
      id: crypto.randomUUID(),
      object: "chat.completion.chunk" as const,
      created: Date.now(),
      model: data.modelVersion || model,
      choices: [
        {
          index: 0,
          delta: { content },
          finish_reason: candidate?.finishReason?.toLowerCase() || null,
        },
      ],
    };
    return chunk;
  }

  private convertGeminiCompletion(data: any, model: string): ChatCompletion {
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

    return {
      id: crypto.randomUUID(),
      object: "chat.completion" as const,
      created: Math.floor(Date.now() / 1000),
      model: data.modelVersion || model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: this.convertGeminiFinishReason(candidate.finishReason),
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
    };
  }

  private convertGeminiFinishReason(reason: string): FinishReason {
    const reasonMap: Record<string, FinishReason> = {
      STOP: "stop",
      MAX_TOKENS: "length",
      SAFETY: "content_filter",
      RECITATION: "content_filter",
      OTHER: "stop",
    };
    return reasonMap[reason] || "stop";
  }

  private handleError(error: any): Error {
    // 원본 에러를 그대로 던지면 클라이언트에서 처리함
    if (this.config.debug) {
      this.log("Gemini API Error:", error);
    }

    // 에러를 그대로 전달하여 parseFeatureError가 처리하도록 함
    return error;
  }
}
