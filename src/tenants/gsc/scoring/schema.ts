import { z } from "zod";

// Report DTO para el informe de scoring de GSC — ver
// docs/adr/0001-contrato-datos-microservicio-informes.md en el repo
// `agregar-reportes` para el razonamiento del contrato. Este schema valida
// el `data` del envelope `{ contractVersion: 1, data: {...} }` que arma
// `ScoringReportDataBuilder` (lado PHP) — nunca nombres de columna SQL ni
// códigos internos crudos.

const numericValue = z.union([z.string(), z.number()]);

const offerRow = z.object({
  label: z.string(),
  value: numericValue.nullable(),
  isGroup: z.boolean(),
  additionalValues: z.array(numericValue.nullable()),
});

const economicActivity = z.object({
  source: z.enum(["AFIP", "CLANAE"]),
  type: z.enum(["principal", "secundaria"]),
  description: z.string(),
});

const scoringIndicator = z.object({
  label: z.string(),
  value: z.number(),
  scale: z.string().nullable(),
  colorLevel: z.enum(["good", "regular", "bad"]),
  // RCI ("relación cuota/ingreso") se muestra en el template con un layout
  // distinto al resto de los indicadores — ver Scoring.php del lado PHP.
  isRci: z.boolean().optional(),
});

const highlight = z.object({
  label: z.string(),
  value: z.string(),
});

// Válvula de escape para piezas legacy demasiado riesgosas de traducir a
// datos crudos en esta pasada (ver spec, item 8, ej. `legacy.destacadosHtml`).
// Cada clave se consume en el template con triple-brace, por eso el nombre
// de la clave queda forzado a terminar en "Html". Deuda técnica temporal —
// no agregar campos acá salvo necesidad real detectada al implementar
// ScoringReportDataBuilder.
const legacy = z.record(
  z.string().regex(/Html$/, "Las claves de 'legacy' deben terminar en 'Html'."),
  z.string(),
);

export const schema = z.object({
  report: z.object({
    title: z.string(),
    generatedAt: z.string(),
    instanceCode: z.string(),
    workflowYear: z.string(),
    workflowNumber: z.string(),
    offerYear: z.string(),
    offerCode: z.string(),
  }),
  company: z.object({
    name: z.string(),
    taxId: z.string().optional(),
  }),
  offer: z.object({
    unitLabel: z.string(),
    additionalColumns: z.array(z.string()),
    rows: z.array(offerRow),
  }),
  economicActivities: z.array(economicActivity),
  scoring: z.object({
    riskLevel: z.enum(["low", "medium", "high"]),
    approved: z.boolean(),
    indicators: z.array(scoringIndicator),
  }),
  alerts: z.array(z.string()),
  highlights: z.array(highlight),
  legacy: legacy.optional(),
});
