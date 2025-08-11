import { HChat } from "../src";

async function errorHandlingExample() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY || "",
    debug: true,
  });

  console.log("Error Handling Examples\n");

  // Example 1: Thinking not supported
  try {
    console.log("1. Trying thinking mode with unsupported model...");
    await client.chat({
      model: "gpt-4",
      content: "Hello, can you think about this?",
      thinking: true,
    });
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Example 2: Tools not supported
  try {
    console.log("2. Trying tools with unsupported model...");
    await client.chat({
      model: "gemini-2.5-flash",
      content: "What's the weather?",
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Get weather information",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string" },
              },
            },
          },
        },
      ],
    });
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Example 3: Successful request after following suggestion
  try {
    console.log("3. Following the suggestion and using supported model...");
    const response = await client.chat({
      model: "claude-sonnet-4",
      content: "Hello! Can you think about what makes a good SDK?",
      thinking: true,
    });
    console.log("✅ Success!");
    console.log(
      `Response: ${response.choices[0].message.content?.substring(0, 100)}...`
    );
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run the example
errorHandlingExample().catch(console.error);
