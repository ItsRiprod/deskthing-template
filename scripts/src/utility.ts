#!/usr/bin/env node

import chalk, { ChalkInstance } from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import { ManifestData } from './types';
import { packageJson, rl } from './setup';
import inquirer from 'inquirer';


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
export async function gatherManifestData(projectName: string, templateId?: string): Promise<ManifestData> {
  const version = packageJson?.version || 'v0.0.0';
  const version_code = packageJson?.version_code || 0;
  const answers = await inquirer.prompt<ManifestData>([
    {
      type: 'input',
      name: 'label',
      message: 'App Label (Display Name):',
      validate: (input: string) => input.trim().length > 0 || 'Label is required',
    },
    {
      type: 'confirm',
      name: 'isAudioSource',
      message: 'Is this app an audio source option?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'isScreenSaver',
      message: 'Is this app a screensaver option?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'isWebApp',
      message: 'Is this app a web app?',
    },
    {
      type: 'input',
      name: 'requires',
      message: 'Required App IDs (comma-separated):',
      filter: (input: string) => (input ? input.split(',').map(str => str.trim()) : []),
    },
    {
      type: 'input',
      name: 'version',
      message: `App Version (${version}):`,
      default: version,
      validate: (input: string) => input.trim().length > 0 || 'Version is required',
    },
    {
      type: 'number',
      name: 'version_code',
      message: `App Version Number (${version_code}):`,
      default: version_code,
    },
    {
      type: 'number',
      name: 'compatible_server',
      message: `Server Compatibility number (${version_code} for ${version}):`,
      default: version_code,
    },
    {
      type: 'number',
      name: 'compatible_client',
      message: `Client Compatibility (${version_code} for ${version}):`,
      default: version_code,
    },
    {
      type: 'input',
      name: 'description',
      message: 'App Description:',
      default: 'None',
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author:',
      default: 'Unknown',
    },
    {
      type: 'input',
      name: 'platforms',
      message: 'Supported Platforms (e.g., "linux,windows,mac"):',
      default: 'linux,windows,mac',
      filter: (input: string) => input.split(',').map(str => str.trim()),
    },
    {
      type: 'input',
      name: 'homepage',
      message: 'Homepage URL (optional):',
    },
    {
      type: 'input',
      name: 'repository',
      message: 'Github Repository URL (optional):'
    }
  ]);

  return {
    ...answers,
    id: projectName,
    template: templateId,
  };
}

export const askQuestion = async (query: string, filter?: (input: string) => string): Promise<string> => 
  { 
  const { answer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message: query,
        filter: (input) => filter ? filter(input) : input,
        transformer: (input) => filter ? filter(input) : input
      }
  ]);
  return answer as string;
};

// Helper to ask a yes/no question
export async function getBooleanAnswer(question: string): Promise<boolean> {
  const answer = (await askQuestion( question)).trim().toLowerCase();
  return answer === 'yes' || answer === 'y';
}

// Helper to ask for a comma-separated list
export async function askList(question: string): Promise<string[]> {
  const answer = await askQuestion( question);
  return answer ? answer.split(',').map((str) => str.trim()) : [];
}

export async function askNumber(question: string): Promise<number | undefined> {
  const answer = await askQuestion( question);
  if (typeof answer == 'number') {
      return answer
  }
}

// Helper to replace placeholders using EJS
export async function replacePlaceholders(destDir: string, data: { projectName: string }): Promise<void> {
  const files = await fs.readdir(destDir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(destDir, file.name);
    if (file.isFile() && !file.name.includes('manifest.json')) {
      const content = await fs.readFile(filePath, 'utf-8');
      const rendered = ejs.render(content, data);
      await fs.writeFile(filePath, rendered, 'utf-8');
    }
  }
  console.log('Template placeholders replaced successfully.\n');
}