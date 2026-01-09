# Contributing to Counsel MCP Server

Thank you for your interest in contributing to the Counsel MCP Server! This document provides guidelines and information for contributors.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building something together.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/counsel-mcp-server.git
   cd counsel-mcp-server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```

### Running Locally

```bash
npm run start
```

The server will start at `http://localhost:3000`.

## Development Workflow

### Branching

- Create a feature branch from `main`:
  ```bash
  git checkout -b feature/your-feature-name
  ```
- Use descriptive branch names: `feature/add-new-tool`, `fix/oauth-redirect`, `docs/update-readme`

### Making Changes

1. Make your changes in the appropriate files
2. Follow existing code style and patterns
3. Add tests for new functionality
4. Update documentation if needed

### Code Style

- **TypeScript**: Use strict mode, proper types (avoid `any`)
- **ES Modules**: Use `.js` extension in imports
- **Formatting**: Follow existing patterns (consider adding Prettier in the future)
- **Naming**: Use descriptive names, camelCase for variables/functions, PascalCase for types/classes

### Testing

Run the test suite before submitting:

```bash
npm test
```

For watch mode during development:

```bash
npm run test:watch
```

### Committing

- Write clear, concise commit messages
- Use present tense: "Add feature" not "Added feature"
- Reference issues when applicable: "Fix OAuth redirect (#123)"

### Security Checks

This project includes automated secret detection to prevent accidental leakage of API keys and tokens.

**Pre-commit Hook**

A pre-commit hook automatically scans staged files for potential secrets before each commit. If secrets are detected, the commit will be blocked.

**Manual Security Scan**

```bash
# Scan staged files
npm run security:check

# Scan all tracked files
npm run security:check:all
```

**Detected Patterns**

The scanner detects:
- API keys and secret keys
- Bearer tokens
- AWS credentials
- GitHub tokens (PAT, OAuth, etc.)
- npm tokens
- Slack tokens
- Stripe keys
- Private keys
- Passwords and generic tokens

**False Positives**

If you encounter a false positive:
1. Add the file pattern to `.secretsignore`
2. Use placeholder values like `your_api_key_here`
3. Reference environment variables (`process.env.API_KEY`)

## Adding New Tools

Tools are the core functionality of the MCP server. To add a new tool:

1. Create or edit a file in `src/tools/`:

```typescript
import { z } from "zod";
import { apiClient } from "../client.js";

export const TOOLS = {
  my_new_tool: {
    name: "my_new_tool",
    description: "Clear description of what this tool does",
    schema: {
      param1: z.string().describe("Description of param1"),
      param2: z.number().optional().describe("Optional param2"),
    },
    handler: async (args: { param1: string; param2?: number }) => {
      const response = await apiClient.post("/endpoint", args);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    }
  }
};
```

2. Import and register in `src/index.ts`:

```typescript
import { TOOLS as MY_TOOLS } from "./tools/my_tools.js";

// In the start action:
for (const tool of Object.values(MY_TOOLS)) {
  mcpServer.tool(tool.name, tool.schema, tool.handler);
}
```

3. Add tests in `tests/`:

```typescript
import { describe, it, expect } from 'vitest';

describe('my_new_tool', () => {
  it('should do something', async () => {
    // Test implementation
  });
});
```

## Submitting Changes

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request against `main`
5. Fill out the PR template with:
   - Description of changes
   - Related issues
   - Testing performed

### PR Review

- PRs require review before merging
- Address review feedback promptly
- Keep discussions constructive

## Reporting Issues

### Bug Reports

Include:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, OS, MCP client)
- Relevant logs or error messages

### Feature Requests

Include:
- Description of the feature
- Use case / motivation
- Proposed implementation (if any)

## Questions?

- Open a [GitHub Discussion](https://github.com/mercurialsolo/counsel-mcp/discussions)
- Check existing issues and discussions first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
