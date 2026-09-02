import { beforeAll, describe, expect, it } from "vitest";
import { TenantManager } from "../src/core/tenantManager";

describe("TenantManager — tenants reales sin schema.ts no se ven afectados", () => {
  beforeAll(() => {
    TenantManager.inicializar();
  });

  it.each([
    ["basa", "menor"],
    ["basa", "califSinLimites"],
    ["example", "default"],
  ])(
    "%s/%s sigue sin schema declarado y compilando su template normalmente",
    (cliente, informe) => {
      expect(TenantManager.getSchema(cliente, informe)).toBeUndefined();
      expect(() =>
        TenantManager.getTemplateDelegate(cliente, informe),
      ).not.toThrow();
    },
  );
});

describe("TenantManager — gsc/scoring", () => {
  beforeAll(() => {
    TenantManager.inicializar();
  });

  it("declara un schema y compila su template sin tirar", () => {
    expect(TenantManager.getSchema("gsc", "scoring")).toBeDefined();
    expect(() =>
      TenantManager.getTemplateDelegate("gsc", "scoring"),
    ).not.toThrow();
  });

  it.each([
    "aprobado",
    "rechazado",
    "muchas-alertas",
    "sin-destacados",
  ])("compila el template con el fixture '%s' sin tirar", (nombreFixture) => {
    const fixture = require(
      `../src/tenants/gsc/scoring/fixtures/${nombreFixture}.json`,
    );
    const schema = TenantManager.getSchema("gsc", "scoring")!;
    expect(schema.safeParse(fixture).success).toBe(true);

    const template = TenantManager.getTemplateDelegate("gsc", "scoring");
    expect(() => template(fixture)).not.toThrow();
  });
});
