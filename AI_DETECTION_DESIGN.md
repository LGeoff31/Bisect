# AI-Powered Repository Detection Design

Instead of hardcoding all edge cases, use AI/LLM to analyze repositories and determine:
- Package manager to use
- Dependencies to install
- Commands to run
- Port configuration
- Environment variables needed

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Repository Analysis Pipeline            │
├─────────────────────────────────────────────────┤
│  1. Collect Repository Context                 │
│     - Read package.json files                  │
│     - Read lock files                          │
│     - Read .env files                          │
│     - Analyze directory structure              │
│     - Read dev scripts                         │
│                                                 │
│  2. Build Context Prompt                       │
│     - Structure repository info                │
│     - Include relevant files                   │
│                                                 │
│  3. AI Analysis                                │
│     - Send to LLM (OpenAI/Anthropic/Local)    │
│     - Get structured response                  │
│                                                 │
│  4. Execute AI Recommendations                 │
│     - Install dependencies                     │
│     - Run post-install scripts                 │
│     - Start dev server                         │
└─────────────────────────────────────────────────┘
```

---

## Context Collection

### What to Collect

```typescript
interface RepositoryContext {
  // Structure
  rootPackageJson?: PackageJson;
  packageJsonFiles: Array<{
    path: string;
    relativePath: string;
    content: PackageJson;
  }>;
  
  // Lock files
  lockFiles: Array<{
    path: string;
    type: 'npm' | 'pnpm' | 'yarn';
  }>;
  
  // Environment
  envFiles: Array<{
    path: string;
    content: string;
  }>;
  
  // Scripts
  devScripts: Array<{
    path: string;
    script: string;
  }>;
  
  // Structure
  directoryStructure: {
    depth: number;
    hasFrontend: boolean;
    hasBackend: boolean;
    isMonorepo: boolean;
    frontendPaths: string[];
    backendPaths: string[];
  };
  
  // Framework indicators
  frameworkIndicators: {
    nextjs: boolean;
    vite: boolean;
    react: boolean;
    express: boolean;
    // ... etc
  };
}
```

---

## AI Prompt Design

### System Prompt

```
You are an expert at analyzing Node.js/JavaScript repositories and determining:
1. Which package manager to use (npm, pnpm, yarn)
2. What dependencies need to be installed
3. How to start the development server
4. What port to use (avoid port 3000)
5. What environment variables are needed
6. What post-install scripts to run

Given a repository structure, provide a JSON response with your analysis.
```

### User Prompt Template

```json
{
  "repository": {
    "rootPackageJson": {
      "name": "...",
      "scripts": {...},
      "dependencies": {...},
      "devDependencies": {...},
      "packageManager": "...",
      "workspaces": [...]
    },
    "packageJsonFiles": [
      {
        "path": "frontend/package.json",
        "relativePath": "frontend",
        "content": {...}
      }
    ],
    "lockFiles": [
      {"path": "pnpm-lock.yaml", "type": "pnpm"}
    ],
    "envFiles": [
      {"path": ".env", "content": "PORT=3000\n..."}
    ],
    "devScripts": [
      {"path": "frontend/package.json", "script": "next dev"}
    ],
    "directoryStructure": {
      "depth": 2,
      "hasFrontend": true,
      "hasBackend": true,
      "isMonorepo": false,
      "frontendPaths": ["frontend"],
      "backendPaths": ["backend"]
    },
    "frameworkIndicators": {
      "nextjs": true,
      "vite": false,
      "react": true
    }
  },
  "requirements": {
    "mainAppPort": 3000,
    "availablePortRange": [3001, 3100],
    "needDevServer": true
  }
}
```

### Expected AI Response

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
      "reason": "Root workspace, installs all workspace dependencies"
    },
    {
      "directory": "frontend",
      "command": "pnpm install",
      "reason": "Frontend app dependencies"
    },
    {
      "directory": "backend",
      "command": "yarn install",
      "reason": "Backend uses yarn (has yarn.lock)"
    }
  ],
  "postInstallScripts": [
    {
      "directory": "backend",
      "command": "npx prisma generate",
      "reason": "Prisma client needs generation",
      "schemaPath": "backend/prisma/schema.prisma"
    }
  ],
  "devServer": {
    "directory": "frontend",
    "command": "npx next dev -p 3001",
    "port": 3001,
    "reason": "Next.js app, use -p flag to avoid PORT env var conflicts",
    "envVars": {
      "PORT": "3001",
      "NEXT_PUBLIC_API_URL": "http://localhost:3002"
    },
    "removeEnvVars": ["PORT"]  // Remove from .env files
  },
  "backendServer": {
    "directory": "backend",
    "command": "npm run dev",
    "port": 3002,
    "envVars": {
      "PORT": "3002",
      "DATABASE_URL": "..."
    }
  },
  "warnings": [
    "Backend has PORT=3000 in .env, will override to 3002"
  ],
  "confidence": 0.95
}
```

---

