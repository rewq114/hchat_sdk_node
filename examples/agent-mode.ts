import { HChat, UnifiedRequest } from "../src";
import { MockMCPManager } from "../test/mock-mcp";

interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  preferredModel: string;
  assignedMCPServers: string[];
  capabilities: {
    thinking?: boolean;
    vision?: boolean;
  };
}

class AgentMode {
  private agents: Map<string, Agent> = new Map([
    [
      "dev-agent",
      {
        id: "dev-agent",
        name: "개발 도우미",
        systemPrompt: `You are an expert software developer. 
        You help with code reviews, debugging, and optimization.
        Always provide clear explanations and best practices.`,
        preferredModel: "claude-opus-4",
        assignedMCPServers: ["filesystem", "git"],
        capabilities: { thinking: true },
      },
    ],
    [
      "research-agent",
      {
        id: "research-agent",
        name: "리서치 도우미",
        systemPrompt: `You are a research assistant.
        You help analyze documents, find information, and create reports.
        Be thorough and cite your sources.`,
        preferredModel: "gemini-2.0-flash",
        assignedMCPServers: ["jira", "confluence"],
        capabilities: { thinking: true, vision: true },
      },
    ],
  ]);

  constructor(private llmClient: HChat) {}

  async *execute(agentId: string, query: string) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    console.log(`\n🤖 Using Agent: ${agent.name}`);
    console.log(`📦 Model: ${agent.preferredModel}`);
    console.log(`🔧 MCP Servers: ${agent.assignedMCPServers.join(", ")}\n`);

    const request: UnifiedRequest = {
      model: agent.preferredModel,
      system: agent.systemPrompt,
      content: { text: query },
      mcpServers: agent.assignedMCPServers,
      thinking: agent.capabilities.thinking,
    };

    yield* this.llmClient.stream(request);
  }
}

async function runAgentMode() {
  const mcpManager = new MockMCPManager();
  const client = new HChat(
    { apiKey: process.env.HCHAT_API_KEY!, debug: true },
    mcpManager
  );

  const agentMode = new AgentMode(client);

  console.log("🔷 Agent Mode Example");

  // Dev Agent 사용
  for await (const chunk of agentMode.execute(
    "dev-agent",
    "React 프로젝트 구조를 추천해주세요."
  )) {
    process.stdout.write(chunk);
  }
}

runAgentMode().catch(console.error);
