import { z } from "zod";

// Valida los campos que `pdf/template.html` consume vía Handlebars. Rediseño
// a pedido de Efren (San Cristóbal) — ver
// `agregar-reportes/.scratch/gsc-scoring-rediseno-efren/spec.md` (repo
// agregar-reportes) para el razonamiento completo. Reemplaza la migración
// literal del legacy Dompdf (docs/adr/0003) donde este rediseño ya cubre la
// sección; el legacy sigue siendo el ancla de lo que no cubre todavía.
//
// Esta etapa solo define el contrato de datos con fixtures mockeadas — el
// template todavía no se tocó (ver tickets 02/03 de la misma carpeta), y
// varios campos no tienen fuente real confirmada del lado GSC-sir todavía
// (ver "Out of Scope" del spec): quedan opcionales, mostrados en blanco/"—"
// cuando no hay dato.

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

const labelValueRow = z.object({
  label: z.string(),
  value: z.string(),
});

// Fila de las tablas combinadas Antecedentes/Ingresos/Endeudamiento — un
// valor por persona, para poder alinear cada concepto entre columnas.
const multiPersonRow = z.object({
  label: z.string(),
  titular: z.string().nullable().optional(),
  conyuge: z.string().nullable().optional(),
  codeudor: z.string().nullable().optional(),
});

// "Datos de Cotitulares" combina Cónyuge/Codeudor solamente — el Titular ya
// tiene su propia tabla completa (`titular`).
const cotitularRow = multiPersonRow.omit({ titular: true });

const encuadramientoRow = z.object({
  indicador: z.string(),
  resultadoOperacion: z.string(),
  parametroAplicado: z.string(),
  desvio: z.string(),
  estado: z.string(),
});

const alertaColor = z.enum(["rojo", "amarillo", "sin-color"]);

const leyendaAlerta = z.object({
  color: alertaColor,
  texto: z.string(),
});

// Los tres campos estructurados no tienen fuente real confirmada todavía
// (ver Out of Scope del spec) — quedan opcionales, el template los muestra
// en blanco/"—" cuando faltan.
const tarjetaAlerta = z.object({
  tipo: alertaColor,
  titulo: z.string(),
  datoQueLaOrigino: z.string().nullable().optional(),
  parametroAplicable: z.string().nullable().optional(),
  desvioProducido: z.string().nullable().optional(),
});

const alertasYExcepciones = z.object({
  leyenda: z.array(leyendaAlerta).optional(),
  conteoTotal: z.number().optional(),
  gravedadDestacada: z.string().optional(),
  tarjetas: z.array(tarjetaAlerta),
});

// Campos sin fuente real confirmada (ver Out of Scope del spec): versión
// del motor, ID del préstamo, reglas cumplidas/incumplidas en detalle,
// excepciones utilizadas, intervenciones manuales. Quedan opcionales.
const resultadoMotor = z.object({
  resultado: z.string(),
  explicacion: z.string().nullable().optional(),
  fechaHoraEvaluacion: z.string().nullable().optional(),
  versionMotor: z.string().nullable().optional(),
  idPrestamo: z.string().nullable().optional(),
  ndc: z.string().nullable().optional(),
  reglasCumplidas: z.array(z.string()).optional(),
  reglasIncumplidas: z.array(z.string()).optional(),
  excepcionesUtilizadas: z.string().nullable().optional(),
  intervencionesManuales: z.string().nullable().optional(),
});

export const schema = z.object({
  // Cabecera — sin cambios respecto al schema anterior.
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
  ofertaSeleccionada: z.string().optional(),
  comentarios: z.string().optional(),

  // Único criterio de presencia para todas las tablas combinadas — "ausente"
  // significa que esa persona nunca fue dada de alta en la operación, no
  // que tenga campos vacíos.
  conyugePresente: z.boolean(),
  codeudorPresente: z.boolean(),

  // 1. Resumen de la operación y resultado — incluye "Oferta" (tabla
  // dinámica de productos), que no tiene lugar propio en el rediseño de
  // Eugenia y encaja acá por el tipo de dato que contiene.
  resumenOperacion: z.array(labelValueRow).optional(),
  resultado: z.array(labelValueRow).optional(),
  offer: z
    .object({
      unitLabel: z.string(),
      additionalColumns: z.array(z.string()),
      rows: z.array(offerRow),
    })
    .optional(),

  // 2. Datos del titular y demás intervinientes — incluye "Actividad
  // Económica" por el mismo motivo que "Oferta" queda en la sección 1.
  economicActivities: z.array(economicActivity).optional(),
  scoring: z
    .object({
      indicators: z.array(scoringIndicator),
    })
    .optional(),
  titular: z.array(labelValueRow).optional(),
  cotitulares: z.array(cotitularRow).optional(),

  // 3. Antecedentes internos y externos
  antecedentes: z.array(multiPersonRow).optional(),

  // 4. Datos del vehículo o garantía
  vehiculo: z.array(labelValueRow).optional(),

  // 5. Ingresos y endeudamiento
  ingresosNota: z.string().optional(),
  ingresos: z.array(multiPersonRow).optional(),
  endeudamiento: z.array(multiPersonRow).optional(),

  // 6. Encuadramiento de la operación
  encuadramiento: z.array(encuadramientoRow).optional(),

  // 7. Alertas y Excepciones
  alertasYExcepciones: alertasYExcepciones.optional(),

  // 8. Resultado del motor y trazabilidad
  resultadoMotor: resultadoMotor.optional(),
});
