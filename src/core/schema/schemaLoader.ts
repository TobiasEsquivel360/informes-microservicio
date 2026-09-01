import type { ZodTypeAny } from "zod";
import { cargarExportDeModulo } from "../moduleLoader";

export function cargarSchema(dir: string): ZodTypeAny | undefined {
  return cargarExportDeModulo<ZodTypeAny>(dir, "schema", "schema");
}
