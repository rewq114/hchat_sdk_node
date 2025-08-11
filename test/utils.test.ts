import "jest";
import { getModelProvider } from "../src/utils/model";
import { parseSSEStream } from "../src/utils/sse-parser";

describe("Utils Tests", () => {
  describe("getModelProvider", () => {
    it("should return correct provider for OpenAI models", () => {
      expect(getModelProvider("gpt-4")).toBe("openai");
      expect(getModelProvider("gpt-4.1")).toBe("openai");
      expect(getModelProvider("gpt-4o")).toBe("openai");
      expect(getModelProvider("gpt-4o-mini")).toBe("openai");
    });

    it("should return correct provider for Claude models", () => {
      expect(getModelProvider("claude-sonnet-4")).toBe("claude");
      expect(getModelProvider("claude-opus-4")).toBe("claude");
      expect(getModelProvider("claude-3-opus")).toBe("claude");
    });

    it("should return correct provider for Gemini models", () => {
      expect(getModelProvider("gemini-2.5-flash")).toBe("gemini");
      expect(getModelProvider("gemini-2.5-pro")).toBe("gemini");
      expect(getModelProvider("gemini-1.5-pro")).toBe("gemini");
    });

    it("should throw error for unknown model", () => {
      expect(() => getModelProvider("unknown-model")).toThrow(
        "Unknown model provider for: unknown-model"
      );
    });
  });

  describe("SSE Parser", () => {
    it("should parse SSE stream correctly", async () => {
      const mockResponse = {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"test": "value1"}\n\n')
            );
            controller.enqueue(
              new TextEncoder().encode('data: {"test": "value2"}\n\n')
            );
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
      } as Response;

      const results: any[] = [];
      for await (const data of parseSSEStream(mockResponse)) {
        results.push(data);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ test: "value1" });
      expect(results[1]).toEqual({ test: "value2" });
    });

    it("should handle multi-line data", async () => {
      const mockResponse = {
        body: new ReadableStream({
          start(controller) {
            // Send a proper multi-line SSE message
            // SSE parser needs each data line prefixed with "data: "
            controller.enqueue(new TextEncoder().encode('data: {"test":\n'));
            controller.enqueue(
              new TextEncoder().encode('data: "multiline"}\n')
            );
            controller.enqueue(
              new TextEncoder().encode("\n") // Empty line to end the event
            );
            controller.close();
          },
        }),
      } as Response;

      const results: any[] = [];
      for await (const data of parseSSEStream(mockResponse)) {
        results.push(data);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ test: "multiline" });
    });

    it("should skip non-data events", async () => {
      const mockResponse = {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("event: ping\n\n"));
            controller.enqueue(
              new TextEncoder().encode('data: {"test": "value"}\n\n')
            );
            controller.enqueue(new TextEncoder().encode(": comment\n\n"));
            controller.close();
          },
        }),
      } as Response;

      const results: any[] = [];
      for await (const data of parseSSEStream(mockResponse)) {
        results.push(data);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ test: "value" });
    });

    it("should handle errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();

      const mockResponse = {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode("data: invalid json\n\n")
            );
            controller.enqueue(
              new TextEncoder().encode('data: {"valid": "json"}\n\n')
            );
            controller.close();
          },
        }),
      } as Response;

      const results: any[] = [];
      for await (const data of parseSSEStream(mockResponse)) {
        results.push(data);
      }

      // Should skip invalid JSON and continue
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ valid: "json" });

      // Check that error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse SSE data as JSON:",
        "invalid json"
      );

      consoleSpy.mockRestore();
    });
  });
});
