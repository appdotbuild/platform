import type { TemplateId } from '@appdotbuild/core';
import { Code2, Server, Zap } from 'lucide-react';

export type StackOption = {
  id: TemplateId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Only the first 3 are functional template IDs, others are for display
export const STACK_OPTIONS: StackOption[] = [
  {
    id: 'trpc_agent',
    name: 'React + tRPC',
    description: 'Full-stack TypeScript',
    icon: Code2,
  },
  {
    id: 'laravel_agent',
    name: 'Laravel',
    description: 'PHP web framework',
    icon: Server,
  },
  {
    id: 'nicegui_agent',
    name: 'FastAPI + NiceGUI',
    description: 'Python web apps',
    icon: Zap,
  },
];
