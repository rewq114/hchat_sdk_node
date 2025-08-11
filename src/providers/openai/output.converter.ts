import { ChatCompletion, StreamChunk } from "../../types";

export class OpenAIOutputConverter {
  /**
   * OpenAI 응답을 ChatCompletion 형식으로 변환
   */
  static toCompletion(response: any, model: string): ChatCompletion {
    const choices = response.choices.map((choice: any) => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content || "",
        tool_calls: choice.message.tool_calls,
      },
      finish_reason: choice.finish_reason,
    }));
    
    // 첫 번째 choice의 정보를 shortcuts로 제공
    const firstChoice = choices[0];
    
    return {
      id: response.id,
      object: "chat.completion",
      created: response.created,
      model: model,
      choices: choices,
      usage: response.usage,
      // Shortcuts
      message: firstChoice.message,
      content: firstChoice.message.content,
      thinking: firstChoice.message.thinking,
      tool_calls: firstChoice.message.tool_calls,
      finish_reason: firstChoice.finish_reason,
    };
  }

  /**
   * OpenAI 스트림 청크는 이미 올바른 형식이므로 그대로 반환
   */
  static toStreamChunk(chunk: any): StreamChunk {
    return chunk as StreamChunk;
  }
}