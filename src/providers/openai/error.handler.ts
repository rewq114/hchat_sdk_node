import { OpenAIError } from "./types";
import { FeatureError } from "../../types";

export class OpenAIErrorHandler {
  /**
   * OpenAI API 에러를 처리하고 통일된 에러 메시지 반혐
   */
  static handle(error: OpenAIError): Error {
    // 기능 관련 에러 체크
    const featureError = this.parseOpenAIFeatureError(error);
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

    // 일반 에러 처리
    const status = error.status || 500;
    let message = error.message || "Unknown error";

    // 에러 코드별 메시지 매핑
    switch (status) {
      case 401:
        message = "Invalid API key";
        break;
      case 429:
        message = "Rate limit exceeded";
        break;
      case 400:
        message = "Invalid request";
        break;
      case 404:
        message = "Model not found";
        break;
      case 500:
      case 502:
      case 503:
        message = "OpenAI service error. Please try again later.";
        break;
    }

    const enhancedError = new Error(`OpenAI API Error (${status}): ${message}`);
    (enhancedError as any).status = status;
    (enhancedError as any).originalError = error;

    return enhancedError;
  }

  /**
   * OpenAI 특화 기능 에러 파싱
   */
  private static parseOpenAIFeatureError(error: any): FeatureError | null {
    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code?.toLowerCase() || "";

    // GPT 모델은 thinking을 지원하지 않음
    if (errorMessage.includes("thinking") || errorCode.includes("thinking")) {
      return {
        code: "THINKING_NOT_SUPPORTED",
        feature: "thinking",
        message: "GPT 모델은 thinking 기능을 지원하지 않습니다.",
        suggestion:
          "Claude 모델(claude-sonnet-4, claude-opus-4)을 사용하거나 thinking: false로 설정해주세요.",
      };
    }

    // OpenAI의 tool calling 에러
    if (
      errorMessage.includes("invalid tool") ||
      errorMessage.includes("tool_calls")
    ) {
      return {
        code: "INVALID_TOOL_DEFINITION",
        feature: "tools",
        message: "도구 정의가 잘못되었습니다.",
        suggestion: "도구의 파라미터와 설명을 확인해주세요.",
      };
    }

    // 이미지 크기 제한
    if (
      errorMessage.includes("image too large") ||
      errorMessage.includes("image_size")
    ) {
      return {
        code: "IMAGE_TOO_LARGE",
        feature: "vision",
        message: "이미지 크기가 너무 큽니다.",
        suggestion: "이미지를 20MB 이하로 줄여주세요.",
      };
    }

    return null;
  }

  /**
   * 디버그 정보 로깅
   */
  static logError(error: any, debug: boolean): void {
    if (debug) {
      console.log("[OpenAIProvider] Error details:", {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type,
      });
    }
  }
}
