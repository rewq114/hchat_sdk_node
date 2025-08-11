import { FeatureError } from "../../types";

export class ClaudeErrorHandler {
  /**
   * Claude API 에러를 처리하고 통일된 에러 메시지 반환
   */
  static handle(error: any): Error {
    // 기능 관련 에러 체크
    const featureError = this.parseClaudeFeatureError(error);
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

    // Claude 특화 에러 코드 처리
    if (error.status === 400 && error.message?.includes("credit")) {
      return new Error("크레디트가 부족합니다. API 크레디트를 확인해주세요.");
    }

    if (error.status === 413) {
      return new Error("요청이 너무 큽니다. 메시지를 줄여주세요.");
    }

    // 일반 에러 처리
    const status = error.status || 500;
    const message = error.message || "Unknown error";
    return new Error(`Claude API Error (${status}): ${message}`);
  }

  /**
   * Claude 특화 기능 에러 파싱
   */
  private static parseClaudeFeatureError(error: any): FeatureError | null {
    const errorMessage = error.message?.toLowerCase() || "";

    // Claude의 thinking 에러
    if (errorMessage.includes("thinking blocks are not supported")) {
      return {
        code: "THINKING_NOT_SUPPORTED",
        feature: "thinking",
        message: "이 모델 버전은 thinking 기능을 지원하지 않습니다.",
        suggestion:
          "최신 Claude 모델(claude-sonnet-4, claude-opus-4)을 사용하거나 thinking: false로 설정해주세요.",
      };
    }

    // Claude의 tool 에러
    if (errorMessage.includes("tools.0.name")) {
      return {
        code: "INVALID_TOOL_NAME",
        feature: "tools",
        message: "도구 이름이 잘못되었습니다.",
        suggestion: "도구 이름은 영어, 숫자, 언더스코어만 사용 가능합니다.",
      };
    }

    if (
      errorMessage.includes("invalid tool") ||
      errorMessage.includes("tool schema")
    ) {
      return {
        code: "INVALID_TOOL_SCHEMA",
        feature: "tools",
        message: "도구 스키마가 잘못되었습니다.",
        suggestion:
          "도구의 parameters가 올바른 JSON Schema 형식인지 확인해주세요.",
      };
    }

    // 이미지 형식 에러
    if (
      errorMessage.includes("image format") ||
      errorMessage.includes("unsupported image")
    ) {
      return {
        code: "INVALID_IMAGE_FORMAT",
        feature: "vision",
        message: "지원하지 않는 이미지 형식입니다.",
        suggestion: "JPEG, PNG, GIF, WebP 형식의 이미지를 사용해주세요.",
      };
    }

    // 토큰 제한
    if (
      errorMessage.includes("max_tokens") ||
      errorMessage.includes("token limit")
    ) {
      return {
        code: "TOKEN_LIMIT_EXCEEDED",
        feature: "general",
        message: "토큰 제한을 초과했습니다.",
        suggestion: "max_tokens를 줄이거나 입력 메시지를 짧게 해주세요.",
      };
    }

    return null;
  }

  /**
   * 디버그 정보 로깅
   */
  static logError(error: any, debug: boolean): void {
    if (debug) {
      console.log("[ClaudeProvider] Error details:", {
        status: error.status,
        message: error.message,
        response: error.response,
      });
    }
  }
}
