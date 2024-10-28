#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));
const sourceDir = path.join(__dirname, 'template'); 
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Initialize the setup process
async function init() {
  try {
    const { default: ora } = await import('ora');
    const { default: chalk } = await import('chalk');

    welcomeMessage(chalk);
    const projectName = await askQuestion('Enter App ID (lowercase, no spaces): ');

    const destDir = path.join(process.cwd(), projectName);
    validateProjectName(projectName, destDir);

    await copyTemplate(sourceDir, destDir);

    const manifestData = await gatherManifestData(projectName);
    await createManifest(destDir, manifestData);

    await replacePlaceholders(destDir, { projectName });

    console.log(chalk.green(`DeskThing template created successfully at: ${destDir}`));
    await installDependencies(destDir, ora, chalk);

    finalInstructions(projectName, chalk);
  } catch (error) {
    console.error('Error creating template:', error);
  } finally {
    rl.close();
  }
}

// Helper to print a welcome message
function welcomeMessage(chalk) {
  console.log(chalk.cyanBright.bold(`Welcome to DeskThing v${packageJson.version}`));
  console.log(chalk.greenBright('Let’s set up your new project!\n'));
}

// Helper to validate the project name and directory
function validateProjectName(projectName, destDir) {
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
async function copyTemplate(source, destination) {
  console.log('Copying template files...');
  await fs.copy(source, destination);
  console.log('Template files copied successfully.\n');
}

// Helper to gather manifest data
async function gatherManifestData(projectName) {
  return {
    id: projectName,
    isAudioSource: await getBooleanAnswer('Is this app an audio source option? (yes/no): '),
    isScreenSaver: await getBooleanAnswer('Is this app a screensaver option? (yes/no): '),
    isWebApp: true,
    isLocalApp: false,
    requires: await askList('Required App IDs (comma-separated): '),
    label: await askQuestion('App Label (Display Name): '),
    version: packageJson.version,
    version_code: await askQuestion('App Version Number (e.g., 1.0): '),
    compatible_server: await askList('Server Compatibility (comma-separated, e.g., 7.3,9): '),
    compatible_client: await askList('Client Compatibility (comma-separated): '),
    description: await askQuestion('App Description: '),
    author: await askQuestion('Author: '),
    platforms: await askList('Supported Platforms (comma-separated): '),
    homepage: await askQuestion('Homepage URL (optional): '),
    repository: await askQuestion('Github Repository URL (optional): ')
  };
}

// Helper to ask a yes/no question
async function getBooleanAnswer(question) {
  const answer = (await askQuestion(question)).trim().toLowerCase();
  return answer === 'yes' || answer === 'y';
}

// Helper to ask for a comma-separated list
async function askList(question) {
  const answer = await askQuestion(question);
  return answer ? answer.split(',').map((str) => str.trim()) : [];
}

// Helper to create the manifest.json file
async function createManifest(destDir, manifestData) {
  const manifestPath = path.join(destDir, 'public', 'manifest.json');
  await fs.outputJson(manifestPath, manifestData, { spaces: 2 });
  console.log('Manifest file created successfully.\n');
}

// Helper to replace placeholders using EJS
async function replacePlaceholders(destDir, data) {
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
async function installDependencies(destDir, ora, chalk) {
  console.log(chalk.blue('Installing dependencies...'));
  const spinner = ora('Running npm install...').start();

  exec('npm install', { cwd: destDir }, (error, stdout, stderr) => {
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
function finalInstructions(projectName, chalk) {
  console.log(
    chalk.greenBright('Setup complete! Now run the following commands:')
  );
  console.log(chalk.bgBlack.bold(`  cd ${projectName}`));
  console.log(chalk.bgBlack.bold('  npm run dev'));
  console.log(chalk.greenBright('\nEnjoy your new DeskThing app!'));
}

init();
