import { z } from "zod";

export const megaPayInitiateResponseSchema = z.object({
  success: z.union([z.string(), z.number(), z.boolean()]).optional(),
  massage: z.string().optional(),
  message: z.string().optional(),
  transaction_request_id: z.string().min(1),
}).passthrough();
