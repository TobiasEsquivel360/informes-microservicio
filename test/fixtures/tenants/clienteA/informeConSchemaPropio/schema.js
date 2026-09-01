const { z } = require("zod");

module.exports = {
  schema: z.object({
    informe: z.string(),
  }),
};
