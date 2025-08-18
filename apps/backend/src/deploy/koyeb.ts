import { type DeploymentState, PlatformMessageType } from '@appdotbuild/core';
import { desc, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../db';
import { appPrompts, deployments } from '../db/schema';
import { logger } from '../logger';

type KoyebOrgSwitchResponse = {
  token: {
    id: string;
    user_id: string;
    organization_id: string;
    expires_at: string;
  };
};

type CreateKoyebOrganizationResponse = {
  organization: {
    id: string;
  };
};

type CreateKoyebAppResponse = {
  app: {
    id: string;
  };
};
type KoyebEnv = {
  scopes?: Array<string>;
  key: string;
  value: string;
};

export async function createKoyebOrganization(githubUsername: string) {
  const koyebOrgName = getOrgName(githubUsername);

  const response = await fetch(`https://app.koyeb.com/v1/organizations`, {
    headers: {
      Authorization: `Bearer ${process.env.KOYEB_CLI_PAT_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      name: koyebOrgName,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to create Koyeb organization', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error('Failed to create Koyeb organization');
  }

  const data = (await response.json()) as CreateKoyebOrganizationResponse;

  return {
    koyebOrgId: data.organization.id,
    koyebOrgName,
  };
}

export async function getOrganizationToken(orgId: string) {
  const response = await fetch(
    `https://app.koyeb.com/v1/organizations/${orgId}/switch`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KOYEB_CLI_PAT_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get organization token', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const data = (await response.json()) as KoyebOrgSwitchResponse;
  const tokenId = data?.token?.id;
  if (!tokenId) {
    throw new Error('Token ID not found in the response');
  }

  return tokenId;
}

export async function createKoyebApp({
  koyebAppName,
  token,
}: {
  koyebAppName: string;
  token: string;
}) {
  const response = await fetch('https://app.koyeb.com/v1/apps', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: koyebAppName,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to create Koyeb app', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const data = (await response.json()) as CreateKoyebAppResponse;
  const appId = data?.app?.id;
  if (!appId) {
    throw new Error('App ID not found in the response');
  }

  return { created: true, koyebAppId: appId };
}

export async function createKoyebService({
  koyebAppId,
  databaseUrl,
  dockerImage,
  token,
  customEnvs,
}: {
  koyebAppId: string;
  dockerImage: string;
  databaseUrl: string;
  token: string;
  customEnvs?: KoyebEnv[];
}) {
  const response = await fetch(`https://app.koyeb.com/v1/services`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      app_id: koyebAppId,
      definition: getKoyebServiceBody({
        dockerImage,
        databaseUrl,
        customEnvs,
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to create Koyeb service', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const data = await response.json();
  const serviceId = data?.service?.id;
  const deploymentId = data?.service?.latest_deployment_id;

  if (!serviceId) {
    throw new Error('Service ID not found in the response');
  }
  if (!deploymentId) {
    throw new Error('Deployment ID not found in the response');
  }

  return {
    koyebServiceId: serviceId,
    deploymentId: deploymentId,
  };
}

export async function updateKoyebService({
  databaseUrl,
  dockerImage,
  serviceId,
  token,
  customEnvs,
}: {
  dockerImage: string;
  databaseUrl: string;
  serviceId: string;
  token: string;
  customEnvs?: KoyebEnv[];
}) {
  const response = await fetch(
    `https://app.koyeb.com/v1/services/${serviceId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        definition: getKoyebServiceBody({
          dockerImage,
          databaseUrl,
          customEnvs,
        }),
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to update Koyeb service', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const data = await response.json();
  const updatedServiceId = data?.service?.id;
  const updatedDeploymentId = data?.service?.latest_deployment_id;

  if (!updatedServiceId) {
    throw new Error('Service ID not found in the response');
  }
  if (!updatedDeploymentId) {
    throw new Error('Deployment ID not found in the response');
  }

  return {
    koyebServiceId: updatedServiceId,
    deploymentId: updatedDeploymentId,
  };
}

export async function createEcrSecret({
  token,
  username,
  password,
  url,
}: {
  token: string;
  username: string;
  password: string;
  url: string;
}) {
  const response = await fetch(`https://app.koyeb.com/v1/secrets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'ecr-creds',
      type: 'REGISTRY',
      private_registry: {
        username,
        password,
        url,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to create ECR secret', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const responseData = await response.json();
  const secretId = responseData?.secret?.id;
  if (!secretId) {
    throw new Error('Secret ID not found in the response');
  }
  return secretId;
}

export async function updateEcrSecret({
  token,
  secretId,
  username,
  password,
  url,
}: {
  token: string;
  secretId: string;
  username: string;
  password: string;
  url: string;
}) {
  const response = await fetch(`https://app.koyeb.com/v1/secrets/${secretId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'ecr-creds',
      type: 'REGISTRY',
      private_registry: {
        username,
        password,
        url,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to update ECR secret', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const responseData = await response.json();
  const updatedSecretId = responseData?.secret?.id;
  if (!updatedSecretId) {
    throw new Error('Secret ID not found in the response');
  }

  return updatedSecretId;
}

export async function createKoyebDomain({
  koyebAppId,
  koyebAppName,
  token,
}: {
  koyebAppId: string;
  koyebAppName: string;
  token: string;
}) {
  const response = await fetch(`https://app.koyeb.com/v1/domains`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: getDomainName(koyebAppName),
      type: 'AUTOASSIGNED',
      app_id: koyebAppId,
      koyeb: {},
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to create Koyeb domain', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const data = await response.json();
  const domainId = data?.domain?.id;
  if (!domainId) {
    throw new Error('Domain ID not found in the response');
  }

  return { koyebDomainId: domainId as string };
}

export async function getKoyebDomain({
  koyebDomainId,
  token,
}: {
  koyebDomainId: string;
  token: string;
}) {
  const response = await fetch(
    `https://app.koyeb.com/v1/domains/${koyebDomainId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get Koyeb domain', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const data = await response.json();
  const domainName = data?.domain?.name;
  if (!domainName) {
    throw new Error('Domain name not found in the response');
  }

  return { koyebDomainName: domainName };
}

export async function getKoyebDeployment({
  deploymentId,
  token,
}: {
  deploymentId: string;
  token: string;
}) {
  const response = await fetch(
    `https://app.koyeb.com/v1/deployments/${deploymentId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get Koyeb deployment', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error);
  }

  const data = await response.json();
  const deploymentStatus = data?.deployment?.status;
  if (!deploymentStatus) {
    throw new Error('Deployment status not found in the response');
  }

  return { koyebDeploymentStatus: deploymentStatus };
}

export const getKoyebDeploymentEndpoint = async (
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { messageId?: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = request.params;
    const { messageId } = request.query;

    if (!id) {
      return reply.status(400).send({ message: 'Deployment ID is required' });
    }

    const deploymentData = await db
      .select({
        koyebOrgId: deployments.koyebOrgId,
      })
      .from(deployments)
      .where(eq(deployments.ownerId, request.user.id!))
      .orderBy(desc(deployments.createdAt))
      .limit(1);

    const koyebOrgId = deploymentData[0]?.koyebOrgId;

    if (!koyebOrgId) {
      return reply
        .status(404)
        .send({ message: 'Organization for user not found' });
    }

    const userToken = await getOrganizationToken(koyebOrgId);

    const deploymentChecker = getDeploymentChecker({
      deploymentId: id,
      token: userToken,
    });

    const response = await deploymentChecker();

    // if received messageId, should update the message with the deployment status
    if (
      messageId &&
      (response.type === 'HEALTHY' || response.type === 'ERROR')
    ) {
      await updateDeploymentMessage(messageId, response.type, response.message);
    }

    return reply.send(response);
  } catch (error) {
    logger.error('Error getting deployment endpoint', { error });
    return reply.status(500).send({ message: 'Internal server error' });
  }
};

function getOrgName(githubUsername: string) {
  if (process.env.NODE_ENV === 'production') {
    return getNormalizedOrgName(`appbuild-${githubUsername}`);
  }

  return getNormalizedOrgName(`appbuild-dev-${githubUsername}`);
}

/**
 * Koyeb validation for org names is this
 * "Use 1 to 39 letters, digits and dash only"
 * So this function is used to normalize the org name to meet the requirements.
 */
function getNormalizedOrgName(orgName: string) {
  // This will replace all non-alphanumeric characters with a dash
  let normalized = orgName.replace(/[^a-zA-Z0-9-]/g, '-');

  // If there's multiple dashes, they get replaced with one.
  normalized = normalized.replace(/-+/g, '-');

  if (normalized.length > 39) {
    normalized = normalized.substring(0, 39);
  }

  return normalized;
}

function getDomainName(appId: string) {
  if (process.env.NODE_ENV === 'production') {
    return `${appId}.build.myneon.app`;
  }

  return `${appId}.build-dev.myneon.app`;
}

function getKoyebServiceBody({
  dockerImage,
  databaseUrl,
  customEnvs,
}: {
  dockerImage: string;
  databaseUrl: string;
  customEnvs?: KoyebEnv[];
}) {
  return {
    name: 'service',
    type: 'WEB',
    strategy: { type: 'DEPLOYMENT_STRATEGY_TYPE_INVALID' },
    routes: [{ port: 80, path: '/' }],
    ports: [{ port: 80, protocol: 'http' }],
    env: [
      {
        scopes: ['region:was'],
        key: 'APP_DATABASE_URL',
        value: databaseUrl,
      },
      { scopes: ['region:was'], key: 'SERVER_PORT', value: '2022' },
      ...(customEnvs?.map((e) => ({
        scopes: e.scopes || ['region:was'],
        key: e.key,
        value: e.value,
      })) ?? []),
    ],
    regions: ['was'],
    scalings: [{ scopes: ['region:was'], min: 1, max: 1, targets: [] }],
    instance_types: [{ scopes: ['region:was'], type: 'nano' }],
    health_checks: [],
    volumes: [],
    config_files: [],
    skip_cache: false,
    docker: {
      image: dockerImage,
      command: '',
      args: [],
      image_registry_secret: 'ecr-creds',
      entrypoint: [],
      privileged: false,
    },
  };
}

function getDeploymentChecker({
  deploymentId,
  token,
}: {
  deploymentId: string;
  token: string;
}) {
  async function checkDeployment(): Promise<{
    message: string;
    isDeployed: boolean;
    type: DeploymentState;
  }> {
    try {
      const { koyebDeploymentStatus } = await getKoyebDeployment({
        deploymentId,
        token,
      });

      logger.info('Deployment status check', {
        deploymentId,
        status: koyebDeploymentStatus,
      });

      if (koyebDeploymentStatus === 'HEALTHY') {
        logger.info('Deployment is healthy');
        return {
          message: `Your application has been deployed`,
          isDeployed: true,
          type: 'HEALTHY',
        };
      }

      if (koyebDeploymentStatus === 'STOPPING') {
        logger.info(
          'Deployment is stopping, a new deployment is being created',
        );
        return {
          message: `Current deployment is stopping, a new deployment is being created`,
          isDeployed: false,
          type: 'STOPPING',
        };
      }

      if (koyebDeploymentStatus === 'ERROR') {
        logger.error('Deployment has error status');
        return {
          message: `There was an error deploying your application.`,
          isDeployed: false,
          type: 'ERROR',
        };
      }

      logger.info('Deployment still in progress', {
        status: koyebDeploymentStatus,
      });
      return {
        message: `Your application is being deployed`,
        isDeployed: false,
        type: 'DEPLOYMENT_IN_PROGRESS',
      };
    } catch (error) {
      logger.error('Error checking deployment status', { error, deploymentId });
      return {
        message: `Unable to check deployment status`,
        isDeployed: false,
        type: 'ERROR',
      };
    }
  }

  return checkDeployment;
}

async function updateDeploymentMessage(
  messageId: string,
  deploymentType: DeploymentState,
  message: string,
) {
  try {
    const newPlatformType =
      deploymentType === 'HEALTHY'
        ? PlatformMessageType.DEPLOYMENT_COMPLETE
        : PlatformMessageType.DEPLOYMENT_FAILED;

    const existingMessage = await db
      .select()
      .from(appPrompts)
      .where(eq(appPrompts.id, messageId))
      .limit(1);

    if (existingMessage.length === 0) {
      return;
    }

    const currentMetadata = existingMessage[0]?.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      type: newPlatformType,
    };

    await db
      .update(appPrompts)
      .set({
        metadata: updatedMetadata,
        prompt: message,
      })
      .where(eq(appPrompts.id, messageId));
  } catch (error) {
    logger.error('Failed to update deployment message', {
      messageId,
      deploymentType,
      error,
    });
  }
}
