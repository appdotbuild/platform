import { useEffect, useRef, useState } from 'react';
import { Box, Text } from 'ink';

export type BufferedTextInputProps = {
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  isDisabled?: boolean;
  defaultValue?: string;
};

export function BufferedTextInput({
  placeholder = '',
  onChange,
  onSubmit,
  isDisabled = false,
  defaultValue = '',
}: BufferedTextInputProps) {
  const [displayText, setDisplayText] = useState(defaultValue);
  const inputBuffer = useRef(defaultValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;

    const updateDisplay = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        setDisplayText(inputBuffer.current);
        onChange?.(inputBuffer.current);
      }, 10);
    };

    if (process.stdin.isTTY && !isDisabled) {
      process.stdin.pause();
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    const handleData = (chunk: Buffer) => {
      if (isDisabled) return;

      const char = chunk.toString();
      const code = char.charCodeAt(0);

      if (code === 3) {
        process.exit(0);
      } else if (code === 13) {
        if (onSubmit && inputBuffer.current.trim()) {
          onSubmit(inputBuffer.current);
          inputBuffer.current = '';
          setDisplayText('');
        }
      } else if (code === 127 || code === 8) {
        inputBuffer.current = inputBuffer.current.slice(0, -1);
        updateDisplay();
      } else if (code >= 32 && code <= 126) {
        inputBuffer.current += char;
        updateDisplay();
      }
    };

    if (!isDisabled) {
      process.stdin.on('data', handleData);
    }

    return () => {
      clearTimeout(updateTimeout);
      if (!isDisabled) {
        process.stdin.off('data', handleData);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
      }
    };
  }, [onChange, onSubmit, isDisabled]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isReady && !isDisabled) {
        drawInput();
      }
    }, 30); // A cada 30ms

    return () => clearInterval(interval);
  }, [isReady, displayText, isDisabled, placeholder]);

  const drawInput = () => {
    process.stdout.write('\x1b[s');

    for (let i = 2; i <= 6; i++) {
      process.stdout.write(`\x1b[${i}A`);
      process.stdout.write('\x1b[0G');
      if (i === 4) {
        process.stdout.write('\x1b[2K');

        const leftPadding = '│ ';
        const arrow = '\x1b[34m❯ \x1b[0m';
        const textContent = displayText || (placeholder ? placeholder : '');
        const cols = process.stdout.columns || 80;
        const rightPadding = `${' '.repeat(
          Math.max(0, cols - leftPadding.length - 3 - textContent.length - 1),
        )}│`;

        process.stdout.write(
          `${leftPadding}${arrow}${textContent}${rightPadding}`,
        );
        break;
      }
    }

    process.stdout.write('\x1b[u');
  };

  useEffect(() => {
    if (isReady && !isDisabled) {
      setTimeout(() => {
        drawInput();
      }, 5);
    }
  }, [displayText, isReady, isDisabled]);

  return (
    <Box height={1}>
      <Text>
        {/* Espaço reservado para o input - será sobrescrito via stdout */}
      </Text>
    </Box>
  );
}
