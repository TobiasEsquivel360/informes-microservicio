const { z } = require("zod");

module.exports = {
  schema: z.object({
    cliente: z.string(),
  }),
};
