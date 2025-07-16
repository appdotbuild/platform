import { ReactNode } from 'react';
import { Form, type FormProps, Translate, WithRecord } from 'ra-core';
import { useNavigate } from 'react-router';
import { CircleX, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/admin/delete-button';

export const SimpleForm = ({
  children,
  className,
  toolbar = defaultFormToolbar,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  toolbar?: ReactNode;
} & FormProps) => {
  return (
    <Form
      className={cn(`flex flex-col gap-4 w-full max-w-lg`, className)}
      {...rest}
    >
      {/* @ts-expect-error - children is a ReactNode */}
      {children}
      {toolbar}
    </Form>
  );
};

export const FormToolbar = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'sticky pt-4 pb-4 md:block md:pt-0 md:pb-0 bottom-0 bg-linear-to-b from-transparent to-background to-10%',
        className,
      )}
    >
      <div className="flex flex-row gap-4 justify-start">
        <Button type="submit">
          <Save />
          <Translate i18nKey="ra.action.save">Save</Translate>
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          <CircleX />
          <Translate i18nKey="ra.action.cancel">Cancel</Translate>
        </Button>
        <div className="flex-1" />
        <WithRecord
          render={(record) => record.id !== null && <DeleteButton />}
        />
      </div>
    </div>
  );
};

const defaultFormToolbar = <FormToolbar />;
