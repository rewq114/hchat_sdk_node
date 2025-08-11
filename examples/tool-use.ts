import { dot } from "node:test/reporters";
import { ChatRequest, HChat, RequestMessage } from "../src";
import dotenv from "dotenv";

dotenv.config();

// Tool calling example with all providers
async function toolUseExample() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY!,
    debug: false,
  });

  // Test different models
  const models = ["gpt-4.1", "claude-sonnet-4", "gemini-2.5-pro"];

  for (const model of models) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔧 Testing Tool Use with ${model}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      await testBasicToolCall(client, model);
      await testMultipleTools(client, model);
      await testToolCallWithResponse(client, model);
    } catch (error) {
      console.error(`Error with ${model}:`, error);
    }
  }
}

// Basic tool call test
async function testBasicToolCall(client: HChat, model: string) {
  console.log("📌 Basic Tool Call Test");

  const request: ChatRequest = {
    model,
    system: "You are a helpful assistant with access to tools.",
    content: [
      {
        role: "user",
        content: "What's the weather like in Seoul and Tokyo?",
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

  const response = await client.chat(request);
  const message = response.choices[0].message;

  console.log("\n🤖 Assistant Response:");
  if (message.tool_calls && message.tool_calls.length > 0) {
    console.log("Tool calls detected:");
    for (const toolCall of message.tool_calls) {
      console.log(`- Function: ${toolCall.function.name}`);
      console.log(`  Arguments: ${toolCall.function.arguments}`);
      console.log(`  ID: ${toolCall.id}`);
    }
  } else {
    console.log(message.content);
  }
}

// Multiple tools test
async function testMultipleTools(client: HChat, model: string) {
  console.log("\n📌 Multiple Tools Test");

  const request: ChatRequest = {
    model,
    system: "You are a helpful assistant with access to various tools.",
    content: [
      {
        role: "user",
        content: "Convert 100 USD to EUR and tell me the weather in Paris.",
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

  const response = await client.chat(request);
  const message = response.choices[0].message;

  console.log("\n🤖 Assistant Response:");
  if (message.tool_calls && message.tool_calls.length > 0) {
    console.log("Tool calls detected:");
    for (const toolCall of message.tool_calls) {
      console.log(`- Function: ${toolCall.function.name}`);
      console.log(`  Arguments: ${toolCall.function.arguments}`);
    }
  } else {
    console.log(message.content);
  }
}

// Tool call with response test
async function testToolCallWithResponse(client: HChat, model: string) {
  console.log("\n📌 Tool Call with Response Test");

  // First request - assistant will call the tool
  const messages: RequestMessage[] = [
    {
      role: "user",
      content: "What's the weather like in Seoul?",
    },
  ];

  const firstRequest: ChatRequest = {
    model,
    system: "You are a helpful assistant with access to weather data.",
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
    ],
  };

  const firstResponse = await client.chat(firstRequest);
  const assistantMessage = firstResponse.choices[0].message;

  console.log("\n🤖 First Response (Tool Call):");
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    // Add assistant's message with tool calls to history
    // OpenAI requires the exact message format including tool_calls
    const assistantMsg: any = {
      role: "assistant",
      content: assistantMessage.content || "",
    };

    // tool_calls must be included in the message
    if (assistantMessage.tool_calls) {
      assistantMsg.tool_calls = assistantMessage.tool_calls;
    }

    messages.push(assistantMsg);

    // Simulate tool execution
    for (const toolCall of assistantMessage.tool_calls) {
      console.log(`Calling function: ${toolCall.function.name}`);
      console.log(`With arguments: ${toolCall.function.arguments}`);

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

    // Second request with tool results
    const secondRequest: ChatRequest = {
      model,
      system: firstRequest.system,
      content: messages,
    };

    console.log("\n📊 Tool Execution Results:");
    const secondResponse = await client.chat(secondRequest);
    console.log(secondResponse.choices[0].message.content);
  } else {
    console.log("No tool calls made");
    console.log(assistantMessage.content);
  }
}

// Simulate tool execution
function simulateToolExecution(functionName: string, args: any): any {
  console.log(`\n🔨 Simulating ${functionName} execution...`);

  switch (functionName) {
    case "get_weather":
      return {
        location: args.location,
        temperature: 22,
        unit: args.unit || "celsius",
        description: "Partly cloudy",
        humidity: 65,
        wind_speed: 10,
      };

    case "currency_converter":
      const rate = 0.85; // Simulated exchange rate
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
toolUseExample().catch(console.error);
