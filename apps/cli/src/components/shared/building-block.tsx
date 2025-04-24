import { FreeText, type FreeTextProps } from './free-text.js';
import ConfirmPrompt, { type ConfirmPromptProps } from './confirm-prompt.js';
import { Select, type SelectProps } from './select.js';
import { MultiSelect, type MultiSelectProps } from './multi-select.js';
import { MarkdownBlock, type MarkdownBlockProps } from './markdown-block.js';

type BuildingBlockProps =
  | ({ type: 'free-text' } & FreeTextProps)
  | ({ type: 'select' } & SelectProps<string>)
  | ({ type: 'boolean' } & ConfirmPromptProps)
  | ({ type: 'multi-select' } & MultiSelectProps)
  | ({ type: 'markdown' } & MarkdownBlockProps);

export function BuildingBlock(props: BuildingBlockProps) {
  switch (props.type) {
    case 'free-text': {
      return <FreeText {...props} />;
    }
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
