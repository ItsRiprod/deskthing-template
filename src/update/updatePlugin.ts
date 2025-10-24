import path from "path";
import { promises as fs } from "fs";
import { input, confirm } from "@inquirer/prompts";
import { PluginManifest, PluginApplications, PluginEntrypoints } from "@deskthing/types";

export async function updatePluginManifest(
    pluginId: string,
): Promise<void> {
    const pluginRoot = path.join(process.cwd(), "plugins", pluginId);
    const manifestPath = path.join(pluginRoot, "manifest.json");
    const manifest = await getJSON(manifestPath);

    // Basic top-level fields
    manifest.version = String(
        await input({ message: "Plugin Version:", default: String(manifest.version || "") })
    ).trim() || manifest.version;

    manifest.label = String(
        await input({ message: "Human-friendly label:", default: String(manifest.label || pluginId) })
    ).trim();

    manifest.description = String(
        await input({ message: "Short description:", default: String(manifest.description || "") })
    ).trim();

    manifest.purpose = String(
        await input({ message: "Purpose (one-line):", default: String(manifest.purpose || "") })
    ).trim();

    // required versions (server, client, app)
    const req = Object.assign({}, manifest.required ?? {});
    const reqKeys: Array<keyof typeof req | "server" | "client" | "app"> = ["server", "client", "app"];
    for (const k of reqKeys) {
        const current = String((req as any)[k] ?? "");
        const val = String(
            await input({
                message: `Minimum required version for ${k} (leave empty to remove):`,
                default: current,
            })
        ).trim();
        if (val) {
            (req as any)[k] = val;
        } else {
            delete (req as any)[k];
        }
    }
    manifest.required = Object.keys(req).length ? (req as any) : {};

    // Entrypoints: allow editing, removing, or adding for known platforms
    manifest.entrypoints = manifest.entrypoints ?? {};

    for (const plugin of Object.values(PluginApplications)) {
        const existing = manifest.entrypoints[plugin]

        if (existing) {
            const remove = await confirm({
                message: `Entry point for ${plugin} exists (${existing.fileName}). Remove it?`,
                default: false,
            });
            if (remove) {
                delete manifest.entrypoints[plugin];
                continue;
            }

            const edit = await confirm({ message: `Edit entrypoint for ${plugin}?`, default: false });
            if (edit) {
                const fileName = String(
                    await input({
                        message: `File name for ${plugin}:`,
                        default: String(existing.fileName || "index.ts"),
                        validate: (v: string) => (v && v.trim() ? true : "fileName is required"),
                    })
                ).trim();
                const isRepeatable = !!(
                    await confirm({ message: `Is the ${plugin} plugin repeatable?`, default: !!existing.isRepeatable })
                );
                const persistent = !!(
                    await confirm({ message: `Is the ${plugin} plugin persistent?`, default: !!existing.persistent })
                );

                manifest.entrypoints[plugin] = { fileName, isRepeatable, persistent };

                if (plugin === PluginApplications.CLIENT && 'lazy' in existing) {
                    const lazy = !!(await confirm({ message: "Load client entrypoint lazily?", default: !!existing.lazy }));
                    manifest.entrypoints[plugin].lazy = lazy;
                }
            }
        } else {
            const add = await confirm({ message: `Add entrypoint for ${plugin}?`, default: false });
            if (!add) continue;

            const fileName = String(
                await input({
                    message: `File name for ${plugin}:`,
                    default: "index.ts",
                    validate: (v: string) => (v && v.trim() ? true : "fileName is required"),
                })
            ).trim();
            const isRepeatable = !!(await confirm({ message: `Is the ${plugin} plugin repeatable?`, default: false }));
            const persistent = !!(await confirm({ message: `Is the ${plugin} plugin persistent?`, default: false }));

            manifest.entrypoints[plugin] = { fileName, isRepeatable, persistent };
            if (plugin === "client") {
                const lazy = !!(await confirm({ message: "Load client entrypoint lazily?", default: false }));
                manifest.entrypoints[plugin].lazy = lazy;
            }
        }
    }

    // Normalize entrypoints: remove if empty object
    if (!manifest.entrypoints || Object.keys(manifest.entrypoints).length === 0) {
        delete manifest.entrypoints;
    }

    // Persist changes back to disk
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

async function getJSON(manifestPath: string): Promise<PluginManifest> {
    try {
        const content = await fs.readFile(manifestPath, "utf8");
        return JSON.parse(content) as PluginManifest;
    } catch (err: any) {
        throw new Error(`Failed to read/parse manifest at ${manifestPath}: ${err?.message ?? err}`);
    }
}