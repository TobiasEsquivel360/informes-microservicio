import fs from "fs";
import path from "path";

type HelpersMap = Record<string, Handlebars.HelperDelegate>;

export function cargarHelpers(dir: string): HelpersMap {
  const helpersJs = path.join(dir, "helpers.js");
  const helpersTs = path.join(dir, "helpers.ts");
  const helpersPath = fs.existsSync(helpersJs) ? helpersJs : helpersTs;

  if (!fs.existsSync(helpersPath)) return {};

  const mod = require(helpersPath) as { helpers?: HelpersMap };
  return mod.helpers ?? {};
}

export function mergeHelpers(...fuentes: HelpersMap[]): HelpersMap {
  return Object.assign({}, ...fuentes);
}
