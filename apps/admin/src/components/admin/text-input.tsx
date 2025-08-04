import {
  type InputProps,
  useInput,
  useResourceContext,
  FieldTitle,
} from 'ra-core';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from '@appdotbuild/design';
import { Input } from '@appdotbuild/design';
import { Textarea } from '@appdotbuild/design';
import { FormError } from '@/components/admin/form-error';

export type TextInputProps = InputProps & {
  multiline?: boolean;
} & React.ComponentProps<'textarea'> &
  React.ComponentProps<'input'>;

export const TextInput = (props: TextInputProps) => {
  const resource = useResourceContext(props);
  const { label, source, multiline, className, ...rest } = props;
  const { field, fieldState, isRequired } = useInput(props);

  return (
    <FormItem className={className}>
      {label !== false && (
        <FormLabel>
          <FieldTitle
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FormLabel>
      )}
      <FormControl>
        {multiline ? (
          <Textarea {...rest} {...field} />
        ) : (
          <Input {...rest} {...field} />
        )}
      </FormControl>
      {props.helperText && (
        <FormDescription>{props.helperText}</FormDescription>
      )}
      <FormError fieldState={fieldState} />
    </FormItem>
  );
};
