import SyntaxHighlight from 'ink-syntax-highlight';

type HighlightedInputProps = {
  value: string;
  language: string;
};

export const Code = ({ value, language }: HighlightedInputProps) => {
  return <SyntaxHighlight language={language} code={value || ' '} />;
};
