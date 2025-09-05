import { type DeploymentState, PlatformMessageType } from '@appdotbuild/core';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../db';
import { appPrompts, deployments } from '../db/schema';
import { Instrumentation } from '../instrumentation';
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
type KoyebOrganizationPlan =
  | 'hobby'
  | 'starter'
  | 'startup'
  | 'business'
  | 'enterprise'
  | 'internal'
  | 'hobby23'
  | 'no_plan'
  | 'pro'
  | 'scale'
  | 'partner_csp'
  | 'partner_csp_unit';

type KoyebOrganizationStatus =
  | 'WARNING'
  | 'LOCKED'
  | 'ACTIVE'
  | 'DEACTIVATING'
  | 'DEACTIVATED'
  | 'DELETING'
  | 'DELETED';

type KoyebOrganizationDetailedStatus =
  | 'NEW'
  | 'EMAIL_NOT_VALIDATED'
  | 'BILLING_INFO_MISSING'
  | 'LOCKED'
  | 'PAYMENT_FAILURE'
  | 'VALID'
  | 'PENDING_VERIFICATION'
  | 'VERIFICATION_FAILED'
  | 'REVIEWING_ACCOUNT'
  | 'PLAN_UPGRADE_REQUIRED';

type KoyebOrganizationDeactivationReason =
  | 'INVALID'
  | 'REQUESTED_BY_OWNER'
  | 'SUBSCRIPTION_TERMINATION'
  | 'LOCKED_BY_ADMIN'
  | 'VERIFICATION_FAILED'
  | 'TRIAL_DID_NOT_CONVERT';

type KoyebOrganization = {
  id: string;
  address1?: string;
  address2?: string;
  city?: string;
  postal_code?: string;
  state?: string;
  country?: string;
  company?: boolean;
  vat_number?: string;
  billing_name?: string;
  billing_email?: string;
  name: string;
  plan: KoyebOrganizationPlan;
  plan_updated_at?: string;
  has_payment_method?: boolean;
  subscription_id?: string;
  current_subscription_id?: string;
  latest_subscription_id?: string;
  signup_qualification?: object;
  status: KoyebOrganizationStatus;
  status_message: KoyebOrganizationDetailedStatus;
  deactivation_reason: KoyebOrganizationDeactivationReason;
  verified?: boolean;
  qualifies_for_hobby23?: boolean;
  reprocess_after?: string;
  trialing?: boolean;
  trial_starts_at?: string;
  trial_ends_at?: string;
};

