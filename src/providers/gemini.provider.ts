// src/providers/gemini.provider.ts
import { BaseProvider } from "./base.provider";
import { ChatRequest, StreamChunk, Message } from "../types";
import { parseSSEStream } from "../utils/sse-parser";

export class GeminiProvider extends BaseProvider {
  // TODO : 다듬기 필요
  async chat(request: ChatRequest): Promise<any> {
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
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return {
        content: content,
        usage: data.usageMetadata,
      };
    } catch (error: any) {
      this.log("Error in Gemini chat:", error);
      throw this.handleError(error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
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
        // this.log("", data.candidates[0].content.parts);
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

  protected convertToProviderInputformat(request: ChatRequest): any {
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
        thinkingBudget:
          (request.max_tokens || 32768) > 24576 ? 24576 : request.max_tokens,
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
    }

    // Tools
    if (request.tools && request.tools.length > 0) {
      geminiBody.tools = this.convertTools(request.tools);
    }

    return geminiBody;
  }

  private convertMessages(messages: Message[]): any[] {
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

    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        })),
      },
    ];
  }

  private convertGeminiChunk(data: any, model: string): StreamChunk | null {
    const candidate = data.candidates?.[0];
    let content: string;

    if (data.thinking && data.thinking.length > 0) {
      const thought = data.thinking[0];
      const thinkingContent =
        thought.thought || thought.contest || JSON.stringify(thought);
      content = `\n[thinking]\n${thinkingContent}\n</thinking>\n`;
    } else {
      content = candidate?.content?.parts?.[0]?.text;

      if (!content) return null;
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

  private handleError(error: any): Error {
    const status = error.status || 500;
    let message = error.message || "Unknown Gemini API error";

    // Gemini API의 특정 에러 코드에 맞춰 메시지를 상세화할 수 있습니다.
    if (status === 400) {
      message = "Invalid request sent to Gemini API.";
    } else if (status === 429) {
      message = "Gemini API rate limit exceeded.";
    } else if (status === 500) {
      message = "Internal server error at Gemini API.";
    }

    this.log("Gemini API Error:", { status, message, error });
    return new Error(`Gemini API Error (${status}): ${message}`);
  }
}
