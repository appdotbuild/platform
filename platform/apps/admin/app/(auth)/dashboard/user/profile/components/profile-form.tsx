"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EasyForm, EasyFormFieldText, EasyFormSubmit } from "@repo/design/components/form/easy-form";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateProfileAction } from "../actions";
import { profileFormSchema } from "../actions.schema";

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm({ defaultValues }: { defaultValues?: Partial<ProfileFormValues> }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { executeAsync, isExecuting } = useAction(updateProfileAction);

  return (
    <EasyForm form={form} onSubmit={(data) => executeAsync(data)} message="Profile updated">
      <EasyFormFieldText
        form={form}
        name="name"
        title="Name"
        description="This is your public display name. It can be your real name or a pseudonym. You can only change this once every 30 days."
      />
      <EasyFormFieldText
        form={form}
        name="email"
        title="Email"
        description="Your email address is used to log in to your account."
      />

      <EasyFormSubmit form={form} />
    </EasyForm>
  );
}
