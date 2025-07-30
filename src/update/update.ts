import { execSync } from "child_process";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "fs/promises";
import path from "path";
import { AppManifest, PlatformTypes, TagTypes } from "@deskthing/types";
import { confirm, input } from "@inquirer/prompts";
import semverValid from "semver/functions/valid";
import {
  compatible_client,
  compatible_server,
  version,
} from "../config/config";
import { Logger } from "../view/logger";

interface Options {
  noOverwrite?: boolean;
}

export async function updateProject(options: Options = { noOverwrite: false }) {
  try {
    // Check if it's a deskthing project
    const publicPath = path.join("./public/");
    const deskthingPath = path.join("./deskthing/");
    const oldManifestPath = path.join("./public/manifest.json");
    const manifestPath = path.join("./deskthing/manifest.json");

    try {
      const [oldManifestExists, newManifestExists] = await Promise.all([
        stat(oldManifestPath)
          .then(() => true)
          .catch(() => false),
        stat(manifestPath)
          .then(() => true)
          .catch(() => false),
      ]);

      // Case 1: Only old manifest exists - migrate it
      if (oldManifestExists && !newManifestExists) {
        Logger.warning(
          "Old manifest.json found. Migrating to the new file format in /deskthing"
        );

        // Create deskthing directory if it doesn't exist
        await mkdir(deskthingPath, { recursive: true });

        // Move images and icons directories if they exist
        for (const dir of ["images", "icons"]) {
          const oldDir = path.join(publicPath, dir);
          const newDir = path.join(deskthingPath, dir);

          try {
            await stat(oldDir);
            await rename(oldDir, newDir);
          } catch (e) {
            // Directory doesn't exist, skip
          }
        }

        // Move manifest file
        await rename(oldManifestPath, manifestPath);
      }
      // Case 2: Both manifests exist - keep new, remove old
      else if (oldManifestExists && newManifestExists) {
        Logger.warning(
          "Both old and new manifest.json found. Keeping the new one and removing the old one."
        );
        await unlink(oldManifestPath);
      }
      // Case 3: Only new manifest exists - do nothing
      else if (!oldManifestExists && newManifestExists) {
        Logger.info("Using manifest.json in /deskthing directory.");
      }
      // Case 4: Neither manifest exists - error
      else {
        Logger.error(
          "No manifest.json found. Please run 'npm create deskthing@latest' first."
        );
        process.exit(1);
      }
    } catch (error) {
      Logger.error("Error during manifest migration:", error);
      process.exit(1);
    }

    Logger.info("Updating deskthing project...");

    // Backup existing config
    const manifestFile = await readFile(manifestPath, "utf-8");
    const manifestObject = JSON.parse(manifestFile) as AppManifest;

    const answer = await input({
      message: "Enter the version of the app you want to update to:",
      default: manifestObject.version || version,
      validate: (input: string) => {
        if (!semverValid(input)) {
          return "Invalid version format";
        }
        return true;
      },
    });

    const confirmAnswer = await confirm({
      message: `Update the client and server compatibilities to ${compatible_server} and ${compatible_client}?`,
      default: true,
    });

    const updatedManifest: AppManifest = {
      id: manifestObject.id || "deskthingtemplateapp",
      isAudioSource: manifestObject.isAudioSource || undefined,
      isScreenSaver: manifestObject.isScreenSaver || undefined,
      isWebApp: manifestObject.isWebApp || undefined,
      requires: manifestObject.requires || [],
      label: manifestObject.label || "Template App",
      version: answer || manifestObject.version || version,
      version_code: manifestObject.version_code || undefined,
      compatible_server: manifestObject.compatible_server || undefined,
      compatible_client: manifestObject.compatible_client || undefined,
      description:
        manifestObject.description ||
        "Description was not found while updating",
      author: manifestObject.author || "Unknown",
      platforms: manifestObject.platforms || [
        PlatformTypes.WINDOWS,
        PlatformTypes.MAC,
        PlatformTypes.LINUX,
      ],
      homepage: manifestObject.homepage || manifestObject.repository || "",
      repository: manifestObject.repository || "",
      template: manifestObject.template,
      tags: manifestObject.tags || [
        manifestObject.isAudioSource && TagTypes.AUDIO_SOURCE,
        manifestObject.isScreenSaver && TagTypes.SCREEN_SAVER,
      ],
      requiredVersions: confirmAnswer
        ? {
            server: `>=${compatible_server}`,
            client: `>=${compatible_client}`,
          }
        : manifestObject.requiredVersions || {
            server: `>=${
              manifestObject.compatible_server || compatible_server
            }`,
            client: `>=${
              manifestObject.compatible_client || compatible_client
            }`,
          },
      updateUrl: manifestObject.updateUrl || manifestObject.repository || "",
    };

    // Remove old deps
    Logger.startProgress("Removing old dependencies...");
    execSync("npm uninstall deskthing-client deskthing-server concurrently",  { // remove concurrently as it is no longer needed
      stdio: "inherit",
    });
    Logger.stopProgress(true);

    // Update dependencies
    Logger.startProgress("Updating dependencies...");
    execSync(
      "npm install @deskthing/client@latest @deskthing/server@latest --save",
      { stdio: "inherit" }
    );
    // Update dev dependencies
    const devDeps = [
      "vite",
      "tsm",
      "@deskthing/types@latest",
      "@deskthing/cli@latest",
    ];

    execSync(`npm install ${devDeps.join(" ")} --save-dev`, {
      stdio: "inherit",
    });
    Logger.stopProgress(true);

    // Restore user's config
    await writeFile(manifestPath, JSON.stringify(updatedManifest));

    if (!options.noOverwrite) {
      // Update template files while preserving user modifications
      Logger.debug("Updating template files (no-overwrite set to false)...");
      const templateFiles = [
        "vite.config.ts",
        "tsconfig.json",
        "tsconfig.node.json",
        "tsconfig.app.json",
        "eslint.config.js",
        "package.json",
      ];

      Logger.debug(`Found the template used ${manifestObject.template}`);
      Logger.startProgress("Updating template files...");

      await Promise.all(
        templateFiles.map(async (file) => {
          const templatePath = path.join(
            __dirname,
            "..",
            "template",
            manifestObject.template || "full",
            file
          );

          // Early break for the template file if it doesn't exist
          try {
            await stat(templatePath);
          } catch (error) {
            Logger.debug(
              `Template file ${templatePath} not found. Skipping...`
            );
            return;
          }

          try {
            const templateContent = await readFile(templatePath, "utf-8");
            const userFile = path.join(process.cwd(), file);

            await mkdir(path.dirname(userFile), { recursive: true });

            try {
              const existingContent = await readFile(userFile, "utf-8");
              if (existingContent !== templateContent) {
                await cp(userFile, `${userFile}.backup`);
              }
            } catch (error) {
              // Ignore the error if the file does not exist
            }

            // handle package.json
            if (file === "package.json") {
              // Merge package.json instead of overwriting
              const currentPackage = JSON.parse(
                await readFile(userFile, "utf-8")
              );
              const templatePackage = JSON.parse(templateContent);
              currentPackage.scripts = {
                ...currentPackage.scripts,
                ...templatePackage.scripts,
              };

              // Update the package.json version
              currentPackage.version = answer || currentPackage.version || manifestObject.version || version;
              await writeFile(
                userFile,
                JSON.stringify(currentPackage, null, 2)
              );
            } else {
              await writeFile(userFile, templateContent);
            }
          } catch (error) {
            Logger.warning(`Error processing file ${file}:`, error);
          }
        })
      );
      Logger.stopProgress(true);
    } else {
      Logger.debug(
        `Not overwriting because noOverwrite is set to ${options.noOverwrite}`
      );
    }

    Logger.startProgress("Updating import statements...");
    const tsFiles = await findTypeScriptFiles(process.cwd());
    for (const file of tsFiles) {
      Logger.debug(`Processing file ${file}`);
      await updateImports(file);
    }
    Logger.stopProgress(true);

    Logger.success("Project updated successfully!");
    Logger.warning(
      "Note: Backup files have been created for modified template files (.backup extension)"
    );
    Logger.info("Please review the changes and test your application.");
    Logger.error("Ensure there are no errors.");
  } catch (error) {
    Logger.error("Error updating project:", error);
    process.exit(1);
  }
}

