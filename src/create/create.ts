#!/usr/bin/env node

import path from "path";
import { exec } from "child_process";
import { AppManifest } from "@deskthing/types";
import { input } from "@inquirer/prompts";
import { replacePlaceholders, validateProjectName } from "../utils/utility";
import { Logger } from "../view/logger";
import { gatherAppManifest } from "../view/appManifest";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";

// Initialize the setup process
export async function startCreation(type: string): Promise<void> {
  try {
    const sourceDir: string = path.join(
      __dirname,
      path.join("..", "template", type)
    );
    const rawProjectName = await input({
      message: "Enter App ID: ",
      validate: (input: string) =>
        input.trim().length > 0 || "Project name cannot be empty",
      transformer: (input: string) => {
        return input.trim().toLowerCase().replace(/\s+/g, "-");
      },
    });

    const projectName = rawProjectName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    Logger.info(`Creating project "${projectName}"...`);

    const destDir = path.join(process.cwd(), projectName);
    await validateProjectName(projectName, destDir);

    const manifestData = await gatherAppManifest(projectName, type);

    Logger.info(`Creating project "${projectName}" in "${destDir}"...`);

    await copyTemplate(sourceDir, destDir);
    await createManifest(destDir, manifestData);
    await replacePlaceholders(destDir, { projectName });

    Logger.success(`DeskThing template created successfully at: ${destDir}`);
    await installDependencies(destDir);

    Logger.header("Setup complete! Now run the following commands:");
    Logger.info(`  cd ${projectName}`);
    Logger.info("  npm run dev");
    Logger.success("\nEnjoy your new DeskThing app!");

    return Promise.resolve();
  } catch (error) {
    Logger.error("Error creating template:", error);
  }
}

// Helper to copy the template directory
async function copyTemplate(
  source: string,
  destination: string
): Promise<void> {
  Logger.info("Copying template files...");
  // Remove dist and node_modules if they exist
  
  const excludeDirs = ["node_modules", "dist", ".git"];

  await cp(source, destination, {
    recursive: true,
    filter: (src) => {
      // Get the relative path from source
      const relativePath = path.relative(source, src);

      // Check if this path or any parent directory should be excluded
      const shouldExclude = excludeDirs.some(
        (dir) =>
          relativePath === dir || relativePath.startsWith(`${dir}${path.sep}`)
      );

      if (shouldExclude) {
        Logger.debug(`Skipping: ${relativePath}`);
        return false;
      }

      return true;
    },
  });

  Logger.success("Template files copied successfully.");
}
// Helper to create the manifest.json file
async function createManifest(
  destDir: string,
  manifestData: AppManifest
): Promise<void> {
  const manifestPath = path.join(destDir, "deskthing", "manifest.json");
  await mkdir(path.join(destDir, "deskthing"), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifestData, null, 2));
  Logger.success("Manifest file created successfully.");
}
// Helper to install dependencies
async function installDependencies(destDir: string): Promise<void> {
  Logger.info("Installing dependencies...");
  Logger.startProgress("Running npm install...");

  return new Promise((resolve, reject) => {
    exec(
      "npm install",
      { cwd: destDir },
      (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          Logger.stopProgress(false);
          Logger.error("Failed to install dependencies:", stderr);
          reject(error);
          return;
        }
        Logger.stopProgress(true);
        Logger.success("Dependencies installed successfully.");
        Logger.debug(stdout);
        resolve();
      }
    );
  });
}
