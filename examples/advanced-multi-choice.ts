import { HChat } from "../src";
import dotenv from "dotenv";

// .env 파일에서 환경변수 로드
dotenv.config();

async function multiChoiceExample() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY || "",
    debug: true,
  });

  console.log("🎯 Multiple Choices Example\n");

  // 여러 개의 응답을 생성하는 예제
  const request = {
    model: "gpt-4",
    system: "You are a creative writer. Provide different variations.",
    content: "Write a one-line slogan for a coffee shop",
    // n: 3, // 3개의 다른 응답 생성 (현재 API가 지원하는 경우)
    temperature: 0.9, // 더 창의적인 응답을 위해 높은 temperature
  };

  const response = await client.chat(request);

  // 일반적인 사용 - shortcuts 사용
  console.log("🔹 Quick Access (Default):");
  console.log(`Content: ${response.content}`);
  console.log(`Finish Reason: ${response.finish_reason}`);

  console.log("\n" + "=".repeat(60) + "\n");

  // 고급 사용 - 전체 choices 접근
  console.log("🔸 Full Choices Access:");
  response.choices.forEach((choice, index) => {
    console.log(`\nChoice ${index + 1}:`);
    console.log(`  Content: ${choice.message.content}`);
    console.log(`  Finish Reason: ${choice.finish_reason}`);
  });

  // Agent mode에서 활용 예시
  console.log("\n" + "=".repeat(60) + "\n");
  console.log("🤖 Agent Mode Usage Example:");
  
  // 여러 응답 중 가장 짧은 것 선택
  const shortestResponse = response.choices
    .sort((a, b) => a.message.content.length - b.message.content.length)[0];
  
  console.log(`Shortest slogan: ${shortestResponse.message.content}`);
  
  // 특정 키워드가 포함된 응답 찾기
  const keywordResponse = response.choices
    .find(choice => choice.message.content.toLowerCase().includes('coffee'));
  
  if (keywordResponse) {
    console.log(`Response with 'coffee': ${keywordResponse.message.content}`);
  }
}

// Thinking mode with shortcuts
async function thinkingWithShortcuts() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY || "",
    debug: false,
  });

  console.log("\n" + "=".repeat(60) + "\n");
  console.log("🤔 Thinking Mode with Shortcuts\n");

  const response = await client.chat({
    model: "claude-sonnet-4",
    system: "You are a math tutor",
    content: "What is 15% of 240? Think step by step.",
    thinking: true,
  });

  // shortcuts를 사용한 간단한 접근
  if (response.thinking) {
    console.log("💭 Thinking:");
    console.log(response.thinking);
    console.log();
  }

  console.log("📝 Answer:");
  console.log(response.content);
}

// Tool calls with shortcuts
async function toolsWithShortcuts() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY || "",
    debug: false,
  });

  console.log("\n" + "=".repeat(60) + "\n");
  console.log("🔧 Tool Calls with Shortcuts\n");

  const response = await client.chat({
    model: "gpt-4",
    system: "You are a helpful assistant with access to tools.",
    content: "What's the weather like in Seoul and Tokyo?",
    tools: [{
      type: "function",
      function: {
        name: "get_weather",
        description: "Get weather for a city",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string" }
          },
          required: ["city"]
        }
      }
    }]
  });

  // shortcuts를 사용한 간단한 접근
  if (response.tool_calls) {
    console.log("🔧 Tool Calls:");
    response.tool_calls.forEach(call => {
      console.log(`- ${call.function.name}(${call.function.arguments})`);
    });
  } else {
    console.log("📝 Response:", response.content);
  }
}

// 실행
async function runExamples() {
  try {
    await multiChoiceExample();
    await thinkingWithShortcuts();
    await toolsWithShortcuts();
  } catch (error) {
    console.error("Error:", error);
  }
}

runExamples();