async function updateImports(filePath: string) {
  const content = await readFile(filePath, "utf-8");

  // Transform server imports
  let updatedContent = content.replace(
    /import\s*{([^}]+)}\s*from\s*['"]deskthing-server['"]/g,
    (match, imports) => {
      const importList = imports.split(",").map((i) => i.trim());
      const types = importList.filter((i) => i !== "DeskThing");
      const hasDeskthing = importList.includes("DeskThing");

      const lines: string[] = [];
      if (types.length) {
        lines.push(`import { ${types.join(", ")} } from '@deskthing/types'`);
      }
      if (hasDeskthing) {
        lines.push(`import { DeskThing } from '@deskthing/server'`);
      }
      return lines.join("\n");
    }
  );

  // Transform client imports
  updatedContent = updatedContent.replace(
    /import\s*{([^}]+)}\s*from\s*['"]deskthing-client['"]/g,
    (match, imports) => {
      const importList = imports.split(",").map((i) => i.trim());
      const types = importList.filter((i) => i !== "DeskThing");
      const hasDeskthing = importList.includes("DeskThing");

      const lines: string[] = [];
      if (types.length) {
        lines.push(`import { ${types.join(", ")} } from '@deskthing/types'`);
      }
      if (hasDeskthing) {
        lines.push(`import { DeskThing } from '@deskthing/client'`);
      }
      return lines.join("\n");
    }
  );
  // Removing exporting of deskthing
  if (
    filePath.toLowerCase().endsWith("server/index.ts") ||
    filePath.toLowerCase().endsWith("server\\index.ts")
  ) {
    Logger.debug("Removing export of DeskThing from server/index.ts");
    updatedContent = updatedContent.replace(
      /export\s*{\s*DeskThing\s*}[;]?\s*\n?(?!.*export\s*{\s*DeskThing\s*})/g,
      ""
    );
  }

  // Replace specific words
  const wordReplacements = [
    { from: "ServerEvent", to: "DESKTHING_EVENTS" },
    { from: "taskId: ", to: "taskReference: " },
    { from: "SEND_TYPES", to: "APP_REQUESTS" },
    { from: "ToServerData", to: "GenericTransitData" },
    { from: "FromDeviceDataEvents", to: "DEVICE_CLIENT" },
    { from: "ToDeviceDataEvents", to: "CLIENT_REQUESTS" },
    { from: "DeskThing.sendLog", to: "console.log" },
    { from: "DeskThing.sendDebug", to: "console.debug" },
    { from: "DeskThing.sendWarning", to: "console.warn" },
    { from: "DeskThing.sendWarn", to: "console.warn" },
    { from: "DeskThing.sendError", to: "console.error" },
    { from: "DeskThing.sendDataToClient", to: "DeskThing.send" },
  ];

  for (const replacement of wordReplacements) {
    const regex = new RegExp(replacement.from, "g");
    updatedContent = updatedContent.replace(regex, replacement.to);
  }
  await writeFile(filePath, updatedContent, "utf-8");
}

const findTypeScriptFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  const items = await readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (await stat(fullPath).then((stats) => stats.isDirectory())) {
      if (!["node_modules", "dist"].includes(item)) {
        files.push(...(await findTypeScriptFiles(fullPath)));
      }
    } else if (fullPath.match(/\.(ts|tsx)$/)) {
      files.push(fullPath);
    }
  }

  return files;
};
