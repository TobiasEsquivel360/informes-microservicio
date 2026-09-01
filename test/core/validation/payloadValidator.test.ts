import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { TenantManager } from "../../../src/core/tenantManager";
import {
  PayloadValidationError,
  validarPayload,
} from "../../../src/core/validation/payloadValidator";

const FIXTURES_TENANTS_PATH = path.join(__dirname, "../../fixtures/tenants");

describe("validarPayload", () => {
  beforeAll(() => {
    TenantManager.inicializar(FIXTURES_TENANTS_PATH);
  });

  it("no lanza cuando el tenant/informe no declara schema", () => {
    expect(() =>
      validarPayload("clienteB", "informeSinNadaDeSchema", {
        cualquierCosa: 1,
      }),
    ).not.toThrow();
  });

  it("no lanza cuando el payload cumple el schema declarado", () => {
    expect(() =>
      validarPayload("clienteA", "informeConSchemaPropio", {
        informe: "ok",
      }),
    ).not.toThrow();
  });

  it("lanza PayloadValidationError con el detalle del campo cuando el payload no cumple el schema", () => {
    try {
      validarPayload("clienteA", "informeConSchemaPropio", { informe: 123 });
      expect.fail("Se esperaba que validarPayload lanzara.");
    } catch (error) {
      expect(error).toBeInstanceOf(PayloadValidationError);
      const validationError = error as PayloadValidationError;
      expect(validationError.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "informe",
            message: expect.stringMatching(/\S/),
          }),
        ]),
      );
    }
  });
});
