import fs from "fs";
import path from "path";
import type { ZodTypeAny } from "zod";
import { cargarHelpers } from "./helpers/helpersLoader";
import { cargarSchema } from "./schema/schemaLoader";
import { compilarInforme, esInformeValido } from "./templateCompiler";

interface InformeEntry {
  template: HandlebarsTemplateDelegate;
  schema?: ZodTypeAny;
}

interface TenantInformes {
  informes: Map<string, InformeEntry>;
}

export class TenantManager {
  private static tenantsCache = new Map<string, TenantInformes>();
  private static readonly TENANTS_PATH = path.join(__dirname, "../tenants");

  public static inicializar(tenantsPath: string = this.TENANTS_PATH): void {
    this.tenantsCache.clear();
    const clientes = this.listarDirectorios(tenantsPath);

    let totalInformes = 0;

    for (const clientName of clientes) {
      const clienteDir = path.join(tenantsPath, clientName);
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

    const entry = tenant.informes.get(nombreInforme);
    if (!entry) {
      const disponibles = [...tenant.informes.keys()].join(", ");
      throw new Error(
        `El informe '${nombreInforme}' no existe para el cliente '${clienteNombre}'. Disponibles: [${disponibles}]`,
      );
    }

    return entry.template;
  }

  public static getSchema(
    clienteNombre: string,
    nombreInforme: string,
  ): ZodTypeAny | undefined {
    return this.tenantsCache
      .get(clienteNombre)
      ?.informes.get(nombreInforme)?.schema;
  }

  private static cargarInformesDeTenant(
    clienteDir: string,
  ): Map<string, InformeEntry> {
    const helpersCompartidos = cargarHelpers(clienteDir);
    const schemaCompartido = cargarSchema(clienteDir);
    const subcarpetas = this.listarDirectorios(clienteDir);
    const informes = new Map<string, InformeEntry>();

    for (const nombreInforme of subcarpetas) {
      const informeDir = path.join(clienteDir, nombreInforme);

      if (!esInformeValido(informeDir)) {
        console.warn(
          `[TenantManager] ${path.basename(clienteDir)}/${nombreInforme}: sin pdf/template.html, se omite.`,
        );
        continue;
      }

      const template = compilarInforme(informeDir, helpersCompartidos);
      const schema = cargarSchema(informeDir) ?? schemaCompartido;
      informes.set(nombreInforme, schema ? { template, schema } : { template });
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
