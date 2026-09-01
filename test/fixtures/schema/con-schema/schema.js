const { z } = require("zod");

module.exports = {
  schema: z.object({
    nombre: z.string(),
  }),
};
