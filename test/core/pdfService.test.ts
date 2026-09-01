import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const launchMock = vi.fn();

vi.mock("playwright", () => ({
  chromium: {
    launch: (...args: unknown[]) => launchMock(...args),
  },
}));

function crearPageFake(pdfContenido: string) {
  return {
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Buffer.from(pdfContenido)),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function crearBrowserFake(isConnected = true) {
  const pageMock = crearPageFake("pdf-bytes");
  const browserMock = {
    isConnected: vi.fn().mockReturnValue(isConnected),
    newPage: vi.fn().mockResolvedValue(pageMock),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { browserMock, pageMock };
}

describe("PdfService — browser Chromium compartido y reusado", () => {
  beforeEach(() => {
    vi.resetModules();
    launchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inicializar() lanza Chromium al arrancar el proceso, sin esperar al primer render", async () => {
    const { browserMock } = crearBrowserFake();
    launchMock.mockResolvedValue(browserMock);

    const { PdfService } = await import("../../src/core/pdfService");

    await PdfService.inicializar();

    expect(launchMock).toHaveBeenCalledTimes(1);
  });

  it("lanza Chromium una sola vez aunque createDocument se invoque varias veces en secuencia", async () => {
    const { browserMock } = crearBrowserFake();
    launchMock.mockResolvedValue(browserMock);

    const { PdfService } = await import("../../src/core/pdfService");

    await PdfService.createDocument("<html></html>");
    await PdfService.createDocument("<html></html>");
    await PdfService.createDocument("<html></html>");

    expect(launchMock).toHaveBeenCalledTimes(1);
    expect(browserMock.newPage).toHaveBeenCalledTimes(3);
  });

  it("requests concurrentes generan cada uno su PDF con su propia page, sin mezclarse", async () => {
    const { browserMock, pageMock: pageA } = crearBrowserFake();
    const pageB = crearPageFake("pdf-b");
    browserMock.newPage
      .mockResolvedValueOnce(pageA)
      .mockResolvedValueOnce(pageB);
    launchMock.mockResolvedValue(browserMock);

    const { PdfService } = await import("../../src/core/pdfService");

    const [pdfA, pdfB] = await Promise.all([
      PdfService.createDocument("<html>a</html>"),
      PdfService.createDocument("<html>b</html>"),
    ]);

    expect(launchMock).toHaveBeenCalledTimes(1);
    expect(pageA.setContent).toHaveBeenCalledWith(
      "<html>a</html>",
      expect.anything(),
    );
    expect(pageB.setContent).toHaveBeenCalledWith(
      "<html>b</html>",
      expect.anything(),
    );
    expect(pdfA.toString()).toBe("pdf-bytes");
    expect(pdfB.toString()).toBe("pdf-b");
    expect(pageA.close).toHaveBeenCalledTimes(1);
    expect(pageB.close).toHaveBeenCalledTimes(1);
    expect(browserMock.close).not.toHaveBeenCalled();
  });

  it("relanza el browser compartido si se detecta cerrado, sin reiniciar el proceso", async () => {
    const { browserMock: primerBrowser } = crearBrowserFake(true);
    const { browserMock: segundoBrowser } = crearBrowserFake(true);
    launchMock
      .mockResolvedValueOnce(primerBrowser)
      .mockResolvedValueOnce(segundoBrowser);

    const { PdfService } = await import("../../src/core/pdfService");

    await PdfService.createDocument("<html></html>");

    primerBrowser.isConnected.mockReturnValue(false);

    await PdfService.createDocument("<html></html>");

    expect(launchMock).toHaveBeenCalledTimes(2);
    expect(segundoBrowser.newPage).toHaveBeenCalledTimes(1);
  });

  it("si Chromium falla al lanzar, loguea y propaga un error de renderizado claro", async () => {
    launchMock.mockRejectedValue(new Error("boom"));

    const { PdfService } = await import("../../src/core/pdfService");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(PdfService.createDocument("<html></html>")).rejects.toThrow(
      "Fallo en la capa de renderizado de PDF.",
    );
    expect(errorSpy).toHaveBeenCalled();
  });
});
