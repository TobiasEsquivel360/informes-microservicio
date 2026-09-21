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
    "default",
    "sin-conyuge",
    "sin-codeudor",
    "sin-ninguno",
  ])(
    "el fixture '%s' pasa el schema y compila el template sin tirar",
    (nombreFixture) => {
      const fixture = require(
        `../src/tenants/gsc/scoring/fixtures/${nombreFixture}.json`,
      );
      const schema = TenantManager.getSchema("gsc", "scoring")!;
      expect(schema.safeParse(fixture).success).toBe(true);

      const template = TenantManager.getTemplateDelegate("gsc", "scoring");
      expect(() => template(fixture)).not.toThrow();
    },
  );

  it("con ambos ausentes, la sección 'Datos de Cotitulares' no aparece", () => {
    const fixture = require(
      "../src/tenants/gsc/scoring/fixtures/sin-ninguno.json",
    );
    const template = TenantManager.getTemplateDelegate("gsc", "scoring");
    const html = template(fixture);
    expect(html).not.toContain("Datos de Cotitulares");
  });

  it("sin cónyuge, se oculta su columna en las tablas combinadas pero se conserva el codeudor", () => {
    const fixture = require(
      "../src/tenants/gsc/scoring/fixtures/sin-conyuge.json",
    );
    const template = TenantManager.getTemplateDelegate("gsc", "scoring");
    const html = template(fixture);
    expect(html).toContain("Datos de Cotitulares");
    expect(html).not.toContain(">Cónyuge<");
    expect(html).toContain(">Codeudor<");
  });

  it("sin codeudor, se oculta su columna en las tablas combinadas pero se conserva el cónyuge", () => {
    const fixture = require(
      "../src/tenants/gsc/scoring/fixtures/sin-codeudor.json",
    );
    const template = TenantManager.getTemplateDelegate("gsc", "scoring");
    const html = template(fixture);
    expect(html).toContain("Datos de Cotitulares");
    expect(html).toContain(">Cónyuge<");
    expect(html).not.toContain(">Codeudor<");
  });

  it("con ambos presentes, se muestran las dos columnas y la tabla de Cotitulares", () => {
    const fixture = require(
      "../src/tenants/gsc/scoring/fixtures/default.json",
    );
    const template = TenantManager.getTemplateDelegate("gsc", "scoring");
    const html = template(fixture);
    expect(html).toContain("Datos de Cotitulares");
    expect(html).toContain(">Cónyuge<");
    expect(html).toContain(">Codeudor<");
  });
});
