import { HChat } from "../src";

async function simpleStringExample() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY || "",
    debug: true,
  });

  console.log("String Input Examples\n");

  // Example 1: 가장 간단한 string 입력
  console.log("1. Simple string input:");
  const response1 = await client.chat({
    model: "gpt-4",
    system: "You are a helpful assistant",
    content: "Hello! How are you?", // 간단한 string
  });
  console.log("Response:", response1.choices[0].message.content);

  console.log("\n" + "=".repeat(60) + "\n");

  // Example 2: 기존 방식 (RequestMessage[] 사용)
  console.log("2. Traditional RequestMessage[] input:");
  const response2 = await client.chat({
    model: "gpt-4",
    system: "You are a helpful assistant",
    content: [
      {
        role: "user",
        content: "What's the weather like?",
      },
      {
        role: "assistant",
        content: "I don't have access to real-time weather data. Could you tell me your location?",
      },
      {
        role: "user",
        content: "I'm in Seoul, South Korea.",
      },
    ],
  });
  console.log("Response:", response2.choices[0].message.content);

  console.log("\n" + "=".repeat(60) + "\n");

  // Example 3: Stream with string input
  console.log("3. Stream with simple string:");
  const stream = client.stream({
    model: "gpt-4",
    system: "You are a creative writer",
    content: "Write a haiku about programming", // 간단한 string
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  console.log("\n");
}

// Run the example
simpleStringExample().catch(console.error);