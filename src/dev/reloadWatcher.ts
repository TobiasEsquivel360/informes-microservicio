import path from "path";
import type { Application, Request, Response } from "express";
import chokidar, { type FSWatcher } from "chokidar";

const TENANTS_PATH = path.join(__dirname, "../tenants");
const ARCHIVO_RELEVANTE = /\.(html|css)$|fixtures[\\/].*\.json$/;

let watcher: FSWatcher | undefined;
const clientesConectados = new Set<Response>();

export function registrarRutaReload(
  app: Application,
  tenantsPath: string = TENANTS_PATH,
): void {
  app.get("/__dev/reload", (req: Request, res: Response) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");

    clientesConectados.add(res);
    req.on("close", () => clientesConectados.delete(res));
  });

  iniciarWatcher(tenantsPath);
}

export function detenerWatcher(): Promise<void> {
  clientesConectados.clear();
  const watcherActual = watcher;
  watcher = undefined;
  return watcherActual ? watcherActual.close() : Promise.resolve();
}

function iniciarWatcher(tenantsPath: string): void {
  if (watcher) return;

  watcher = chokidar.watch(tenantsPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 },
  });

  watcher.on("all", (_evento, rutaCambiada) => {
    if (!ARCHIVO_RELEVANTE.test(rutaCambiada)) return;
    notificarClientes();
  });
}

function notificarClientes(): void {
  for (const res of clientesConectados) {
    res.write("event: reload\ndata: reload\n\n");
  }
}
