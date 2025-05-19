import {
  InteractivePrompt,
  type InteractivePromptProps,
} from './interactive-prompt.js';
import {
  ConfirmPrompt,
  type ConfirmPromptProps,
} from './shared/input/confirm-prompt.js';
import {
  MarkdownBlock,
  type MarkdownBlockProps,
} from './shared/input/markdown-block.js';
import {
  MultiSelect,
  type MultiSelectProps,
} from './shared/input/multi-select.js';
import { Select, type SelectProps } from './shared/input/select.js';

type InputSelectorProps =
  | ({ type: 'text-input' } & InteractivePromptProps)
  | ({ type: 'select' } & SelectProps<string>)
  | ({ type: 'boolean' } & ConfirmPromptProps)
  | ({ type: 'multi-select' } & MultiSelectProps)
  | ({ type: 'markdown' } & MarkdownBlockProps);

export function InputSelector(props: InputSelectorProps) {
  switch (props.type) {
    case 'text-input':
      console.log('InteractivePrompt', props);
      return <InteractivePrompt {...props} />;
    case 'select':
      return <Select {...props} />;
    case 'boolean':
      return <ConfirmPrompt {...props} />;
    case 'multi-select':
      return <MultiSelect {...props} />;
    case 'markdown':
      return <MarkdownBlock {...props} />;
  }
}
