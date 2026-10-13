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

describe("TenantManager — gsc/auditoriaEtapas", () => {
  beforeAll(() => {
    TenantManager.inicializar();
  });

  const cargarFixture = (nombreFixture: string) =>
    require(`../src/tenants/gsc/auditoriaEtapas/fixtures/${nombreFixture}.json`);

  const obtenerSchema = () =>
    TenantManager.getSchema("gsc", "auditoriaEtapas")!;

  const renderizar = (fixture: unknown): string =>
    TenantManager.getTemplateDelegate("gsc", "auditoriaEtapas")(fixture);

  const contar = (html: string, texto: string): number =>
    html.split(texto).length - 1;

  // Acotado a la etiqueta: el HTML renderizado incluye el <style> inline.
  const ETIQUETA_EN_CURSO = `<span class="etiqueta-en-curso">En curso</span>`;

  it("declara un schema y compila su template sin tirar", () => {
    expect(TenantManager.getSchema("gsc", "auditoriaEtapas")).toBeDefined();
    expect(() =>
      TenantManager.getTemplateDelegate("gsc", "auditoriaEtapas"),
    ).not.toThrow();
  });

  it.each([
    "default",
    "cerrada",
    "recorrido-largo",
    "sin-observaciones",
  ])(
    "el fixture '%s' pasa el schema y compila el template sin tirar",
    (nombreFixture) => {
      const fixture = cargarFixture(nombreFixture);
      const schema = obtenerSchema();
      expect(schema.safeParse(fixture).success).toBe(true);
      expect(() => renderizar(fixture)).not.toThrow();
    },
  );

  it("rechaza una etapa sin el flag enCurso", () => {
    const fixture = cargarFixture("default");
    const schema = obtenerSchema();
    const { enCurso: _enCurso, ...etapaSinFlag } = fixture.etapas[0];
    expect(
      schema.safeParse({ ...fixture, etapas: [etapaSinFlag] }).success,
    ).toBe(false);
  });

  it("muestra la tabla 'Etapas de la solicitud' con sus 6 columnas", () => {
    const html = renderizar(cargarFixture("default"));
    expect(html).toContain("Etapas de la solicitud");
    for (const columna of [
      "Fecha y hora",
      "Tiempo en etapa",
      "Apellido y nombre",
      "Sucursal / Zonal",
      "Etapa workflow",
      "Observaciones",
    ]) {
      expect(html).toContain(`>${columna}<`);
    }
    expect(html).not.toContain(">Estado<");
  });

  it("con la solicitud abierta, 'En curso' aparece una sola vez, en la primera fila", () => {
    const fixture = cargarFixture("default");
    const html = renderizar(fixture);
    expect(contar(html, ETIQUETA_EN_CURSO)).toBe(1);

    const primeraFila = html.split("<tr class=\"fila-etapa\">")[1];
    expect(primeraFila).toContain(ETIQUETA_EN_CURSO);
    expect(primeraFila).toContain(fixture.etapas[0].tiempoEnEtapa);
  });

  it("con la solicitud cerrada, ninguna fila lleva 'En curso'", () => {
    const html = renderizar(cargarFixture("cerrada"));
    expect(contar(html, ETIQUETA_EN_CURSO)).toBe(0);
  });

  it("las observaciones vacías se muestran como '—', nunca en blanco", () => {
    const fixture = cargarFixture("sin-observaciones");
    const html = renderizar(fixture);
    expect(contar(html, '<td class="col-observaciones">—</td>')).toBe(
      fixture.etapas.length,
    );
  });

  it("muestra la observación cuando viene cargada", () => {
    const fixture = cargarFixture("default");
    const conObservacion = fixture.etapas.find(
      (etapa: { observaciones?: string | null }) => etapa.observaciones,
    );
    const html = renderizar(fixture);
    expect(html).toContain(
      `<td class="col-observaciones">${conObservacion.observaciones}</td>`,
    );
  });

  it("una fila con solo sucursal muestra solo la sucursal, sin separador colgando", () => {
    const fixture = cargarFixture("sin-observaciones");
    const soloSucursal = fixture.etapas.find(
      (etapa: { sucursalZonal: string }) => !etapa.sucursalZonal.includes("/"),
    );
    const html = renderizar(fixture);
    expect(html).toContain(
      `<td class="col-sucursal-zonal">${soloSucursal.sucursalZonal}</td>`,
    );
  });
});
