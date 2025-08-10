import { ChatRequest, HChat } from "../src";

async function basicExample(model: string = "gpt-4.1") {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY!,
    debug: true,
  });

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

  let response = "";
  for await (const chunk of client.stream(request)) {
    process.stdout.write(chunk);
    response += chunk;
  }

  console.log("\n\n✅ Complete!");
}

async function thinkingExample(model: string = "gpt-4.1") {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY!,
    debug: true,
  });

  console.log("🔷 Thinking Text Generation");

  const request: ChatRequest = {
    model: model,
    system: "You are a helpful assistant.",
    content: [
      {
        role: "user",
        content: `한국의 전통 음식 3가지를 소개해주세요.`,
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

// Run
// const model =  "gpt-4.1";
const model = "gemini-2.5-flash";
// const model = "gemini-2.5-pro";
// const model = "claude-sonnet-4";
// basicExample(model).catch(console.error);
thinkingExample(model).catch(console.error);
