import process from "process";
import { crearApp } from "./app";
import { PdfService } from "./core/pdfService";
import { TenantManager } from "./core/tenantManager";

const port = process.env.PORT || 3005;

// Sin autenticación: decisión deliberada porque hoy escucha en loopback
// (127.0.0.1/localhost del mismo host que GSC-sir, nunca expuesto a la red).
// Si en el futuro este servicio se mueve a otro host o se expone fuera de
// localhost, hay que agregar autenticación ANTES de ese cambio — ver README.

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
