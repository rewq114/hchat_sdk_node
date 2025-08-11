import "jest";
import { HChat } from "../src/client";
import { ChatRequest } from "../src/types/request.types";
import { MockMCPManager } from "./mock-mcp";

// Provider들을 모킹하여 실제 네트워크 요청을 방지합니다.
const mockStream = jest.fn();
const mockChat = jest.fn();

jest.mock("../src/providers/openai.provider", () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    stream: mockStream,
    chat: mockChat,
  })),
}));
jest.mock("../src/providers/claude.provider", () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => ({
    stream: mockStream,
    chat: mockChat,
  })),
}));
jest.mock("../src/providers/gemini.provider", () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    stream: mockStream,
    chat: mockChat,
  })),
}));

describe("HChat Client - Unit Tests", () => {
  let client: HChat;
  beforeEach(() => {
    // 각 테스트 전에 mock 함수를 초기화합니다.
    mockStream.mockClear();
    mockChat.mockClear();

    // Mock stream implementation
    mockStream.mockImplementation(async function* () {
      yield {
        id: "test-chunk-1",
        object: "chat.completion.chunk",
        created: Date.now(),
        model: "test-model",
        choices: [
          {
            index: 0,
            delta: { content: "Hello" },
            finish_reason: null,
          },
        ],
      };
      yield {
        id: "test-chunk-2",
        object: "chat.completion.chunk",
        created: Date.now(),
        model: "test-model",
        choices: [
          {
            index: 0,
            delta: { content: " world" },
            finish_reason: null,
          },
        ],
      };
    });

    // Mock chat implementation
    mockChat.mockResolvedValue({
      id: "test-completion",
      object: "chat.completion",
      created: Date.now(),
      model: "test-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello world",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    });

    // 실제 API 키가 필요 없는 테스트용 클라이언트를 생성합니다.
    client = new HChat(
      { apiKey: "test-key", debug: false },
      new MockMCPManager()
    );
  });
  describe("Stream functionality", () => {
    it("should call provider's stream with correctly formatted simple request", async () => {
      const request: ChatRequest = {
        model: "gpt-4.1",
        system: "You are a test assistant.",
        content: [{ role: "user", content: "Hello world" }],
      };

      const chunks: string[] = [];
      for await (const chunk of client.stream(request)) {
        chunks.push(chunk);
      }

      // provider의 stream 함수가 1번 호출되었는지 확인합니다.
      expect(mockStream).toHaveBeenCalledTimes(1);

      // provider에게 전달된 인자(ChatRequest)가 올바른지 확인합니다.
      const calledWith = mockStream.mock.calls[0][0];
      expect(calledWith.model).toBe("gpt-4.1");
      expect(calledWith.system).toBe("You are a test assistant.");
      expect(calledWith.content).toEqual([
        { role: "user", content: "Hello world" },
      ]);

      // 스트림에서 데이터를 받았는지 확인
      expect(chunks).toEqual(["Hello", " world"]);
    });
    it("should handle stream with tools", async () => {
      const request: ChatRequest = {
        model: "claude-sonnet-4",
        system: "You are a helpful assistant.",
        content: [{ role: "user", content: "Get weather" }],
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get weather information",
              parameters: {
                type: "object",
                properties: {
                  location: { type: "string" },
                },
              },
            },
          },
        ],
      };

      const chunks: string[] = [];
      for await (const chunk of client.stream(request)) {
        chunks.push(chunk);
      }

      expect(mockStream).toHaveBeenCalledTimes(1);
      const calledWith = mockStream.mock.calls[0][0];
      expect(calledWith.tools).toBeDefined();
      expect(calledWith.tools).toHaveLength(1);
      expect(calledWith.tools[0].function.name).toBe("get_weather");
    });
  });
  describe("Chat functionality", () => {
    it("should call provider's chat method and return completion", async () => {
      const request: ChatRequest = {
        model: "gpt-4.1",
        system: "You are a test assistant.",
        content: [{ role: "user", content: "Hello world" }],
      };

      const response = await client.chat(request);

      // provider의 chat 함수가 1번 호출되었는지 확인합니다.
      expect(mockChat).toHaveBeenCalledTimes(1); // 반환된 응답 확인
      expect(response.id).toBe("test-completion");
      expect(response.choices[0].message.content).toBe("Hello world");
      expect(response.usage?.total_tokens).toBe(15);
    });

    it("should handle chat with thinking mode", async () => {
      // Mock chat with thinking
      mockChat.mockResolvedValueOnce({
        id: "test-thinking",
        object: "chat.completion",
        created: Date.now(),
        model: "claude-sonnet-4",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "The answer is 42",
              thinking: "Let me think about this...",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
          thinking_tokens: 5,
        },
      });

      const request: ChatRequest = {
        model: "claude-sonnet-4",
        system: "Think carefully.",
        content: [{ role: "user", content: "What is the meaning of life?" }],
        thinking: true,
      };

      const response = await client.chat(request);

      expect(mockChat).toHaveBeenCalledTimes(1);
      const calledWith = mockChat.mock.calls[0][0];
      expect(calledWith.thinking).toBe(true); // Response에 thinking이 포함되었는지 확인
      expect(response.choices[0].message.thinking).toBe(
        "Let me think about this..."
      );
      expect(response.usage?.thinking_tokens).toBe(5);
    });

    it("should handle chat with tool calls", async () => {
      // Mock chat with tool calls
      mockChat.mockResolvedValueOnce({
        id: "test-tools",
        object: "chat.completion",
        created: Date.now(),
        model: "gpt-4.1",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "call_123",
                  type: "function",
                  function: {
                    name: "get_weather",
                    arguments: '{"location": "Seoul"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      });

      const request: ChatRequest = {
        model: "gpt-4.1",
        system: "You have access to tools.",
        content: [{ role: "user", content: "What's the weather in Seoul?" }],
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get weather",
              parameters: { type: "object" },
            },
          },
        ],
      };

      const response = await client.chat(request);
      expect(response.choices[0].message.tool_calls).toBeDefined();
      expect(response.choices[0].message.tool_calls?.[0].function.name).toBe(
        "get_weather"
      );
    });
  });
  describe("Feature support", () => {
    it("should warn when using unsupported features", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Create client with debug enabled
      const debugClient = new HChat(
        { apiKey: "test-key", debug: true },
        new MockMCPManager()
      );

      // Gemini doesn't support tools
      const request: ChatRequest = {
        model: "gemini-2.5-pro",
        system: "System",
        content: [{ role: "user", content: "Test" }],
        tools: [
          {
            type: "function",
            function: {
              name: "test_tool",
              description: "Test tool",
            },
          },
        ],
      };

      await debugClient.chat(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[HChat]",
        "Warning: Model gemini-2.5-pro does not support tools"
      );

      consoleSpy.mockRestore();
    });

    it("should disable thinking mode for unsupported models", async () => {
      const request: ChatRequest = {
        model: "gpt-4.1", // GPT doesn't support thinking
        system: "System",
        content: [{ role: "user", content: "Test" }],
        thinking: true,
      };

      await client.chat(request);

      const calledWith = mockChat.mock.calls[0][0];
      expect(calledWith.thinking).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("should throw error for unknown model", async () => {
      const request: ChatRequest = {
        model: "unknown-model",
        system: "System",
        content: [{ role: "user", content: "Test" }],
      };
      await expect(client.chat(request)).rejects.toThrow(
        "Unknown model provider for: unknown-model"
      );
    });
  });
});
