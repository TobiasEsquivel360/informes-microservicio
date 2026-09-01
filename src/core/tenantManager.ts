import fs from "fs";
import path from "path";
import { cargarHelpers } from "./helpers/helpersLoader";
import { compilarInforme, esInformeValido } from "./templateCompiler";

interface TenantInformes {
  informes: Map<string, HandlebarsTemplateDelegate>;
}

export class TenantManager {
  private static tenantsCache = new Map<string, TenantInformes>();
  private static readonly TENANTS_PATH = path.join(__dirname, "../tenants");

  public static inicializar(): void {
    const clientes = this.listarDirectorios(this.TENANTS_PATH);

    let totalInformes = 0;

    for (const clientName of clientes) {
      const clienteDir = path.join(this.TENANTS_PATH, clientName);
      const informesMap = this.cargarInformesDeTenant(clienteDir);

      if (informesMap.size === 0) continue;

      this.tenantsCache.set(clientName, { informes: informesMap });
      totalInformes += informesMap.size;

      console.log(
        `[TenantManager] ${clientName}: ${informesMap.size} informe(s) → [${[...informesMap.keys()].join(", ")}]`,
      );
    }

    console.log(
      `[TenantManager] ${this.tenantsCache.size} cliente(s), ${totalInformes} informe(s) cargados.`,
    );
  }

  public static getTemplateDelegate(
    clienteNombre: string,
    nombreInforme: string,
  ): HandlebarsTemplateDelegate {
    const tenant = this.tenantsCache.get(clienteNombre);
    if (!tenant) {
      throw new Error(
        `El cliente '${clienteNombre}' no existe o no está configurado.`,
      );
    }

    const template = tenant.informes.get(nombreInforme);
    if (!template) {
      const disponibles = [...tenant.informes.keys()].join(", ");
      throw new Error(
        `El informe '${nombreInforme}' no existe para el cliente '${clienteNombre}'. Disponibles: [${disponibles}]`,
      );
    }

    return template;
  }

  private static cargarInformesDeTenant(
    clienteDir: string,
  ): Map<string, HandlebarsTemplateDelegate> {
    const helpersCompartidos = cargarHelpers(clienteDir);
    const subcarpetas = this.listarDirectorios(clienteDir);
    const informes = new Map<string, HandlebarsTemplateDelegate>();

    for (const nombreInforme of subcarpetas) {
      const informeDir = path.join(clienteDir, nombreInforme);

      if (!esInformeValido(informeDir)) {
        console.warn(
          `[TenantManager] ${path.basename(clienteDir)}/${nombreInforme}: sin pdf/template.html, se omite.`,
        );
        continue;
      }

      const template = compilarInforme(informeDir, helpersCompartidos);
      informes.set(nombreInforme, template);
    }

    return informes;
  }

  private static listarDirectorios(basePath: string): string[] {
    return fs
      .readdirSync(basePath)
      .filter((nombre) =>
        fs.statSync(path.join(basePath, nombre)).isDirectory(),
      );
  }
}