type GetKoyebOrganizationResponse = {
  organization: KoyebOrganization;
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
    if (error.includes('already exists')) {
      const userDeployments = await db
        .select({
          koyebOrgId: deployments.koyebOrgId,
        })
        .from(deployments)
        .where(and(eq(deployments.koyebOrgName, koyebOrgName)))
        .limit(1);

      if (!userDeployments[0]?.koyebOrgId) {
        throw new Error('Organization exists but no deployments found');
      }

      return {
        koyebOrgId: userDeployments[0].koyebOrgId,
        koyebOrgName,
      };
    }

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
  koyebOrgId,
}: {
  token: string;
  username: string;
  password: string;
  url: string;
  koyebOrgId: string;
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

    if (error.includes('already exists')) {
      const orgDeployments = await db
        .select({
          koyebOrgEcrSecretId: deployments.koyebOrgEcrSecretId,
        })
        .from(deployments)
        .where(and(eq(deployments.koyebOrgId, koyebOrgId)))
        .limit(1);

      if (!orgDeployments[0]?.koyebOrgEcrSecretId) {
        throw new Error('Secret already exists but no deployments found');
      }

      return orgDeployments[0].koyebOrgEcrSecretId;
    }

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
      .where(
        and(
          eq(deployments.ownerId, request.user.id!),
          isNull(deployments.deletedAt),
        ),
      )
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
  const SLEEP_IDLE_DELAY_SECONDS = 12 * 60 * 60;
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
    scalings: [
      {
        scopes: ['region:was'],
        min: 0,
        max: 1,
        targets: [
          {
            sleep_idle_delay: {
              value: SLEEP_IDLE_DELAY_SECONDS,
              deep_sleep_value: SLEEP_IDLE_DELAY_SECONDS,
              light_sleep_value: SLEEP_IDLE_DELAY_SECONDS,
            },
          },
        ],
      },
    ],
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

export async function deleteKoyebService({
  serviceId,
  token,
}: {
  serviceId: string;
  token: string;
}) {
  const response = await fetch(
    `https://app.koyeb.com/v1/services/${serviceId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    // Don't throw on 404 - resource might already be deleted
    if (response.status === 404) {
      logger.info('Koyeb service already deleted or not found', { serviceId });
      return { deleted: true, alreadyDeleted: true };
    }

    const error = await response.text();
    logger.error('Failed to delete Koyeb service', {
      status: response.status,
      statusText: response.statusText,
      error,
      serviceId,
    });
    throw new Error(`Failed to delete Koyeb service: ${error}`);
  }

  logger.info('Successfully deleted Koyeb service', { serviceId });
  return { deleted: true, alreadyDeleted: false };
}

export async function deleteKoyebDomain({
  domainId,
  token,
}: {
  domainId: string;
  token: string;
}) {
  const response = await fetch(`https://app.koyeb.com/v1/domains/${domainId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Don't throw on 404 - resource might already be deleted
    if (response.status === 404) {
      logger.info('Koyeb domain already deleted or not found', { domainId });
      return { deleted: true, alreadyDeleted: true };
    }

    const error = await response.text();
    logger.error('Failed to delete Koyeb domain', {
      status: response.status,
      statusText: response.statusText,
      error,
      domainId,
    });
    throw new Error(`Failed to delete Koyeb domain: ${error}`);
  }

  logger.info('Successfully deleted Koyeb domain', { domainId });
  return { deleted: true, alreadyDeleted: false };
}

export async function deleteKoyebApp({
  appId,
  token,
}: {
  appId: string;
  token: string;
}) {
  const response = await fetch(`https://app.koyeb.com/v1/apps/${appId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Don't throw on 404 - resource might already be deleted
    if (response.status === 404) {
      logger.info('Koyeb app already deleted or not found', { appId });
      return { deleted: true, alreadyDeleted: true };
    }

    const error = await response.text();
    logger.error('Failed to delete Koyeb app', {
      status: response.status,
      statusText: response.statusText,
      error,
      appId,
    });
    throw new Error(`Failed to delete Koyeb app: ${error}`);
  }

  logger.info('Successfully deleted Koyeb app', { appId });
  return { deleted: true, alreadyDeleted: false };
}

async function getKoyebOrganization({
  orgId,
  token,
}: {
  orgId: string;
  token: string;
}) {
  const response = await fetch(
    `https://app.koyeb.com/v1/organizations/${orgId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to get Koyeb organization', {
      status: response.status,
      statusText: response.statusText,
      error,
      orgId,
    });
    throw new Error(`Failed to get Koyeb organization: ${error}`);
  }

  const data = (await response.json()) as GetKoyebOrganizationResponse;
  const organization = data?.organization;
  if (!organization) {
    throw new Error('Organization not found in the response');
  }

  return { organization };
}

