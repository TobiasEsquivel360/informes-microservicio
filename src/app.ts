import type { Application } from "express";
import express from "express";
import { createPdf } from "./core/createPdf";
import {
  PayloadValidationError,
  validarPayload,
} from "./core/validation/payloadValidator";

export function crearApp(): Application {
  const app: Application = express();

  app.use(express.json({ limit: "50mb" }));

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

      validarPayload(clienteNombre, nombreInforme, data);

      const pdfBuffer: Buffer<ArrayBufferLike> = await createPdf(
        clienteNombre,
        nombreInforme,
        data,
      );

      res.setHeader("Content-Type", "application/pdf");
      res.send(pdfBuffer);
    } catch (error: any) {
      if (error instanceof PayloadValidationError) {
        res.status(400).json({
          error: "El payload no cumple el schema esperado.",
          issues: error.issues,
        });
        return;
      }

      res.status(500).json({ error: error.message });
    }
  });

  return app;
}
