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

const deploymentOptions = [
  {
    id: 'koyeb' as const,
    name: 'Koyeb',
    subtitle: 'Default Cloud Platform',
    icon: Server,
    features: ['Fast deployment', 'Managed infrastructure', 'Auto-scaling'],
    description:
      'Default cloud platform with fast deployment and managed infrastructure',
  },
  {
    id: 'databricks' as const,
    name: 'Databricks Apps',
    subtitle: 'Enterprise Platform',
    icon: Database,
    features: [
      'Enterprise-grade security',
      'Custom workspace integration',
      'Advanced analytics support',
    ],
    description:
      'Enterprise platform with advanced security and custom workspace integration',
  },
] as const;

export interface DeploymentTargetSelectorHandle {
  validateConfiguration: () => Promise<
    | {
        success: true;
        config: DeploymentConfig;
      }
    | {
        success: false;
      }
  >;
}

type DeploymentTargetSelectorProps = {
  onChange?: (target: DeploymentTarget) => void;
};

export const DeploymentTargetSelector = forwardRef<
  DeploymentTargetSelectorHandle,
  DeploymentTargetSelectorProps
>(({ onChange }, ref) => {
  const formMethods = useForm<DeploymentFormData>({
    resolver: zodResolver(deploymentFormSchema),
    defaultValues: {
      selectedTarget: 'koyeb',
    },
  });

  const { setValue, watch, trigger, getValues } = formMethods;
  const watchedTarget = watch('selectedTarget');

  // Expose methods via imperative handle
  useImperativeHandle(
    ref,
    () => ({
      validateConfiguration: async () => {
        const isValid = await trigger();
        if (!isValid) {
          return {
            success: false,
          };
        }

        return {
          success: true,
          config: getValues(),
        };
      },
    }),
    [trigger, getValues],
  );

  const handleTargetClick = (target: DeploymentTarget) => {
    setValue('selectedTarget', target);
    onChange?.(target);
  };

  return (
    <FormProvider {...formMethods}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">Deployment Platform</h3>
          <Badge variant="outline" className="text-xs font-medium">
            Staff Only
          </Badge>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          {deploymentOptions.map((option) => {
            const IconComponent = option.icon;
            const isSelected = watchedTarget === option.id;

            return (
              <Card
                key={option.id}
                className={cn(
                  'group relative cursor-pointer transition-colors duration-200',
                  'hover:bg-muted/20',
                  'border-2 focus-within:ring-2 focus-within:ring-primary/20',
                  isSelected
                    ? [
                        'border-primary bg-gradient-to-br from-primary/5 to-primary/10',
                        'shadow-lg shadow-primary/10',
                      ]
                    : 'border-border hover:border-primary/30',
                )}
                onClick={() => handleTargetClick(option.id)}
                tabIndex={0}
                role="radio"
                aria-checked={isSelected}
                aria-describedby={`${option.id}-description`}
              >
                <CardContent className="p-6 py-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-background to-muted/50 shadow-inner">
                        <IconComponent
                          className={cn(
                            'w-6 h-6 transition-colors duration-200',
                            isSelected
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-primary',
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-md">
                            {option.name}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {option.subtitle}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 transition-all duration-200',
                        isSelected
                          ? 'bg-primary border-primary shadow-lg'
                          : 'border-muted-foreground/30 group-hover:border-primary/50',
                      )}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-primary-foreground m-0.5" />
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {option.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <p id={`${option.id}-description`} className="sr-only">
                    {option.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
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
