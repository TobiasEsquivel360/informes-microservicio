import type { Application, Request, Response } from "express";
import express from "express";
import { PdfService } from "./core/pdfService";
import { TenantManager } from "./core/tenantManager";

const app: Application = express();

const port = process.env.PORT || 3005;

app.use(express.json({ limit: "50mb" }));

try {
  TenantManager.inicializar();
} catch (err: unknown) {
  console.error("[Error] Fallo al inicializar tenants:", err);
  process.exit(1);
}

app.post("/render/:clienteNombre", async (req, res) => {
  try {
    const { clienteNombre } = req.params;
    const { data } = req.body;

    const compilarTemplate = TenantManager.getTemplate(clienteNombre);
    const htmlFinal = compilarTemplate(data);

    const pdfService = new PdfService();
    const pdfBuffer = await pdfService.createDocument(htmlFinal);

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
