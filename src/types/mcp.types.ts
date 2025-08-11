export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPManager {
  listTools(serverName: string): Promise<MCPTool[]>;
  callTool(serverName: string, toolName: string, args: any): Promise<any>;
}

export interface HChatConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
}
