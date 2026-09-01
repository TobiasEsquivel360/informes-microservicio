import { cargarExportDeModulo } from "../moduleLoader";

type HelpersMap = Record<string, Handlebars.HelperDelegate>;

export function cargarHelpers(dir: string): HelpersMap {
  return cargarExportDeModulo<HelpersMap>(dir, "helpers", "helpers") ?? {};
}

export function mergeHelpers(...fuentes: HelpersMap[]): HelpersMap {
  return Object.assign({}, ...fuentes);
}
