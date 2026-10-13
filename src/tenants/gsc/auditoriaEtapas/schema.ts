import { z } from "zod";

// Valida los campos que `pdf/template.html` consume vía Handlebars. Rediseño
// de Eugenia (San Cristóbal) del informe "Auditoría de etapas" — ver
// `agregar-reportes-auditoria-etapas/.scratch/gsc-auditoria-etapas/spec.md`
// para el razonamiento completo.
//
// El builder de GSC-sir ya entrega cada fila interpretada: fecha formateada
// `dd/mm/aaaa hh:mm:ss`, tiempo en etapa como texto ("3 días 4 hs 45 min"),
// sucursal y zonal unidas en un solo texto, y `enCurso` marcado en la fila
// más reciente de un workflow sin cierre. El "—" de las observaciones
// vacías lo pone el template (es presentación), por eso pueden faltar.
const etapa = z.object({
  fechaHora: z.string(),
  tiempoEnEtapa: z.string(),
  enCurso: z.boolean(),
  apellidoNombre: z.string(),
  sucursalZonal: z.string(),
  etapa: z.string(),
  observaciones: z.string().nullable().optional(),
});

export const schema = z.object({
  // Cabecera — mismas claves que la de `gsc/scoring`.
  logoBase64: z.string().optional(),
  nombreInforme: z.string().optional(),
  workflow: z.string().optional(),
  fecha: z.string().optional(),
  cuitCuil: z.string().optional(),
  razonSocialNombre: z.string().optional(),
  fechaInscripcionAfip: z.string().optional(),
  fechaInforme: z.string().optional(),
  fechaComiteCredito: z.string().optional(),
  analista: z.string().optional(),
  supervisor: z.string().optional(),

  // Una fila por cada entrada a una etapa del log del workflow, de la más
  // reciente a la más antigua (orden del SP, el template no reordena).
  etapas: z.array(etapa),
});
