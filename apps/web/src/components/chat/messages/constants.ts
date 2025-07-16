import { PlatformMessageType } from '@appdotbuild/core';

export const MESSAGE_TRUNCATION_LENGTH = 800;

export const LINK_ENABLED_TYPES = [
  PlatformMessageType.COMMIT_CREATED,
  PlatformMessageType.DEPLOYMENT_COMPLETE,
  PlatformMessageType.REPO_CREATED,
] as const;

export const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
