// import { useEffect, useRef } from 'react';
// import { Box, Text } from 'ink';
// import { useTerminalState } from '../../../hooks/use-terminal-state.js';
//
// export type BufferedTextInputProps = {
//   placeholder?: string;
//   onChange?: (value: string) => void;
//   onSubmit?: (value: string) => void;
//   isDisabled?: boolean;
//   defaultValue?: string;
// };
//
// export function BufferedTextInput({
//   placeholder = '',
//   onChange,
//   onSubmit,
//   isDisabled = false,
//   defaultValue = '',
// }: BufferedTextInputProps) {
//   const displayTextRef = useRef(defaultValue);
//   const inputBuffer = useRef(defaultValue);
//   const isReadyRef = useRef(false);
//   const intervalRef = useRef<NodeJS.Timeout>();
//   const { setRawMode } = useTerminalState();
//   const isActiveRef = useRef(false);
//
//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       isReadyRef.current = true;
//       startDrawing();
//     }, 100);
//
//     return () => clearTimeout(timeout);
//   }, []);
//
//   const drawInput = () => {
//     if (!isActiveRef.current) return;
//
//     process.stdout.write('\x1b[s');
//
//     for (let i = 2; i <= 6; i++) {
//       process.stdout.write(`\x1b[${i}A`);
//       process.stdout.write('\x1b[0G');
//       if (i === 4) {
//         process.stdout.write('\x1b[2K');
//
//         const leftPadding = '│ ';
//         const arrow = '\x1b[34m❯ \x1b[0m';
//         const textContent =
//           displayTextRef.current || (placeholder ? placeholder : '');
//         const cols = process.stdout.columns || 80;
//         const rightPadding = `${' '.repeat(
//           Math.max(0, cols - leftPadding.length - 3 - textContent.length - 1),
//         )}│`;
//
//         process.stdout.write(
//           `${leftPadding}${arrow}${textContent}${rightPadding}`,
//         );
//         break;
//       }
//     }
//
//     process.stdout.write('\x1b[u');
//   };
//
//   const startDrawing = () => {
//     if (intervalRef.current) clearInterval(intervalRef.current);
//
//     intervalRef.current = setInterval(() => {
//       if (isReadyRef.current && !isDisabled) {
//         drawInput();
//       }
//     }, 30);
//   };
//
//   useEffect(() => {
//     let updateTimeout: NodeJS.Timeout;
//
//     const updateDisplay = () => {
//       clearTimeout(updateTimeout);
//       updateTimeout = setTimeout(() => {
//         displayTextRef.current = inputBuffer.current;
//         onChange?.(inputBuffer.current);
//       }, 10);
//     };
//
//     if (!isDisabled) {
//       isActiveRef.current = true;
//       setRawMode(true);
//       startDrawing();
//     }
//
//     const handleData = (chunk: Buffer) => {
//       if (isDisabled || !isActiveRef.current) return;
//
//       const char = chunk.toString();
//       const code = char.charCodeAt(0);
//
//       if (code === 3) {
//         process.exit(0);
//       } else if (code === 13) {
//         if (onSubmit && inputBuffer.current.trim()) {
//           onSubmit(inputBuffer.current);
//           inputBuffer.current = '';
//           displayTextRef.current = '';
//         }
//       } else if (code === 127 || code === 8) {
//         inputBuffer.current = inputBuffer.current.slice(0, -1);
//         updateDisplay();
//       } else if (code >= 32 && code <= 126) {
//         inputBuffer.current += char;
//         updateDisplay();
//       }
//     };
//
//     if (!isDisabled) {
//       process.stdin.on('data', handleData);
//     }
//
//     return () => {
//       clearTimeout(updateTimeout);
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }
//       if (!isDisabled) {
//         process.stdin.off('data', handleData);
//         setRawMode(false);
//       }
//       inputBuffer.current = '';
//       displayTextRef.current = '';
//       isActiveRef.current = false;
//     };
//   }, [onChange, onSubmit, isDisabled, setRawMode]);
//
//   useEffect(() => {
//     if (isDisabled) {
//       setRawMode(false);
//       inputBuffer.current = '';
//       displayTextRef.current = '';
//       isActiveRef.current = false;
//     } else {
//       isActiveRef.current = true;
//       startDrawing();
//     }
//   }, [isDisabled, setRawMode]);
//
//   return (
//     <Box height={1}>
//       <Text>{/* reserved slot */}</Text>
//     </Box>
//   );
// }
