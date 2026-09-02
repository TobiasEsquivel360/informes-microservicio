import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createDocumentMock = vi.fn();

vi.mock("../../src/core/pdfService", () => ({
  PdfService: {
    createDocument: (...args: unknown[]) => createDocumentMock(...args),
  },
}));

import { generarPdfPreview } from "../../src/dev/pdfPreviewCli";

describe("generarPdfPreview (comando pdf:preview) — con tenants reales del repo", () => {
  let outputDir: string;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-preview-"));
    createDocumentMock.mockResolvedValue(
      Buffer.from("%PDF-1.7\n(render simulado del motor)"),
    );
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("genera con el escenario 'default' un archivo con bytes de PDF válidos y el render del fixture default", async () => {
    const ruta = await generarPdfPreview("gsc", "scoring", "default", {
      outputDir,
    });

    expect(path.basename(ruta)).toBe("gsc-scoring-default.pdf");
    expect(fs.existsSync(ruta)).toBe(true);
    expect(fs.readFileSync(ruta).subarray(0, 5).toString()).toBe("%PDF-");

    const htmlRenderizado = createDocumentMock.mock.calls[0]?.[0] as string;
    expect(htmlRenderizado).toContain("Juan Ejemplo Pérez");
    expect(htmlRenderizado).not.toContain("María Alertada Gómez");
  });

  it("usa el escenario 'default' cuando no se pasa ninguno", async () => {
    const ruta = await generarPdfPreview("gsc", "scoring", undefined, {
      outputDir,
    });

    expect(path.basename(ruta)).toBe("gsc-scoring-default.pdf");
    const htmlRenderizado = createDocumentMock.mock.calls[0]?.[0] as string;
    expect(htmlRenderizado).toContain("Juan Ejemplo Pérez");
  });

  it("usa el fixture del escenario pedido (con-alertas) en vez del default", async () => {
    const ruta = await generarPdfPreview("gsc", "scoring", "con-alertas", {
      outputDir,
    });

    expect(path.basename(ruta)).toBe("gsc-scoring-con-alertas.pdf");
    expect(fs.existsSync(ruta)).toBe(true);
    const htmlRenderizado = createDocumentMock.mock.calls[0]?.[0] as string;
    expect(htmlRenderizado).toContain("María Alertada Gómez");
    expect(htmlRenderizado).not.toContain("Juan Ejemplo Pérez");
  });

  it("falla con mensaje claro y sin generar archivos si el escenario no existe", async () => {
    await expect(
      generarPdfPreview("gsc", "scoring", "no-existe", { outputDir }),
    ).rejects.toThrow(/Buscado en: .*no-existe\.json/);

    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(fs.readdirSync(outputDir)).toEqual([]);
  });

  it("falla con mensaje claro si el cliente/informe no existe en el disco", async () => {
    await expect(
      generarPdfPreview("gsc", "informeQueNoExiste", undefined, { outputDir }),
    ).rejects.toThrow(/informeQueNoExiste/);

    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(fs.readdirSync(outputDir)).toEqual([]);
  });
});
