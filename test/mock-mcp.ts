import { MCPManager, MCPTool } from "../src/types";

export class MockMCPManager implements MCPManager {
  private tools: Map<string, MCPTool[]> = new Map([
    [
      "filesystem",
      [
        {
          name: "read_file",
          description: "Read contents of a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
            },
            required: ["path"],
          },
        },
        {
          name: "write_file",
          description: "Write contents to a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: "string" },
            },
            required: ["path", "content"],
          },
        },
      ],
    ],
    [
      "git",
      [
        {
          name: "status",
          description: "Get git status",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    ],
    [
      "jira",
      [
        {
          name: "list_issues",
          description: "List JIRA issues",
          inputSchema: {
            type: "object",
            properties: {
              project: { type: "string" },
            },
          },
        },
      ],
    ],
  ]);

  async listTools(serverName: string): Promise<MCPTool[]> {
    return this.tools.get(serverName) || [];
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: any
  ): Promise<any> {
    const serverTools = this.tools.get(serverName);
    if (!serverTools) {
      throw new Error(`Server ${serverName} not found`);
    }

    const tool = serverTools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found in ${serverName}`);
    }

    // Simulate tool execution
    switch (toolName) {
      case "read_file":
        return {
          content: `Mock content of ${args.path}`,
        };
      case "write_file":
        return {
          success: true,
          path: args.path,
        };
      case "status":
        return {
          branch: "main",
          changes: [],
        };
      case "list_issues":
        return {
          issues: [
            { id: "PROJ-123", title: "Test issue" },
            { id: "PROJ-124", title: "Another issue" },
          ],
        };
      default:
        return { result: "Mock result" };
    }
  }
}
