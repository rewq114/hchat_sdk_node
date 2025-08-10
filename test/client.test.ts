import "jest";
import { HChat } from "../src/client";
import { ChatRequest } from "../src/types/request.types";
import { MockMCPManager } from "./mock-mcp";

// Provider들을 모킹하여 실제 네트워크 요청을 방지합니다.
const mockStream = jest.fn();
jest.mock("../src/providers/openai.provider", () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    stream: mockStream,
  })),
}));
jest.mock("../src/providers/claude.provider", () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => ({
    stream: mockStream,
  })),
}));
jest.mock("../src/providers/gemini.provider", () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    stream: mockStream,
  })),
}));

describe("HChat Client - Unit Tests", () => {
  let client: HChat;

  beforeEach(() => {
    // 각 테스트 전에 mock 함수를 초기화합니다.
    mockStream.mockClear();

    // 실제 API 키가 필요 없는 테스트용 클라이언트를 생성합니다.
    client = new HChat(
      { apiKey: "test-key", debug: false },
      new MockMCPManager()
    );
  });

  it("should call provider's stream with correctly formatted simple request", async () => {
    const request: ChatRequest = {
      model: "gpt-4o-mini",
      system: "You are a test assistant.",
      content: [{ role: "user", content: "Hello world" }],
    };

    // stream 함수를 호출합니다. 실제로는 아무것도 반환하지 않아도 됩니다.
    // 우리는 stream 함수가 내부적으로 provider를 잘 호출하는지만 검증할 것입니다.
    for await (const _ of client.stream(request)) {
    }

    // provider의 stream 함수가 1번 호출되었는지 확인합니다.
    expect(mockStream).toHaveBeenCalledTimes(1);

    // provider에게 전달된 인자(ChatRequest)가 올바른지 확인합니다.
    const calledWith = mockStream.mock.calls[0][0];
    expect(calledWith.model).toBe("gpt-4o-mini");
    expect(calledWith.system).toBe("You are a test assistant.");
    expect(calledWith.content).toEqual([
      { role: "user", content: "Hello world" },
    ]);
  });

  it("should call provider's stream with multimodal content", async () => {
    const request: ChatRequest = {
      model: "gemini-1.5-flash-latest",
      system: "System prompt",
      content: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image_url: {
                url: "",
              },
            },
          ],
        },
      ],
    };

    for await (const _ of client.stream(request)) {
    }

    expect(mockStream).toHaveBeenCalledTimes(1);
    const calledWith = mockStream.mock.calls[0][0];

    const userMessageContent = calledWith.content[0].content;
    expect(userMessageContent).toBeInstanceOf(Array);
    expect(userMessageContent).toHaveLength(2);
    expect(userMessageContent[0].type).toBe("text");
    expect(userMessageContent[0].text).toContain("file content"); // 파일 내용이 텍스트에 포함되는지 확인
    expect(userMessageContent[1].type).toBe("image");
    expect(userMessageContent[1].image_url.url).toContain("base64_image_data");
  });

  //   it("should call provider's stream with prepared MCP tools", async () => {
  //     const request: ChatRequest = {
  //       model: "claude-3-haiku-20240307",
  //       system: "You are a helpful agent.",
  //       content: [
  //         { role: "user", content: "List files in the current directory." },
  //       ],
  //       tools: ["filesystem"], // MCP 툴 사용 요청
  //     };

  //     for await (const _ of client.stream(request)) {
  //     }

  //     expect(mockStream).toHaveBeenCalledTimes(1);
  //     const calledWith = mockStream.mock.calls[0][0];

  //     expect(calledWith.tools).toBeDefined();
  //     expect(calledWith.tools.length).toBe(2); // MockMCPManager가 반환하는 filesystem 툴 2개
  //     expect(calledWith.tools[0].name).toContain("filesystem");
  //   });

  it("should call provider's stream with advanced config for thinking mode", async () => {
    const request: ChatRequest = {
      model: "gemini-1.5-flash-latest",
      system: "Think carefully.",
      content: [{ role: "user", content: "A complex question." }],
      thinking: true, // Thinking 모드 활성화
    };

    for await (const _ of client.stream(request)) {
    }

    expect(mockStream).toHaveBeenCalledTimes(1);
    const calledWith = mockStream.mock.calls[0][0];

    expect(calledWith.advanced).toBeDefined();
    expect(calledWith.advanced.gemini.thinking_mode).toBe(true);
  });
});
