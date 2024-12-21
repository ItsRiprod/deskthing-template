#!/usr/bin/env node

import chalk, { ChalkInstance } from "chalk";
import fs from "fs-extra";
import path from "path";
import readline from "readline";
import inquirer from "inquirer";
import { startCreation } from "./create";
import { updateProject } from "./update";

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
export const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../package.json"), "utf-8")
);

// Initialize the setup process
async function init(): Promise<void> {
  try {
    welcomeMessage(chalk);

    const { setupChoice } = await inquirer.prompt(
      [
        {
          type: "list",
          name: "setupChoice",
          message:
            "What would you like to do? (use arrow keys to navigate, enter to select)",
          choices: [
            {
              name: "Create new project (Full template Vite+React+TS+Tailwindcss)",
              value: "full",
            },
            {
              name: "Create new project (Minimum template Vite+TS)",
              value: "minimum",
            },
            {
              name: "Upgrade existing project",
              value: "upgrade",
            },
          ],
        },
      ],
      rl
    );

    let result;
    switch (setupChoice) {
      case "upgrade":
        // Handle upgrade logic
        console.log(chalk.yellow("Upgrading existing project..."));
        console.log(chalk.red("Warning: This is experimental!"));
        const { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message: "Do you want to continue?",
            default: true,
          },
        ]);
        if (!confirm) {
          console.log(chalk.yellow("Operation cancelled"));
          process.exit(0);
        }
        result = await updateProject();
        break;
      case "full":
        // Handle full template creation
        console.log(chalk.yellow("Creating full template..."));
        result = await startCreation("full");
        break;
      case "minimum":
        // Handle minimum template creation
        console.log(chalk.yellow("Creating minimum template..."));
        result = await startCreation("min");
        break;
    }
    await result;
  } catch (error) {
    console.error("Error creating template:", error);
  }
  rl.close();
}

// Helper to print a welcome message
function welcomeMessage(chalk: ChalkInstance): void {
  console.log(
    chalk.cyanBright.bold(`Welcome to DeskThing v${packageJson.version}`)
  );
  console.log(
    chalk.cyanBright(
      "I just need to ask you a few questions and you can be on your way!\n"
    )
  );
  console.log(chalk.greenBright("Let's set up your new project!\n"));
}

init();
