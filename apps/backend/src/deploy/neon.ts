import { createApiClient } from '@neondatabase/api-client';
import { logger } from '../logger';

const neonClient = createApiClient({
  apiKey: process.env.NEON_API_KEY!,
});

const NEON_DEFAULT_DATABASE_NAME = 'neondb';

export async function getOrCreateNeonProject({
  existingNeonProjectId,
}: {
  existingNeonProjectId: string | undefined;
}) {
  let connectionString: string | undefined;
  let neonProjectId = existingNeonProjectId;

  if (neonProjectId) {
    connectionString = await getNeonProjectConnectionString({
      projectId: neonProjectId,
    });
    logger.info('Using existing Neon database', {
      projectId: neonProjectId,
    });
  } else {
    // Create a Neon database
    const { data } = await neonClient.createProject({
      project: {},
    });
    connectionString = data.connection_uris[0]?.connection_uri;
    neonProjectId = data.project.id;
    logger.info('Created Neon database', { projectId: data.project.id });
  }

  if (!connectionString) {
    throw new Error('Failed to get Neon connection string');
  }

  if (!neonProjectId) {
    throw new Error('Failed to get Neon project ID');
  }

  return {
    connectionString,
    neonProjectId,
  };
}

async function getNeonProjectConnectionString({
  projectId,
}: {
  projectId: string;
}) {
  const branches = await neonClient.listProjectBranches({
    projectId,
  });
  const defaultBranch = branches.data.branches.find((branch) => branch.default);
  const branchId = defaultBranch?.id;
  if (!branchId) {
    throw new Error(`Default branch not found`);
  }

  const databases = await neonClient.listProjectBranchDatabases(
    projectId,
    branchId,
  );
  const defaultDatabase =
    databases.data.databases.find(
      (db) => db.name === NEON_DEFAULT_DATABASE_NAME,
    ) ?? databases.data.databases[0];

  if (!defaultDatabase) {
    throw new Error(`Default database not found`);
  }
  const databaseName = defaultDatabase?.name;
  const roleName = defaultDatabase?.owner_name;

  const connectionString = await neonClient.getConnectionUri({
    projectId,
    database_name: databaseName,
    role_name: roleName,
  });

  return connectionString.data.uri;
}
