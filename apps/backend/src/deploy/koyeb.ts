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

  const data = (await response.json()) as KoyebOrgSwitchResponse;

  return data.token.id;
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

  const data = (await response.json()) as CreateKoyebAppResponse;

  return { created: true, koyebAppId: data.app.id };
}

export async function createKoyebService({
  koyebAppId,
  databaseUrl,
  dockerImage,
  token,
}: {
  koyebAppId: string;
  dockerImage: string;
  databaseUrl: string;
  token: string;
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
      }),
    }),
  });

  const data = await response.json();

  return { koyebServiceId: data.service.id };
}

export async function updateKoyebService({
  databaseUrl,
  dockerImage,
  serviceId,
  token,
}: {
  dockerImage: string;
  databaseUrl: string;
  serviceId: string;
  token: string;
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
        }),
      }),
    },
  );

  const data = await response.json();

  return data.service.id;
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

  const data = await response.json();

  return data.secret.id;
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

  const data = await response.json();

  return data.secret.id;
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

  const data = await response.json();

  return { koyebDomainId: data.domain.id as string };
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

  const data = await response.json();

  return { koyebDomainName: data.domain.name };
}

function getOrgName(githubUsername: string) {
  if (process.env.NODE_ENV === 'production') {
    return `appbuild-${githubUsername}`;
  }

  return `appbuild-dev-${githubUsername}`;
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
}: {
  dockerImage: string;
  databaseUrl: string;
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
