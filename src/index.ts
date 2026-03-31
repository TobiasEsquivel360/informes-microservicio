import type { Application, Request, Response } from "express";
import express from "express";
import type { RenderPdfRequest } from "./dtos/renderPdfRequest";
import { PdfService } from "./pdfService";

const app: Application = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

app.post("/render", async (req: Request<RenderPdfRequest>, res: Response) => {
  try {
    const { data } = req.body;
    const pdfService = new PdfService();

    const pdfBuffer = await pdfService.createDocument(data);

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).send("Error interno generando el documento");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
