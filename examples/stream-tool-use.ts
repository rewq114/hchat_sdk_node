import { ChatRequest, HChat, RequestMessage } from "../src";
// Stream tool calling example
async function streamToolUseExample() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY!,
    debug: true,
  });

  // Test different models
  const models = [
    "gpt-4.1",
    "claude-sonnet-4",
    // "gemini-2.5-pro", // Tool not supported
  ];

  for (const model of models) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔧 Testing Stream Tool Use with ${model}`);
    console.log(`${"-".repeat(60)}\n`);
    console.log(`${"=".repeat(60)}\n`);
    // 서버가 지원 여부를 판단하도록 함

    try {
      await testStreamBasicToolCall(client, model);
      await testStreamToolCallWithResponse(client, model);
    } catch (error) {
      console.error(`Error with ${model}:`, error);
    }
  }
}

// Basic stream tool call test
async function testStreamBasicToolCall(client: HChat, model: string) {
  console.log("📌 Stream Basic Tool Call Test");

  const request: ChatRequest = {
    model,
    system: "You are a helpful assistant with access to tools.",
    content: [
      {
        role: "user",
        content: "What's the weather like in Seoul?",
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the current weather for a location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city name",
              },
              unit: {
                type: "string",
                enum: ["celsius", "fahrenheit"],
                description: "Temperature unit",
              },
            },
            required: ["location"],
          },
        },
      },
    ],
  };

  console.log("\n🤖 Streaming Response:");
  let fullResponse = "";
  let toolCalls: any[] = [];

  for await (const chunk of client.stream(request)) {
    process.stdout.write(chunk);
    fullResponse += chunk;
  }

  console.log("\n\n✅ Stream completed");
}

// Stream tool call with response test
async function testStreamToolCallWithResponse(client: HChat, model: string) {
  console.log("\n📌 Stream Tool Call with Response Test");

  // First request - assistant will call the tool
  const messages: RequestMessage[] = [
    {
      role: "user",
      content:
        "What's the weather like in Seoul and Tokyo? Also convert 100 USD to KRW.",
    },
  ];

  const firstRequest: ChatRequest = {
    model,
    system:
      "You are a helpful assistant with access to weather and currency conversion tools.",
    content: messages,
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the current weather for a location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city name",
              },
            },
            required: ["location"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "currency_converter",
          description: "Convert currency from one to another",
          parameters: {
            type: "object",
            properties: {
              amount: {
                type: "number",
                description: "Amount to convert",
              },
              from_currency: {
                type: "string",
                description: "Source currency code (e.g., USD)",
              },
              to_currency: {
                type: "string",
                description: "Target currency code (e.g., EUR)",
              },
            },
            required: ["amount", "from_currency", "to_currency"],
          },
        },
      },
    ],
  };

  // First stream - get tool calls
  console.log("\n🔧 First Stream (Tool Calls):");
  const firstResponse = await client.chat(firstRequest);
  const assistantMessage = firstResponse.choices[0].message;

  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    console.log("\nTool calls detected:");

    // Add assistant's message with tool calls to history
    const assistantMsg: any = {
      role: "assistant",
      content: assistantMessage.content || "",
    };

    if (assistantMessage.tool_calls) {
      assistantMsg.tool_calls = assistantMessage.tool_calls;
    }

    messages.push(assistantMsg);

    // Simulate tool execution
    for (const toolCall of assistantMessage.tool_calls) {
      console.log(
        `- ${toolCall.function.name}: ${toolCall.function.arguments}`
      );

      // Add tool response to messages
      const toolResponse = simulateToolExecution(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );

      messages.push({
        role: "tool",
        content: JSON.stringify(toolResponse),
        tool_call_id: toolCall.id,
      });
    }

    // Second stream with tool results
    console.log("\n🔧 Second Stream (With Tool Results):");
    const secondRequest: ChatRequest = {
      model,
      system: firstRequest.system,
      content: messages,
    };

    let finalResponse = "";
    for await (const chunk of client.stream(secondRequest)) {
      process.stdout.write(chunk);
      finalResponse += chunk;
    }

    console.log("\n\n✅ Final stream completed");
  } else {
    console.log("No tool calls made");
    console.log(assistantMessage.content);
  }
}

// Simulate tool execution
function simulateToolExecution(functionName: string, args: any): any {
  switch (functionName) {
    case "get_weather":
      return {
        location: args.location,
        temperature: args.location === "Seoul" ? 22 : 18,
        unit: args.unit || "celsius",
        description: args.location === "Seoul" ? "Partly cloudy" : "Clear sky",
        humidity: args.location === "Seoul" ? 65 : 55,
        wind_speed: 10,
      };

    case "currency_converter":
      const rates: Record<string, Record<string, number>> = {
        USD: { KRW: 1320, EUR: 0.85, JPY: 150 },
        EUR: { USD: 1.18, KRW: 1550, JPY: 176 },
      };

      const rate = rates[args.from_currency]?.[args.to_currency] || 1;
      return {
        amount: args.amount,
        from: args.from_currency,
        to: args.to_currency,
        converted_amount: args.amount * rate,
        exchange_rate: rate,
      };

    default:
      return { error: "Unknown function" };
  }
}

// Run the example
streamToolUseExample().catch(console.error);