## Implementation Options

### Option 1: OpenAI API

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeRepository(context: RepositoryContext) {
  const prompt = buildPrompt(context);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(prompt, null, 2) }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1  // Low temperature for consistent results
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

**Pros:**
- Very accurate
- Handles edge cases well
- Can explain reasoning

**Cons:**
- Requires API key
- Costs money per request
- Network latency
- Rate limits

### Option 2: Anthropic Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function analyzeRepository(context: RepositoryContext) {
  const prompt = buildPrompt(context);
  
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: JSON.stringify(prompt, null, 2) }
    ]
  });
  
  return JSON.parse(response.content[0].text);
}
```

**Pros:**
- Excellent reasoning
- Good at structured output
- Long context window

**Cons:**
- More expensive
- API key required
- Network dependency

### Option 3: Local LLM (Ollama/Llama)

```typescript
async function analyzeRepository(context: RepositoryContext) {
  const prompt = buildPrompt(context);
  
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama2:13b',
      prompt: SYSTEM_PROMPT + '\n\n' + JSON.stringify(prompt, null, 2),
      stream: false,
      format: 'json'
    })
  });
  
  return await response.json();
}
```

**Pros:**
- No API costs
- No rate limits
- Privacy (runs locally)
- Fast (no network latency)

**Cons:**
- Requires local setup
- Less accurate than GPT-4
- Needs good hardware
- Model management

### Option 4: Hybrid Approach (Recommended)

```typescript
async function analyzeRepository(context: RepositoryContext) {
  // Try local LLM first (fast, free)
  try {
    const localResult = await analyzeWithLocalLLM(context);
    if (localResult.confidence > 0.8) {
      return localResult;
    }
  } catch (error) {
    // Fallback to cloud if local fails
  }
  
  // Fallback to cloud LLM (accurate, costs money)
  return await analyzeWithCloudLLM(context);
}
```

---

## Implementation Strategy

### Phase 1: Basic AI Detection

```typescript
// lib/ai-repository-analyzer.ts

interface AnalysisResult {
  packageManager: string;
  installCommands: InstallCommand[];
  devServerCommand: string;
  port: number;
  envVars: Record<string, string>;
  confidence: number;
}

export async function analyzeRepository(
  repoDir: string
): Promise<AnalysisResult> {
  // 1. Collect context
  const context = await collectRepositoryContext(repoDir);
  
  // 2. Build prompt
  const prompt = buildAnalysisPrompt(context);
  
  // 3. Get AI analysis
  const analysis = await callLLM(prompt);
  
  // 4. Validate and return
  return validateAnalysis(analysis);
}
```

### Phase 2: Caching

```typescript
// Cache analysis results by repo structure hash
const cache = new Map<string, AnalysisResult>();

async function analyzeRepository(repoDir: string) {
  const hash = await getRepoStructureHash(repoDir);
  
  if (cache.has(hash)) {
    return cache.get(hash);
  }
  
  const analysis = await performAnalysis(repoDir);
  cache.set(hash, analysis);
  return analysis;
}
```

### Phase 3: Learning from Failures

```typescript
// If AI recommendation fails, learn from it
async function executeWithLearning(command: string, analysis: AnalysisResult) {
  try {
    await executeCommand(command);
  } catch (error) {
    // Log failure for future learning
    await logFailure(analysis, error);
    
    // Try fallback
    return await tryFallback(analysis);
  }
}
```

---

## Prompt Engineering

### Minimal Context (Fast, Cheap)

```typescript
const minimalPrompt = {
  rootPackageJson: readPackageJson(repoDir),
  lockFiles: findLockFiles(repoDir),
  devScript: getDevScript(repoDir)
};
```

### Full Context (Accurate, Expensive)

```typescript
const fullPrompt = {
  // All package.json files
  packageJsonFiles: findAllPackageJsonFiles(repoDir),
  
  // All lock files
  lockFiles: findAllLockFiles(repoDir),
  
  // All .env files
  envFiles: findAllEnvFiles(repoDir),
  
  // Directory structure
  directoryStructure: analyzeDirectoryStructure(repoDir),
  
  // Framework indicators
  frameworkIndicators: detectFrameworks(repoDir),
  
  // Git info
  gitInfo: {
    branch: getCurrentBranch(repoDir),
    hasChanges: hasUncommittedChanges(repoDir)
  }
};
```

### Smart Context (Balanced)

```typescript
// Only include relevant context based on initial analysis
const smartPrompt = {
  rootPackageJson: readPackageJson(repoDir),
  
  // Only if monorepo detected
  ...(isMonorepo ? { workspacePackages: findWorkspacePackages(repoDir) } : {}),
  
  // Only if Prisma detected
  ...(hasPrisma ? { prismaSchema: findPrismaSchema(repoDir) } : {}),
  
  // Only if .env exists
  ...(hasEnvFiles ? { envFiles: readEnvFiles(repoDir) } : {})
};
```

---

## Cost Analysis

### OpenAI GPT-4 Turbo
- Input: ~$0.01 per 1K tokens
- Output: ~$0.03 per 1K tokens
- Average request: ~2000 tokens = $0.08
- 100 repos/day = $8/day = $240/month

### Anthropic Claude Opus
- Input: ~$0.015 per 1K tokens
- Output: ~$0.075 per 1K tokens
- Average request: ~2000 tokens = $0.18
- 100 repos/day = $18/day = $540/month

### Local LLM (Ollama)
- One-time: Hardware cost
- Ongoing: Electricity (~$10-50/month)
- No per-request cost

### Hybrid Approach
- 80% local (free)
- 20% cloud (fallback)
- Cost: ~$48-108/month

---

## Example Implementation

### Basic Version

```typescript
// lib/ai-repository-analyzer.ts

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert at analyzing Node.js repositories.
Given repository information, determine:
1. Package manager to use (npm/pnpm/yarn)
2. Installation commands
3. Dev server startup command
4. Port configuration (avoid 3000)
5. Environment variables needed

