import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(rootDirectory, "package.json"), "utf8"));
const versionFile = resolve(rootDirectory, "public", "version.json");

await writeFile(versionFile, `${JSON.stringify({ version: packageJson.version }, null, 2)}\n`);
