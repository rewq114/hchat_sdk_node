import { HChat, UnifiedRequest } from "../src";
import { MockMCPManager } from "../test/mock-mcp";

class ManualMode {
  constructor(private llmClient: HChat) {}

  async *execute(config: {
    model: string;
    systemPrompt: string;
    query: string;
    mcpServers?: string[];
    thinking?: boolean;
    attachments?: {
      images?: string[];
      files?: Array<{ name: string; content: string }>;
    };
  }) {
    const request: UnifiedRequest = {
      model: config.model,
      system: config.systemPrompt,
      content: {
        text: config.query,
        images: config.attachments?.images,
        files: config.attachments?.files,
      },
      mcpServers: config.mcpServers,
      thinking: config.thinking,
    };

    yield* this.llmClient.stream(request);
  }
}

async function runManualMode() {
  const mcpManager = new MockMCPManager();
  const client = new HChat(
    { apiKey: process.env.HCHAT_API_KEY!, debug: true },
    mcpManager
  );

  const manualMode = new ManualMode(client);

  console.log("🔷 Manual Mode Example");
  console.log("MCP Servers: filesystem, git");
  console.log("Thinking: enabled\n");

  const sampleCode = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

  for await (const chunk of manualMode.execute({
    model: "gemini-2.5-pro",
    systemPrompt: "You are an expert code reviewer.",
    query: "이 코드를 최적화해주세요.",
    mcpServers: ["filesystem", "git"],
    thinking: true,
    attachments: {
      files: [{ name: "fibonacci.js", content: sampleCode }],
    },
  })) {
    process.stdout.write(chunk);
  }
}

runManualMode().catch(console.error);
