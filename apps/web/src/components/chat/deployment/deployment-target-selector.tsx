import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@appdotbuild/design';
import { Server, Database, Check } from 'lucide-react';
import { DatabricksConfigForm } from './databricks-config-form';
import { cn } from '@appdotbuild/design';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forwardRef, useImperativeHandle } from 'react';

const KoyebSchema = z.object({
  selectedTarget: z.literal('koyeb'),
});
const DatabricksConfigSchema = z.object({
  hostUrl: z
    .string()
    .min(1, 'Workspace URL is required')
    .regex(
      /^https?:\/\/.*\.databricks\.com$/,
      'URL must be a valid Databricks workspace (e.g., https://company.cloud.databricks.com)',
    ),
  personalAccessToken: z
    .string()
    .min(1, 'Access token is required')
    .regex(
      /^dapi[a-f0-9]+$/,
      'Invalid Databricks token format. Tokens start with "dapi" followed by hexadecimal characters',
    ),
});
const DatabricksSchema = z.object({
  selectedTarget: z.literal('databricks'),
  databricksConfig: DatabricksConfigSchema,
});
const deploymentFormSchema = z.union([KoyebSchema, DatabricksSchema]);

type DeploymentFormData = z.infer<typeof deploymentFormSchema>;
export type DeploymentTarget = DeploymentFormData['selectedTarget'];
export type DeploymentConfig = z.infer<typeof deploymentFormSchema>;

// Imperative handle interface
export interface DeploymentTargetSelectorHandle {
  getDeploymentConfig: () => DeploymentConfig;
  deployInformationIsValid: () => boolean;
}

type DeploymentTargetSelectorProps = {
  className?: string;
};

export const DeploymentTargetSelector = forwardRef<
  DeploymentTargetSelectorHandle,
  DeploymentTargetSelectorProps
>(({ className }, ref) => {
  const formMethods = useForm<DeploymentFormData>({
    resolver: zodResolver(deploymentFormSchema),
    defaultValues: {
      selectedTarget: 'koyeb',
    },
  });

  const { setValue, watch, getValues, formState } = formMethods;
  const watchedTarget = watch('selectedTarget');

  // Expose methods via imperative handle
  useImperativeHandle(
    ref,
    () => ({
      getDeploymentConfig: (): DeploymentConfig => {
        if (getValues('selectedTarget') === 'databricks') {
          return {
            selectedTarget: 'databricks',
            databricksConfig: getValues('databricksConfig'),
          };
        }
        return { selectedTarget: 'koyeb' };
      },
      deployInformationIsValid: (): boolean => {
        return formState.isValid;
      },
    }),
    [formState.isValid, getValues],
  );

  const handleTargetClick = (target: DeploymentTarget) => {
    setValue('selectedTarget', target);
  };

  return (
    <FormProvider {...formMethods}>
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">Deployment Platform</h3>
          <Badge variant="outline" className="text-xs font-medium">
            Staff Only
          </Badge>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          {/* Koyeb Card */}
          <Card
            className={cn(
              'group relative cursor-pointer transition-colors duration-200',
              'hover:bg-muted/20',
              'border-2 focus-within:ring-2 focus-within:ring-primary/20',
              watchedTarget === 'koyeb'
                ? [
                    'border-primary bg-gradient-to-br from-primary/5 to-primary/10',
                    'shadow-lg shadow-primary/10',
                  ]
                : 'border-border hover:border-primary/30',
            )}
            onClick={() => handleTargetClick('koyeb')}
            tabIndex={0}
            role="radio"
            aria-checked={watchedTarget === 'koyeb'}
            aria-describedby="koyeb-description"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-background to-muted/50 shadow-inner">
                    <Server
                      className={cn(
                        'w-6 h-6 transition-colors duration-200',
                        watchedTarget === 'koyeb'
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-primary',
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">Koyeb</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Default Cloud Platform
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 transition-all duration-200',
                    watchedTarget === 'koyeb'
                      ? 'bg-primary border-primary shadow-lg'
                      : 'border-muted-foreground/30 group-hover:border-primary/50',
                  )}
                >
                  {watchedTarget === 'koyeb' && (
                    <Check className="w-3 h-3 text-primary-foreground m-0.5" />
                  )}
                </div>
              </div>

              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary" />
                  Fast deployment
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary" />
                  Managed infrastructure
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary" />
                  Auto-scaling
                </li>
              </ul>
              <p id="koyeb-description" className="sr-only">
                Default cloud platform with fast deployment and managed
                infrastructure
              </p>
            </CardContent>
          </Card>

          {/* Databricks Card */}
          <Card
            className={cn(
              'group relative cursor-pointer transition-colors duration-200',
              'hover:bg-muted/20',
              'border-2 focus-within:ring-2 focus-within:ring-primary/20',
              watchedTarget === 'databricks'
                ? [
                    'border-primary bg-gradient-to-br from-primary/5 to-primary/10',
                    'shadow-lg shadow-primary/10',
                  ]
                : 'border-border hover:border-primary/30',
            )}
            onClick={() => handleTargetClick('databricks')}
            tabIndex={0}
            role="radio"
            aria-checked={watchedTarget === 'databricks'}
            aria-describedby="databricks-description"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-background to-muted/50 shadow-inner">
                    <Database
                      className={cn(
                        'w-6 h-6 transition-colors duration-200',
                        watchedTarget === 'databricks'
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-primary',
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">Databricks Apps</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enterprise Platform
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 transition-all duration-200',
                    watchedTarget === 'databricks'
                      ? 'bg-primary border-primary shadow-lg'
                      : 'border-muted-foreground/30 group-hover:border-primary/50',
                  )}
                >
                  {watchedTarget === 'databricks' && (
                    <Check className="w-3 h-3 text-primary-foreground m-0.5" />
                  )}
                </div>
              </div>

              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary" />
                  Enterprise-grade security
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary" />
                  Custom workspace integration
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary" />
                  Advanced analytics support
                </li>
              </ul>
              <p id="databricks-description" className="sr-only">
                Enterprise platform with advanced security and custom workspace
                integration
              </p>
            </CardContent>
          </Card>
        </div>

        {watchedTarget === 'databricks' && (
          <Card>
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Workspace Configuration
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Connect your Databricks workspace to enable app deployment
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DatabricksConfigForm />
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {watchedTarget === 'koyeb'
              ? 'Fast, reliable deployment to our managed cloud infrastructure'
              : 'Deploy to Databricks Apps. Currently supports NiceGUI applications only.'}
          </p>
        </div>
      </div>
    </FormProvider>
  );
});
