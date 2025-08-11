import { ProviderChatRequest, RequestMessage, ToolDefinition } from "../../types";
import { ClaudeRequestParams } from "./types";

export class ClaudeInputConverter {
  /**
   * ProviderChatRequest를 Claude API 형식으로 변환
   */
  static toClaudeFormat(request: ProviderChatRequest): ClaudeRequestParams {
    const params: ClaudeRequestParams = {
      model: request.model,
      system: request.system,
      messages: this.convertMessages(request.content),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
    };

    // Tool 처리
    if (request.tools && request.tools.length > 0) {
      params.tools = this.convertTools(request.tools);
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

  /**
   * RequestMessage 배열을 Claude 메시지 형식으로 변환
   */
  private static convertMessages(messages: RequestMessage[]): any[] {
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

  /**
   * 메시지 콘텐츠 변환 (텍스트, 이미지 등)
   */
  private static convertContent(content: any): any {
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

  /**
   * Tool definitions를 Claude 형식으로 변환
   */
  private static convertTools(tools: ToolDefinition[]): any[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters || {
        type: "object",
        properties: {},
      },
    }));
  }
}