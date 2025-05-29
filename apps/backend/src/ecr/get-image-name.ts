const ECR_REPO_URI = `${process.env.AWS_ECR_URL}/${process.env.AWS_ECR_NAMESPACE}`;

export function getImageName(appId: string, githubUsername: string) {
  return `${ECR_REPO_URI}-${githubUsername}/${appId}`;
}
