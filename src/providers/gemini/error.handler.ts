import { FeatureError } from "../../types";

export class GeminiErrorHandler {
  /**
   * Gemini API 에러를 처리하고 통일된 에러 메시지 반환
   */
  static handle(error: any): Error {
    // 기능 관련 에러 체크
    const featureError = this.parseGeminiFeatureError(error);
    if (featureError) {
      const enhancedError = new Error(
        `${featureError.message}\n💡 ${featureError.suggestion}`
      );
      (enhancedError as any).code = featureError.code;
      (enhancedError as any).feature = featureError.feature;
      (enhancedError as any).model = featureError.model;

      // originalError를 enumerable: false로 설정하여 console.error 시 표시되지 않도록 함
      Object.defineProperty(enhancedError, "originalError", {
        value: error,
        enumerable: false, // console.error에서 표시되지 않음
        writable: true,
        configurable: true,
      });

      return enhancedError;
    }

    // Gemini 특화 에러 코드 처리
    if (error.status === 403 && error.message?.includes("location")) {
      return new Error("이 지역에서는 Gemini API를 사용할 수 없습니다.");
    }

    if (error.status === 503) {
      return new Error(
        "Gemini 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요."
      );
    }

    // 일반 에러 처리
    const status = error.status || 500;
    const message = error.message || "Unknown error";
    return new Error(`Gemini API Error (${status}): ${message}`);
  }

  /**
   * Gemini 특화 기능 에러 파싱
   */
  private static parseGeminiFeatureError(error: any): FeatureError | null {
    const errorMessage = error.message || "";

    // Gemini의 tools 에러
    if (errorMessage.includes("Function declarations cannot be empty")) {
      return {
        code: "TOOLS_NOT_SUPPORTED",
        feature: "tools",
        message: "Gemini 모델은 현재 API에서 도구 사용을 지원하지 않습니다.",
        suggestion:
          "GPT-4(gpt-4, gpt-4o) 또는 Claude 모델을 사용하거나, tools를 제거해주세요.",
      };
    }

    // Gemini의 thinking 에러 (현재 API에서 미지원)
    if (
      errorMessage.includes("thinking is not supported") ||
      errorMessage.includes("thinking_mode")
    ) {
      return {
        code: "THINKING_NOT_SUPPORTED",
        feature: "thinking",
        message:
          "Gemini 모델은 현재 API에서 thinking 기능을 지원하지 않습니다.",
        suggestion: "Claude 모델을 사용하거나 thinking: false로 설정해주세요.",
      };
    }

    // 안전 필터 에러
    if (errorMessage.includes("SAFETY") || errorMessage.includes("blocked")) {
      return {
        code: "CONTENT_BLOCKED",
        feature: "safety",
        message: "콘텐츠가 Gemini의 안전 정책에 의해 차단되었습니다.",
        suggestion: "요청 내용을 수정하거나 다른 모델을 사용해주세요.",
      };
    }

    // 이미지 크기 제한
    if (
      errorMessage.includes("image size") ||
      errorMessage.includes("too large")
    ) {
      return {
        code: "IMAGE_TOO_LARGE",
        feature: "vision",
        message: "이미지 크기가 너무 큽니다.",
        suggestion: "이미지를 4MB 이하로 줄여주세요.",
      };
    }

    // 토큰 제한
    if (
      errorMessage.includes("token limit") ||
      errorMessage.includes("max_output_tokens")
    ) {
      return {
        code: "TOKEN_LIMIT_EXCEEDED",
        feature: "general",
        message: "토큰 제한을 초과했습니다.",
        suggestion: "max_tokens를 8192 이하로 설정하거나 입력을 줄여주세요.",
      };
    }

    // API 키 오류
    if (errorMessage.includes("API key not valid") || error.status === 401) {
      return {
        code: "INVALID_API_KEY",
        feature: "auth",
        message: "Gemini API 키가 잘못되었습니다.",
        suggestion: "API 키를 확인하고 올바른 키를 사용해주세요.",
      };
    }

    return null;
  }

  /**
   * 디버그 정보 로깅
   */
  static logError(error: any, debug: boolean): void {
    if (debug) {
      console.log("[GeminiProvider] Error details:", error);
    }
  }
}
