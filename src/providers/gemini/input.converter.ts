import { ProviderChatRequest, RequestMessage, ToolDefinition } from "../../types";
import { GeminiRequestParams, GeminiContent, GeminiPart, GeminiTool } from "./types";

export class GeminiInputConverter {
  /**
   * ProviderChatRequest를 Gemini API 형식으로 변환
   */
  static toGeminiFormat(request: ProviderChatRequest): GeminiRequestParams {
    const contents = this.convertMessages(request.content);
    const systemInstruction = {
      parts: [
        {
          text: request.system,
        },
      ],
    };

    const generationConfig: any = {
      maxOutputTokens: request.max_tokens || 1000,
      temperature: request.temperature || 0.7,
    };

    // Thinking mode 처리
    if (request.thinking) {
      generationConfig.thinking = {
        type: "enabled",
        budget_tokens: request.max_tokens || 4096,
      };
      generationConfig.temperature = 1;
    }

    const geminiBody: GeminiRequestParams = {
      contents,
    };

    // System instruction
    if (systemInstruction) {
      geminiBody.systemInstruction = systemInstruction;
    }

    // Generation config
    geminiBody.generationConfig = generationConfig;

    // Tools
    if (request.tools && request.tools.length > 0) {
      const convertedTools = this.convertTools(request.tools);
      if (convertedTools) {
        geminiBody.tools = convertedTools;
      }
    }

    return geminiBody;
  }

  /**
   * RequestMessage 배열을 Gemini 메시지 형식으로 변환
   */
  private static convertMessages(messages: RequestMessage[]): GeminiContent[] {
    return messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: this.convertContent(msg.content),
    }));
  }

  /**
   * 메시지 콘텐츠를 Gemini parts 형식으로 변환
   */
  private static convertContent(content: any): GeminiPart[] {
    if (typeof content === "string") {
      return [{ text: content }];
    }

    if (Array.isArray(content)) {
      return content.map((item) => {
        if (item.type === "text") {
          return { text: item.text };
        } else if (item.type === "image") {
          // base64 이미지 처리
          const base64Data = item.image_url.url.includes("base64,")
            ? item.image_url.url.split(",")[1]
            : item.image_url.url;

          const mimeType = item.image_url.url.includes("image/png")
            ? "image/png"
            : "image/jpeg";

          return {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
        }
        return item;
      });
    }

    return [{ text: String(content) }];
  }

  /**
   * Tool definitions를 Gemini 형식으로 변환
   */
  private static convertTools(tools?: ToolDefinition[]): GeminiTool[] | undefined {
    if (!tools || tools.length === 0) return undefined;

    const functionDeclarations = tools.map((tool) => {
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

    if (functionDeclarations.length === 0) {
      return undefined;
    }

    return [
      {
        functionDeclarations: functionDeclarations,
      },
    ];
  }
}