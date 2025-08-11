import { ChatRequest, HChat } from "../src";
import dotenv from "dotenv";

// .env 파일에서 환경변수 로드
dotenv.config();
const client = new HChat({
  apiKey: process.env.HCHAT_API_KEY!,
  debug: false,
});

async function basicExample(model: string = "gpt-4.1") {
  console.log("🔷 Basic Text Generation");

  const request: ChatRequest = {
    model: model,
    system: "You are a helpful assistant.",
    content: [
      {
        role: "user",
        content: "한국의 전통 음식 3가지를 소개해주세요.",
      },
    ],
  };
  const response = await client.chat(request);

  console.log("\n📝 Response:");
  console.log(response.choices[0].message.content);

  if (response.usage) {
    console.log("\n📊 Token Usage:");
    console.log(`  - Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`  - Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`  - Total tokens: ${response.usage.total_tokens}`);
  }

  console.log("\n✅ Complete!");
}

async function streamExample(model: string = "gpt-4.1") {
  console.log("🔷 Stream Text Generation");

  const request: ChatRequest = {
    model: model,
    system: "You are a helpful assistant.",
    content: [
      {
        role: "user",
        content: "한국의 전통 음식 3가지를 소개해주세요.",
      },
    ],
  };

  let response = "";
  for await (const chunk of client.stream(request)) {
    process.stdout.write(chunk);
    response += chunk;
  }

  console.log("\n\n✅ Complete!");
}

async function chatThinkingExample(model: string = "gpt-4.1") {
  console.log("🤔 Thinking Mode (Non-stream)");

  const request: ChatRequest = {
    model: model,
    system: "You are a helpful assistant.",
    content: [
      {
        role: "user",
        content: `문제: 1부터 100까지의 자연수 중에서 3의 배수의 합을 구하세요. 
단계별로 생각하며 풀이해주세요.`,
      },
    ],
    thinking: true,
  };
  const response = await client.chat(request);

  // Thinking process를 먼저 표시
  if (response.choices[0].message.thinking) {
    console.log("\n🤔 Thinking Process:");
    console.log(response.choices[0].message.thinking);
  }

  console.log("\n📝 Response:");
  console.log(response.choices[0].message.content);

  if (response.usage) {
    console.log("\n📊 Token Usage:");
    console.log(`  - Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`  - Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`  - Total tokens: ${response.usage.total_tokens}`);
    if (response.usage.thinking_tokens) {
      console.log(`  - Thinking tokens: ${response.usage.thinking_tokens}`);
    }
  }

  console.log("\n✅ Complete!");
}

async function streamThinkingExample(model: string = "gpt-4.1") {
  console.log("🤔 Thinking Mode (Stream)");

  const request: ChatRequest = {
    model: model,
    system: "You are a helpful assistant.",
    content: [
      {
        role: "user",
        content: `문제: 1부터 100까지의 자연수 중에서 3의 배수의 합을 구하세요.`,
      },
    ],
    thinking: true,
  };

  let response = "";
  for await (const chunk of client.stream(request)) {
    process.stdout.write(chunk);
    response += chunk;
  }

  console.log("\n\n✅ Complete!");
}

async function chatWithToolsExample(model: string = "gpt-4.1") {
  console.log("🔧 Tool Use Example (Non-stream)");

  const request: ChatRequest = {
    model: model,
    system: "You are a helpful assistant with access to tools.",
    content: [
      {
        role: "user",
        content: `오늘 서울의 날씨는 어떤가요?`,
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

  console.log("\n📝 Response:");
  const message = response.choices[0].message;

  if (message.tool_calls && message.tool_calls.length > 0) {
    console.log("\n🔧 Tool Calls:");
    for (const toolCall of message.tool_calls) {
      console.log(`  - Function: ${toolCall.function.name}`);
      console.log(`    Arguments: ${toolCall.function.arguments}`);
    }
  } else {
    console.log(message.content);
  }

  if (response.usage) {
    console.log("\n📊 Token Usage:");
    console.log(`  - Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`  - Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`  - Total tokens: ${response.usage.total_tokens}`);
  }

  console.log("\n✅ Complete!");
}

async function runExamples() {
  // 모델 선택
  const model = "gpt-4.1";
  // const model = "gpt-4o";
  // const model = "gemini-2.5-flash";
  // const model = "gemini-2.5-pro";
  // const model = "claude-sonnet-4";
  // const model = "claude-opus-4";

  console.log(`\n🚀 Testing with model: ${model}\n`);
  console.log("=".repeat(50));

  try {
    // 1. 기본 채팅 (비스트림)
    await basicExample(model);
    console.log("\n" + "=".repeat(50) + "\n");

    // 2. 스트림 채팅
    await streamExample(model);
    console.log("\n" + "=".repeat(50) + "\n");

    // 3. Thinking 모드 (비스트림)
    await chatThinkingExample(model);
    console.log("\n" + "=".repeat(50) + "\n");

    // 4. Thinking 모드 (스트림)
    await streamThinkingExample(model);
    console.log("\n" + "=".repeat(50) + "\n");

    // 5. Tool 사용 예제
    await chatWithToolsExample(model);
  } catch (error: any) {
    // 깨끗한 에러 표시
    console.error("\n❌ 에러 발생:");
    console.error(error.message);

    // 디버그 모드일 때만 상세 정보 표시
    if (error.originalError && process.env.DEBUG === "true") {
      console.error("\n🔍 상세 에러:", error.originalError);
    }
  }
}

// 실행
runExamples().catch(console.error);
