import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Form,
} from "@appdotbuild/design/shadcn/form";
import { Input } from "@appdotbuild/design/shadcn/input";
import { toast } from "@appdotbuild/design/hooks/use-toast";
import { Button } from "@appdotbuild/design/shadcn/button";
import { Delete, Loader2, Trash, Trash2, X } from "lucide-react";
import { cn } from "@appdotbuild/design/lib/utils";
import { UseFieldArrayReturn } from "react-hook-form";
import { Switch } from "@appdotbuild/design/shadcn/switch";
import { Label } from "@appdotbuild/design/shadcn/label";

export function EasyForm({
  form,
  onSubmit,
  children,
  message,
}: {
  form: any;
  onSubmit: any;
  children: React.ReactNode;
  message?: string;
}) {
  async function onSubmitToast(data) {
    const result = await onSubmit(data);
    if (result?.data?.success) {
      toast({
        title: message || "Data saved",
      });
    } else {
      toast({
        title: result?.serverError || "An error occurred",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitToast)} className="space-y-8">
        {children}
      </form>
    </Form>
  );
}

export function EasyFormGlobalErrors({ form }: { form: any }) {
  const globalErrors = Object.entries(form.formState.errors)
    .map(([key, error]) => ({ key, error: (error as any).root }))
    .filter(({ error }) => error);

  return (
    <>
      {globalErrors.map(({ key, error }) => (
        <p className="text-sm font-medium text-destructive" key={key}>
          {error?.message}
        </p>
      ))}
    </>
  );
}

export function EasyFormSubmit({
  form,
  className,
}: {
  form: any;
  className?: string;
}) {
  // Ensure the loading animation isn't too fast:
  const [isSaving, setIsSaving] = React.useState(false);
  const [savingTimeout, setSavingTimeout] = React.useState<any>(null);
  const isExecuting = form.formState.isSubmitting;

  React.useEffect(() => {
    if (isExecuting) {
      setIsSaving(true);
      const timer = setTimeout(() => {
        setIsSaving(false);
      }, 300);
      setSavingTimeout(timer);
      return () => {
        if (savingTimeout) clearTimeout(savingTimeout);
      };
    }
  }, [isExecuting]);

  React.useEffect(() => {
    return () => {
      if (savingTimeout) clearTimeout(savingTimeout);
    };
  }, []);

  return (
    <div>
      <Button
        type="submit"
        disabled={isExecuting}
        className={cn("min-w-24 pr-5 relative", className)}
      >
        <span className="inline-flex items-center justify-center w-full">
          <span>Save</span>
          <span
            className={cn(
              "absolute right-3 inline-flex items-center justify-center h-4 w-4 transition-opacity duration-300",
              isExecuting || isSaving ? "opacity-100" : "opacity-0",
            )}
          >
            <Loader2 className={`h-4 w-4 animate-spin`} />
          </span>
        </span>
      </Button>
    </div>
  );
}

export type EasyFormFieldProps = {
  form: any;
  name: string;
  title?: string;
  description?: string;
  placeholder?: string;
};

export function EasyFormFieldText({
  form,
  name,
  title,
  description,
  placeholder,
  type = "text",
}: EasyFormFieldProps & { type?: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <EasyFormFieldTemplate title={title} description={description}>
          <Input placeholder={placeholder || title} {...field} type={type} />
        </EasyFormFieldTemplate>
      )}
    />
  );
}

export function EasyFormFieldNumber({
  form,
  name,
  title,
  description,
}: EasyFormFieldProps) {
  return (
    <EasyFormFieldText
      form={form}
      name={name}
      title={title}
      description={description}
      type="number"
    />
  );
}

export function EasyFormFieldSwitch({
  form,
  name,
  title,
  label,
  description,
}: EasyFormFieldProps & { label: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <EasyFormFieldTemplate title={title} description={description}>
          <div className="flex items-center space-x-2">
            <Switch
              {...field}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <Label
              htmlFor={name}
              className="cursor-pointer"
              onClick={() => field.onChange(!field.value)}
            >
              {label}
            </Label>
          </div>
        </EasyFormFieldTemplate>
      )}
    />
  );
}

export function EasyFormFieldTemplate({ title, description, children }) {
  return (
    <FormItem>
      {title && <FormLabel>{title}</FormLabel>}
      <FormControl>{children}</FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}

export function EasyFormMultiTextField({
  form,
  field,
  name,
  title,
  description,
  placeholder,
  addButtonLabel = "Add",
}: {
  form: any;
  field: UseFieldArrayReturn;
  name: string;
  title: string;
  description?: string;
  placeholder?: string;
  addButtonLabel?: string;
}) {
  const { fields, append, remove } = field;
  return (
    <div>
      {fields.map((field, index) => (
        <FormField
          control={form.control}
          key={field.id}
          name={`${name}.${index}.value`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={cn(index !== 0 && "sr-only")}>
                {title}
              </FormLabel>
              {description && (
                <FormDescription className={cn(index !== 0 && "sr-only")}>
                  {description}
                </FormDescription>
              )}
              <FormControl>
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Input placeholder={placeholder || title} {...field} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => append({ value: "" })}
      >
        {addButtonLabel || "Add"}
      </Button>
    </div>
  );
}
