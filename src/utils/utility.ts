#!/usr/bin/env node

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'path';
import { render } from 'ejs';
import { input } from '@inquirer/prompts';
import { Logger } from '../view/logger'

// Helper to validate the project name and directory
export async function validateProjectName(projectName: string, destDir: string): Promise<void> {
  if (!projectName.match(/^[a-z0-9-]+$/)) {
    Logger.error('Invalid App ID: Use lowercase letters, numbers, and hyphens only.');
    process.exit(1);
  }
  try {
    await stat(destDir)
    Logger.error(`Directory "${projectName}" already exists as ${destDir}!`);
    process.exit(1);
  } catch (error) {
    // Ignore the error if the directory does not exist
  }
}

export const askQuestion = async (query: string, filter?: (input: string) => string): Promise<string> => {
  const answer = await input({
    message: query,
    transformer: (input) => filter ? filter(input) : input
  });
  return answer;
};

// Helper to replace placeholders using EJS
export async function replacePlaceholders(destDir: string, data: { projectName: string }): Promise<void> {
  // Recursively get all files including those in subdirectories
  const getAllFiles = async (dir: string): Promise<string[]> => {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getAllFiles(res) : res;
    }));
    return files.flat();
  };

  const files = await getAllFiles(destDir);

  // Process each file
  await Promise.all(files.map(async (filePath) => {
    if (!filePath.includes('manifest.json') && !filePath.endsWith('.png') && !filePath.endsWith('.jpg')) {
      const content = await readFile(filePath, 'utf-8');
      const rendered = render(content, data, {});
      await writeFile(filePath, rendered, 'utf-8');
    }
  }));

  console.log('Template placeholders replaced successfully.\n');
}