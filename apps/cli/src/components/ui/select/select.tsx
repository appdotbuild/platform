import { type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { useComponentTheme, type Option } from '@inkjs/ui';
import { SelectOption } from './select-option.js';
import { useSelectState } from './use-select-state.js';
import { useSelect } from './use-select.js';
import { type Theme } from './theme.js';

export type SelectProps = {
  /**
   * When disabled, user input is ignored.
   *
   * @default false
   */
  readonly isDisabled?: boolean;

  /**
   * Number of visible options.
   *
   * @default 10
   */
  readonly visibleOptionCount?: number;

  /**
   * Highlight text in option labels.
   */
  readonly highlightText?: string;

  /**
   * Options.
   */
  readonly options: Option[];

  /**
   * Default value.
   */
  readonly defaultValue?: string;

  /**
   * Initially focused option's value.
   */
  readonly focusedValue?: string;

  /**
   * Callback when selected option changes.
   */
  readonly onChange?: (value: string) => void;

  /**
   * Callback to fetch more items when reaching the end of the list.
   * Receives the current focused value and a function to focus the first new item.
   */
  readonly onFetchMore?: () => void;
};

export function Select({
  isDisabled = false,
  visibleOptionCount = 10,
  highlightText,
  options,
  defaultValue,
  onChange,
  onFetchMore,
}: SelectProps) {
  const state = useSelectState({
    visibleOptionCount,
    options,
    defaultValue,
    onChange,
  });

  useSelect({
    isDisabled,
    state,
    onFetchMore,
  });

  const { styles } = useComponentTheme<Theme>('Select');

  return (
    <Box {...styles.container()}>
      {state.visibleOptions.map((option) => {
        let label: ReactNode = option.label;

        if (highlightText && option.label.includes(highlightText)) {
          const index = option.label.indexOf(highlightText);

          label = (
            <>
              {option.label.slice(0, index)}
              <Text {...styles.highlightedText()}>{highlightText}</Text>
              {option.label.slice(index + highlightText.length)}
            </>
          );
        }

        return (
          <SelectOption
            key={option.value}
            isFocused={!isDisabled && state.focusedValue === option.value}
            isSelected={state.value === option.value}
          >
            {label}
          </SelectOption>
        );
      })}
    </Box>
  );
}
