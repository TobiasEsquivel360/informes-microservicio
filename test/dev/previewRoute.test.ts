import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { crearApp } from "../../src/app";

describe("GET /preview/:cliente/:informe (NODE_ENV=development)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("devuelve 200 con el HTML renderizado del fixture, envuelto en un contenedor de 210mm", async () => {
    const app = crearApp();

    const res = await request(app).get("/preview/gsc/scoring?fixture=default");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("210mm");
    expect(res.text).toContain("Juan Ejemplo Pérez");
    expect(res.text).toContain("EventSource(\"/__dev/reload\")");
  });

  it("devuelve 200 para otro escenario de fixture (con-alertas)", async () => {
    const app = crearApp();

    const res = await request(app).get(
      "/preview/gsc/scoring?fixture=con-alertas",
    );

    expect(res.status).toBe(200);
    expect(res.text).toContain("María Alertada Gómez");
  });

  it("usa el fixture 'default' cuando no se pasa el query param fixture", async () => {
    const app = crearApp();

    const res = await request(app).get("/preview/gsc/scoring");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Juan Ejemplo Pérez");
  });

  it("responde 404 con mensaje claro cuando el fixture no existe", async () => {
    const app = crearApp();

    const res = await request(app).get(
      "/preview/gsc/scoring?fixture=no-existe",
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no-existe/);
  });

  it("responde 404 con mensaje claro cuando el informe no existe para el cliente", async () => {
    const app = crearApp();

    const res = await request(app).get(
      "/preview/gsc/informeQueNoExiste?fixture=default",
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/informeQueNoExiste/);
  });
});

describe("GET /preview/:cliente/:informe (NODE_ENV distinto de development)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("la ruta no está registrada: responde el 404 propio de Express, no el de la ruta", async () => {
    process.env.NODE_ENV = "production";
    const app = crearApp();

    const res = await request(app).get("/preview/gsc/scoring?fixture=default");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toEqual({});
  });

  it("sin NODE_ENV seteado, la ruta tampoco está registrada", async () => {
    delete process.env.NODE_ENV;
    const app = crearApp();

    const res = await request(app).get("/preview/gsc/scoring?fixture=default");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("text/html");
  });
});
