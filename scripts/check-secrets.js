#!/usr/bin/env node

/**
 * Secret detection script to prevent accidental commits of API keys and tokens.
 * Run as part of pre-commit hook to scan staged files.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Patterns that indicate potential secrets
const SECRET_PATTERNS = [
  // Generic API keys
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi, name: 'API Key' },
  { pattern: /(?:secret[_-]?key|secretkey)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi, name: 'Secret Key' },

  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/g, name: 'Bearer Token' },

  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
  { pattern: /(?:aws[_-]?secret|secret[_-]?access[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9\/+=]{40}['"]/gi, name: 'AWS Secret Key' },

  // GitHub
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token' },
  { pattern: /ghu_[a-zA-Z0-9]{36}/g, name: 'GitHub User Token' },
  { pattern: /ghs_[a-zA-Z0-9]{36}/g, name: 'GitHub Server Token' },
  { pattern: /ghr_[a-zA-Z0-9]{36}/g, name: 'GitHub Refresh Token' },

  // npm
  { pattern: /npm_[a-zA-Z0-9]{36}/g, name: 'npm Token' },

  // Slack
  { pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g, name: 'Slack Token' },

  // Stripe
  { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, name: 'Stripe Live Secret Key' },
  { pattern: /rk_live_[a-zA-Z0-9]{24,}/g, name: 'Stripe Live Restricted Key' },

  // Private keys
  { pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g, name: 'Private Key' },

  // Generic tokens and passwords
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, name: 'Password' },
  { pattern: /(?:token)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{20,}['"]/gi, name: 'Token' },

  // Counsel-specific
  { pattern: /COUNSEL_API_KEY\s*[:=]\s*['"][a-zA-Z0-9_\-]{10,}['"]/g, name: 'Counsel API Key' },
];

// Files and patterns to ignore
const IGNORE_PATTERNS = [
  /node_modules\//,
  /dist\//,
  /\.git\//,
  /package-lock\.json$/,
  /\.secretsignore$/,
  /check-secrets\.js$/,  // This script itself
];

// Content patterns to ignore (e.g., example placeholders)
const IGNORE_CONTENT_PATTERNS = [
  /your[_-]?api[_-]?key[_-]?here/i,
  /your[_-]?secret[_-]?here/i,
  /your[_-]?token[_-]?here/i,
  /example[_-]?key/i,
  /placeholder/i,
  /xxx+/i,
  /\$\{.*\}/,  // Template variables like ${VAR}
  /process\.env\./,  // Environment variable references
  /secrets\./,  // GitHub secrets references
];

/**
 * Load custom ignore patterns from .secretsignore
 */
function loadIgnorePatterns() {
  const ignoreFile = join(rootDir, '.secretsignore');
  if (existsSync(ignoreFile)) {
    const content = readFileSync(ignoreFile, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => new RegExp(line.trim()));
  }
  return [];
}

/**
 * Check if a file should be ignored
 */
function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Check if content should be ignored (e.g., placeholder text)
 */
function shouldIgnoreContent(content, match) {
  // Get surrounding context (50 chars before and after)
  const matchIndex = content.indexOf(match);
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + match.length + 50);
  const context = content.slice(start, end);

  return IGNORE_CONTENT_PATTERNS.some(pattern => pattern.test(context));
}

/**
 * Scan a file for secrets
 */
function scanFile(filePath, content) {
  const findings = [];

  for (const { pattern, name } of SECRET_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Skip if this looks like a placeholder
      if (shouldIgnoreContent(content, match[0])) {
        continue;
      }

      // Find line number
      const lines = content.slice(0, match.index).split('\n');
      const lineNumber = lines.length;

      findings.push({
        file: filePath,
        line: lineNumber,
        type: name,
        match: match[0].slice(0, 50) + (match[0].length > 50 ? '...' : ''),
      });
    }
  }

  return findings;
}

/**
 * Get list of staged files
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf-8',
      cwd: rootDir,
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get all tracked files (for full scan)
 */
function getAllFiles() {
  try {
    const output = execSync('git ls-files', {
      encoding: 'utf-8',
      cwd: rootDir,
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const fullScan = args.includes('--all');
  const customIgnores = loadIgnorePatterns();

  console.log(fullScan ? 'Scanning all tracked files for secrets...' : 'Scanning staged files for secrets...');

  const files = fullScan ? getAllFiles() : getStagedFiles();

  if (files.length === 0) {
    console.log('No files to scan.');
    process.exit(0);
  }

  let allFindings = [];

  for (const file of files) {
    if (shouldIgnoreFile(file)) {
      continue;
    }

    // Check custom ignore patterns
    if (customIgnores.some(pattern => pattern.test(file))) {
      continue;
    }

    const filePath = join(rootDir, file);

    if (!existsSync(filePath)) {
      continue;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const findings = scanFile(file, content);
      allFindings = allFindings.concat(findings);
    } catch (err) {
      // Skip binary files or unreadable files
      if (err.code !== 'EISDIR') {
        console.warn(`Warning: Could not read ${file}`);
      }
    }
  }

  if (allFindings.length > 0) {
    console.error('\n\x1b[31mPotential secrets detected!\x1b[0m\n');

    for (const finding of allFindings) {
      console.error(`  \x1b[33m${finding.file}:${finding.line}\x1b[0m`);
      console.error(`    Type: ${finding.type}`);
      console.error(`    Match: ${finding.match}`);
      console.error('');
    }

    console.error('\x1b[31mCommit blocked to prevent secret leakage.\x1b[0m');
    console.error('\nIf these are false positives, you can:');
    console.error('  1. Add patterns to .secretsignore');
    console.error('  2. Use placeholder values like "your_api_key_here"');
    console.error('  3. Reference environment variables instead');
    console.error('');

    process.exit(1);
  }

  console.log('\x1b[32mNo secrets detected.\x1b[0m');
  process.exit(0);
}

main();
