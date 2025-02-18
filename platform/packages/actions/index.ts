//@ts-ignore
import { auth } from "@repo/auth";
import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE, returnValidationErrors } from "next-safe-action";
import { z } from "zod";
import { redirect } from "next/navigation";
import { UnauthorizedError, UserError } from "@repo/core";

export const actionClient = createSafeActionClient()

export const actionClientWithMeta = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof UnauthorizedError) {
      redirect("/api/auth/signin");
      return;
    }
    if (e instanceof UserError) {
      return e.message;
    }
    if (e instanceof Error) {
      console.error(e, "Action error");

      if ("code" in e && e.code === "23505") {
        return "Duplicate value";
      }
      return "An error occurred";
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
  defineMetadataSchema() {
    return z.object({
      name: z.string(),
      allowUnauthenticated: z.boolean().optional(),
    });
  },
});

let authActionClient = actionClientWithMeta.use(async ({ next, metadata, clientInput }) => {
  const session = await auth();
  if (metadata.allowUnauthenticated !== true && (!session || !session.user || !session.user.id)) {
    console.log("Redirecting to signin");
    throw new UnauthorizedError();
  }
  return next({
    ctx: {
      session,
    },
  });
});

if (process.env.NODE_ENV === "development") {
  authActionClient = authActionClient.use(async ({ next, clientInput, metadata, ctx }) => {
    const result = await next({});
    if (result.success) {
      console.log("Action", { data: result.data, input: clientInput, metadata, user: ctx.session?.user });
    } else {
      console.error(
          { data: result, input: clientInput, metadata, user: ctx.session?.user },
          "Actions returned error: " + (result.validationErrors?._errors.join(", ") || result.serverError)
        );
    }
    return result;
  });
}

export { authActionClient, returnValidationErrors };
