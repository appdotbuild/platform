import { z } from 'zod';
import { type JSONSchema7 } from 'json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  client,
  type MessageParam,
  type ToolUseBlock,
  type ToolResultBlock,
} from './llm';
import { handlers } from '../tools';
import { getHistory, putMessageBatch } from './crud';
import { env } from '../env';

const makeSchema = (schema: z.ZodObject<any>) => {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'root',
  }) as JSONSchema7;
  return {
    properties: jsonSchema.properties,
    required: jsonSchema.required,
    definitions: jsonSchema.definitions,
  };
};

const handlerTools = handlers.map((tool) => ({
  ...tool,
  toolInput: makeSchema(tool.inputSchema),
}));

async function callClaude(prompt: string | MessageParam[]) {
  const messages: MessageParam[] = Array.isArray(prompt)
    ? prompt
    : [{ role: 'user', content: prompt }];
  return await client.messages.create({
    model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    max_tokens: 2048,
    messages: messages,
    tools: handlerTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.toolInput.properties,
        required: tool.toolInput.required,
        definitions: tool.toolInput.definitions,
      },
    })),
  });
}

async function callTool(toolBlock: ToolUseBlock) {
  const { name, id, input } = toolBlock;
  const tool = handlerTools.find((tool) => tool.name === name);
  if (tool) {
    try {
      const content = await tool.handler(tool.inputSchema.parse(input));
      return {
        type: 'tool_result',
        tool_use_id: id,
        content: JSON.stringify(content),
      } as ToolResultBlock;
    } catch (error) {
      return {
        type: 'tool_result',
        tool_use_id: id,
        content: `${error}`,
        is_error: true,
      } as ToolResultBlock;
    }
  } else {
    return {
      type: 'tool_result',
      tool_use_id: id,
      content: `Tool ${name} does not exist`,
    } as ToolResultBlock;
  }
}

export function postprocessThread(
  thread: MessageParam[],
  logResponse: boolean
): string {
  let toolCalls: ToolUseBlock[] = [];
  let toolResults: ToolResultBlock[] = [];
  let textContent: string[] = [];

  thread.forEach(({ role, content }) => {
    if (role === 'assistant' && typeof content === 'string') {
      textContent.push(content);
    } else if (Array.isArray(content)) {
      content.forEach((block) => {
        if (block.type === 'tool_use') {
          toolCalls.push(block);
        } else if (block.type === 'tool_result') {
          toolResults.push(block);
        } else if (block.type === 'text' && role === 'assistant') {
          textContent.push(block.text);
        }
      });
    }
  });

  const toolLines = toolResults.map((toolResult) => {
    const toolCall = toolCalls.find(
      (toolCall) => toolCall.id === toolResult.tool_use_id
    );
    return `Handler '${toolCall!.name}' responded with: "${toolResult.content}"`;
  });

  let userReply = textContent.join('\n');
  if (logResponse && toolLines.length) {
    userReply += '\n' + toolLines.join('\n');
  }
  return userReply || 'No response';
}

export async function handleChat({
  user_id,
  message,
}: {
  user_id: string;
  message: string;
}) {
  const THREAD_LIMIT = 10;
  const WINDOW_SIZE = 100;

  const messages = await getHistory(user_id, WINDOW_SIZE);
  let thread: MessageParam[] = [{ role: 'user', content: message }];
  while (thread.length < THREAD_LIMIT) {
    const response = await callClaude([...messages, ...thread]);

    if (!response.content.length) {
      break;
    }

    thread.push({ role: response.role, content: response.content });

    const toolUseBlocks = response.content.filter<ToolUseBlock>(
      (content) => content.type === 'tool_use'
    );
    const allToolResultPromises = toolUseBlocks.map(async (toolBlock) => {
      return await callTool(toolBlock);
    });
    const allToolResults = await Promise.all(allToolResultPromises);

    if (allToolResults.length) {
      thread.push({ role: 'user', content: allToolResults });
      continue;
    }

    break;
  }

  await putMessageBatch(
    thread.map((message) => ({ user_id: user_id, ...message }))
  );
  return thread;
}
