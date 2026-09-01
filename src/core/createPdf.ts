import { PdfService } from "./pdfService";
import { TenantManager } from "./tenantManager";

export async function createPdf(
  clienteNombre: string,
  nombreInforme: string,
  data: any,
): Promise<Buffer<ArrayBufferLike>> {
  const compilarTemplate = TenantManager.getTemplateDelegate(clienteNombre, nombreInforme);
  const htmlFinal = compilarTemplate(data);

  const pdfBuffer: Buffer<ArrayBufferLike> =
    await PdfService.createDocument(htmlFinal);

  return pdfBuffer;
}
