import { describe, it, expect } from 'vitest';

describe('Counsel MCP Server', () => {
  it('should have correct configuration defaults', async () => {
    const { config } = await import('../src/config.js');
    expect(config.COUNSEL_API_URL).toBe('https://counsel.getmason.dev');
  });
});
