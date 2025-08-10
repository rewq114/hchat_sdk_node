export interface StreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: ChunkDelta;
    finish_reason?: string | null;
  }>;
  usage?: any;
}

export interface ChunkDelta {
  role?: "assistant";
  content?: string;
  thinking?: string; // 새로 추가
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}
