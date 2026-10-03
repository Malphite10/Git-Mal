import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next') {
          walk(fullPath);
        }
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

describe('Client Boundary Enforcement', () => {
  const projectRoot = path.join(__dirname, '../../');
  const clientDir = path.join(projectRoot, 'client');

  // Only run if client/ directory exists
  const clientExists = fs.existsSync(clientDir);

  if (!clientExists) {
    it('client/ directory not yet created - skipping boundary tests', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const clientFiles = getAllTsFiles(clientDir);

  it('client should not import Prisma', () => {
    clientFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toContain('@prisma/client');
      expect(content).not.toContain('import { PrismaClient }');
      expect(content).not.toContain("from '@/lib/prisma'");
    });
  });

  it('client should not import Core services directly', () => {
    clientFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toContain("from '@/lib/services'");
      expect(content).not.toContain('createServices()');
    });
  });

  it('client should only call Core via API', () => {
    clientFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const hasApiCall = content.includes('apiClient') ||
                        content.includes("fetch('/api/") ||
                        content.includes("fetch(\"/api/") ||
                        content.includes('api.');

      const isTypeFile = file.includes('types/') || file.includes('hooks/use-') || file.includes('lib/constants');
      if (!isTypeFile && !content.includes('apiClient') && !content.includes('api.')) {
        const hasExternalFetch = content.includes('fetch(');
        expect(hasExternalFetch || hasApiCall).toBe(true);
      }
    });
  });

  it('client should not import Core auth directly', () => {
    clientFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toContain("from '@/lib/auth'");
    });
  });
});