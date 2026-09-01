import type { Application } from "express";
import express from "express";
import { TenantManager } from "./core/tenantManager";
import { createPdf } from "./core/createPdf";
import process from "process";

const app: Application = express();

const port = process.env.PORT || 3005;

app.use(express.json({ limit: "50mb" }));

try {
  TenantManager.inicializar();
} catch (err: unknown) {
  console.error("[Error] Fallo al inicializar tenants:", err);
  process.exit(1);
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/render/:clienteNombre", async (req, res) => {
  try {
    console.log("[Render] Entro al render");
    const { clienteNombre } = req.params;
    const nombreInforme = req.query.nombreInforme as string | undefined;
    console.log("[Render] Cliente nombre:", clienteNombre);
    console.log("[Render] Nombre informe:", nombreInforme);

    if (!nombreInforme) {
      res
        .status(400)
        .json({ error: "El query param 'nombreInforme' es obligatorio." });
      return;
    }

    const { data } = req.body;

    const pdfBuffer: Buffer<ArrayBufferLike> = await createPdf(
      clienteNombre,
      nombreInforme,
      data,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
