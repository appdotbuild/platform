export type RagMetadata = {
  contentId: string;
  organizationId: number;
  pageUrl: string;
  pageTitle?: string;
  pageDescription?: string;
  keywords?: string[];
  questions?: string[];
  entities?: Array<{ name: string; type: string }>;
  tokens?: number;
};
