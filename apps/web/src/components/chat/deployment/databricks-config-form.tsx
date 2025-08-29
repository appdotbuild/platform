import {
  Input,
  Label,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@appdotbuild/design';
import { Link2, Key, Info, Globe, Shield } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

export function DatabricksConfigForm() {
  const formMethods = useFormContext();

  return (
    <Form {...formMethods}>
      <div className={'space-y-6'}>
        <div className="space-y-3">
          <Label
            htmlFor="workspace-url"
            className="text-sm font-medium flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Workspace URL
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Find this in your Databricks workspace URL bar. It typically
                    follows the format:
                    https://[workspace-name].cloud.databricks.com
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>

          <FormField
            control={formMethods.control}
            name="databricksConfig.hostUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="workspace-url"
                      type="url"
                      placeholder="https://workspace.cloud.databricks.com"
                      className="pl-10 transition-all duration-200"
                      {...field}
                    />
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">
                  How to find your workspace URL:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your Databricks workspace</li>
                  <li>Copy the URL from your browser's address bar</li>
                  <li>Remove any path after .com (keep only the domain)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label
            htmlFor="access-token"
            className="text-sm font-medium flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            Personal Access Token
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Create a personal access token in your Databricks workspace:
                    User Settings → Developer → Access Tokens
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>

          <FormField
            control={formMethods.control}
            name="databricksConfig.personalAccessToken"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="access-token"
                      type="password"
                      placeholder="dapi••••••••••••••••••••••••••••••"
                      className="pl-10 font-mono text-sm tracking-wider"
                      {...field}
                    />
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">
                  How to find your access token:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your Databricks workspace</li>
                  <li>Click on your profile icon in the top right corner</li>
                  <li>
                    Navigate to "User Settings" → "Developer" → "Access Tokens"
                  </li>
                  <li>Generate a new token</li>
                  <li>Copy the token</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Form>
  );
}
