#!/usr/bin/env node

import chalk, { ChalkInstance } from "chalk";
import readline from "readline";
import inquirer from "inquirer";
import { startCreation } from "./create";
import { updateProject } from "./update";

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const args = process.argv.slice(2);
const isUpdate = args.includes('--update');
const isCreate = args.includes('--create');
const isCreateMin = isCreate && args.includes('min');
const isCreateFull = isCreate && args.includes('full');
const isHelp = isCreate && args.includes('--help');

// Initialize the setup process
async function init(): Promise<void> {
  try {
    if (isHelp) {
      console.log(chalk.yellow("Help:"));
      console.log("Usage: deskthing [--update] [--create] [--min] [--full] [--help]");
      console.log("--update: Upgrade an existing deskthing project.");
      console.log("--create: Create a new deskthing project.");
      console.log("--create min: Create a minimal deskthing project.");
      console.log("--create full: Create a full deskthing project.");
      console.log("--help: Show this help message.");
      return;
    }
    if (isUpdate) {
      console.log(chalk.yellow("Upgrading existing project..."));
      await updateProject();
      return;
    }

    if (isCreateMin) {
      console.log(chalk.yellow("Creating minimum template..."));
      await startCreation("min");
      return;
    }

    if (isCreateFull) {
      console.log(chalk.yellow("Creating full template..."));
      await startCreation("full");
      return;
    }

    if (isCreate) {
      console.log(chalk.yellow("Creating base template..."));
      await startCreation("base");
      return;
    }

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
              name: "Create full project (Template with example code Vite + React + TS + Tailwindcss)",
              value: "full",
            },
            {
              name: "Create minimal project (Template with minimal code Vite + React + TS + Tailwindcss)",
              value: "base",
            },
            {
              name: "Create new project (Minimum template with TS)",
              value: "min",
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
      case "base":
        // Handle full template creation
        console.log(chalk.yellow("Creating base template..."));
        result = await startCreation("base");
        break;
      case "min":
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
async function welcomeMessage(chalk: ChalkInstance): Promise<void> {
  const version = (await import("../../package.json")).version;
  
  console.log(
    chalk.cyanBright.bold(`Welcome to DeskThing v${version}`)
  );
  console.log(
    chalk.cyanBright(
      "I just need to ask you a few questions and you can be on your way!\n"
    )
  );
  console.log(chalk.greenBright("Let's set up your new project!\n"));
}

init();
