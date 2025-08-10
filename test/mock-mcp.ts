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
    // Mock 응답
    if (serverName === "filesystem" && toolName === "read_file") {
      return { content: "File content here..." };
    }
    return { success: true, data: "Mock response" };
  }
}
