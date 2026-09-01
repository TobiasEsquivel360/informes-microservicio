import fs from "fs";
import path from "path";

export function cargarExportDeModulo<T>(
  dir: string,
  nombreBase: string,
  clave: string,
): T | undefined {
  const rutaJs = path.join(dir, `${nombreBase}.js`);
  const rutaTs = path.join(dir, `${nombreBase}.ts`);
  const ruta = fs.existsSync(rutaJs) ? rutaJs : rutaTs;

  if (!fs.existsSync(ruta)) return undefined;

  const mod = require(ruta) as Record<string, T | undefined>;
  return mod[clave];
}
