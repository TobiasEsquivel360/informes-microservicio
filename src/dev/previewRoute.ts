import fs from "fs";
import path from "path";
import type { Application, Request, Response } from "express";
import { cargarHelpers } from "../core/helpers/helpersLoader";
import { compilarInforme, esInformeValido } from "../core/templateCompiler";

const TENANTS_PATH = path.join(__dirname, "../tenants");

export function registrarRutaPreview(app: Application): void {
  app.get("/preview/:cliente/:informe", previewHandler);
}

function previewHandler(
  req: Request<{ cliente: string; informe: string }>,
  res: Response,
): void {
  const { cliente, informe } = req.params;
  const fixtureNombre = (req.query.fixture as string | undefined) ?? "default";

  const clienteDir = path.join(TENANTS_PATH, cliente);
  const informeDir = path.join(clienteDir, informe);
  const fixturePath = path.join(informeDir, "fixtures", `${fixtureNombre}.json`);

  if (!esInformeValido(informeDir)) {
    res.status(404).json({
      error: `El informe '${informe}' no existe para el cliente '${cliente}'.`,
    });
    return;
  }

  if (!fs.existsSync(fixturePath)) {
    res.status(404).json({
      error: `El fixture '${fixtureNombre}' no existe para ${cliente}/${informe}.`,
    });
    return;
  }

  try {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const helpersCompartidos = cargarHelpers(clienteDir);
    const template = compilarInforme(informeDir, helpersCompartidos);
    const htmlInforme = template(fixture);

    res.status(200).send(inyectarAutoReload(envolverEnA4(htmlInforme)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

const ESTILO_CONTENEDOR_A4 =
  `<style>\n` +
  `  html { margin: 0; background: #2b2b2b; }\n` +
  `  body { width: 210mm; margin: 0 auto; background: white; box-sizing: border-box; }\n` +
  `</style>`;

function envolverEnA4(html: string): string {
  return insertarAntesDeCierre(html, "</head>", ESTILO_CONTENEDOR_A4);
}

const SCRIPT_AUTO_RELOAD =
  `<script>\n` +
  `  new EventSource("/__dev/reload").addEventListener("reload", () => location.reload());\n` +
  `</script>`;

function inyectarAutoReload(html: string): string {
  return insertarAntesDeCierre(html, "</body>", SCRIPT_AUTO_RELOAD);
}

function insertarAntesDeCierre(
  html: string,
  tagCierre: "</head>" | "</body>",
  contenido: string,
): string {
  return html.includes(tagCierre)
    ? html.replace(tagCierre, `${contenido}${tagCierre}`)
    : `${html}\n${contenido}`;
}
