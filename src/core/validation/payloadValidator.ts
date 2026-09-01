import { TenantManager } from "../tenantManager";

export interface PayloadValidationIssue {
  path: string;
  message: string;
}

export class PayloadValidationError extends Error {
  constructor(public readonly issues: PayloadValidationIssue[]) {
    super("El payload no cumple el schema esperado.");
    this.name = "PayloadValidationError";
  }
}

export function validarPayload(
  clienteNombre: string,
  nombreInforme: string,
  data: unknown,
): void {
  const schema = TenantManager.getSchema(clienteNombre, nombreInforme);
  if (!schema) return;

  const resultado = schema.safeParse(data);
  if (resultado.success) return;

  const issues: PayloadValidationIssue[] = resultado.error.issues.map(
    (issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    }),
  );

  throw new PayloadValidationError(issues);
}
