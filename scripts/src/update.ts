import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { AppManifest, PlatformTypes, TagTypes } from "@deskthing/types";
import { input } from '@inquirer/prompts';
import { confirm } from '@inquirer/prompts';
import semverValid from "semver/functions/valid";
import { COMPATIBLE_CLIENT, COMPATIBLE_SERVER, TEMPLATE_VERSION } from "./constants";

export async function updateProject() {
  try {
    // Check if it's a deskthing project

    const publicPath = path.join("./public/");
    const deskthingPath = path.join("./deskthing/");
    const oldManifestPath = path.join("./public/manifest.json");
    const manifestPath = path.join("./deskthing/manifest.json");

    if (fs.existsSync(oldManifestPath)) {
      console.error(
        chalk.yellow(
          "Old manifest.json found. Automatically updating to the new file format with manifest.json, images/ and icons/ in /deskthing instead of /public"
        )
      );
      if (fs.existsSync(manifestPath)) {
        console.warn(
          chalk.yellow(
            "Manifest.json already exists in deskthing. Deleting the old manifest.json"
          )
        );
        fs.unlinkSync(manifestPath);
        } else {
        if (!fs.existsSync(deskthingPath)) {
          fs.mkdirSync(deskthingPath)
        } else {
          console.warn(chalk.yellow("deskthing directory already exists"))
        }
        try {

          if (fs.existsSync(path.join(publicPath, 'images'))) {
            fs.renameSync(path.join(publicPath, 'images'), path.join(deskthingPath, 'images'));
          }
          if (fs.existsSync(path.join(publicPath, 'icons'))) {
            fs.renameSync(path.join(publicPath, 'icons'), path.join(deskthingPath, 'icons'));
          }
          fs.renameSync(oldManifestPath, manifestPath);
        } catch (error) {
          console.error(chalk.red("Error moving files:"), error);
        }
      }
    } else if (!fs.existsSync(manifestPath)) {
      console.error(chalk.red("No manifest.json found in /deskthing/manifest.json. Please run 'npm create deskthing@latest' first."));
      process.exit(1);
    }

    console.log(chalk.blue("Updating deskthing project..."));

    // Backup existing config
    const manifestFile = fs.readFileSync(manifestPath, "utf-8");
    const manifestObject = JSON.parse(manifestFile) as AppManifest;

    const version = TEMPLATE_VERSION; // "0.10.7"
    const serverVersion = COMPATIBLE_SERVER // "0.10.4"
    const clientVersion = COMPATIBLE_CLIENT; // "0.10.4"

    const answer = await input({
      message: "Enter the version of the app you want to update to:",
      default: manifestObject.version || version,
      validate: (input: string) => {
        if (!semverValid(input)) {
          return "Invalid version format";
        }
        return true;
      }
    });

    const confirmAnswer = await confirm({
      message: `Update the client and server compatibilities to ${serverVersion} and ${clientVersion}?`,
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
        manifestObject.isScreenSaver && TagTypes.SCREEN_SAVER
      ],
      requiredVersions: confirmAnswer ?
        {
          server: `>=${serverVersion}`,
          client: `>=${clientVersion}`,
        }
      :
      manifestObject.requiredVersions || {
        server: `>=${manifestObject.compatible_server || serverVersion}`,
        client: `>=${manifestObject.compatible_client || clientVersion}`,
      },
      updateUrl: manifestObject.updateUrl || manifestObject.repository || "",
    };

    // Remove old deps
    console.log(chalk.yellow("Removing old dependencies..."));
    execSync(
      "npm uninstall deskthing-client deskthing-server",
      { stdio: "inherit" }
    );

    // Update dependencies
    console.log(chalk.yellow("Updating dependencies..."));
    execSync(
      "npm install @deskthing/client@latest @deskthing/types@latest @deskthing/server@latest --save",
      { stdio: "inherit" }
    );
    // Update dev dependencies
    const devDeps = [
      "vite",
      "concurrently",
      "tsm"
    ];

    execSync(`npm install ${devDeps.join(" ")} --save-dev`, {
      stdio: "inherit",
    });

    // Restore user's config
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest));

    // Update template files while preserving user modifications
    const templateFiles = [
      "vite.config.ts",
      "tsconfig.json",
      "tsconfig.node.json",
      "tsconfig.app.json",
      "scripts/package.js",
      "package.json",
    ];

    console.log(chalk.yellow("Updating template files..."));
    templateFiles.forEach((file) => {
      const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "template",
        manifestObject.template || 'full',
        file
      );
      if (fs.existsSync(templatePath)) {
        const templateContent = fs.readFileSync(templatePath, "utf-8");
        const userFile = path.join(process.cwd(), file);

        // Create directory if it doesn't exist (for scripts folder)
        const dir = path.dirname(userFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (fs.existsSync(userFile)) {
          const existingContent = fs.readFileSync(userFile, "utf-8");
          if (existingContent !== templateContent) {
            // Create backup only if files are different
            fs.copyFileSync(userFile, `${userFile}.backup`);
          }
        }

        if (file === "package.json") {
          // Merge package.json instead of overwriting
          const currentPackage = JSON.parse(fs.readFileSync(userFile, "utf-8"));
          const templatePackage = JSON.parse(templateContent);
          currentPackage.scripts = {
            ...currentPackage.scripts,
            "build": "deskthing package",
            "dev:vite": "vite",
            "dev:wrapper": "npx @deskthing/cli dev",
            "dev": "concurrently \"npm run dev:vite\" \"npm run dev:wrapper\"",
            "lint": "eslint .",
            "preview": "vite preview"
          };
          fs.writeFileSync(userFile, JSON.stringify(currentPackage, null, 2));
        } else {
          fs.writeFileSync(userFile, templateContent);
        }
      }
    });

    // Add this to the try block in updateProject()
    console.log(chalk.yellow('Updating import statements...'));
    const tsFiles = findTypeScriptFiles(process.cwd());
    for (const file of tsFiles) {
      console.log(`Processing file ${file}`)
      await updateImports(file);
    }

    console.log(chalk.green("✨ Project updated successfully!"));
    console.log(
      chalk.yellow(
        "Note: Backup files have been created for modified template files (.backup extension)"
      )
    );
    console.log(
      chalk.blue("Please review the changes and test your application.")
    );
    console.log(chalk.red("Ensure there are no errors."));
  } catch (error) {
    console.error(chalk.red("Error updating project:"), error);
    process.exit(1);
  }
}

