import fs from "fs";
import path from "path";
import { create } from "handlebars";

export class TenantManager {
  private static templatesCache = new Map<string, HandlebarsTemplateDelegate>();

  public static inicializar() {
    const tenantsBasePath = path.join(__dirname, "../tenants");
    const clientes = fs.readdirSync(tenantsBasePath);

    for (const clientName of clientes) {
      const clienteDir = path.join(tenantsBasePath, clientName);
      const hbsAislado = create();

      const helpersJs = path.join(clienteDir, "helpers.js");
      const helpersTs = path.join(clienteDir, "helpers.ts");
      const helpersPath = fs.existsSync(helpersJs) ? helpersJs : helpersTs;

      if (fs.existsSync(helpersPath)) {
        const { helpers } = require(helpersPath) as {
          helpers: Record<string, Handlebars.HelperDelegate>;
        };

        for (const [nombre, funcion] of Object.entries(helpers)) {
          hbsAislado.registerHelper(nombre, funcion);
        }
      }

      const htmlPath = path.join(clienteDir, "pdf/template.html");
      const cssPath = path.join(clienteDir, "pdf/styles.css");

      let htmlCrudo = fs.readFileSync(htmlPath, "utf-8");

      if (fs.existsSync(cssPath)) {
        const cssCrudo = fs.readFileSync(cssPath, "utf-8");
        htmlCrudo = `<style>${cssCrudo}</style>\n` + htmlCrudo;
      }

      const templateCompilado = hbsAislado.compile(htmlCrudo);
      this.templatesCache.set(clientName, templateCompilado);
    }

    console.log(
      `[Arquitectura] ${clientes.length} clientes cargados en memoria.`,
    );
  }

  public static getTemplate(clienteNombre: string): HandlebarsTemplateDelegate {
    const template = this.templatesCache.get(clienteNombre);
    if (!template) {
      throw new Error(
        `El cliente '${clienteNombre}' no existe o no está configurado.`,
      );
    }
    return template;
  }
}
