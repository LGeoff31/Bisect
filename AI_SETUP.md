# AI-Powered Repository Detection Setup

This guide explains how to set up AI-powered repository analysis to automatically detect package managers, installation commands, and dev server configuration.

## Why Use AI?

Instead of hardcoding all possible repository structures, AI can:
- ✅ Handle new frameworks automatically
- ✅ Understand complex monorepo setups
- ✅ Adapt to unusual structures
- ✅ Explain its decisions
- ✅ Handle edge cases we haven't thought of

## Setup Options

### Option 1: OpenAI (Recommended for Accuracy)

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add to `.env`:
   ```bash
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4-turbo-preview  # Optional, defaults to gpt-4-turbo-preview
   ```

**Cost:** ~$0.08 per repository analysis
**Accuracy:** ⭐⭐⭐⭐⭐

### Option 2: Anthropic Claude

1. Get an API key from [Anthropic](https://console.anthropic.com/)
2. Add to `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

**Cost:** ~$0.18 per repository analysis
**Accuracy:** ⭐⭐⭐⭐⭐

### Option 3: Local LLM (Ollama) - Free!

1. Install [Ollama](https://ollama.ai/)
2. Pull a model:
   ```bash
   ollama pull llama2:13b
   # or
   ollama pull mistral:7b
   ```
3. Add to `.env` (optional, defaults shown):
   ```bash
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama2:13b
   ```

**Cost:** Free (runs locally)
**Accuracy:** ⭐⭐⭐ (depends on model)

### Option 4: No AI (Rule-Based Fallback)

If no AI is configured, the system automatically falls back to rule-based detection (current behavior).

## How It Works

### Flow Diagram

```
User Starts Dev Server
    │
    ▼
Check if AI configured?
    │
    ├─► Yes → Try AI Analysis
    │   │
    │   ├─► Success (confidence ≥ 0.7)
    │   │   └─► Use AI Recommendations
    │   │       ├─► Install dependencies (all packages)
    │   │       ├─► Run post-install scripts
    │   │       └─► Start dev server with AI command
    │   │
    │   └─► Fail/Low Confidence
    │       └─► Fallback to Rules
    │
    └─► No → Use Rule-Based Detection
        └─► Current behavior
```

### AI Analysis Process

1. **Collect Context**
   - Read all `package.json` files
   - Find lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`)
   - Read `.env` files
   - Analyze directory structure

2. **Send to AI**
   - Build structured prompt
   - Call LLM API
   - Get JSON response

3. **Execute Recommendations**
   - Install dependencies for all packages
   - Run post-install scripts (Prisma, etc.)
   - Start dev server with correct command and port

## Example AI Response

```json
{
  "packageManager": {
    "root": "pnpm",
    "packages": {
      "frontend": "pnpm",
      "backend": "yarn"
    }
  },
  "installCommands": [
    {
      "directory": ".",
      "command": "pnpm install",
      "packageManager": "pnpm",
      "reason": "Root workspace, installs all workspace dependencies"
    },
    {
      "directory": "frontend",
      "command": "pnpm install",
      "packageManager": "pnpm",
      "reason": "Frontend app dependencies"
    },
    {
      "directory": "backend",
      "command": "yarn install",
      "packageManager": "yarn",
      "reason": "Backend uses yarn (has yarn.lock)"
    }
  ],
  "postInstallScripts": [
    {
      "directory": "backend",
      "command": "npx prisma generate",
      "reason": "Prisma client needs generation"
    }
  ],
  "devServer": {
    "directory": "frontend",
    "command": "npx next dev -p 3001",
    "port": 3001,
    "type": "nextjs",
    "envVars": {
      "PORT": "3001"
    },
    "removeEnvVars": ["PORT"],
    "reason": "Next.js app, use -p flag to avoid PORT env var conflicts"
  },
  "warnings": [],
  "confidence": 0.95
}
```

## Cost Optimization

### Caching (Future Enhancement)

Analysis results can be cached by repository structure hash:
- Same repo structure = cached result
- Reduces API calls
- Faster startup

### Hybrid Approach (Current)

- **Common cases:** Handled by rules (fast, free)
- **Edge cases:** Handled by AI (accurate, costs money)
- **Fallback:** Rules if AI fails

## Testing

### Test Without AI

Just don't set any API keys - system uses rule-based detection.

### Test With AI

1. Set up API key (see options above)
2. Start dev server
3. Check logs for:
   ```
   [Dev Server] Using AI analysis (openai)...
   [Dev Server] AI analysis confidence: 0.95
   [Dev Server] Using AI-powered analysis
   ```

### Test Local LLM

1. Start Ollama:
   ```bash
   ollama serve
   ```
2. Pull model:
   ```bash
   ollama pull llama2:13b
   ```
3. Set `OLLAMA_URL` in `.env` (or use default)
4. Start dev server

## Troubleshooting

### AI Analysis Fails

**Symptom:** Logs show "AI analysis failed, falling back to rules"

**Causes:**
- Invalid API key
- Network error
- Rate limit exceeded
- Invalid response format

**Solution:** System automatically falls back to rules - no action needed

### Low Confidence

**Symptom:** "Low AI confidence (0.6), falling back to rules"

**Causes:**
- Unusual repository structure
- AI unsure about recommendations

**Solution:** Falls back to rules automatically, or improve prompt

### High Costs

**Symptom:** API costs too high

**Solutions:**
1. Use local LLM (Ollama) - free
2. Add caching (future)
3. Use AI only for edge cases
4. Use cheaper model (gpt-3.5-turbo instead of gpt-4)

## Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Ollama (Local)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2:13b
```

## Next Steps

1. **Choose a provider** (OpenAI recommended for best results)
2. **Set API key** in `.env`
3. **Test with a repository**
4. **Monitor costs** (if using cloud AI)
5. **Consider caching** for production use

## Benefits

- ✅ **Handles edge cases** automatically
- ✅ **Adapts to new frameworks** without code changes
- ✅ **Better error messages** (AI explains why)
- ✅ **Less code to maintain**
- ✅ **Self-improving** (can learn from failures)

## Drawbacks

- ❌ **Costs money** (cloud AI) or **requires setup** (local AI)
- ❌ **Network latency** (cloud AI)
- ❌ **Less predictable** than hardcoded rules
- ❌ **Requires API key** management

## Recommendation

**Start with rule-based** (current behavior), then **add AI for edge cases**:
- Use rules for common cases (fast, free)
- Use AI when rules fail or confidence is low
- Best of both worlds!

