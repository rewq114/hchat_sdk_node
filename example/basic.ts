import { HChat } from '../src';

async function main() {
  const client = new HChat({
    apiKey: process.env.HCHAT_API_KEY!,
    debug: true
  });

  // 1. 간단한 텍스트 생성
  const answer = await client.complete('한국의 수도는?');
  console.log('Answer:', answer);

  // 2. 멀티모달 (이미지 분석)
  const imageResponse = await client.generate({
    model: 'claude-3-5-sonnet-v2',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: '이 이미지를 설명해주세요' },
        { type: 'image', image_url: { url: 'data:image/jpeg;base64,...' } }
      ]
    }]
  });

  // 3. Tool calling
  const toolResponse = await client.generate({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: '서울 날씨 알려줘' }],
    tools: [{
      type: 'function',
      function: {
        name: 'get_weather',
        description: '날씨 정보를 가져옵니다',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          },
          required: ['location']
        }
      }
    }]
  });

  // 4. 스트리밍
  console.log('\nStreaming:');
  for await (const chunk of client.stream({
    model: 'gemini-2.0-flash',
    messages: [{ role: 'user', content: '짧은 이야기를 들려줘' }]
  })) {
    process.stdout.write(chunk.choices[0].delta.content || '');
  }
  console.log('\n');

  // 5. Thinking 모드 (Gemini 2.0)
  const thinkingResponse = await client.generate({
    model: 'gemini-2.0-flash',
    messages: [{ role: 'user', content: '복잡한 수학 문제...' }],
    advanced: {
      gemini: {
        thinking_mode: true,
        thinking_budget: 30000
      }
    }
  });
  
  console.log('Thinking tokens:', thinkingResponse.metadata?.thinking_tokens);
}

main().catch(console.error);