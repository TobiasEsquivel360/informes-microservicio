import { Browser, chromium } from "playwright";

export class PdfService {
  public async createDocument(finalHtml: string): Promise<Buffer> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // evita crashes por /dev/shm limitado en Docker (64MB default)
        ],
      });
      const page = await browser.newPage();

      await page.setContent(finalHtml, { waitUntil: "networkidle" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px" },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error("[Arquitectura] Error crítico en Chromium:", error);
      throw new Error("Fallo en la capa de renderizado de PDF.");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
