import { z } from "zod";

export const profileFormSchema = z.object({
  name: z.string().min(3).max(40),
  email: z.string().email(),
});
