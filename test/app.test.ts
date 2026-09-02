import path from "path";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { TenantManager } from "../src/core/tenantManager";

vi.mock("../src/core/createPdf", () => ({
  createPdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
}));

const FIXTURES_TENANTS_PATH = path.join(__dirname, "fixtures/tenants");

describe("POST /render/:clienteNombre", () => {
  beforeAll(async () => {
    TenantManager.inicializar(FIXTURES_TENANTS_PATH);
  });

  it("responde 200 con el PDF cuando el payload cumple el schema del informe", async () => {
    const { crearApp } = await import("../src/app");
    const app = crearApp();

    const res = await request(app)
      .post("/render/clienteA?nombreInforme=informeConSchemaPropio")
      .send({ data: { informe: "ok" } });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("responde 422 con el detalle del campo cuando el payload no cumple el schema", async () => {
    const { crearApp } = await import("../src/app");
    const app = crearApp();

    const res = await request(app)
      .post("/render/clienteA?nombreInforme=informeConSchemaPropio")
      .send({ data: { informe: 123 } });

    expect(res.status).toBe(422);
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "informe",
          message: expect.stringMatching(/\S/),
        }),
      ]),
    );
  });

  it("responde 200 sin validar cuando el tenant/informe no declara schema", async () => {
    const { crearApp } = await import("../src/app");
    const app = crearApp();

    const res = await request(app)
      .post("/render/clienteB?nombreInforme=informeSinNadaDeSchema")
      .send({ data: { loQueSea: true } });

    expect(res.status).toBe(200);
  });

  it("responde 200 cuando el body no trae contractVersion (compatibilidad hacia atrás)", async () => {
    const { crearApp } = await import("../src/app");
    const app = crearApp();

    const res = await request(app)
      .post("/render/clienteA?nombreInforme=informeConSchemaPropio")
      .send({ data: { informe: "ok" } });

    expect(res.status).toBe(200);
  });

  it("responde 200 cuando contractVersion es 1", async () => {
    const { crearApp } = await import("../src/app");
    const app = crearApp();

    const res = await request(app)
      .post("/render/clienteA?nombreInforme=informeConSchemaPropio")
      .send({ contractVersion: 1, data: { informe: "ok" } });

    expect(res.status).toBe(200);
  });

  it("responde 422 cuando contractVersion no es 1", async () => {
    const { crearApp } = await import("../src/app");
    const app = crearApp();

    const res = await request(app)
      .post("/render/clienteA?nombreInforme=informeConSchemaPropio")
      .send({ contractVersion: 2, data: { informe: "ok" } });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/contractVersion/);
  });
});
