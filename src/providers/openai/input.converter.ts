import { ProviderChatRequest, RequestMessage, ToolDefinition } from "../../types";
import { OpenAIRequestParams } from "./types";

export class OpenAIInputConverter {
  /**
   * ProviderChatRequest를 OpenAI API 형식으로 변환
   */
  static toOpenAIFormat(request: ProviderChatRequest): OpenAIRequestParams {
    const params: OpenAIRequestParams = {
      model: request.model,
      instructions: request.system,
      messages: this.convertMessages(request.content),
      max_tokens: request.max_tokens || 1000,
      temperature: request.temperature || 0.7,
    };

    // Tools 처리
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools;
    }

    // 고급 설정 적용
    if (request.advanced?.openai) {
      Object.assign(params, request.advanced.openai);
    }

    // undefined 값 제거
    return Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined)
    ) as OpenAIRequestParams;
  }

  /**
   * RequestMessage 배열을 OpenAI 메시지 형식으로 변환
   */
  private static convertMessages(messages: RequestMessage[]): any[] {
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return msg;
      }

      // 멀티모달 메시지 처리
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.map((item: any) => {
            if (item.type === "text") {
              return { type: "text", text: item.text };
            } else if (item.type === "image") {
              return {
                type: "image_url",
                image_url: item.image_url,
              };
            }
            return item;
          }),
        };
      }

      return msg;
    });
  }
}