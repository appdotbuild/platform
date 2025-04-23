import { useInput } from 'ink';
import { type SelectState } from './use-select-state.js';

export type UseSelectProps = {
  /**
   * When disabled, user input is ignored.
   *
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Select state.
   */
  state: SelectState;

  /**
   * Callback to fetch more items when reaching the end of the list.
   */
  onFetchMore?: () => void;

  /**
   * Number of items before reaching the end of the list to prefetch.
   *
   * @default 3
   */
  itemsToPrefetch?: number;
};

export const useSelect = ({
  isDisabled = false,
  state,
  onFetchMore,
  itemsToPrefetch = 3,
}: UseSelectProps) => {
  useInput(
    (_input, key) => {
      if (key.downArrow) {
        state.focusNextOption();

        if (onFetchMore && state.focusedValue) {
          const currentOption = state.optionMap.get(state.focusedValue);
          if (
            currentOption &&
            currentOption.index >= state.optionMap.size - itemsToPrefetch
          ) {
            onFetchMore();
          }
        }
      }

      if (key.upArrow) {
        state.focusPreviousOption();
      }

      if (key.return) {
        state.selectFocusedOption();
      }
    },
    { isActive: !isDisabled }
  );
};
