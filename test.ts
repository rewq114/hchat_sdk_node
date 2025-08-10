#!/usr/bin/env ts-node
// test.ts
import { HChat, UnifiedRequest } from "./src";

async function quickTest() {
  console.log("🧪 H-Chat SDK Quick Test\n");

  const apiKey = process.env.HCHAT_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: HCHAT_API_KEY environment variable not set");
    console.log('Please set: export HCHAT_API_KEY="your-api-key"');
    process.exit(1);
  }

  const client = new HChat({
    apiKey,
    debug: true,
  });

  // Test 1: Simple request
  console.log("Test 1: Simple text generation");
  const request1: UnifiedRequest = {
    model: "gpt-4.1-mini",
    system: "You are a test assistant. Keep responses very brief.",
    content: { text: 'Say "Test successful" in Korean.' },
  };

  try {
    let result = "";
    for await (const chunk of client.stream(request1)) {
      process.stdout.write(chunk);
      result += chunk;
    }
    console.log("\n✅ Test 1 passed\n");
  } catch (error) {
    console.error("❌ Test 1 failed:", error);
  }

  // Test 2: With file
  console.log("Test 2: With file attachment");
  const request2: UnifiedRequest = {
    model: "gpt-4.1-mini",
    system: "You are a code reviewer. Be brief.",
    content: {
      text: "Is this code correct?",
      files: [
        {
          name: "test.js",
          content: 'console.log("Hello, World!");',
        },
      ],
    },
  };

  try {
    let result = "";
    let chunkCount = 0;
    for await (const chunk of client.stream(request2)) {
      result += chunk;
      chunkCount++;
      if (chunkCount > 50) break; // Limit for testing
    }
    console.log(result.slice(0, 100) + "...");
    console.log("✅ Test 2 passed\n");
  } catch (error) {
    console.error("❌ Test 2 failed:", error);
  }

  console.log("🎉 All tests completed!");
}

quickTest().catch(console.error);
