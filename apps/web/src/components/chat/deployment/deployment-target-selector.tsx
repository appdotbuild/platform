import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@appdotbuild/design';
import { Server, Database } from 'lucide-react';
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
  hostUrl: z.string().min(1, 'Workspace URL is required'),
  personalAccessToken: z.string().min(1, 'Access token is required'),
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
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Deployment Platform</h3>
          <Badge variant="outline" className="text-xs">
            Staff Only
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Koyeb Card */}
          <Card
            className={cn(
              'relative cursor-pointer transition-all duration-200 hover:bg-muted/50',
              watchedTarget === 'koyeb'
                ? 'border-2 border-primary bg-primary/10'
                : 'border-2 border-transparent',
            )}
            onClick={() => handleTargetClick('koyeb')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 p-3 bg-muted/50 rounded-lg">
                  <Server
                    className={cn(
                      'w-6 h-6 transition-colors',
                      watchedTarget === 'koyeb'
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-base mb-1">Koyeb</h4>
                  <p className="text-sm text-muted-foreground">
                    Default Cloud Platform
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Databricks Card */}
          <Card
            className={cn(
              'relative cursor-pointer transition-all duration-200 hover:bg-muted/50',
              watchedTarget === 'databricks'
                ? 'border-2 border-primary bg-primary/10'
                : 'border-2 border-transparent',
            )}
            onClick={() => handleTargetClick('databricks')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 p-3 bg-muted/50 rounded-lg">
                  <Database
                    className={cn(
                      'w-6 h-6 transition-colors',
                      watchedTarget === 'databricks'
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-base">Databricks Apps</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enterprise Platform
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {watchedTarget === 'databricks' && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Workspace Configuration</CardTitle>
              <CardDescription>
                Connect your Databricks workspace to deploy apps
              </CardDescription>
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
