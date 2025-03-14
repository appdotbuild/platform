import { App, LogLevel, subtype } from "@slack/bolt";
import { drizzle } from "drizzle-orm/neon-serverless";
import { threads } from "./db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { CronJob } from "cron";
import { config } from "dotenv";
import fetch from "node-fetch";
import https from "https";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

// Load environment variables from .env file
config();

const db = drizzle(process.env.DATABASE_URL!);

let BACKEND_API_HOST: string;
if (process.env.NODE_ENV === "production") {
  BACKEND_API_HOST = "https://platform-muddy-meadow-938.fly.dev";
} else {
  // BACKEND_API_HOST = "https://platform-muddy-meadow-938.fly.dev";
  BACKEND_API_HOST = "http://localhost:4444";
}

const app = new App({
  token: process.env.TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  appToken: process.env.APP_TOKEN,
  logLevel: LogLevel.DEBUG,
  socketMode: true,
});

const job = CronJob.from({
  cronTime: "*/30 * * * * *", // every 30 seconds
  onTick: async function () {
    const undeployedBots = await db
      .select()
      .from(threads)
      .where(and(eq(threads.deployed, false), isNotNull(threads.chatbotId)));

    for (const bot of undeployedBots) {
      const botStatus = await fetch(
        `${BACKEND_API_HOST}/chatbots/${bot.chatbotId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.BACKEND_API_SECRET}`,
          },
        },
      );
      const botStatusJson = await botStatus.json();

      if (botStatusJson.flyAppId && bot.channelId) {
        await app.client.chat.postMessage({
          channel: bot.channelId,
          thread_ts: bot.threadTs,
          text: `✅ The bot has been successfully deployed, go and talk to it!
  Download the code here: ${botStatusJson.readUrl}`,
        });

        await db
          .update(threads)
          .set({
            deployed: true,
          })
          .where(eq(threads.threadTs, bot.threadTs));
      }
    }
  },
  start: true,
});

job.start();

// Function to download a file from Slack
async function downloadFileFromSlack(
  fileId: string,
  token: string,
): Promise<{ filePath: string; fileName: string }> {
  try {
    console.log(`Downloading file with ID: ${fileId}`);

    // Get file info
    const fileInfoResponse = await fetch(
      `https://slack.com/api/files.info?file=${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!fileInfoResponse.ok) {
      throw new Error(
        `Failed to get file info: ${fileInfoResponse.statusText}`,
      );
    }

    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok || !fileInfo.file) {
      throw new Error(`Failed to get file info: ${JSON.stringify(fileInfo)}`);
    }

    const file = fileInfo.file;
    const fileUrl = file.url_private;
    const fileName = file.name;

    console.log(`File URL: ${fileUrl}, File Name: ${fileName}`);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download the file
    const filePath = path.join(tempDir, fileName);
    const fileStream = fs.createWriteStream(filePath);

    const response = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    await pipeline(response.body, fileStream);

    console.log(`File downloaded to: ${filePath}`);

    return { filePath, fileName };
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}

async function chatbotIteration({
  telegramBotToken,
  prompt,
  channelId,
  threadTs,
  userId,
  useStaging,
  runMode,
  sourceCodeFileId,
  botId,
}: {
  telegramBotToken: string;
  prompt: string;
  channelId: string;
  threadTs: string;
  userId: string;
  useStaging: boolean;
  runMode: string;
  sourceCodeFileId?: string;
  botId?: string;
}) {
  try {
    console.log("calling generate endpoint");

    let requestBody: any = {
      prompt,
      telegramBotToken: runMode === "telegram" ? telegramBotToken : undefined,
      userId,
      useStaging,
      runMode,
      botId,
    };

    // If a source code file ID is provided, download the file and prepare to send it
    if (sourceCodeFileId) {
      try {
        // Get the bot token from the environment
        const botToken = process.env.TOKEN;
        if (!botToken) {
          throw new Error("TOKEN is not set in environment variables");
        }

        // Download the file
        const { filePath, fileName } = await downloadFileFromSlack(
          sourceCodeFileId,
          botToken,
        );

        // Read the file as a base64 string
        const fileContent = fs.readFileSync(filePath);
        const base64Content = fileContent.toString("base64");

        // Add the file content to the request body
        requestBody.sourceCodeFile = {
          name: fileName,
          content: base64Content,
        };

        // Clean up the temporary file
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error("Error processing source code file:", error);
        // Continue without the file if there's an error
      }
    }

    const response = await fetch(`${BACKEND_API_HOST}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("generate endpoint returned", response);

    if (response.ok) {
      const generateResult: {
        newBot: {
          id: string;
        };
        message: string;
      } = await response.json();

      console.log("generateResult", generateResult);

      const chatbotId = generateResult.newBot.id;

      // Update the initial message to include the chatbot ID
      await app.client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: `Received ${generateResult.message} from the agent. ${sourceCodeFileId ? `Uploading bot right away` : `Generating bot source code`}`
      });

      await db
        .update(threads)
        .set({
          chatbotId: chatbotId,
        })
        .where(eq(threads.threadTs, threadTs));
    } else {
      const errorMessage = await response.text();

      await app.client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: `There was an error while deploying the bot: ${errorMessage}`,
      });
    }
  } catch (error) {
    console.error("generate endpoint error", error);

    if (error instanceof DOMException && error.name === "TimeoutError") {
      await app.client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: "More than 10 minutes have passed and we have timed out.",
      });
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

