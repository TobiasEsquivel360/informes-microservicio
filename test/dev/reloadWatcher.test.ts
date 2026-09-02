import express from "express";
import fs from "fs";
import http from "http";
import type { AddressInfo } from "net";
import os from "os";
import path from "path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { crearApp } from "../../src/app";
import { detenerWatcher, registrarRutaReload } from "../../src/dev/reloadWatcher";

describe("GET /__dev/reload (NODE_ENV=development)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
  });

  afterEach(async () => {
    await detenerWatcher();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("responde con headers de Server-Sent Events", async () => {
    const app = crearApp();
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    await new Promise<void>((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/__dev/reload`, (res) => {
        try {
          expect(res.headers["content-type"]).toContain("text/event-stream");
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          req.destroy();
        }
      });
      req.on("error", reject);
    });

    server.close();
  });

  it("empuja un evento reload cuando cambia un archivo relevante bajo tenants", async () => {
    const tenantsDirTemporal = fs.mkdtempSync(
      path.join(os.tmpdir(), "reload-test-"),
    );
    const informeDir = path.join(tenantsDirTemporal, "clienteX", "informeY", "pdf");
    fs.mkdirSync(informeDir, { recursive: true });
    const stylesPath = path.join(informeDir, "styles.css");
    fs.writeFileSync(stylesPath, "body { color: red; }");

    const app = express();
    registrarRutaReload(app, tenantsDirTemporal);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const eventoRecibido = new Promise<string>((resolve, reject) => {
      let acumulado = "";
      const req = http.get(`http://127.0.0.1:${port}/__dev/reload`, (res) => {
        res.on("data", (chunk: Buffer) => {
          acumulado += chunk.toString();
          if (acumulado.includes("event: reload")) resolve(acumulado);
        });
      });
      req.on("error", reject);
      setTimeout(() => reject(new Error("timeout esperando el evento reload")), 3000);
    });

    // Espera a que chokidar termine de indexar antes de escribir el cambio.
    await new Promise((resolve) => setTimeout(resolve, 300));
    fs.writeFileSync(stylesPath, "body { color: blue; }");

    const chunk = await eventoRecibido;
    expect(chunk).toContain("event: reload");

    server.close();
  }, 10000);

  it("no notifica cambios en archivos fuera del patrón vigilado (.ts)", async () => {
    const tenantsDirTemporal = fs.mkdtempSync(
      path.join(os.tmpdir(), "reload-test-"),
    );
    const informeDir = path.join(tenantsDirTemporal, "clienteX", "informeY", "pdf");
    fs.mkdirSync(informeDir, { recursive: true });
    const archivoIrrelevante = path.join(informeDir, "notas.ts");
    fs.writeFileSync(archivoIrrelevante, "// nada");

    const app = express();
    registrarRutaReload(app, tenantsDirTemporal);
    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    let recibioEvento = false;
    const req = http.get(`http://127.0.0.1:${port}/__dev/reload`, (res) => {
      res.on("data", (chunk: Buffer) => {
        if (chunk.toString().includes("event: reload")) recibioEvento = true;
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    fs.writeFileSync(archivoIrrelevante, "// cambio");
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(recibioEvento).toBe(false);

    req.destroy();
    server.close();
  }, 10000);
});

describe("GET /__dev/reload (NODE_ENV distinto de development)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("la ruta no está registrada", async () => {
    process.env.NODE_ENV = "production";
    const app = crearApp();

    const res = await request(app).get("/__dev/reload");

    expect(res.status).toBe(404);
  });
});
