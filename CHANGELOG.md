# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-08-11

### Added

- Initial release of h-chat-sdk
- Support for multiple AI models:
  - OpenAI (GPT-4, GPT-4o)
  - Claude (Sonnet-4, Opus-4)
  - Gemini (2.5-flash, 2.5-pro)
- Core features:
  - Text generation with streaming support
  - Tool/Function calling capabilities
  - Thinking mode (Claude models)
  - Vision/Image support
  - TypeScript support with full type definitions
- Convenient response shortcuts for easier access
- Provider-specific error handling with helpful suggestions
- Modular architecture for easy extension

### Security

- API keys are handled securely
- No credentials are logged or exposed

[0.1.0]: https://github.com/rewq114/hchat_sdk_node/releases/tag/v0.1.0
