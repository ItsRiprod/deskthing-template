import { readFileSync } from "node:fs";
import { Logger } from "../view/logger";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const defaultValues = {
  version: "0.11.5",
  compatible_client: "0.11.2",
  compatible_server: "0.11.18",
};

// Function to get package.json path that works in both ESM and CJS
function getPackagePath() {
  try {
    // For ESM (import.meta.url is available)
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      return join(__dirname, "..", "package.json");
    }
    // For CJS
    else {
      // In CJS, __dirname is available directly
      return join(__dirname, "..", "package.json");
    }
  } catch (error) {
    Logger.debug(`Error determining package path: ${error}`);
    // Fallback - try relative path from current working directory
    return join(process.cwd(), "package.json");
  }
}

let packageJson;
try {
  const packagePath = getPackagePath();
  Logger.debug(`packagePath: ${packagePath}`);
  packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
} catch (error) {
  // Fallback values if package.json cannot be read
  packageJson = { ...defaultValues };
  Logger.warning(
    "Warning: Could not read package.json, using default values:",
    error
  );
}

Logger.debug(`Got the package.json ${JSON.stringify(packageJson)}`);

export const version = packageJson.version || defaultValues.version;
export const compatible_client =
  packageJson.compatible_client || defaultValues.compatible_client;
export const compatible_server =
  packageJson.compatible_server || defaultValues.compatible_server;