async function deactivateKoyebOrganizationAsync({
  orgId,
  token,
}: {
  orgId: string;
  token: string;
}) {
  const response = await fetch(
    `https://app.koyeb.com/v1/organizations/${orgId}/deactivate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        skip_confirmation: true,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error('Failed to deactivate Koyeb organization', {
      status: response.status,
      statusText: response.statusText,
      error,
      orgId,
    });

    Instrumentation.captureError(
      new Error(`Failed to deactivate Koyeb organization: ${error}`),
      {
        context: 'deactivate_koyeb_organization_async',
        orgId,
      },
    );

    throw new Error(`Failed to deactivate Koyeb organization: ${error}`);
  }

  logger.info('Koyeb organization deactivation initiated (async)', { orgId });
}

function scheduleOrganizationDeletion({
  orgId,
  token,
}: {
  orgId: string;
  token: string;
}): Promise<{ deleted: boolean; alreadyDeleted: boolean }> {
  let attempt = 0;
  const maxAttempts = 30;
  const delay = 5_000;

  async function checkStatusAndScheduleNext(): Promise<{
    deleted: boolean;
    alreadyDeleted: boolean;
  }> {
    attempt++;

    return getKoyebOrganization({ orgId, token })
      .then(({ organization }) => {
        logger.info('Organization status check (scheduled)', {
          orgId,
          attempt,
          status: organization.status,
          maxAttempts,
        });

        if (organization.status === 'DEACTIVATED') {
          logger.info('Organization deactivated, proceeding with deletion', {
            orgId,
          });
          return performOrganizationDeletion({ orgId, token });
        }

        if (attempt >= maxAttempts) {
          const error = `Failed to confirm organization deactivation after ${maxAttempts} attempts`;
          logger.error(error, { orgId });

          Instrumentation.captureError(new Error(error), {
            context: 'schedule_organization_deletion',
            orgId,
          });

          throw new Error(error);
        }

        // Schedule next check with exponential backoff
        logger.info('Scheduling next status check', {
          orgId,
          attempt,
          nextCheckInMs: delay,
          maxAttempts,
        });

        return new Promise<{ deleted: boolean; alreadyDeleted: boolean }>(
          (resolve, reject) => {
            setTimeout(() => {
              checkStatusAndScheduleNext().then(resolve).catch(reject);
            }, delay);
          },
        );
      })
      .catch((error) => {
        logger.error('Error during scheduled organization status check', {
          orgId,
          attempt,
          error: error instanceof Error ? error.message : error,
        });

        if (attempt >= maxAttempts) {
          const finalError = new Error(
            `Failed to verify organization deactivation after ${attempt} attempts: ${error}`,
          );

          Instrumentation.captureError(finalError, {
            context: 'schedule_organization_deletion',
            orgId,
          });

          throw finalError;
        }

        // Retry on error with same scheduling logic
        return new Promise<{ deleted: boolean; alreadyDeleted: boolean }>(
          (resolve, reject) => {
            setTimeout(() => {
              checkStatusAndScheduleNext().then(resolve).catch(reject);
            }, delay);
          },
        );
      });
  }

  return checkStatusAndScheduleNext();
}

async function performOrganizationDeletion({
  orgId,
  token,
}: {
  orgId: string;
  token: string;
}): Promise<{ deleted: boolean; alreadyDeleted: boolean }> {
  const response = await fetch(
    `https://app.koyeb.com/v1/organizations/${orgId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    // Handle 404 as already deleted (idempotent)
    if (response.status === 404) {
      logger.warn('Koyeb organization already deleted or not found', { orgId });
      return { deleted: false, alreadyDeleted: true };
    }

    const error = await response.text();
    logger.error('Failed to delete Koyeb organization', {
      status: response.status,
      statusText: response.statusText,
      error,
      orgId,
    });
    throw new Error(`Failed to delete Koyeb organization: ${error}`);
  }

  logger.info('Successfully deleted Koyeb organization', { orgId });
  return { deleted: true, alreadyDeleted: false };
}

export async function deleteKoyebOrganization({
  orgId,
  token,
}: {
  orgId: string;
  token: string;
}) {
  // Initiate deactivation immediately
  await deactivateKoyebOrganizationAsync({ orgId, token });

  // Return a promise that schedules status polling and eventual deletion
  return scheduleOrganizationDeletion({ orgId, token });
}
