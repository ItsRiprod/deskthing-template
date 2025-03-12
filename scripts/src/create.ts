#!/usr/bin/env node

import chalk, { ChalkInstance } from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import ora from 'ora';
import { AppManifest } from '@deskthing/types';
import { input } from '@inquirer/prompts';
import { gatherAppManifest, replacePlaceholders, validateProjectName } from './utility';


// Initialize the setup process
export async function startCreation(type: string): Promise<void> {
    try {
      const sourceDir: string = path.join(__dirname, path.join('..', '..', 'template', type)); 
    const rawProjectName = await input({
      message: 'Enter App ID: ',
      validate: (input: string) => input.trim().length > 0 || 'Project name cannot be empty',
      transformer: (input: string) => { 
        return input.trim().toLowerCase().replace(/\s+/g, '-')
      },
    });

    const projectName = rawProjectName.trim().toLowerCase().replace(/\s+/g, '-');
  
    console.log(`\nCreating project "${projectName}"...`);

    const destDir = path.join(process.cwd(), projectName);
    validateProjectName(projectName, destDir);

    const manifestData = await gatherAppManifest(projectName, type);

    console.log(`\nCreating project "${projectName}" in "${destDir}"...`);

    await copyTemplate(sourceDir, destDir);
    await createManifest(destDir, manifestData);
    await replacePlaceholders(destDir, { projectName });

    console.log(chalk.green(`DeskThing template created successfully at: ${destDir}`));
    await installDependencies(destDir, chalk);

    finalInstructions(projectName, chalk);

    return Promise.resolve()
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

// Helper to copy the template directory
async function copyTemplate(source: string, destination: string): Promise<void> {
  console.log('Copying template files...');
  await fs.copy(source, destination);
  console.log('Template files copied successfully.\n');
}

// Helper to create the manifest.json file
async function createManifest(destDir: string, manifestData: AppManifest): Promise<void> {
  const manifestPath = path.join(destDir, 'public', 'manifest.json');
  await fs.outputJson(manifestPath, manifestData, { spaces: 2 });
  console.log('Manifest file created successfully.\n');
}

// Helper to install dependencies
async function installDependencies(destDir: string, chalk: ChalkInstance): Promise<void> {
  console.log(chalk.blue('Installing dependencies...'));
  const spinner = ora('Running npm install...').start();

  return new Promise((resolve, reject) => {
    exec('npm install', { cwd: destDir }, (error: Error | null, stdout: string, stderr: string) => {
      spinner.stop();
      if (error) {
        console.error(chalk.red('Failed to install dependencies:', stderr));
        reject(error);
        return;
      }
      console.log(chalk.green('Dependencies installed successfully.\n'));
      console.log(stdout);
      resolve();
    });
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
