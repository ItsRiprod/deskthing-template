#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");
const readline = require("readline");
const { exec } = require("child_process");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));
const sourceDir = path.join(__dirname, "template");
const packageJsonPath = path.join(__dirname, "package.json");
async function init() {
  try {
    const { default: ora } = await import("ora");
    const { default: chalk2 } = await import("chalk");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const version = packageJson.version;
    console.log(chalk2.cyanBright.bold(`Welcome to DeskThing v${version} `));
    console.log(chalk2.greenBright("Setting up your project... "));
    console.log();
    const projectName = await askQuestion("App ID: ");
    const destDir = path.join(process.cwd(), projectName);
    fs.copySync(sourceDir, destDir);
    const manifestData = {
      id: projectName.toLowerCase().replace(/\s+/g, "-"),
      // Generate ID from project name
      isAudioSource: await getBooleanAnswer("Is this app an audiosource option? (yes/no): "),
      isScreenSaver: await getBooleanAnswer("Is this app a screensaver option? (yes/no): "),
      isWebApp: true,
      isLocalApp: false,
      requires: (await askQuestion("Comma-separated list of required app IDs (e.g., utility,local,spotify): ")).split(",").map((str) => str.trim()),
      label: await askQuestion("App Label (display name): "),
      version,
      // You can customize this or get it from package.json
      description: await askQuestion("Description: "),
      author: await askQuestion("Author: "),
      platforms: await getPlatforms(),
      homepage: await askQuestion("Homepage Link: "),
      repository: await askQuestion("Repository Link: ")
    };
    const manifestPath = path.join(destDir, "public", "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
    const files = fs.readdirSync(destDir, { withFileTypes: true });
    files.forEach((file) => {
      const filePath = path.join(destDir, file.name);
      if (file.isFile() && !file.name.includes("manifest.json")) {
        renderTemplate(filePath, { projectName });
      }
    });
    console.log(chalk2.green("DeskThing template created successfully at", destDir));
    console.log(chalk2.blue("Running npm install to set up dependencies..."));
    const spinner = ora("Installing dependencies...").start();
    exec("npm install", { cwd: destDir }, (error, stdout, stderr) => {
      spinner.stop();
      if (error) {
        console.error(chalk2.red("Error running npm install:", stderr));
        return;
      }
      console.log(chalk2.green("Dependencies installed successfully."));
      console.log(stdout);
      console.log(chalk2.greenBright("Now do ") + chalk2.bgBlack.bold(`cd ${projectName}`) + chalk2.greenBright(" and start developing!"));
    });
  } catch (error) {
    console.error(chalk.red("Error creating template:", error));
  } finally {
    rl.close();
  }
}
async function getBooleanAnswer(question) {
  const answer = (await askQuestion(question)).trim().toLowerCase();
  return answer === "yes" || answer === "y";
}
async function getPlatforms() {
  const platforms = await askQuestion("Comma-separated list of supported platforms (e.g., windows,macos,linux): ");
  return platforms.split(",").map((str) => str.trim());
}
function renderTemplate(filePath, data) {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const rendered = ejs.render(fileContent, data);
  fs.writeFileSync(filePath, rendered);
}
init();
