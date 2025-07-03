import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import { apps, db } from '../db';
import {
  checkIfRepoExists,
  createInitialCommit,
  createRepository,
  type GithubEntityInitialized,
} from '../github';
import { Instrumentation } from '../instrumentation';
import type { FileData } from '../utils';

export interface CreateAppParams {
  applicationId?: string; // Optional - if not provided, will generate a new one
  appName: string;
  githubEntity: GithubEntityInitialized;
  ownerId: string;
  clientSource: string;
  traceId?: string;
  agentState?: any;
  databricksApiKey?: string;
  databricksHost?: string;
  files?: FileData[];
}

export interface CreateAppResult {
  applicationId: string;
  appName: string;
  repositoryUrl: string;
  initialCommitUrl: string;
}

/**
 * Creates a new app with GitHub repository and database entry
 * This function is used by both the message handler and the direct API endpoint
 */
export async function createApp({
  applicationId: providedApplicationId,
  appName,
  githubEntity,
  ownerId,
  clientSource,
  traceId,
  agentState,
  databricksApiKey,
  databricksHost,
  files = [],
}: CreateAppParams): Promise<CreateAppResult> {
  const applicationId = providedApplicationId || uuidv4();

  // Check if repo exists and generate unique name if needed
  let finalAppName = appName;
  const repoExists = await checkIfRepoExists({
    appName: finalAppName,
    githubEntity,
  });

  if (repoExists) {
    finalAppName = `${appName}-${uuidv4().slice(0, 4)}`;
    app.log.info({
      message: 'Repository exists, generated new app name',
      originalAppName: appName,
      newAppName: finalAppName,
    });
  }

  // Create GitHub repository
  githubEntity.repo = finalAppName;

  const repoCreationStartTime = Instrumentation.trackGitHubRepoCreation();

  const createRepoResult = await createRepository({
    githubEntity,
  });

  if (!createRepoResult.repositoryUrl) {
    throw new Error('Failed to create repository - no URL returned');
  }

  const repositoryUrl = createRepoResult.repositoryUrl;

  app.log.info({
    message: 'Repository created',
    repositoryUrl,
    appName: finalAppName,
  });

  // Create initial commit if files are provided
  let initialCommitUrl = '';
  if (files.length > 0) {
    const { commitSha: initialCommitSha } = await createInitialCommit({
      githubEntity,
      paths: files,
    });

    initialCommitUrl = `https://github.com/${githubEntity.owner}/${finalAppName}/commit/${initialCommitSha}`;
  }

  Instrumentation.trackGitHubRepoCreationEnd(repoCreationStartTime);

  // Save to database
  await db.insert(apps).values({
    id: applicationId,
    name: appName, // Original requested name
    appName: finalAppName, // Actual GitHub repo name
    clientSource,
    ownerId,
    traceId: traceId || `app-${applicationId}`,
    agentState: agentState || null,
    repositoryUrl,
    githubUsername: githubEntity.githubUsername || null,
    databricksApiKey: databricksApiKey || null,
    databricksHost: databricksHost || null,
  });

  app.log.info({
    message: 'App created in database',
    applicationId,
    appName: finalAppName,
    ownerId,
  });

  return {
    applicationId,
    appName: finalAppName,
    repositoryUrl,
    initialCommitUrl,
  };
}
