import fs from "fs";
import path from "path";
import Handlebars, { type TemplateDelegate } from "handlebars";
import { Browser, chromium } from "playwright";

export class PdfService {
  private readonly compileTemplate: TemplateDelegate;

  constructor() {
    const templatePath = path.join(__dirname, "pdf", "index.html");
    const dirtyHtml = fs.readFileSync(templatePath, "utf-8");
    this.compileTemplate = Handlebars.compile(dirtyHtml);
  }

  public async createDocument(data: any): Promise<Buffer> {
    let browser: Browser | null = null;

    const finalHtml: string = this.compileTemplate(data);

    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage();

    await page.setContent(finalHtml, { waitUntil: "networkidle" });

    const cssPath = path.join(__dirname, "pdf", "styles.css");
    await page.addStyleTag({ path: cssPath });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px" },
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}
