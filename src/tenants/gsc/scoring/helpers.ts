// Usado por template.html para mostrar/ocultar "Datos de Cotitulares" cuando
// al menos una de las dos personas (Cónyuge/Codeudor) está presente.
export const helpers = {
  or: (a: unknown, b: unknown) => Boolean(a) || Boolean(b),
};
