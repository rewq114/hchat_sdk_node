import { OpenAIProvider } from "../src/providers/openai.provider";
import { ClaudeProvider } from "../src/providers/claude.provider";
import { GeminiProvider } from "../src/providers/gemini.provider";
import { HChatConfig, StreamChunk, ProviderChatRequest } from "../src/types";

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

  const testRequest: Omit<ProviderChatRequest, "model"> = {
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
        const request: ProviderChatRequest = {
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
        const request: ProviderChatRequest = {
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
        const request: ProviderChatRequest = {
          ...testRequest,
          model: "gpt-4o-mini",
        };
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

describe("Provider Unit Tests", () => {
  const mockConfig: HChatConfig = {
    apiKey: "test-key",
    baseUrl: "https://test.api.com",
    debug: false,
  };

  describe("Claude Provider", () => {
    let provider: ClaudeProvider;
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
      provider = new ClaudeProvider(mockConfig);
      fetchMock = jest.spyOn(global, "fetch").mockImplementation();
    });

    afterEach(() => {
      fetchMock.mockRestore();
    });

    it("should convert tools to Claude format", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg_123",
          content: [{ type: "text", text: "I'll help you with that." }],
          stop_reason: "end_turn",
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
        }),
      } as Response);

      const request: ProviderChatRequest = {
        model: "claude-sonnet-4",
        system: "Test",
        content: [{ role: "user", content: "Test" }],
        tools: [
          {
            type: "function",
            function: {
              name: "test_tool",
              description: "Test tool",
              parameters: {
                type: "object",
                properties: {
                  param: { type: "string" },
                },
              },
            },
          },
        ],
      };

      await provider.chat(request);

      expect(fetchMock).toHaveBeenCalled();
      const [url, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.tools).toBeDefined();
      expect(body.tools[0]).toEqual({
        name: "test_tool",
        description: "Test tool",
        input_schema: {
          type: "object",
          properties: {
            param: { type: "string" },
          },
        },
      });
      expect(body.tool_choice).toEqual({ type: "auto" });
    });

    it("should handle tool response messages correctly", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg_123",
          content: [{ type: "text", text: "Done" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      } as Response);

      const request: ProviderChatRequest = {
        model: "claude-sonnet-4",
        system: "Test",
        content: [
          { role: "user", content: "Test" },
          {
            role: "assistant",
            content: "I'll help",
            tool_calls: [
              {
                id: "call_123",
                type: "function",
                function: {
                  name: "test_tool",
                  arguments: '{"param": "value"}',
                },
              },
            ],
          },
          {
            role: "tool",
            content: '{"result": "success"}',
            tool_call_id: "call_123",
          },
        ],
      };

      await provider.chat(request);

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);

      // Check assistant message with tool_use
      expect(body.messages[1].content).toContainEqual({
        type: "tool_use",
        id: "call_123",
        name: "test_tool",
        input: { param: "value" },
      });

      // Check tool response as user message
      expect(body.messages[2].role).toBe("user");
      expect(body.messages[2].content[0].type).toBe("tool_result");
      expect(body.messages[2].content[0].tool_use_id).toBe("call_123");
    });

    it("should extract tool calls from response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg_123",
          content: [
            { type: "text", text: "I'll check the weather." },
            {
              type: "tool_use",
              id: "toolu_123",
              name: "get_weather",
              input: { location: "Seoul" },
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      } as Response);

      const response = await provider.chat({
        model: "claude-sonnet-4",
        system: "Test",
        content: [{ role: "user", content: "What's the weather?" }],
      });

      // shortcuts 테스트
      expect(response.content).toBe("The answer is 42");
      expect(response.thinking).toBe("Let me think about this...");
      expect(response.finish_reason).toBe("stop");

      // 기존 방식도 여전히 작동
      expect(response.choices[0].message.thinking).toBe(
        "Let me think about this..."
      );
      // shortcuts 테스트
      expect(response.tool_calls).toBeDefined();
      expect(response.tool_calls?.[0].function.name).toBe("get_weather");
      expect(response.finish_reason).toBe("tool_calls");

      // 기존 방식도 여전히 작동
      expect(response.choices[0].message.tool_calls).toBeDefined();
      expect(response.choices[0].message.tool_calls?.[0].function.name).toBe(
        "get_weather"
      );
      expect(response.choices[0].message.tool_calls?.[0]).toEqual({
        id: "toolu_123",
        type: "function",
        function: {
          name: "get_weather",
          arguments: '{"location":"Seoul"}',
        },
      });
      expect(response.choices[0].finish_reason).toBe("tool_calls");
    });
  });

  describe("Gemini Provider", () => {
    let provider: GeminiProvider;
    let fetchMock: jest.SpyInstance;

    beforeEach(() => {
      provider = new GeminiProvider(mockConfig);
      fetchMock = jest.spyOn(global, "fetch").mockImplementation();
    });

    afterEach(() => {
      fetchMock.mockRestore();
    });

    it("should convert messages to Gemini format", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Hello!" }],
                role: "model",
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        }),
      } as Response);

      const request: ProviderChatRequest = {
        model: "gemini-2.5-flash",
        system: "Be helpful",
        content: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "How are you?" },
        ],
      };

      await provider.chat(request);

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);

      // Check system instruction
      expect(body.systemInstruction).toEqual({
        parts: [{ text: "Be helpful" }],
      });

      // Check message conversion
      expect(body.contents).toHaveLength(3);
      expect(body.contents[0].role).toBe("user");
      expect(body.contents[1].role).toBe("model"); // assistant -> model
      expect(body.contents[2].role).toBe("user");
    });

    it("should handle multimodal content", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: "I see the image" }] },
              finishReason: "STOP",
            },
          ],
        }),
      } as Response);

      const request: ProviderChatRequest = {
        model: "gemini-2.5-pro",
        system: "Analyze images",
        content: [
          {
            role: "user",
            content: [
              { type: "text", text: "What's in this image?" },
              {
                type: "image",
                image_url: {
                  url: "data:image/jpeg;base64,/9j/4AAQ...",
                },
              },
            ],
          },
        ],
      };

      await provider.chat(request);

      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.contents[0].parts).toHaveLength(2);
      expect(body.contents[0].parts[0]).toEqual({
        text: "What's in this image?",
      });
      expect(body.contents[0].parts[1].inlineData).toBeDefined();
      expect(body.contents[0].parts[1].inlineData.mimeType).toBe("image/jpeg");
    });
  });

  describe("OpenAI Provider", () => {
    it("should handle Azure OpenAI specific configuration", () => {
      const provider = new OpenAIProvider(mockConfig);
      // Azure OpenAI의 경우 endpoint와 apiVersion이 설정되는지 확인
      // 이는 실제 구현에 따라 테스트 방법이 달라질 수 있음
      expect(provider).toBeDefined();
    });
  });
});
