import fs from "fs";
import path from "path";
import type { ZodTypeAny } from "zod";

export function cargarSchema(dir: string): ZodTypeAny | undefined {
  const schemaJs = path.join(dir, "schema.js");
  const schemaTs = path.join(dir, "schema.ts");
  const schemaPath = fs.existsSync(schemaJs) ? schemaJs : schemaTs;

  if (!fs.existsSync(schemaPath)) return undefined;

  const mod = require(schemaPath) as { schema?: ZodTypeAny };
  return mod.schema;
}
