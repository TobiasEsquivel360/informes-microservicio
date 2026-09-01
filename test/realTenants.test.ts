import { beforeAll, describe, expect, it } from "vitest";
import { TenantManager } from "../src/core/tenantManager";

describe("TenantManager — tenants reales sin schema.ts no se ven afectados", () => {
  beforeAll(() => {
    TenantManager.inicializar();
  });

  it.each([
    ["basa", "menor"],
    ["basa", "califSinLimites"],
    ["example", "default"],
  ])(
    "%s/%s sigue sin schema declarado y compilando su template normalmente",
    (cliente, informe) => {
      expect(TenantManager.getSchema(cliente, informe)).toBeUndefined();
      expect(() =>
        TenantManager.getTemplateDelegate(cliente, informe),
      ).not.toThrow();
    },
  );
});
