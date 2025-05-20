import type { UserMessageLimit } from '@appdotbuild/core';
import { createMessageLimitError } from '../../app/message/use-message-limit.js';
import ConfirmPrompt, { type ConfirmPromptProps } from './confirm-prompt.js';
import { FreeText, FreeTextError, type FreeTextProps } from './free-text.js';
import { MarkdownBlock, type MarkdownBlockProps } from './markdown-block.js';
import { MultiSelect, type MultiSelectProps } from './multi-select.js';
import { Select, type SelectProps } from './select.js';

type BasicProps = {
  question?: string;
  userMessageLimit?: UserMessageLimit;
};

type BuildingBlockProps =
  | ({ type: 'free-text' } & BasicProps & FreeTextProps)
  | ({ type: 'select' } & BasicProps & SelectProps<string>)
  | ({ type: 'boolean' } & BasicProps & ConfirmPromptProps)
  | ({ type: 'multi-select' } & BasicProps & MultiSelectProps)
  | ({ type: 'markdown' } & BasicProps & MarkdownBlockProps);

export function BuildingBlock(props: BuildingBlockProps) {
  if (props.userMessageLimit?.isUserLimitReached) {
    const limitReachedError = createMessageLimitError({
      userMessageLimit: props.userMessageLimit,
      question: props.question || 'Message limit reached',
    });
    return <FreeTextError {...limitReachedError} />;
  }

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
