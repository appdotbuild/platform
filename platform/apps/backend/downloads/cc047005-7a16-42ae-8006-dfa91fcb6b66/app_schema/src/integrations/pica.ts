import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { Pica } from "@picahq/ai";
import { env } from "../env";
import { z } from "zod";

export const runAgentParamsSchema = z.object({
    query: z.string(),
  });

const pica = new Pica(env.PICA_SECRET_KEY!);

async function runAgentTask(message: string): Promise<string> {
    const system = await pica.generateSystemPrompt();

    const { text } = await generateText({
        model: anthropic("claude-3-5-sonnet-20240620"),
        system,
        prompt: message,
        tools: { ...pica.oneTool },
        maxSteps: 10,
    });

    return text;
}

interface RunAgentResponse {
    query: string;
    result: string;
  }
  
export type RunAgentParams = z.infer<typeof runAgentParamsSchema>;

export const handle_run_agent = async (options: RunAgentParams): Promise<RunAgentResponse> => {
    const result = await runAgentTask(options.query);
    return {
        query: options.query,
        result: result,
    };
};

export const can_handle = (): boolean => {
    return env.PICA_SECRET_KEY !== undefined;
};

//runAgentTask("Add a slot in my calendar for this week for and time when the weather is sunny in London")
//  .then((text) => {
//    console.log(text);
//  })
//  .catch(console.error);