Respond with valid JSON only.`;

export async function analyzeRepository(repoDir: string) {
  // Collect context
  const context = {
    rootPackageJson: await readPackageJson(repoDir),
    packageJsonFiles: await findAllPackageJsonFiles(repoDir),
    lockFiles: await findLockFiles(repoDir),
    envFiles: await findEnvFiles(repoDir),
    devScripts: await getDevScripts(repoDir)
  };
  
  // Build prompt
  const userPrompt = JSON.stringify(context, null, 2);
  
  // Call AI
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });
  
  const analysis = JSON.parse(response.choices[0].message.content);
  
  // Validate
  if (analysis.confidence < 0.7) {
    throw new Error('Low confidence analysis');
  }
  
  return analysis;
}
```

### Usage in Dev Server Manager

```typescript
// lib/dev-server-manager.ts

export async function startDevServer(repoId: string, repoDir: string) {
  // Use AI to analyze repository
  const analysis = await analyzeRepository(repoDir);
  
  // Execute AI recommendations
  for (const installCmd of analysis.installCommands) {
    await executeCommand(installCmd.command, {
      cwd: path.join(repoDir, installCmd.directory)
    });
  }
  
  // Run post-install scripts
  for (const script of analysis.postInstallScripts) {
    await executeCommand(script.command, {
      cwd: path.join(repoDir, script.directory)
    });
  }
  
  // Start dev server
  const port = analysis.devServer.port;
  const command = analysis.devServer.command;
  
  await spawnDevServer(command, {
    cwd: path.join(repoDir, analysis.devServer.directory),
    env: {
      ...process.env,
      ...analysis.devServer.envVars
    }
  });
  
  return { port, appType: analysis.devServer.type };
}
```

---

## Advantages of AI Approach

### ✅ Flexibility
- Handles new frameworks automatically
- Adapts to unusual structures
- No hardcoded rules

### ✅ Accuracy
- Understands context
- Can reason about edge cases
- Explains decisions

### ✅ Maintainability
- Less code to maintain
- No need to update for new frameworks
- Self-improving (with learning)

### ✅ User Experience
- Better error messages (AI explains why)
- Suggestions for fixes
- Handles complex scenarios

---

## Disadvantages

### ❌ Cost
- API costs for cloud LLMs
- Or hardware costs for local LLMs

### ❌ Latency
- Network delay for cloud APIs
- Processing time for local LLMs

### ❌ Reliability
- API outages
- Rate limits
- Inconsistent responses

### ❌ Debugging
- Harder to debug AI decisions
- Less predictable behavior

---

## Recommended Approach

### Hybrid: AI + Rule-Based Fallback

```typescript
async function analyzeRepository(repoDir: string) {
  // 1. Try simple rule-based detection first (fast, free)
  const ruleBased = await detectWithRules(repoDir);
  if (ruleBased.confidence > 0.9) {
    return ruleBased;
  }
  
  // 2. Use AI for complex cases (slower, costs money)
  try {
    const aiAnalysis = await analyzeWithAI(repoDir);
    if (aiAnalysis.confidence > 0.8) {
      return aiAnalysis;
    }
  } catch (error) {
    // AI failed, fallback to rules
  }
  
  // 3. Fallback to conservative defaults
  return getDefaultAnalysis(repoDir);
}
```

This gives us:
- **Fast path** for common cases (rule-based)
- **Smart path** for edge cases (AI)
- **Safe path** if all else fails (defaults)

---

## Next Steps

1. **Implement basic AI analyzer**
   - Start with OpenAI API
   - Simple prompt, basic context

2. **Add caching**
   - Cache by repo structure hash
   - Reduce API calls

3. **Add rule-based fallback**
   - Common cases handled without AI
   - AI only for edge cases

4. **Add local LLM option**
   - Ollama integration
   - User choice: local vs cloud

5. **Add learning**
   - Log failures
   - Improve prompts over time

