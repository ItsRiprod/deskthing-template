#!/usr/bin/env node

import readline from "readline";
import { startCreation } from "./create/create";
import { updateProject } from "./update/update";
import { select, confirm } from "@inquirer/prompts";
import { Logger } from "./view/logger";
import { version } from "./config/config"

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const args = process.argv.slice(2);
const isUpdate = args.includes("--update");
const isCreate = args.includes("--create");
const isCreateMin = isCreate && args.includes("min");
const isCreateFull = isCreate && args.includes("full");
const isHelp = isCreate && args.includes("--help");
const noOverwrite = args.includes("--no-overwrite");

const isSilent = args.includes("--silent");
const isDebug = args.includes("--debug");

Logger.configure({ debug: isDebug, silent: isSilent });

Logger.debug(`Flags: ${args.join(", ")}`);
Logger.debug(`Configuration options selected: isUpdate: ${isUpdate}, isCreate: ${isCreate}, isCreateMin: ${isCreateMin}, isCreateFull: ${isCreateFull}, isHelp: ${isHelp}, noOverwrite: ${noOverwrite}, isSilent: ${isSilent}, isDebug: ${isDebug}`);

// Initialize the setup process
async function init(): Promise<void> {
  try {
    if (isHelp) {
      Logger.info("Help:");
      Logger.info("Usage: deskthing [--update] [--create] [--min] [--full] [--help]");
      Logger.info("--update: Upgrade an existing deskthing project.");
      Logger.info("--create: Create a new deskthing project.");
      Logger.info("--create min: Create a minimal deskthing project.");
      Logger.info("--create full: Create a full deskthing project.");
      Logger.info("--help: Show this help message.");
      return;
    }
    if (isUpdate) {
      Logger.info("Upgrading existing project...");
      await updateProject({ noOverwrite });
      return;
    }

    if (isCreateMin) {
      Logger.info("Creating minimum template...");
      await startCreation("min");
      return;
    }

    if (isCreateFull) {
      Logger.info("Creating full template...");
      await startCreation("full");
      return;
    }

    if (isCreate) {
      Logger.info("Creating base template...");
      await startCreation("base");
      return;
    }

    Logger.header(`Welcome to the DeskThing Template Engine v${version}`);
    Logger.info("I just need to ask you a few questions and you can be on your way!\n");
    Logger.success("Let's set up your new project!\n");

    const setupChoice = await select({
      message:
        "What would you like to do? (use arrow keys to navigate, enter to select)",
      choices: [
        {
          name: "Create full project",
          description:
            "Template with example code Vite + React + TS + Tailwindcss",
          value: "full",
        },
        {
          name: "Create minimal project",
          description:
            "Template with minimal code Vite + React + TS + Tailwindcss",
          value: "base",
        },
        {
          name: "Create new project",
          description: "Minimum template with TS",
          value: "min",
        },
        {
          name: "Upgrade existing project",
          description: "Upgrade an existing deskthing project",
          value: "upgrade",
        },
      ],
    });

    let result;
    switch (setupChoice) {
      case "upgrade":
        // Handle upgrade logic
        Logger.info("Upgrading existing project...");
        Logger.warning("Warning: This is experimental!");
        const confirmRes = await confirm({
          message: "Do you want to continue?",
          default: true,
        });
        if (!confirmRes) {
          Logger.info("Operation cancelled");
          process.exit(0);
        }
        result = await updateProject({ noOverwrite });
        break;
      case "full":
        // Handle full template creation
        Logger.info("Creating full template...");
        result = await startCreation("full");
        break;
      case "base":
        // Handle full template creation
        Logger.info("Creating base template...");
        result = await startCreation("base");
        break;
      case "min":
        // Handle minimum template creation
        Logger.info("Creating minimum template...");
        result = await startCreation("min");
        break;
    }
    await result;
  } catch (error) {
    Logger.error("Error creating template:", error);
  }
  rl.close();
}

init();