// Add this function to handle the import transformations
async function updateImports(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Transform server imports
  let updatedContent = content.replace(
    /import\s*{([^}]+)}\s*from\s*['"]deskthing-server['"]/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());
      const types = importList.filter(i => i !== 'DeskThing');
      const hasDeskthing = importList.includes('DeskThing');
      
      const lines: string[] = [];
      if (types.length) {
        lines.push(`import { ${types.join(', ')} } from '@deskthing/types'`);
      }
      if (hasDeskthing) {
        lines.push(`import { DeskThing } from '@deskthing/server'`);
      }
      return lines.join('\n');
    }
  );

  // Transform client imports 
  updatedContent = updatedContent.replace(
    /import\s*{([^}]+)}\s*from\s*['"]deskthing-client['"]/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());
      const types = importList.filter(i => i !== 'DeskThing');
      const hasDeskthing = importList.includes('DeskThing');
      
      const lines: string[] = [];
      if (types.length) {
        lines.push(`import { ${types.join(', ')} } from '@deskthing/types'`);
      }
      if (hasDeskthing) {
        lines.push(`import { DeskThing } from '@deskthing/client'`);
      }
      return lines.join('\n');
    }
  );

  fs.writeFileSync(filePath, updatedContent);
}

// Add this to the updateProject function
const findTypeScriptFiles = (dir: string): string[] => {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', 'dist'].includes(item)) {
        files.push(...findTypeScriptFiles(fullPath));
      }
    } else if (fullPath.match(/\.(ts|tsx)$/)) {
      files.push(fullPath);
    }
  });
  
  return files;
};
