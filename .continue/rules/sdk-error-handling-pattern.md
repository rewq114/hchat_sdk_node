---
description: Apply this pattern when designing SDK error handling and feature
  detection mechanisms
alwaysApply: false
---

When building SDKs, avoid hardcoding feature support matrices or model capabilities. Instead, let the server determine what's supported and provide clear, actionable error messages when features are not available. This keeps the SDK flexible and reduces maintenance burden.