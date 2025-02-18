import { handlers } from "@repo/auth"; // Referring to the auth.ts we just created
export const { GET, POST } = handlers as unknown as any;
