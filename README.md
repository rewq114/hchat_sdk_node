# h-chat-sdk

현대자동차그룹 H-Chat API를 위한 TypeScript SDK

## 특징

- 🚀 **다중 모델 지원**: OpenAI, Claude, Gemini 모델 통합 지원
- 💬 **편리한 입력**: string 또는 RequestMessage[] 형식 모두 지원
- 🔄 **스트리밍 지원**: 실시간 응답 스트리밍
- 🛠️ **도구 사용**: Function calling 지원
- 🎯 **스마트 에러 처리**: 명확한 에러 메시지와 해결 방법 제공
- 📝 **TypeScript 지원**: 완전한 타입 지원

## 설치

```bash
npm install h-chat-sdk
```

## 환경 설정

`.env` 파일을 생성하고 API 키를 설정하세요:

```bash
HCHAT_API_KEY=your_api_key_here
```

## 빠른 시작

### 기본 사용법 (간단한 string 입력)

```typescript
import { HChat } from "h-chat-sdk";

const client = new HChat({
  apiKey: process.env.HCHAT_API_KEY,
});

// 가장 간단한 방법
const response = await client.chat({
  model: "gpt-4",
  system: "You are a helpful assistant",
  content: "Hello! How are you?", // 간단한 string 입력
});

console.log(response.content);
```

### 대화 컨텍스트 관리

```typescript
// 여러 메시지를 포함한 대화
const response = await client.chat({
  model: "gpt-4",
  system: "You are a helpful assistant",
  content: [
    { role: "user", content: "What is TypeScript?" },
    {
      role: "assistant",
      content: "TypeScript is a typed superset of JavaScript...",
    },
    { role: "user", content: "Can you give me an example?" },
  ],
});
```

### 스트리밍 응답

```typescript
const stream = client.stream({
  model: "gpt-4",
  system: "You are a helpful assistant",
  content: "Tell me a story",
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### 도구 사용 (Function Calling)

```typescript
const response = await client.chat({
  model: "gpt-4",
  content: "What is the weather in Seoul?",
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get weather information for a location",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string", description: "City name" },
          },
          required: ["location"],
        },
      },
    },
  ],
});
```

## 에러 처리

SDK는 지원하지 않는 기능 사용 시 명확한 가이드를 제공합니다:

```typescript
try {
  await client.chat({
    model: 'gemini-2.5-flash',
    content: 'Hello',
    tools: [...] // Gemini는 도구를 지원하지 않음
  });
} catch (error) {
  console.log(error.message);
  // 출력: "이 모델은 도구 사용을 지원하지 않습니다.
  //        💡 GPT-4나 Claude 모델을 사용하거나 도구 사용을 비활성화해주세요."
}
```

## API 참조

### ChatRequest

| 필드        | 타입                       | 필수 | 설명                                         |
| ----------- | -------------------------- | ---- | -------------------------------------------- |
| model       | string                     | ✅   | 사용할 모델 (예: 'gpt-4', 'claude-sonnet-4') |
| system      | string                     | ✅   | 시스템 프롬프트                              |
| content     | string \| RequestMessage[] | ✅   | 사용자 입력 (간단한 텍스트 또는 메시지 배열) |
| stream      | boolean                    | ❌   | 스트리밍 여부 (기본값: false)                |
| thinking    | boolean                    | ❌   | 사고 과정 표시 (Claude 모델만 지원)          |
| max_tokens  | number                     | ❌   | 최대 토큰 수 (기본값: 4096)                  |
| temperature | number                     | ❌   | 창의성 수준 0-2 (기본값: 0.7)                |
| tools       | ToolDefinition[]           | ❌   | 사용 가능한 도구 목록                        |

### ChatCompletion (Response)

기본 응답 구조:

```typescript
const response = await client.chat({...});

// 편리한 접근 (자동으로 choices[0] 참조)
response.content        // 응답 텍스트
response.thinking       // thinking 내용 (Claude/Gemini)
response.tool_calls     // 호출된 도구 리스트
response.finish_reason  // 종료 이유

// 고급 사용 (여러 응답 처리)
response.choices[0]     // 첫 번째 선택지
response.choices[1]     // 두 번째 선택지 (n > 1일 때)
```

## 지원 모델

- **OpenAI**: gpt-4.1, gpt-4o
- **Claude**: claude-sonnet-4, claude-opus-4
- **Gemini**: gemini-2.5-flash, gemini-2.5-pro

## 라이선스

MIT