async function handleBotGeneration({
  channelId,
  userId,
  prompt,
  botToken,
  client,
  threadTs,
  useStaging,
  runMode,
  sourceCodeFileId,
}: {
  channelId: string;
  userId: string;
  prompt: string;
  botToken: string;
  client: any;
  threadTs: string;
  useStaging: boolean;
  runMode: string;
  sourceCodeFileId?: string;
}) {
  const stagingText = useStaging ? "to staging" : "to production";
  const runModeText = runMode === "http-server" ? "HTTP" : "Telegram";

  let messageText;
  if (sourceCodeFileId) {
    messageText = `Since you uploaded the source code, I'm going to just deploy it. This will take 1-2 minutes.`;
  } else {
    messageText = `I'm going to start generating a ${runModeText} bot for you ${stagingText}. This will take a few minutes.`;
  }

  const msg = await client.chat.postMessage({
    channel: channelId,
    thread_ts: threadTs,
    text: messageText,
  });

  if (!msg.ts) {
    throw new Error("Message not found");
  }

  await db.insert(threads).values({
    threadTs,
    chatbotToken: botToken,
    authorId: userId,
    channelId,
    useStaging: useStaging,
    runMode: runMode,
  });

  chatbotIteration({
    telegramBotToken: botToken,
    prompt,
    channelId,
    threadTs,
    userId,
    useStaging,
    runMode,
    sourceCodeFileId,
  });
}

app.message("", async ({ event, logger }) => {
  let threadTs: string;
  if ("thread_ts" in event) {
    threadTs = event.thread_ts as string;
    if (!threadTs) {
      return;
    }
  } else {
    return;
  }

  let prompt;
  if ("text" in event) {
    prompt = event.text;

    if (!prompt) {
      return;
    }
  } else {
    return;
  }

  if (!event.user) {
    return;
  }
  
  const threadResult = await db
    .select()
    .from(threads)
    .where(
      and(eq(threads.threadTs, threadTs), eq(threads.authorId, event.user)),
    );

  if (threadResult.length !== 1) {
    return;
  }
  
  if (event.user !== threadResult[0].authorId) {
    return;
  }

  const thread = threadResult[0];

  chatbotIteration({
    telegramBotToken: thread.chatbotToken,
    prompt,
    channelId: event.channel,
    threadTs: thread.threadTs,
    userId: event.user,
    botId: thread.chatbotId || undefined, // Use the stored botId value
    useStaging: thread.useStaging ?? false, // Use the stored useStaging value with a default
    runMode: thread.runMode ?? "telegram", // Use the stored runMode value with a default
  });
});

