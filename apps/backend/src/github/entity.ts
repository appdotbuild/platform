import { Octokit } from '@octokit/rest';
import { getUserInstallationId } from './utils';
import { githubApp } from './app';

const DEFAULT_OWNER = 'appdotbuilder';

abstract class GithubEntityBase {
  public isOrg: boolean;
  private _owner: string = '';
  private _installationId: number = 0;
  private _isDefaultInstallation: boolean = false;
  private _repo: string = '';

  constructor(
    public readonly githubUsername: string,
    public readonly githubAccessToken: string,
  ) {
    this.githubUsername = githubUsername;
    this.githubAccessToken = githubAccessToken;
    this.isOrg = false;
  }

  set repo(repo: string) {
    this._repo = repo;
  }

  get repo() {
    return this._repo;
  }

  set owner(owner: string) {
    this._owner = owner;
  }

  get owner() {
    return this._owner;
  }

  set installationId(installationId: number) {
    this._installationId = installationId;
  }

  get installationId() {
    return this._installationId;
  }

  set isDefaultInstallation(isDefaultInstallation: boolean) {
    this._isDefaultInstallation = isDefaultInstallation;
  }

  get isDefaultInstallation() {
    return this._isDefaultInstallation;
  }
}

export class GithubEntity extends GithubEntityBase {
  public octokit: Octokit | undefined;

  async init(): Promise<GithubEntityInitialized> {
    const { installationId, isDefaultInstallation } =
      await getUserInstallationId(this.githubAccessToken);

    this.installationId = installationId;
    this.isDefaultInstallation = isDefaultInstallation;

    if (isDefaultInstallation) {
      this.owner = DEFAULT_OWNER;
      this.isOrg = true;
    } else {
      this.owner = this.githubUsername;
    }

    if (this.isOrg) {
      this.octokit = await githubApp.getInstallationOctokit(
        Number(this.installationId),
      );
    } else {
      this.octokit = new Octokit({ auth: this.githubAccessToken });
    }

    return this as unknown as GithubEntityInitialized;
  }
}

export type GithubEntityInitialized = GithubEntityBase & {
  octokit: Octokit;
};

export function isInitialized(
  entity: GithubEntity | GithubEntityInitialized,
): entity is GithubEntityInitialized {
  return entity.octokit !== undefined;
}
