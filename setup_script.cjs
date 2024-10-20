#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

const sourceDir = path.join(__dirname, 'template'); 
const packageJsonPath = path.join(__dirname, 'package.json');

async function init() {
  try {
    const { default: ora} = await import('ora');
    const { default: chalk } = await import('chalk');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;
    const version_code = packageJson.version_code;

    console.log(chalk.cyanBright.bold(`Welcome to DeskThing v${version} `));
    console.log(chalk.greenBright('Setting up your project... '));
    console.log();
    const projectName = await askQuestion('Enter App ID (lowercase, no spaces): ');
    const destDir = path.join(process.cwd(), projectName);

    // 1. Copy the entire template directory
    fs.copySync(sourceDir, destDir);

    // 2. Get manifest information from the user
    const manifestData = {
      id: projectName.toLowerCase().replace(/\s+/g, '-'), // Generate ID from project name
      isAudioSource: await getBooleanAnswer('Is this app an audiosource option? (yes/no): '),
      isScreenSaver: await getBooleanAnswer('Is this app a screensaver option? (yes/no): '),
      isWebApp: true,
      isLocalApp: false,
      requires: (await askQuestion('Comma-separated list of required app IDs (e.g., utility,local,spotify): ')).split(',').map(str => str.trim()),
      label: await askQuestion('App Label (Display Name): '),
      version: version, // You can customize this or get it from package.json
      version_code: await askQuestion('App Version Number (number like 9.0 for v0.9.0): '),
      compatible_server: (await askQuestion('Server Compatibility Range ("7.3,9" for v0.7.3 to v0.9.*): ') || version_code).split(',').map(str => str.trim()),
      compatible_client: (await askQuestion('Client Compatibility Range ("7,9.2" for v0.7.* to v0.9.2): ') || version_code).split(',').map(str => str.trim()),
      description: await askQuestion('App Description: '),
      author: await askQuestion('App Author: '),
      platforms: await getPlatforms(),
      homepage: await askQuestion('Homepage Link (can be blank): '),
      repository: await askQuestion('Github Repository Link (can be blank): '),
    };

    // 3. Create and write the manifest.json file
    const manifestPath = path.join(destDir, 'public', 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));

    // 4. Replace placeholders in other template files (if needed)
    const files = fs.readdirSync(destDir, { withFileTypes: true });
    files.forEach((file) => {
      const filePath = path.join(destDir, file.name);
      if (file.isFile() && !file.name.includes('manifest.json')) { // Exclude manifest.json
        renderTemplate(filePath, { projectName }); 
      }
    });

    console.log(chalk.green('DeskThing template created successfully at', destDir));
    console.log(chalk.blue('Running npm install to set up dependencies...'));

    const spinner = ora('Installing dependencies...').start();

    exec('npm install', { cwd: destDir }, (error, stdout, stderr) => {
      spinner.stop()
      if (error) {
        console.error(chalk.red('Error running npm install:', stderr));
        return;
      }
      console.log(chalk.green('Dependencies installed successfully.'));
      console.log(stdout);
      console.log(chalk.greenBright('Now enter ') + chalk.bgBlack.bold(`cd ${projectName}`) + chalk.greenBright(' and ') + chalk.bgBlack.bold(`npm run dev`) + chalk.greenBright(' to get started!'));
    });
  } catch (error) {
    console.error('Error creating template:', error);
  } finally {
    rl.close();
  }
}

// Helper function to get a boolean answer from user
async function getBooleanAnswer(question) {
  const answer = (await askQuestion(question)).trim().toLowerCase();
  return answer === 'yes' || answer === 'y';
}

// Helper function to get a list of supported platforms
async function getPlatforms() {
  const platforms = await askQuestion('Comma-separated list of supported platforms (e.g., windows,macos,linux): ');
  return platforms.split(',').map(str => str.trim());
}

// Helper function to render templates with EJS
function renderTemplate(filePath, data) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const rendered = ejs.render(fileContent, data);
  fs.writeFileSync(filePath, rendered);
}

init();