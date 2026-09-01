import process from "process";
import { crearApp } from "./app";
import { TenantManager } from "./core/tenantManager";

const port = process.env.PORT || 3005;

try {
  TenantManager.inicializar();
} catch (err: unknown) {
  console.error("[Error] Fallo al inicializar tenants:", err);
  process.exit(1);
}

const app = crearApp();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
