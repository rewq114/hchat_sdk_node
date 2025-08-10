import { HChat, UnifiedRequest } from "../src";

// Update Chat의 실제 사용 시뮬레이션
class UpdateChatSimulation {
  private llmClient: HChat;
  private chatHistory: Array<{ role: string; content: string }> = [];

  constructor() {
    this.llmClient = new HChat({
      apiKey: process.env.HCHAT_API_KEY!,
      debug: false,
    });
  }

  async sendMessage(
    text: string,
    options: {
      model?: string;
      mcpServers?: string[];
      thinking?: boolean;
      attachments?: any;
    } = {}
  ) {
    const request: UnifiedRequest = {
      model: options.model || "gpt-4.1-mini",
      system: "You are a helpful assistant in a chat application.",
      content: {
        text,
        images: options.attachments?.images,
        files: options.attachments?.files,
      },
      mcpServers: options.mcpServers,
      thinking: options.thinking,
    };

    console.log(`\n👤 User: ${text}`);
    console.log(`🤖 Assistant (${request.model}):`);

    let response = "";
    for await (const chunk of this.llmClient.stream(request)) {
      process.stdout.write(chunk);
      response += chunk;
    }

    // 히스토리에 추가
    this.chatHistory.push(
      { role: "user", content: text },
      { role: "assistant", content: response }
    );

    console.log("\n");
    return response;
  }
}

async function runUpdateChat() {
  console.log("🔷 Update Chat Simulation\n");

  const chat = new UpdateChatSimulation();

  // 첫 번째 메시지 (간단한 질문)
  await chat.sendMessage("안녕하세요!");

  // 두 번째 메시지 (모델 변경)
  await chat.sendMessage("TypeScript의 장점을 설명해주세요.", {
    model: "claude-3-5-sonnet-v2",
  });

  // 세 번째 메시지 (파일 첨부)
  await chat.sendMessage("이 코드를 리뷰해주세요.", {
    model: "claude-opus-4",
    thinking: true,
    attachments: {
      files: [
        {
          name: "example.ts",
          content: `
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  // TODO: implement
  return { id, name: 'Test' };
}
`,
        },
      ],
    },
  });
}

runUpdateChat().catch(console.error);
