#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import { AppManifest, TagTypes, PlatformTypes } from '@deskthing/types';
import { input, checkbox } from '@inquirer/prompts';
import semverValid from 'semver/functions/valid';
import semverValidRange from 'semver/ranges/valid'
import { COMPATIBLE_CLIENT, COMPATIBLE_SERVER, TEMPLATE_VERSION } from './constants';
// Helper to validate the project name and directory
export function validateProjectName(projectName: string, destDir: string): void {
  if (!projectName.match(/^[a-z0-9-]+$/)) {
    console.error('Invalid App ID: Use lowercase letters, numbers, and hyphens only.');
    process.exit(1);
  }
  if (fs.existsSync(destDir)) {
    console.error(`Directory "${projectName}" already exists!`);
    process.exit(1);
  }
}
// Helper to gather manifest data
export async function gatherAppManifest(projectName: string, templateId?: string): Promise<AppManifest> {
  const version = TEMPLATE_VERSION;          // "0.10.7"
  const serverVersion = COMPATIBLE_SERVER;  // "0.10.4"
  const clientVersion = COMPATIBLE_CLIENT; // "0.10.4"
  
  const label = await input({
    message: 'App Label (Display Name):',
    default: projectName,
    validate: (input: string) => input.trim().length > 0 || 'Label is required',
    transformer: (input: string) => input.trim()
  });

  const tags = await checkbox({
    message: 'Select app tags:',
    choices: Object.values(TagTypes).map(tag => ({ value: tag, label: tag })),
  });

  const requires = await input({
    message: 'Required App IDs (comma-separated):',
    transformer: (input: string) => input,
    validate: (input: string) => input.trim().length >= 0,
  }).then(input => input ? input.split(',').map(str => str.trim()) : []);

  const appVersion = await input({
    message: `App Version (${version}):`,
    default: version,
    validate: (input: string) => {
      if (!semverValid(input)) {
        return 'Invalid semantic version'
      }
      return input.trim().length > 0 || 'Version is required'
    },
  });

  const requiredServerVersion = await input({
    message: `Please enter a valid semantic version for server compatibility\n (e.g. >=0.10.2, <=0.10.4) or ENTER to use default (>=${serverVersion})`,
    default: '>=0.0.0',
    transformer: (input: string) => input || `>=${serverVersion}`,
    validate: (input): boolean | string => {
      if (!semverValidRange(input)) {
        return 'Invalid server version range';
      }
      return true;
    }
  });

  const requiredClientVersion = await input({
    message: `Please enter a valid semantic version for client compatibility\n (e.g. >=0.10.2, <=0.10.4) or ENTER to use default (>=${clientVersion})`,
    default: `>=${clientVersion}`,
    transformer: (input: string) => input,
    validate: (input): boolean | string => {
      if (!semverValidRange(input)) {
        return 'Invalid client version range';
      }
      return true;
    }
  });

  const requiredVersions = {
    server: requiredServerVersion,
    client: requiredClientVersion
  };

  const description = await input({
    message: 'App Description:',
    default: 'None',
    validate: (input: string) => input.trim().length > 0 || 'Description is required',
  });

  const author = await input({
    message: 'Author:',
    default: 'Unknown',
  });

  const platforms = await checkbox({
    message: 'Select supported platforms:',
    choices: Object.values(PlatformTypes).map(platform => ({ value: platform, label: platform }))
  }) || Object.values(PlatformTypes);

  const repository = await input({
    message: 'Github Repository URL (optional):'
  });

  const homepage = await input({
    message: 'Homepage URL (optional):',
    default: repository || ''
  });

  const updateUrl = await input({
    message: 'Update URL (optional, usually same as repository):',
    default: repository || ''
  });

  return {
    label,
    tags,
    requires,
    version: appVersion,
    requiredVersions,
    description,
    author,
    platforms,
    repository,
    homepage,
    updateUrl,
    id: projectName,
    template: templateId,
  };
}

export const askQuestion = async (query: string, filter?: (input: string) => string): Promise<string> => {
  const answer = await input({
    message: query,
    transformer: (input) => filter ? filter(input) : input
  });
  return answer;
};

// Helper to ask a yes/no question
export async function getBooleanAnswer(question: string): Promise<boolean> {
  const answer = (await askQuestion(question)).trim().toLowerCase();
  return answer === 'yes' || answer === 'y';
}

// Helper to ask for a comma-separated list
export async function askList(question: string): Promise<string[]> {
  const answer = await askQuestion(question);
  return answer ? answer.split(',').map((str) => str.trim()) : [];
}

export async function askNumber(question: string): Promise<number | undefined> {
  const answer = await askQuestion(question);
  if (typeof answer == 'number') {
    return answer
  }
}

// Helper to replace placeholders using EJS
export async function replacePlaceholders(destDir: string, data: { projectName: string }): Promise<void> {
  // Recursively get all files including those in subdirectories
  const getAllFiles = async (dir: string): Promise<string[]> => {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
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
      const content = await fs.readFile(filePath, 'utf-8');
      const rendered = ejs.render(content, data, {});
      await fs.writeFile(filePath, rendered, 'utf-8');
    }
  }));

  console.log('Template placeholders replaced successfully.\n');
}