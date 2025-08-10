/**
 * Server-Sent Events (SSE) 파서
 */
export class SSEParser {
  private buffer = "";
  private decoder = new TextDecoder();

  /**
   * Response를 SSE 이벤트 스트림으로 변환
   */
  async *parse(response: Response): AsyncIterableIterator<SSEEvent> {
    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 청크를 버퍼에 추가
        this.buffer += this.decoder.decode(value, { stream: true });

        // 완성된 이벤트들을 파싱
        yield* this.extractEvents();
      }

      // 마지막 버퍼 처리
      if (this.buffer.trim()) {
        yield* this.extractEvents(true);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private *extractEvents(flush = false): Generator<SSEEvent> {
    // SSE 이벤트는 '\n\n'으로 구분됩니다. [1, 2]
    const eventBlocks = this.buffer.split("\n\n");

    // 마지막 블록은 불완전할 수 있으므로, flush 모드가 아니라면 버퍼에 다시 저장합니다.
    if (!flush) {
      this.buffer = eventBlocks.pop() || "";
    } else {
      this.buffer = "";
    }

    for (const eventBlock of eventBlocks) {
      if (!eventBlock.trim()) {
        continue;
      }

      // 각 이벤트 블록마다 새로운 event 객체와 dataLines 배열을 생성합니다.
      const event: Partial<SSEEvent> = {};
      const dataLines: string[] = [];

      const lines = eventBlock.split("\n");
      for (const line of lines) {
        // 주석 라인은 무시합니다. [1]
        if (line.startsWith(":")) {
          continue;
        }

        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) {
          // 필드 이름이 없는 라인은 무시합니다.
          continue;
        }

        const field = line.slice(0, separatorIndex);
        // value에서 공백만 제거하도록.trim() 대신.replace(/^ /, "") 사용도 가능합니다.
        const value = line.slice(separatorIndex + 1).trim();

        switch (field) {
          case "event":
            event.event = value;
            break;
          case "data":
            // 여러 줄의 'data' 필드를 지원하기 위해 배열에 추가합니다. [2]
            dataLines.push(value);
            break;
          case "id":
            event.id = value;
            break;
          case "retry":
            const retryValue = parseInt(value, 10);
            if (!isNaN(retryValue)) {
              event.retry = retryValue;
            }
            break;
        }
      }

      // 여러 줄의 data를 하나의 문자열로 합칩니다.
      if (dataLines.length > 0) {
        event.data = dataLines.join("\n");
        yield event as SSEEvent;
      }
    }
  }

  reset() {
    this.buffer = "";
  }
}

export interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * SSE 스트림을 JSON 객체 스트림으로 변환
 */
export async function* parseSSEStream<T = any>(
  response: Response,
  options?: {
    onEvent?: (event: SSEEvent) => void;
    dataPrefix?: string; // 일부 API는 "data: " 없이 바로 JSON을 보냄
  }
): AsyncIterableIterator<T> {
  const parser = new SSEParser();

  for await (const event of parser.parse(response)) {
    // 콜백 처리
    if (options?.onEvent) {
      options.onEvent(event);
    }

    // 종료 신호 처리
    if (event.data === "[DONE]" || event.data === "DONE") {
      break;
    }

    // JSON 파싱
    try {
      const json = JSON.parse(event.data);
      yield json;
    } catch (e) {
      // JSON 파싱 실패시 무시 (또는 로깅)
      console.debug("Failed to parse SSE data as JSON:", event.data);
    }
  }
}
