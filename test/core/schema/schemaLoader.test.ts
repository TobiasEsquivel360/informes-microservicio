import path from "path";
import { describe, expect, it } from "vitest";
import { cargarSchema } from "../../../src/core/schema/schemaLoader";

const FIXTURES = path.join(__dirname, "../../fixtures/schema");

describe("cargarSchema", () => {
  it("devuelve el ZodType exportado cuando existe schema.js en el directorio", () => {
    const schema = cargarSchema(path.join(FIXTURES, "con-schema"));

    expect(schema).toBeDefined();
    expect(schema!.safeParse({ nombre: "ok" }).success).toBe(true);
    expect(schema!.safeParse({ nombre: 123 }).success).toBe(false);
  });

  it("devuelve undefined cuando el directorio no tiene schema.js ni schema.ts", () => {
    const schema = cargarSchema(path.join(FIXTURES, "sin-schema"));

    expect(schema).toBeUndefined();
  });
});
