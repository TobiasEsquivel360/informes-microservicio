import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { cargarHelpers } from "../core/helpers/helpersLoader";
import { PdfService } from "../core/pdfService";
import { compilarInforme, esInformeValido } from "../core/templateCompiler";

const TENANTS_PATH = path.join(__dirname, "../tenants");
const OUTPUT_DIR = path.join(__dirname, "../../.output");

export interface OpcionesPdfPreview {
  outputDir?: string;
}

/**
 * Genera el PDF final real (mismo motor Handlebars + Playwright que
 * `POST /render/:cliente`) a partir del fixture `{escenario}.json` del
 * informe pedido, y lo escribe en `outputDir` (por defecto `.output/` en
 * la raíz del proyecto). Devuelve la ruta del PDF generado.
 *
 * No abre ningún visor: ese efecto de lado vive en `ejecutarPdfPreviewCli`.
 */
export async function generarPdfPreview(
  cliente: string,
  informe: string,
  escenario: string = "default",
  opciones: OpcionesPdfPreview = {},
): Promise<string> {
  const informeDir = path.join(TENANTS_PATH, cliente, informe);

  if (!esInformeValido(informeDir)) {
    throw new Error(
      `El informe '${informe}' no existe para el cliente '${cliente}'. Se esperaba 'pdf/template.html' en '${informeDir}'.`,
    );
  }

  const fixturePath = path.join(informeDir, "fixtures", `${escenario}.json`);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `El fixture '${escenario}' no existe para ${cliente}/${informe}. Buscado en: '${fixturePath}'.`,
    );
  }

  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
  const clienteDir = path.join(TENANTS_PATH, cliente);
  const template = compilarInforme(informeDir, cargarHelpers(clienteDir));
  const htmlFinal = template(fixture);

  const pdfBuffer = await PdfService.createDocument(htmlFinal);

  const outputDir = opciones.outputDir ?? OUTPUT_DIR;
  fs.mkdirSync(outputDir, { recursive: true });
  const rutaPdf = path.join(outputDir, `${cliente}-${informe}-${escenario}.pdf`);
  fs.writeFileSync(rutaPdf, pdfBuffer);

  return rutaPdf;
}

function abrirEnVisorPdf(rutaPdf: string): void {
  const comandoAbrir =
    process.platform === "win32"
      ? { comando: "cmd", args: ["/c", "start", "", rutaPdf] }
      : process.platform === "darwin"
        ? { comando: "open", args: [rutaPdf] }
        : { comando: "xdg-open", args: [rutaPdf] };

  // Apertura best-effort: un fallo del visor es un warning, no cambia el
  // exit code — el entregable del comando es el PDF generado, cuya ruta ya
  // se imprimió (el visor por defecto puede no existir en un entorno headless).
  const hijo = spawn(comandoAbrir.comando, comandoAbrir.args, {
    detached: true,
    stdio: "ignore",
  });
  hijo.on("error", (error) => {
    console.warn(
      `[pdf:preview] No se pudo abrir el visor de PDF: ${error.message}`,
    );
  });
  hijo.unref();
}

function mostrarUso(): void {
  console.error("Uso: npm run pdf:preview -- <cliente> <informe> [escenario]");
  console.error(
    "  escenario: nombre del fixture en src/tenants/<cliente>/<informe>/fixtures/ (sin .json). Por defecto: 'default'.",
  );
}

export async function ejecutarPdfPreviewCli(args: string[]): Promise<number> {
  const [cliente, informe, escenario] = args;

  if (!cliente || !informe || args.length > 3) {
    mostrarUso();
    return 1;
  }

  try {
    const rutaPdf = await generarPdfPreview(
      cliente,
      informe,
      escenario || "default",
    );
    console.log(`[pdf:preview] PDF generado en '${rutaPdf}'.`);
    abrirEnVisorPdf(rutaPdf);
    return 0;
  } catch (error) {
    console.error(`[pdf:preview] Error: ${(error as Error).message}`);
    return 1;
  }
}

const esInvocacionDirecta =
  typeof process.argv[1] === "string" &&
  /^pdfPreviewCli\.(ts|js)$/.test(path.basename(process.argv[1]));

if (esInvocacionDirecta) {
  void ejecutarPdfPreviewCli(process.argv.slice(2)).then((codigoSalida) => {
    process.exit(codigoSalida);
  });
}
