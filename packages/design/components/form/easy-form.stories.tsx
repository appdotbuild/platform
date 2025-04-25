import type { Meta, StoryObj } from '@storybook/react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  EasyForm,
  EasyFormFieldSwitch,
  EasyFormFieldText,
  EasyFormMultiTextField,
  EasyFormSubmit,
} from './easy-form';
import React from 'react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  multiField: z.array(z.object({ value: z.string() })),
});

type FormValues = z.infer<typeof formSchema>;

const EasyFormExample = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      multiField: [{ value: '' }],
    },
  });

  const field = useFieldArray({ control: form.control, name: 'multiField' });

  const onSubmit = async (data: FormValues) => {
    console.log('Form submitted:', data);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <EasyForm
      form={form}
      onSubmit={onSubmit}
      message="Form submitted successfully"
    >
      <EasyFormFieldText
        form={form}
        name="name"
        title="Name"
        description="Please enter your full name"
        placeholder="John Doe"
      />
      <EasyFormFieldText
        form={form}
        name="email"
        title="Email"
        description="Enter your email address"
        placeholder="john@example.com"
      />
      <EasyFormMultiTextField
        form={form}
        field={field}
        name="multiField"
        title="Multi Field"
        description="This is a multi EasyFormFieldText component"
        placeholder="Enter some text"
      />
      <EasyFormFieldSwitch
        form={form}
        name="switch"
        title="Switch"
        label="Switch Label"
      />
      <EasyFormSubmit form={form} isExecuting={false} />
    </EasyForm>
  );
};

const meta: Meta<typeof EasyFormExample> = {
  title: 'UI/Custom/EasyForm',
  component: EasyFormExample,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EasyFormExample>;

export const Default: Story = {};

export const Loading: Story = {
  render: () => {
    const form = useForm<FormValues>({
      resolver: zodResolver(formSchema),
    });

    return (
      <EasyForm form={form} onSubmit={async () => {}} message="Form submitted">
        <EasyFormFieldText
          form={form}
          name="name"
          title="Name"
          description="Please enter your full name"
        />
        <EasyFormFieldText
          form={form}
          name="email"
          title="Email"
          description="Enter your email address"
        />
        <EasyFormSubmit form={form} isExecuting={true} />
      </EasyForm>
    );
  },
};

export const FieldText: Story = {
  render: () => {
    const form = useForm<{ singleField: string }>({
      resolver: zodResolver(z.object({ singleField: z.string().min(1) })),
    });

    return (
      <EasyForm form={form} onSubmit={async () => {}} message="Form submitted">
        <EasyFormFieldText
          form={form}
          name="singleField"
          title="Single Field"
          description="This is a single EasyFormFieldText component"
          placeholder="Enter some text"
        />
      </EasyForm>
    );
  },
};

export const FormSubmit: Story = {
  render: () => {
    const form = useForm();

    return <EasyFormSubmit form={form} isExecuting={false} />;
  },
};

export const MultiTextField: Story = {
  render: () => {
    const form = useForm<any>({
      defaultValues: { multiField: [{ value: '' }] },
    });
    const field = useFieldArray({ control: form.control, name: 'multiField' });

    return (
      <EasyForm form={form} onSubmit={async () => {}} message="Form submitted">
        <EasyFormMultiTextField
          form={form}
          field={field}
          name="multiField"
          title="Multi Field"
          description="This is a multi EasyFormFieldText component"
          placeholder="Enter some text"
        />
      </EasyForm>
    );
  },
};

export const FieldSwitch: Story = {
  render: () => {
    const form = useForm<{ singleField: boolean }>({
      resolver: zodResolver(z.object({ singleField: z.boolean() })),
    });

    return (
      <EasyForm form={form} onSubmit={async () => {}} message="Form submitted">
        <EasyFormFieldSwitch
          form={form}
          name="singleField"
          title="Single Field"
          label="Switch Label"
          description="This is a single EasyFormFieldSwitch component"
        />
      </EasyForm>
    );
  },
};
