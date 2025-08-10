import { OpenAIProvider } from "../src/providers/openai.provider";
import { ClaudeProvider } from "../src/providers/claude.provider";
import { GeminiProvider } from "../src/providers/gemini.provider";
import { ChatRequest, HChatConfig, StreamChunk } from "../src/types";

describe("Provider Integration Tests", () => {
  // 환경 변수에서 실제 API 키와 Base URL을 가져옵니다.
  const config: HChatConfig = {
    apiKey: process.env.HCHAT_API_KEY || "",
    baseUrl:
      process.env.HCHAT_BASE_URL || "https://h-chat-api.autoever.com/v2/api",
    debug: true,
  };

  // API 키가 없으면 모든 테스트를 건너뛰기 위한 조건부 함수
  const itif = (condition: any) => (condition ? it : it.skip);

  // 모든 테스트 시작 전에 API 키 존재 여부를 확인하고 로그를 남깁니다.
  beforeAll(() => {
    if (!config.apiKey) {
      console.warn(
        "⚠️ HCHAT_API_KEY is not set. Skipping provider integration tests."
      );
    }
  });

  const testRequest: Omit<ChatRequest, "model"> = {
    system: "You are a helpful assistant. Keep responses very brief.",
    content: [{ role: "user", content: "Say hello in Korean" }],
    max_tokens: 50,
  };

  describe("Claude Provider", () => {
    // config.apiKey가 있을 때만 이 테스트를 실행합니다.
    itif(config.apiKey)(
      "should receive a stream from the real API",
      async () => {
        const provider = new ClaudeProvider(config);
        // 중요: 아래 모델 이름은 H-Chat API Gateway에서 지원하는 정확한 이름이어야 합니다.
        // 예: "claude-3-opus" 등. 400 에러 발생 시 이 부분을 확인하세요.
        const request: ChatRequest = {
          ...testRequest,
          model: "claude-sonnet-4",
        };
        const chunks: StreamChunk[] = [];

        try {
          for await (const chunk of provider.stream(request)) {
            chunks.push(chunk);
            if (chunks.length >= 3) break;
          }
        } catch (error) {
          // 에러를 그대로 던져서 Jest가 테스트 실패로 처리하게 합니다.
          throw error;
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0]?.choices?.[0]?.delta).toBeDefined();
      },
      15000
    ); // 실제 네트워크 요청을 위해 타임아웃을 15초로 설정
  });

  describe("Gemini Provider", () => {
    itif(config.apiKey)(
      "should receive a stream from the real API",
      async () => {
        const provider = new GeminiProvider(config);
        // 중요: 아래 모델 이름은 H-Chat API Gateway에서 지원하는 정확한 이름이어야 합니다.
        const request: ChatRequest = {
          ...testRequest,
          model: "gemini-2.5-flash",
        };
        const chunks: StreamChunk[] = [];

        try {
          for await (const chunk of provider.stream(request)) {
            chunks.push(chunk);
            if (chunks.length >= 3) break;
          }
        } catch (error) {
          throw error;
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0]?.choices?.[0]?.delta).toBeDefined();
      },
      15000
    );
  });

  describe("OpenAI Provider", () => {
    itif(config.apiKey)(
      "should receive a stream from the real API",
      async () => {
        const provider = new OpenAIProvider(config);
        const request: ChatRequest = { ...testRequest, model: "gpt-4o-mini" };
        const chunks: StreamChunk[] = [];

        try {
          for await (const chunk of provider.stream(request)) {
            // 데이터가 있는 유효한 청크만 배열에 추가
            if (chunk?.choices?.[0]?.delta) {
              chunks.push(chunk);
            }
            if (chunks.length >= 3) break;
          }
        } catch (error) {
          throw error;
        }

        expect(chunks.length).toBeGreaterThan(0);
        // 이제 chunks[0]은 유효한 데이터임을 보장할 수 있습니다.
        expect(chunks[0].choices[0].delta).toBeDefined();
      },
      15000
    );
  });
});
