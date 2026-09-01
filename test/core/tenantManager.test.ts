import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { TenantManager } from "../../src/core/tenantManager";

const FIXTURES_TENANTS_PATH = path.join(__dirname, "../fixtures/tenants");

describe("TenantManager — carga de schema.ts/js en cascada", () => {
  beforeAll(() => {
    TenantManager.inicializar(FIXTURES_TENANTS_PATH);
  });

  it("usa el schema del informe cuando existe (pisa al del cliente)", () => {
    const schema = TenantManager.getSchema("clienteA", "informeConSchemaPropio");

    expect(schema).toBeDefined();
    expect(schema!.safeParse({ informe: "ok" }).success).toBe(true);
    expect(schema!.safeParse({ cliente: "ok" }).success).toBe(false);
  });

  it("cae al schema compartido del cliente cuando el informe no tiene uno propio", () => {
    const schema = TenantManager.getSchema("clienteA", "informeSinSchemaPropio");

    expect(schema).toBeDefined();
    expect(schema!.safeParse({ cliente: "ok" }).success).toBe(true);
    expect(schema!.safeParse({ informe: "ok" }).success).toBe(false);
  });

  it("devuelve undefined cuando ni el cliente ni el informe declaran schema", () => {
    const schema = TenantManager.getSchema("clienteB", "informeSinNadaDeSchema");

    expect(schema).toBeUndefined();
  });

  it("sigue devolviendo el template compilado normalmente", () => {
    const template = TenantManager.getTemplateDelegate(
      "clienteA",
      "informeConSchemaPropio",
    );

    expect(template({ informe: "hola" })).toContain("hola");
  });
});
