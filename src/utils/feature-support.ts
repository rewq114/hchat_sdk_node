// Error handling utilities for feature-related errors

export interface FeatureError {
  code: string;
  feature?: string;
  model?: string;
  message: string;
  suggestion?: string;
}

/**
 * Parse server errors and provide helpful guidance
 */
export function parseFeatureError(error: any): FeatureError | null {
  // 서버에서 반환하는 에러 형식에 따라 파싱
  if (error.code === "FEATURE_NOT_SUPPORTED") {
    return {
      code: error.code,
      feature: error.feature,
      model: error.model,
      message: error.message,
      suggestion: getSuggestion(error.feature, error.model),
    };
  }

  // 다른 에러 패턴들도 처리
  if (error.message?.includes("thinking blocks are not supported")) {
    return {
      code: "THINKING_NOT_SUPPORTED",
      feature: "thinking",
      message: "이 모델은 thinking 기능을 지원하지 않습니다.",
      suggestion: "thinking 블록을 제거하거나 다른 모델을 사용해주세요.",
    };
  }

  if (error.message?.includes("tools are not supported")) {
    return {
      code: "TOOLS_NOT_SUPPORTED",
      feature: "tools",
      message: "이 모델은 도구 사용을 지원하지 않습니다.",
      suggestion: "도구 사용 없이 진행하거나 다른 모델을 사용해주세요.",
    };
  }

  // Gemini tools 에러
  if (error.message?.includes("Function declarations cannot be empty")) {
    return {
      code: "TOOLS_NOT_SUPPORTED",
      feature: "tools",
      message: "Gemini 모델은 현재 API에서 도구 사용을 지원하지 않습니다.",
      suggestion: "GPT-4나 Claude 모델을 사용하거나, 도구 없이 질문해주세요.",
    };
  }
  if (error.message?.includes("thinking blocks are not supported")) {
    return {
      code: "THINKING_NOT_SUPPORTED",
      feature: "thinking",
      message: "이 모델은 thinking 기능을 지원하지 않습니다.",
      suggestion: "thinking 블록을 제거하거나 다른 모델을 사용해주세요.",
    };
  }

  if (error.message?.includes("tools are not supported")) {
    return {
      code: "TOOLS_NOT_SUPPORTED",
      feature: "tools",
      message: "이 모델은 도구 사용을 지원하지 않습니다.",
      suggestion: "도구 사용 없이 진행하거나 다른 모델을 사용해주세요.",
    };
  }

  return null;
}

function getSuggestion(feature?: string, model?: string): string {
  switch (feature) {
    case "thinking":
      return "Claude 모델(claude-sonnet-4, claude-opus-4)을 사용하거나 thinking: false로 설정해주세요.";
    case "tools":
      return "GPT-4(gpt-4, gpt-4o) 또는 Claude 모델을 사용하거나, tools를 제거해주세요.";
    case "vision":
      return "이미지를 제거하거나 vision을 지원하는 모델을 사용해주세요.";
    default:
      return "다른 모델을 사용하거나 요청 내용을 수정해주세요.";
  }
}