app.event("message", async ({ event, client, message }) => {
  if (event.channel !== "C089K878WAY") {
    return;
  }

  let eventText: string;
  if ("text" in event && event.text) {
    eventText = event.text;
    if (!eventText) {
      return;
    }
  } else {
    return;
  }

  if (!eventText.startsWith("<@U08FLNSNFDE>")) {
    return;
  }

  const prompt = eventText.replace(/<@[A-Z0-9]+>/, "").trim();

  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: "Let's create a Telegram bot with your prompt!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Your prompt:*\n${prompt}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Create Bot",
              emoji: true,
            },
            action_id: "open_bot_modal",
            value: JSON.stringify({
              prompt,
              channelId: event.channel,
              userId: event.user,
              threadTs: event.ts,
            }),
          },
        ],
      },
    ],
  });
});

// Add this handler for the button click
app.action("open_bot_modal", async ({ ack, body, client }) => {
  await ack();

  // Type assertion for body to access actions property
  const actionBody = body as any;
  const { prompt, channelId, userId, threadTs } = JSON.parse(
    actionBody.actions[0].value,
  );

  console.log("open_bot_modal action triggered");
  console.log(
    "Action body structure:",
    JSON.stringify(Object.keys(actionBody)),
  );

  // Extract the message timestamp from the appropriate location
  let messageTs;
  if (actionBody.message && actionBody.message.ts) {
    messageTs = actionBody.message.ts;
  } else if (actionBody.container && actionBody.container.message_ts) {
    messageTs = actionBody.container.message_ts;
  } else {
    messageTs = threadTs; // Fallback to threadTs if neither is available
  }

  console.log("messageTs:", messageTs);

  // Default run mode is telegram
  const initialRunMode = "telegram";
  const tokenValue = ""; // No token value initially
  const isStaging = false; // Staging not selected initially
  const codeMode = "generate"; // Default to generate code

  // Use the buildModalBlocks function for consistency
  const blocks = buildModalBlocks(initialRunMode, tokenValue, isStaging, codeMode);

  await client.views.open({
    trigger_id: actionBody.trigger_id,
    view: {
      type: "modal",
      callback_id: "bot_token_modal",
      title: {
        type: "plain_text",
        text: "Configure Bot",
      },
      blocks: blocks,
      private_metadata: JSON.stringify({
        prompt,
        channelId,
        userId,
        threadTs,
        messageTs,
      }),
      submit: {
        type: "plain_text",
        text: "Submit",
      },
    },
  });
});

