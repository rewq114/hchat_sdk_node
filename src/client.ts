import { ChatRequest, HChatConfig, MCPManager } from "./types";
import { BaseProvider } from "./providers/base.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { ClaudeProvider } from "./providers/claude.provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { getModelProvider } from "./utils/model";

export class HChat {
  private providers: Map<string, BaseProvider> = new Map();
  private mcpManager?: MCPManager;

  constructor(private config: HChatConfig, mcpManager?: MCPManager) {
    this.mcpManager = mcpManager;
    this.initProviders();
  }

  private initProviders() {
    this.providers.set("openai", new OpenAIProvider(this.config));
    this.providers.set("claude", new ClaudeProvider(this.config));
    this.providers.set("gemini", new GeminiProvider(this.config));
  }

  /**
   * 통합 스트림 인터페이스
   */
  async *stream(request: ChatRequest): AsyncIterable<string> {
    // 1. Provider 선택
    const providerName = getModelProvider(request.model);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not found for model: ${request.model}`);
    }

    if (request.tools === undefined) {
      request.tools = [];
    }

    // 2. Provider 요청 생성
    const chatRequest: ChatRequest = {
      model: request.model,
      system: request.system,
      content: request.content,
      stream: request.stream ? request.stream : false, // 기본 false
      thinking: request.thinking ? request.thinking : false, // 기본 false
      max_tokens: request.max_tokens ? request.max_tokens : 4096,
      temperature: request.temperature ? request.temperature : 0.7,
      tools: request.tools.length > 0 ? request.tools : undefined,
      advanced: request.advanced ? request.advanced : undefined,
    };

    // 추후 chat이냐 stream이냐에 따라 분기 수행

    for await (const chunk of provider.stream(chatRequest)) {
      // OpenAI SDK의 chunk 형식에 맞게 처리
      if (chunk.choices?.[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }

      // Tool call 처리
      if (chunk.choices?.[0]?.delta?.tool_calls) {
        if (this.config.debug) {
          console.log("Tool call detected:", chunk.choices[0].delta.tool_calls);
        }
      }
    }
  }

  // private async prepareMCPTools(
  //   serverNames: string[]
  // ): Promise<ToolDefinition[]> {
  //   if (!this.mcpManager || serverNames.length === 0) {
  //     return [];
  //   }

  //   const tools: ToolDefinition[] = [];

  //   for (const serverName of serverNames) {
  //     try {
  //       const serverTools = await this.mcpManager.listTools(serverName);

  //       for (const mcpTool of serverTools) {
  //         tools.push({
  //           type: "function",
  //           function: {
  //             name: `${serverName}_${mcpTool.name}`,
  //             description: mcpTool.description,
  //             parameters: mcpTool.inputSchema,
  //           },
  //         });
  //       }
  //     } catch (error) {
  //       console.error(`Failed to load tools from ${serverName}:`, error);
  //     }
  //   }

  //   if (this.config.debug) {
  //     console.log(
  //       `Loaded ${tools.length} tools from ${serverNames.length} MCP servers`
  //     );
  //   }

  //   return tools;
  // }
}
