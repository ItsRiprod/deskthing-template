import fs from "fs/promises";
import path from "path";
import * as semver from "semver";
import { input, confirm, checkbox } from "@inquirer/prompts";
import { PluginApplications, PluginManifest, PluginEntrypoints, AppManifest } from "@deskthing/types";
import { Logger } from "../view/logger";
import { validateProjectName } from "../utils/utility";
import semverValid from 'semver/functions/valid';
import { updatePluginManifest } from "../update/updatePlugin";

async function copyRecursive(src: string, dest: string): Promise<void> {
    const st = await fs.stat(src);
    if (st.isDirectory()) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src);
        for (const e of entries) {
            await copyRecursive(path.join(src, e), path.join(dest, e));
        }
    } else {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
    }
}

export default async function createPlugin(): Promise<void> {
    try {
        const MIN_DESKTHING_VERSION = "0.11.18";
        const PLUGIN_VERSION = "0.11.0"
        const repoDeskthingManifest = path.join(process.cwd(), "deskthing", "manifest.json");

        // Verify deskthing manifest exists and version is >= minimum
        let deskthingRaw: string;
        try {
            deskthingRaw = await fs.readFile(repoDeskthingManifest, "utf8");
        } catch (err) {
            Logger.error(`Unable to read ${repoDeskthingManifest}: ${String(err)}`);
            throw err;
        }
        let deskthingManifest: AppManifest
        try {
            deskthingManifest = JSON.parse(deskthingRaw);
        } catch {
            throw new Error("deskthing/manifest.json is not valid JSON");
        }
        const dtRangeRaw = deskthingManifest.requiredVersions?.server;
        const dtRange = String(dtRangeRaw ?? "");
        if (!dtRange) {
            throw new Error(`deskthing requiredVersions.server is missing (require >= ${MIN_DESKTHING_VERSION})`);
        }

        // Determine the minimum concrete version allowed by the repo's range.
        // semver.minVersion(">=0.11.13") => SemVer("0.11.13")
        let minAllowed = semver.minVersion(dtRange);
        if (!minAllowed) {
            // Fallback: try to coerce a version out of the string (e.g. ">=0.11.13" -> "0.11.13")
            const coerced = semver.coerce(dtRange);
            if (coerced) minAllowed = coerced;
        }

        if (!minAllowed) {
            throw new Error(`Unable to determine minimum deskthing version from requiredVersions.server "${dtRangeRaw}"`);
        }

        // Fail if the range allows a version lower than our minimum requirement.
        if (semver.lt(minAllowed.version, MIN_DESKTHING_VERSION)) {
            Logger.error(`Incompatible deskthing server version range "${dtRangeRaw}".`);
            Logger.info('To fix, run "npx create-deskthing@latest --update" to update the deskthing server version.');
            throw new Error(
                `"${dtRangeRaw ?? "(missing)"}" allows versions as low as ${minAllowed.version} but plugin requires >= ${MIN_DESKTHING_VERSION}`
            );
        }

        // Ask for plugin folder/id using same style as create.ts
        const rawName = await input({
            message: "Plugin folder/id:",
            validate: (v: string) => (v && v.trim() ? true : "Name is required"),
            transformer: (v: string) => v.trim().toLowerCase().replace(/\s+/g, "-"),
        });
        const name = rawName.trim().toLowerCase().replace(/\s+/g, "-");

        Logger.info(`Creating plugin "${name}"...`);

        // check if it already exists. If it does, ask if they want to edit. they dont want to edit, exit
        const pluginRoot = path.join(process.cwd(), "plugins", name);
        try {
            await fs.stat(pluginRoot);
            const edit = await confirm({ message: `Plugin "${name}" already exists. Do you want to edit it?`, default: false });
            if (!edit) {
                Logger.info(`Exiting without changes.`);
                return;
            }

            return updatePluginManifest(name);
        } catch (err) {
            // ENOENT means the directory doesn't exist -> continue creating the plugin
            if ((err as any)?.code !== "ENOENT") {
                Logger.error(`Failed to check plugin directory ${pluginRoot}:`, err);
                throw err;
            }
        }

        await validateProjectName(name, pluginRoot);

        const pluginVersion = await input({
            message: `Plugin Version (${MIN_DESKTHING_VERSION}):`,
            default: MIN_DESKTHING_VERSION,
            validate: (input: string) => {
                Logger.info(`Creating plugin "${name}"...`);
                const v = String(input || MIN_DESKTHING_VERSION).trim();
                const valid = semverValid(v);
                return valid ? true : "Invalid semver version";
            },
        });


        const labelResp = await input({ message: "Human-friendly label", default: name });
        const descriptionResp = await input({ message: "Short description", default: "" });
        const purposeResp = await input({ message: "Purpose (one-line)", default: "" });

        const platformsResp = await checkbox({
            message: "Select target platforms",
            instructions: 'This is ',
            required: true,
            choices: [
                { description: 'Plugin runs on the Server and modifies server behavior (not implemented)', name: "Server", value: PluginApplications.SERVER },
                { description: 'Plugin runs on ADB-connected devices', name: "ADB", value: PluginApplications.ADB },
                { description: 'Plugin runs on any bluetooth device (not implemented)', name: "Bluetooth", value: PluginApplications.BLUETOOTH },
                { description: 'Plugin runs on any client (not implemented)', name: "Client", value: PluginApplications.CLIENT },
            ],
        });


        const label: string = (String(labelResp || name)).trim();
        const description: string = (String(descriptionResp || "")).trim();
        const purpose: string = (String(purposeResp || "")).trim();
        const platforms: PluginApplications[] = (platformsResp || []) as PluginApplications[];

        if (platforms.length === 0) {
            throw new Error("At least one platform must be selected");
        }

        // Collect platform-specific info
        const entrypoints: PluginEntrypoints = {};
        const required: { server?: string; client?: string; app?: string } = {};

        for (const p of platforms) {
            const verResp = await input({
                message: `Minimum required version for ${p} (semver, leave empty if none)`,
                default: "",
            });
            const ver = String(verResp || "").trim();
            if (ver) {
                if (p === PluginApplications.SERVER) required.server = ver;
                else if (p === PluginApplications.CLIENT) required.client = ver;
                else required.app = required.app || ver;
            }
            const defaultFileName: string = `index.ts`;
            const fileNameResp = await input({
                message: `File name for ${p} (${defaultFileName}):`,
                default: defaultFileName,
                validate: (v: string) => (v && v.trim() ? true : "fileName is required"),
            });
            const fileName = String(fileNameResp || "").trim();
            if (!fileName) throw new Error("Entrypoint fileName is required");

            let lazy = false;
            if (p === PluginApplications.CLIENT) {
                lazy = !!(await confirm({ message: "Load client entrypoint lazily?", default: false }));
            }

            const isRepeatableResp = await confirm({
                message: `Is the ${p} plugin repeatable (can run multiple times)?`,
                default: false,
            });
            const persistentResp = await confirm({
                message: `Is the ${p} plugin persistent (only has to be run once)?`,
                default: false,
            });
            const isRepeatable: boolean = !!isRepeatableResp;
            const persistent: boolean = !!persistentResp;

            if (p === PluginApplications.SERVER) entrypoints.server = { fileName, isRepeatable, persistent };
            else if (p === PluginApplications.ADB) entrypoints.adb = { fileName, isRepeatable, persistent };
            else if (p === PluginApplications.BLUETOOTH) entrypoints.bluetooth = { fileName, isRepeatable, persistent };
            else if (p === PluginApplications.CLIENT) entrypoints.client = { fileName, lazy, isRepeatable, persistent };
        }



        const manifest: PluginManifest = {
            version: pluginVersion,
            plugin_version: PLUGIN_VERSION,
            required: Object.keys(required).length ? required : {},
            id: name,
            entrypoints: Object.keys(entrypoints).length ? entrypoints : undefined,
            label,
            description,
            purpose,
        };

        // Create plugin folder and write manifest
        Logger.info(`Creating plugin directory at ${pluginRoot}...`);
        try {
            await fs.mkdir(pluginRoot, { recursive: true });
        } catch (err) {
            throw new Error(`Failed to create plugin directory ${pluginRoot}: ${String(err)}`);
        }

        const manifestPath = path.join(pluginRoot, "manifest.json");
        try {
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        } catch (err) {
            throw new Error(`Failed to write manifest.json: ${String(err)}`);
        }

        const baseDir =
            typeof __dirname !== "undefined"
                ? __dirname
                : path.dirname(new URL(import.meta.url).pathname);

        for (const [k, v] of Object.entries(entrypoints)) {
            const fileNameRel = v.fileName;
            const fileNamePath = path.join(pluginRoot, fileNameRel);
            const fileNameDir = path.dirname(fileNamePath);
            const templatePath = path.join(baseDir, "..", "template", "plugin", k);

            try {
                const st = await fs.stat(templatePath);
                if (st.isDirectory()) {
                    // copy template directory contents into the fileName directory
                    await copyRecursive(templatePath, fileNameDir);
                } else {
                    // copy single template file to the intended fileName path
                    await fs.mkdir(fileNameDir, { recursive: true });
                    await fs.copyFile(templatePath, fileNamePath);
                }
            } catch (err) {
                // fallback to placeholder if template not found or copy fails
                await fs.mkdir(fileNameDir, { recursive: true });
                const placeholder = `// Placeholder entrypoint for ${k}\nmodule.exports = async function() {\n  console.log('Running plugin ${name} for ${k}');\n};\n`;
                await fs.writeFile(fileNamePath, placeholder, "utf8");
            }
        }

        Logger.success(`Plugin scaffold created at ${pluginRoot}`);
    } catch (err) {
        Logger.error("Failed to create plugin template:", err);
        throw err;
    }
}