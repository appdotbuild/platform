import { Text } from 'ink';
import { useTextInputState } from './use-text-input-state.js';
import { useTextInput } from './use-text-input.js';

export type TextInputProps = {
  readonly isDisabled?: boolean;
  readonly placeholder?: string;
  readonly defaultValue?: string;
  readonly suggestions?: string[];
  readonly onChange?: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
};

export function TextInput({
  isDisabled = false,
  defaultValue,
  placeholder = '',
  suggestions,
  onChange,
  onSubmit,
}: TextInputProps) {
  const state = useTextInputState({
    defaultValue,
    suggestions,
    onChange,
    onSubmit,
  });

  const { inputValue } = useTextInput({
    isDisabled,
    placeholder,
    state,
  });

  return <Text>{inputValue}</Text>;
}
