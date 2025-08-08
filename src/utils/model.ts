import { ModelProvider } from '../types';

export function getModelProvider(model: string): ModelProvider {
  const lowerModel = model.toLowerCase();
  
  if (lowerModel.startsWith('gpt-')) {
    return 'openai';
  } else if (lowerModel.startsWith('claude-')) {
    return 'claude';
  } else if (lowerModel.startsWith('gemini-')) {
    return 'gemini';
  }
  
  throw new Error(`Unknown model provider for: ${model}`);
}

export const MODEL_INFO = {
  // OpenAI
  'gpt-4.1': {
    provider: 'openai',
    context_window: 128000,
    max_output_tokens: 4096,
    supports_vision: true,
    supports_tools: true,
    supports_streaming: true,
    supports_json_mode: true
  },
  'gpt-4.1-mini': {
    provider: 'openai',
    context_window: 128000,
    max_output_tokens: 4096,
    supports_vision: true,
    supports_tools: true,
    supports_streaming: true,
    supports_json_mode: true
  },
  // Claude
  'claude-opus-4': {
    provider: 'claude',
    context_window: 200000,
    max_output_tokens: 4096,
    supports_vision: true,
    supports_tools: true,
    supports_streaming: true,
    supports_json_mode: false
  },
  'claude-3-5-sonnet-v2': {
    provider: 'claude',
    context_window: 200000,
    max_output_tokens: 8192,
    supports_vision: true,
    supports_tools: true,
    supports_streaming: true,
    supports_json_mode: false
  },
  // Gemini
  'gemini-2.0-flash': {
    provider: 'gemini',
    context_window: 1000000,
    max_output_tokens: 8192,
    supports_vision: true,
    supports_tools: true,
    supports_streaming: true,
    supports_json_mode: true
  }
};