// Add this handler to process the modal submission
app.view("bot_token_modal", async ({ ack, body, view, client }) => {
  await ack();

  const { prompt, channelId, userId, threadTs, messageTs } = JSON.parse(
    view.private_metadata,
  );

  console.log("bot_token_modal submission received");
  console.log("View state:", JSON.stringify(Object.keys(view.state.values)));

  // Extract the selected run mode
  const runMode =
    view.state.values.run_mode_block.run_mode_radio.selected_option?.value ||
    "telegram";
  console.log("Selected run mode:", runMode);

  // Extract the selected code mode
  const codeMode =
    view.state.values.code_mode_block.code_mode_radio.selected_option?.value ||
    "generate";
  console.log("Selected code mode:", codeMode);

  // Get the token value if the token block exists
  let botToken = "";
  if (runMode === "telegram") {
    // Check if token_block exists in the view state
    const tokenBlock = view.state.values.token_block;
    if (tokenBlock && tokenBlock.token_input) {
      botToken = tokenBlock.token_input.value || "";
    }

    // Validate token is provided for Telegram bots
    if (!botToken) {
      await ack({
        response_action: "errors",
        errors: {
          token_block: "Please enter a valid Telegram bot token",
        },
      });
      return;
    }
  }

  // Check if a source code file was uploaded (only if upload code mode)
  let sourceCodeFileId: string | undefined;
  let hasUploadedFile = false;

  if (
    codeMode === "upload" &&
    view.state.values.source_code_block &&
    view.state.values.source_code_block.source_code_input
  ) {
    const fileInput = view.state.values.source_code_block.source_code_input;
    console.log("File input state:", JSON.stringify(fileInput));

    if (fileInput.files && fileInput.files.length > 0) {
      sourceCodeFileId = fileInput.files[0].id;
      hasUploadedFile = true;
      console.log("Source code file ID:", sourceCodeFileId);
    } else {
      // If upload mode is selected but no file is uploaded, show an error
      await ack({
        response_action: "errors",
        errors: {
          source_code_block: "Please upload a ZIP file with your source code",
        },
      });
      return;
    }
  }

  console.log("Source code file uploaded:", hasUploadedFile);

  // Check if staging is selected (only if generate code mode)
  let useStaging = false;
  if (
    codeMode === "generate" &&
    view.state.values.staging_block &&
    view.state.values.staging_block.staging_checkbox
  ) {
    const stagingBlock = view.state.values.staging_block.staging_checkbox;
    console.log("Staging block state:", JSON.stringify(stagingBlock));

    if (
      stagingBlock.selected_options &&
      stagingBlock.selected_options.length > 0
    ) {
      useStaging = true;
    }
  }

  console.log("useStaging:", useStaging);
  console.log("View blocks:", JSON.stringify(Object.keys(view.state.values)));

  // Update the message with a disabled button
  await client.chat.update({
    channel: channelId,
    ts: messageTs,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Your prompt:*\n${prompt}`,
        },
      },
    ],
  });

  await handleBotGeneration({
    channelId,
    userId,
    prompt,
    botToken,
    client,
    threadTs: threadTs,
    useStaging,
    runMode,
    sourceCodeFileId,
  });
});

// Helper function to build modal blocks
function buildModalBlocks(
  runMode: string,
  tokenValue: string,
  isStaging: boolean,
  codeMode: string = "generate" // Default to generate code
) {
  console.log("Building modal blocks with params:", { runMode, isStaging, codeMode });
  const blocks: any[] = [];

  // Add the code mode selection block (always first)
  blocks.push({
    type: "section",
    block_id: "code_mode_block",
    text: {
      type: "mrkdwn",
      text: "*Code Mode*",
    },
    accessory: {
      type: "radio_buttons",
      action_id: "code_mode_radio",
      initial_option: {
        text: {
          type: "plain_text",
          text: codeMode === "upload" ? "Upload Code" : "Generate Code",
        },
        value: codeMode,
      },
      options: [
        {
          text: {
            type: "plain_text",
            text: "Upload Code",
          },
          value: "upload",
        },
        {
          text: {
            type: "plain_text",
            text: "Generate Code",
          },
          value: "generate",
        },
      ],
    },
  });

  // Add the run mode block (always second)
  blocks.push({
    type: "section",
    block_id: "run_mode_block",
    text: {
      type: "mrkdwn",
      text: "*Run Mode*",
    },
    accessory: {
      type: "radio_buttons",
      action_id: "run_mode_radio",
      initial_option: {
        text: {
          type: "plain_text",
          text: runMode === "telegram" ? "Telegram" : "HTTP",
        },
        value: runMode,
      },
      options: [
        {
          text: {
            type: "plain_text",
            text: "Telegram",
          },
          value: "telegram",
        },
        {
          text: {
            type: "plain_text",
            text: "HTTP",
          },
          value: "http-server",
        },
      ],
    },
  });

  // Add the token block only if Telegram mode is selected
  if (runMode === "telegram") {
    blocks.push({
      type: "input",
      block_id: "token_block",
      element: {
        type: "plain_text_input",
        action_id: "token_input",
        initial_value: tokenValue,
        placeholder: {
          type: "plain_text",
          text: "Enter your Telegram bot token",
        },
      },
      label: {
        type: "plain_text",
        text: "Telegram Bot Token",
      },
    });
  }

  // Add the source code block only if upload code mode is selected
  if (codeMode === "upload") {
    blocks.push({
      type: "input",
      block_id: "source_code_block",
      element: {
        type: "file_input",
        action_id: "source_code_input",
        filetypes: ["zip"],
        max_files: 1,
      },
      label: {
        type: "plain_text",
        text: "Source Code (ZIP file)",
      },
    });
  }
  
  // Only add the staging block if generate code mode is selected
  if (codeMode === "generate") {
    const checkboxAccessory: any = {
      type: "checkboxes",
      action_id: "staging_checkbox",
      options: [
        {
          text: {
            type: "plain_text",
            text: "Use staging",
          },
          value: "use_staging",
        },
      ],
    };

    // Only add initial_options if staging is selected
    if (isStaging) {
      checkboxAccessory.initial_options = [
        {
          text: {
            type: "plain_text",
            text: "Use staging",
          },
          value: "use_staging",
        },
      ];
    }
    
    blocks.push({
      type: "section",
      block_id: "staging_block",
      text: {
        type: "mrkdwn",
        text: "*Environment*",
      },
      accessory: checkboxAccessory,
    });
  }

  return blocks;
}

// Add this handler for the run mode selection
app.action("run_mode_radio", async ({ ack, body, client }) => {
  await ack();

  const actionBody = body as any;
  const selectedRunMode = actionBody.actions[0].selected_option.value;
  const viewId = actionBody.view.id;
  const privateMetadata = actionBody.view.private_metadata;

  console.log("run_mode_radio action triggered");
  console.log("selectedRunMode:", selectedRunMode);
  console.log("Action body:", JSON.stringify(actionBody.actions[0]));

  // Get the current view state
  const viewState = actionBody.view.state;

  // Extract the token value if it exists
  let tokenValue = "";
  if (
    viewState.values.token_block &&
    viewState.values.token_block.token_input
  ) {
    tokenValue = viewState.values.token_block.token_input.value || "";
  }

  // Extract the code mode
  let codeMode = "generate"; // Default
  if (
    viewState.values.code_mode_block &&
    viewState.values.code_mode_block.code_mode_radio &&
    viewState.values.code_mode_block.code_mode_radio.selected_option
  ) {
    codeMode =
      viewState.values.code_mode_block.code_mode_radio.selected_option.value;
  }

  // Check if a file is uploaded
  let hasUploadedFile = false;

  // First check if the source_code_block exists and has files
  if (
    viewState.values.source_code_block &&
    viewState.values.source_code_block.source_code_input
  ) {
    // Check if there are files in the state
    const fileInput = viewState.values.source_code_block.source_code_input;
    if (fileInput.files && fileInput.files.length > 0) {
      hasUploadedFile = true;
    }
  }

  console.log("hasUploadedFile from state:", hasUploadedFile);

  // Check if staging is selected (only if generate code mode)
  let isStaging = false;
  if (
    codeMode === "generate" &&
    viewState.values.staging_block &&
    viewState.values.staging_block.staging_checkbox &&
    viewState.values.staging_block.staging_checkbox.selected_options &&
    viewState.values.staging_block.staging_checkbox.selected_options.length > 0
  ) {
    isStaging = true;
  }

  console.log("isStaging:", isStaging);

  // Build the blocks
  const newBlocks = buildModalBlocks(selectedRunMode, tokenValue, isStaging, codeMode);

  console.log(
    "New blocks:",
    JSON.stringify(newBlocks.map((b: any) => b.block_id)),
  );

  // Update the view with the completely new blocks
  try {
    await client.views.update({
      view_id: viewId,
      view: {
        type: "modal",
        callback_id: "bot_token_modal",
        title: {
          type: "plain_text",
          text: "Configure Bot",
        },
        blocks: newBlocks,
        private_metadata: privateMetadata,
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
    console.log("View updated successfully");
  } catch (error) {
    console.error("Error updating view:", error);
  }
});

// Add this handler for the staging checkbox
app.action("staging_checkbox", async ({ ack, body, client }) => {
  await ack();

  const actionBody = body as any;
  const viewId = actionBody.view.id;
  const privateMetadata = actionBody.view.private_metadata;

  console.log("staging_checkbox action triggered");
  console.log("Action body:", JSON.stringify(actionBody.actions[0]));

  // Get the current view state
  const viewState = actionBody.view.state;

  // Extract the run mode
  let runMode = "telegram"; // Default
  if (
    viewState.values.run_mode_block &&
    viewState.values.run_mode_block.run_mode_radio &&
    viewState.values.run_mode_block.run_mode_radio.selected_option
  ) {
    runMode =
      viewState.values.run_mode_block.run_mode_radio.selected_option.value;
  }

  // Extract the code mode
  let codeMode = "generate"; // Default
  if (
    viewState.values.code_mode_block &&
    viewState.values.code_mode_block.code_mode_radio &&
    viewState.values.code_mode_block.code_mode_radio.selected_option
  ) {
    codeMode =
      viewState.values.code_mode_block.code_mode_radio.selected_option.value;
  }

  // Extract the token value if it exists
  let tokenValue = "";
  if (
    viewState.values.token_block &&
    viewState.values.token_block.token_input
  ) {
    tokenValue = viewState.values.token_block.token_input.value || "";
  }

  // Check if staging is selected
  let isStaging = false;
  if (
    viewState.values.staging_block &&
    viewState.values.staging_block.staging_checkbox &&
    viewState.values.staging_block.staging_checkbox.selected_options &&
    viewState.values.staging_block.staging_checkbox.selected_options.length > 0
  ) {
    isStaging = true;
  }

  console.log("isStaging:", isStaging);

  // Build the blocks
  const newBlocks = buildModalBlocks(runMode, tokenValue, isStaging, codeMode);

  console.log(
    "New blocks:",
    JSON.stringify(newBlocks.map((b: any) => b.block_id)),
  );

  // Update the view with the completely new blocks
  try {
    await client.views.update({
      view_id: viewId,
      view: {
        type: "modal",
        callback_id: "bot_token_modal",
        title: {
          type: "plain_text",
          text: "Configure Bot",
        },
        blocks: newBlocks,
        private_metadata: privateMetadata,
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
  } catch (error) {
    console.error("Error updating view:", error);
  }
});

// Add this handler for the code mode selection
app.action("code_mode_radio", async ({ ack, body, client }) => {
  await ack();

  const actionBody = body as any;
  const selectedCodeMode = actionBody.actions[0].selected_option.value;
  const viewId = actionBody.view.id;
  const privateMetadata = actionBody.view.private_metadata;

  console.log("code_mode_radio action triggered");
  console.log("selectedCodeMode:", selectedCodeMode);
  console.log("Action body:", JSON.stringify(actionBody.actions[0]));

  // Get the current view state
  const viewState = actionBody.view.state;

  // Extract the run mode
  let runMode = "telegram"; // Default
  if (
    viewState.values.run_mode_block &&
    viewState.values.run_mode_block.run_mode_radio &&
    viewState.values.run_mode_block.run_mode_radio.selected_option
  ) {
    runMode =
      viewState.values.run_mode_block.run_mode_radio.selected_option.value;
  }

  // Extract the token value if it exists
  let tokenValue = "";
  if (
    viewState.values.token_block &&
    viewState.values.token_block.token_input
  ) {
    tokenValue = viewState.values.token_block.token_input.value || "";
  }

  // Check if staging is selected
  let isStaging = false;
  if (
    viewState.values.staging_block &&
    viewState.values.staging_block.staging_checkbox &&
    viewState.values.staging_block.staging_checkbox.selected_options &&
    viewState.values.staging_block.staging_checkbox.selected_options.length > 0
  ) {
    isStaging = true;
  }

  console.log("isStaging:", isStaging);

  // Build the blocks with the new code mode
  const newBlocks = buildModalBlocks(runMode, tokenValue, isStaging, selectedCodeMode);

  console.log(
    "New blocks:",
    JSON.stringify(newBlocks.map((b: any) => b.block_id)),
  );

  // Update the view with the completely new blocks
  try {
    await client.views.update({
      view_id: viewId,
      view: {
        type: "modal",
        callback_id: "bot_token_modal",
        title: {
          type: "plain_text",
          text: "Configure Bot",
        },
        blocks: newBlocks,
        private_metadata: privateMetadata,
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
    console.log("View updated successfully");
  } catch (error) {
    console.error("Error updating view:", error);
  }
});

app.start().catch((error) => {
  console.error(error);
  process.exit(1);
});
