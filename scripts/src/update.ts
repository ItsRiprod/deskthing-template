import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { ManifestData } from "./types";
import { packageJson } from "./setup";

export async function updateProject() {
  try {
    // Check if it's a deskthing project

    const manifestPath = path.join("./public/manifest.json");

    if (!fs.existsSync(manifestPath)) {
      console.error(
        chalk.red(
          "Error: This is not a deskthing project. Please run this command in a deskthing project directory."
        )
      );
      process.exit(1);
    }

    console.log(chalk.blue("Updating deskthing project..."));

    // Backup existing config
    const manifestFile = fs.readFileSync(manifestPath, "utf-8");
    const manifestObject = JSON.parse(manifestFile);

    const updatedManifest: ManifestData = {
      id: manifestObject.id || "deskthingtemplateapp",
      isAudioSource: manifestObject.isAudioSource || false,
      isScreenSaver: manifestObject.isScreenSaver || false,
      isWebApp: manifestObject.isWebApp || true,
      requires: manifestObject.requires || [],
      label: manifestObject.label || "Template App",
      version: manifestObject.version || packageJson.version || "v0.0.0",
      version_code: manifestObject.version_code || packageJson.version_code || 0,
      compatible_server: packageJson.version_code || 0,
      compatible_client: packageJson.version_code || 0,
      description:
        manifestObject.description ||
        "Description was not found while updating",
      author: manifestObject.author || "Unknown",
      platforms: manifestObject.platforms || ["windows", "mac", "linux"],
      homepage: manifestObject.homepage || "",
      repository: manifestObject.repository || "",
      template: manifestObject.template,
    };

    // Update dependencies
    console.log(chalk.yellow("Updating dependencies..."));
    execSync(
      "npm install deskthing-client@latest deskthing-server@latest --save",
      { stdio: "inherit" }
    );
    // Update dev dependencies
    const devDeps = [
      "archiver",
      "@eslint/js",
      "@types/react",
      "@types/react-dom",
      "@vitejs/plugin-legacy",
      "@vitejs/plugin-react",
      "autoprefixer",
      "esbuild",
      "eslint",
      "eslint-plugin-react-hooks",
      "eslint-plugin-react-refresh",
      "tailwindcss",
      "typescript",
      "typescript-eslint",
      "vite",
    ];

    execSync(`npm install ${devDeps.join(" ")} --save-dev`, {
      stdio: "inherit",
    });

    // Restore user's config
    fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest));

    // Update template files while preserving user modifications
    const templateFiles = [
      "vite.config.ts",
      "electron.vite.config.ts",
      "tsconfig.json",
      "tsconfig.node.json",
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
        "full",
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
            build:
              "vite build && npm run build-server && node scripts/package.js",
            "build-server":
              "esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js",
          };
          fs.writeFileSync(userFile, JSON.stringify(currentPackage, null, 2));
        } else {
          fs.writeFileSync(userFile, templateContent);
        }
      }
    });

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
