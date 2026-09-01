import process from "process";
import { crearApp } from "./app";
import { PdfService } from "./core/pdfService";
import { TenantManager } from "./core/tenantManager";

const port = process.env.PORT || 3005;

async function main(): Promise<void> {
  try {
    TenantManager.inicializar();
    await PdfService.inicializar();
  } catch (err: unknown) {
    console.error("[Error] Fallo al inicializar el servidor:", err);
    process.exit(1);
  }

  const app = crearApp();

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

main();
