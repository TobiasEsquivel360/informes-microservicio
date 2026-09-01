import { Browser, chromium } from "playwright";

export class PdfService {
  private static browser: Browser | null = null;
  private static browserPromise: Promise<Browser> | null = null;

  public static async inicializar(): Promise<void> {
    await this.getBrowser();
  }

  public static async createDocument(finalHtml: string): Promise<Buffer> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        await page.setContent(finalHtml, { waitUntil: "networkidle" });

        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "20px", bottom: "20px" },
        });

        return Buffer.from(pdfBuffer);
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error("[Arquitectura] Error crítico en Chromium:", error);
      throw new Error("Fallo en la capa de renderizado de PDF.");
    }
  }

  private static async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (!this.browserPromise) {
      this.browserPromise = chromium
        .launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage", // evita crashes por /dev/shm limitado en Docker (64MB default)
          ],
        })
        .then((browser) => {
          this.browser = browser;
          return browser;
        })
        .finally(() => {
          this.browserPromise = null;
        });
    }

    return this.browserPromise;
  }
}
