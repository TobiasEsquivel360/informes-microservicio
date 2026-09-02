import { z } from "zod";

// Valida únicamente los campos que `pdf/template.html` consume vía
// Handlebars — ver docs/adr/0002-gsc-scoring-copia-literal-de-basa-menor.md
// (en el repo `agregar-reportes`) para el razonamiento. El template es una
// copia literal de `basa/menor`; el resto de sus secciones son HTML
// estático sin variables, por eso no entran a este schema. Todos los campos
// son opcionales por decisión explícita: no hay certeza todavía de cuáles
// son obligatorios para GSC.

const numericValue = z.union([z.string(), z.number()]);

const cabecera = z.object({
  titular_nombre: z.string().optional(),
  titular_cedula: z.string().optional(),
  titular_nacionalidad: z.string().optional(),
  titular_cliente_entidad: z.string().optional(),
  titular_cliente_desde: z.string().optional(),
  titular_edad: z.string().optional(),
  firmante1_nombre: z.string().optional(),
  firmante1_cedula: z.string().optional(),
  firmante1_nacionalidad: z.string().optional(),
  firmante1_cliente_entidad: z.string().optional(),
  firmante1_cliente_desde: z.string().optional(),
  firmante1_edad: z.string().optional(),
  fecha: z.string().optional(),
  workflow: z.string().optional(),
  pais: z.string().optional(),
  sector_economico: z.string().optional(),
  fecha_informe: z.string().optional(),
  fecha_comite: z.string().optional(),
  analista: z.string().optional(),
  supervisor: z.string().optional(),
});

const ingresoConsiderado = z.object({
  concepto: z.string(),
  titular_bruto: numericValue,
  titular_neto: numericValue,
});

export const schema = z.object({
  logoBase64: z.string().optional(),
  cabecera: cabecera.optional(),
  ingresosConsiderados: z.array(ingresoConsiderado).optional(),
  consolidado_total: numericValue.optional(),
  consolidado_considerado: numericValue.optional(),
});
