import fs from "fs";
import path from "path";
import { create } from "handlebars";
import { cargarHelpers, mergeHelpers } from "./helpers/helpersLoader";

export function compilarInforme(
  informeDir: string,
  helpersCompartidos: Record<string, Handlebars.HelperDelegate>,
): HandlebarsTemplateDelegate {
  const htmlPath = path.join(informeDir, "pdf/template.html");
  const cssPath = path.join(informeDir, "pdf/styles.css");

  const handlebars = create();

  const helpersEspecificos = cargarHelpers(informeDir);
  const helpersCombinados = mergeHelpers(
    helpersCompartidos,
    helpersEspecificos,
  );

  for (const [nombre, funcion] of Object.entries(helpersCombinados)) {
    handlebars.registerHelper(nombre, funcion);
  }

  let html = fs.readFileSync(htmlPath, "utf-8");

  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, "utf-8");
    html = `<style>${css}</style>\n` + html;
  }

  return handlebars.compile(html);
}

export function esInformeValido(informeDir: string): boolean {
  return fs.existsSync(path.join(informeDir, "pdf/template.html"));
}
