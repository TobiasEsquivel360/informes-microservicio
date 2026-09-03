import { z } from "zod";

// Valida los campos que `pdf/template.html` consume vía Handlebars. El
// template migra la estructura real del informe de scoring legacy de GSC
// (Dompdf, `GSC-sir/generacion_informes/src/templates/reporte.html`) — ver
// docs/adr/0003-gsc-scoring-migra-reporte-legacy-dompdf.md (en el repo
// agregar-reportes) para el razonamiento. Todos los campos son opcionales:
// no hay certeza todavía de cuáles son obligatorios para GSC (mapeo de
// datos reales pendiente, etapa aparte).

const numericValue = z.union([z.string(), z.number()]);

const offerRow = z.object({
  label: z.string(),
  value: numericValue.nullable(),
  isGroup: z.boolean(),
  additionalValues: z.array(numericValue.nullable()),
});

const economicActivity = z.object({
  label: z.string(),
  description: z.string(),
});

const scoringIndicator = z.object({
  label: z.string(),
  value: numericValue,
  scale: z.string().nullable().optional(),
});

const highlight = z.object({
  label: z.string(),
  value: z.string(),
});

export const schema = z.object({
  logoBase64: z.string().optional(),
  nombreInforme: z.string().optional(),
  workflow: z.string().optional(),
  fecha: z.string().optional(),
  cuitCuil: z.string().optional(),
  razonSocialNombre: z.string().optional(),
  fechaConstitucion: z.string().optional(),
  sectorEconomico: z.string().optional(),
  fechaInforme: z.string().optional(),
  fechaComiteCredito: z.string().optional(),
  analista: z.string().optional(),
  supervisor: z.string().optional(),
  ofertaSeleccionada: z.string().optional(),
  comentarios: z.string().optional(),
  offer: z
    .object({
      unitLabel: z.string(),
      additionalColumns: z.array(z.string()),
      rows: z.array(offerRow),
    })
    .optional(),
  economicActivities: z.array(economicActivity).optional(),
  scoring: z
    .object({
      indicators: z.array(scoringIndicator),
    })
    .optional(),
  alerts: z.array(z.string()).optional(),
  highlights: z.array(highlight).optional(),
});
