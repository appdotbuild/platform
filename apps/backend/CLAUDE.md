# Backend App - CLAUDE.md

## Overview

This is a Fastify-based backend API for an AI app platform that enables users to build and deploy applications. The backend handles app management, GitHub integration, deployment orchestration, and user authentication.

## Key Technologies

- **Runtime**: Bun
- **Framework**: Fastify 5.2.1
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: StackFrame Stack
- **Cloud Services**: AWS (S3, ECR), Koyeb (deployment)
- **Version Control**: GitHub API integration

## Architecture

### Core Components

- **Apps Module** (`src/apps/`): Core application management logic
- **Auth Strategy** (`src/auth-strategy.ts`): Authentication validation
- **Database** (`src/db/`): Database schema and connection
- **Deploy** (`src/deploy/`): Application deployment orchestration
- **GitHub** (`src/github/`): Git repository management
- **S3** (`src/s3/`): File storage and presigned URLs
- **ECR** (`src/ecr/`): Docker registry management

### Database Schema

- **apps**: Main application records with deployment status, GitHub integration
- **appPrompts**: User and agent messages/prompts for each app
- **deployments**: Deployment history and metadata
- **customMessageLimits**: User-specific message rate limits

## Key Endpoints

### Apps

- `GET /apps` - List user's applications
- `GET /apps/:id` - Get specific app details
- `GET /apps/:id/history` - Get app prompt/message history
- `GET /apps/:id/read-url` - Get S3 presigned URLs for app files
- `POST /message` - Server-Sent Events endpoint that proxies to Agent Server for fullstack app generation
- `GET /message-limit` - Check user's message limits

### Authentication

- `GET /auth/is-neon-employee` - Check if user is Neon employee

### GitHub (Dev only)

- `POST /github/user/create-repo` - Create user repository
- `POST /github/user/initial-commit` - Create initial commit
- `POST /github/user/commit` - Commit changes
- Similar endpoints for organization repositories

## Development Commands

- `bun run dev` - Start development server with auto-reload and database migration
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations
- `bun run lint` - Check code formatting with Prettier
- `bun run lint:fix` - Fix code formatting
- `bun run types:check` - TypeScript type checking
- `bun run test` - Run tests

## Environment Setup

- Database migrations run automatically before dev/start
- Docker login to ECR happens on server start
- Server runs on port 4444 (http://localhost:4444)

## Request Flow

1. Authentication middleware validates JWT tokens via StackFrame Stack
2. User context (including GitHub access token) attached to request
3. `/message` endpoint creates SSE session and proxies user messages to Agent Server
4. Agent Server streams back SSE events with code generation progress and diffs
5. Backend applies diffs, manages GitHub repositories, and triggers deployments
6. Database operations via Drizzle ORM to persist app state and conversation history
7. External service integrations (S3, ECR, Koyeb, GitHub API) based on Agent Server output

## Key Features

- **Agent Server Integration**: POST SSE endpoint that consumes Agent Server's POST SSE endpoint for fullstack app generation
- **App Building**: Users send messages that are proxied to Agent Server which generates fullstack applications
- **GitHub Integration**: Automatic repository creation and code commits based on Agent Server output
- **Deployment**: Automated deployment to Koyeb platform after Agent Server completes code generation
- **File Management**: S3-based file storage with presigned URLs for app file access
- **Rate Limiting**: Configurable per-user message limits for Agent Server interactions
- **Audit Trail**: Complete history of user interactions and Agent Server responses

## Security Notes

- All endpoints require authentication
- GitHub operations use user's personal access tokens
- S3 operations use presigned URLs for secure file access
- Employee-only features gated by `isNeonEmployee` flag
