import { Input, Label } from '@appdotbuild/design';
import { Link2, Key } from 'lucide-react';
import { cn } from '@appdotbuild/design';
import { useFormContext } from 'react-hook-form';

type DatabricksConfigFormProps = {
  className?: string;
};

export function DatabricksConfigForm({ className }: DatabricksConfigFormProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="workspace-url" className="text-sm font-medium">
            Workspace URL
          </Label>
        </div>
        <Input
          id="workspace-url"
          type="url"
          placeholder="https://workspace.cloud.databricks.com"
          {...register('databricksConfig.hostUrl')}
        />
        {errors.databricksConfig?.hostUrl && (
          <p className="text-xs text-red-500">
            {(errors.databricksConfig.hostUrl as any)?.message ||
              'Workspace URL is required'}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Your Databricks workspace URL
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="access-token" className="text-sm font-medium">
            Access Token
          </Label>
        </div>
        <Input
          id="access-token"
          type="password"
          placeholder="dapi••••••••••••••••••••"
          {...register('databricksConfig.personalAccessToken')}
        />
        {errors.databricksConfig?.personalAccessToken && (
          <p className="text-xs text-red-500">
            {(errors.databricksConfig.personalAccessToken as any)?.message ||
              'Access token is required'}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Generate from user settings → Access tokens
        </p>
      </div>
    </div>
  );
}
