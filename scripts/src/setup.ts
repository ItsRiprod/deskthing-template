#!/usr/bin/env node

import chalk, { ChalkInstance } from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import readline from 'readline';
import { exec } from 'child_process';
import { templates, TemplateInterface } from './templates';
import ora from 'ora';

interface ManifestData {
  id: string;
  isAudioSource: boolean;
  isScreenSaver: boolean;
  isWebApp: boolean;
  isLocalApp: boolean;
  requires: string[];
  label: string;
  version: string;
  version_code: string;
  compatible_server: string[];
  compatible_client: string[];
  description: string;
  author: string;
  platforms: string[];
  homepage: string;
  repository: string;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));
const sourceDir: string = path.join(__dirname, '../../template'); 
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

// Initialize the setup process
async function init(): Promise<void> {
  try {
    welcomeMessage(chalk);
    const projectName = (await askQuestion('Enter App ID (lowercase, no spaces): ')).toLowerCase().trim();
  
    const destDir = path.join(process.cwd(), projectName);
    validateProjectName(projectName, destDir);

    /*
    // Template selection
    console.log('\nAvailable templates:');
    Object.entries(templates).forEach(([key, template]) => {
      console.log(chalk.cyan(`\n${(template as typeof TemplateInterface).name} (${key})`));
      console.log((template as typeof TemplateInterface).description);
    });
    const templateKey = await askQuestion('\nSelect a template: ') as keyof typeof templates;
    if (!templates[templateKey]) {
      console.error('Invalid template selection');
      process.exit(1);
    }

    const sourceDir = path.join(__dirname, 'template', templateKey);
    await copyTemplate(sourceDir, destDir);
    */
    const manifestData = await gatherManifestData(projectName);

    console.log(`\nCreating project "${projectName}" in "${destDir}"...`);

    await copyTemplate(sourceDir, destDir);

    await createManifest(destDir, manifestData);

    await replacePlaceholders(destDir, { projectName });

    console.log(chalk.green(`DeskThing template created successfully at: ${destDir}`));
    await installDependencies(destDir, chalk);

    finalInstructions(projectName, chalk);
  } catch (error) {
    console.error('Error creating template:', error);
  } finally {
    rl.close();
  }
}

// Helper to print a welcome message
function welcomeMessage(chalk: ChalkInstance): void {
  console.log(chalk.cyanBright.bold(`Welcome to DeskThing v${packageJson.version}`));
  console.log(chalk.cyanBright('I just need to ask you a few questions and you can be on your way!\n'));
  console.log(chalk.greenBright('Let\'s set up your new project!\n'));
}

// Helper to validate the project name and directory
function validateProjectName(projectName: string, destDir: string): void {
  if (!projectName.match(/^[a-z0-9-]+$/)) {
    console.error('Invalid App ID: Use lowercase letters, numbers, and hyphens only.');
    process.exit(1);
  }
  if (fs.existsSync(destDir)) {
    console.error(`Directory "${projectName}" already exists!`);
    process.exit(1);
  }
}

// Helper to copy the template directory
async function copyTemplate(source: string, destination: string): Promise<void> {
  console.log('Copying template files...');
  await fs.copy(source, destination);
  console.log('Template files copied successfully.\n');
}

// Helper to gather manifest data
async function gatherManifestData(projectName: string): Promise<ManifestData> {
  return {
    id: projectName,
    isAudioSource: await getBooleanAnswer('Is this app an audio source option? (yes/no): '),
    isScreenSaver: await getBooleanAnswer('Is this app a screensaver option? (yes/no): '),
    isWebApp: true,
    isLocalApp: false,
    requires: await askList('Required App IDs (comma-separated): '),
    label: await askQuestion('App Label (Display Name): '),
    version: packageJson.version,
    version_code: await askQuestion('App Version Number (e.g., 1.0 for v0.1.0): '),
    compatible_server: await askList('Server Compatibility (comma-separated, e.g., 7.3,9 for v0.7.3 -> v0.9.X): '),
    compatible_client: await askList('Client Compatibility (comma-separated, e.g., 7.3,9 for v0.7.3 -> v0.9.X): '),
    description: await askQuestion('App Description: '),
    author: await askQuestion('Author: '),
    platforms: await askList('Supported Platforms (eg. "linux,windows,mac"): '),
    homepage: await askQuestion('Homepage URL (optional): '),
    repository: await askQuestion('Github Repository URL (optional): ')
  };
}

// Helper to ask a yes/no question
async function getBooleanAnswer(question: string): Promise<boolean> {
  const answer = (await askQuestion(question)).trim().toLowerCase();
  return answer === 'yes' || answer === 'y';
}

// Helper to ask for a comma-separated list
async function askList(question: string): Promise<string[]> {
  const answer = await askQuestion(question);
  return answer ? answer.split(',').map((str) => str.trim()) : [];
}

// Helper to create the manifest.json file
async function createManifest(destDir: string, manifestData: ManifestData): Promise<void> {
  const manifestPath = path.join(destDir, 'public', 'manifest.json');
  await fs.outputJson(manifestPath, manifestData, { spaces: 2 });
  console.log('Manifest file created successfully.\n');
}

// Helper to replace placeholders using EJS
async function replacePlaceholders(destDir: string, data: { projectName: string }): Promise<void> {
  const files = await fs.readdir(destDir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(destDir, file.name);
    if (file.isFile() && !file.name.includes('manifest.json')) {
      const content = await fs.readFile(filePath, 'utf-8');
      const rendered = ejs.render(content, data);
      await fs.writeFile(filePath, rendered);
    }
  }
  console.log('Template placeholders replaced successfully.\n');
}

// Helper to install dependencies
async function installDependencies(destDir: string, chalk: ChalkInstance): Promise<void> {
  console.log(chalk.blue('Installing dependencies...'));
  const spinner = ora('Running npm install...').start();

  await exec('npm install', { cwd: destDir }, (error: Error | null, stdout: string, stderr: string) => {
    spinner.stop();
    if (error) {
      console.error(chalk.red('Failed to install dependencies:', stderr));
      return;
    }
    console.log(chalk.green('Dependencies installed successfully.\n'));
    console.log(stdout);
  });
}

// Helper to print final instructions
function finalInstructions(projectName: string, chalk: ChalkInstance): void {
  console.log(
    chalk.greenBright('Setup complete! Now run the following commands:')
  );
  console.log(chalk.bgBlack.bold(`  cd ${projectName}`));
  console.log(chalk.bgBlack.bold('  npm run dev'));
  console.log(chalk.greenBright('\nEnjoy your new DeskThing app!'));
}

init();