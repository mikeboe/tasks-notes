# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Task Notes is a monorepo containing a collaborative productivity application that combines Kanban-style task management with hierarchical note-taking. It consists of three main applications:

- **API** (`apps/api`): Express backend with TypeScript
- **Client** (`apps/client`): React 19 frontend with Vite
- **MCP Server** (`apps/mcp-server`): Model Context Protocol server for read-only access to notes and tasks

## Common Commands

### Development
```bash
# Start both API and client in development mode
npm run dev

# Run only API server
make run-api
# OR: cd apps/api && npm run dev

# Run only client
make run-client
# OR: cd apps/client && npm run dev

# Run MCP server (for Claude Desktop integration)
make run-mcp
# OR: cd apps/mcp-server && npm run dev
```

### Database Management
```bash
# Generate new database migration after schema changes
make migrations-create
# OR: cd apps/api && npx drizzle-kit generate

# Apply migrations to database
make migrations-apply
# OR: cd apps/api && npx drizzle-kit migrate

# Open Drizzle Studio (database GUI)
cd apps/api && npm run db:studio

# Seed database with initial data
cd apps/api && npm run db:seed
```

### Building
```bash
# Build all workspaces
npm run build

# Build individual apps
make build-api    # cd apps/api && npm run build
make build-client # cd apps/client && npm run build
make build-mcp    # cd apps/mcp-server && npm run build
```

### Type Checking
```bash
# Check types in API
cd apps/api && npm run type-check

# Check types in client (part of build)
cd apps/client && npm run build
```

## Architecture

### Backend (apps/api)

**Database Layer:**
- Uses Drizzle ORM with PostgreSQL
- Schema files organized by domain in `src/schema/`:
  - `auth-schema.ts`: Users, sessions, API keys, refresh tokens
  - `notes-schema.ts`: Notes with hierarchical structure and tags
  - `tasks-schema.ts`: Tasks, stages, comments, checklists
  - `teams-schema.ts`: Teams, memberships, roles
  - `assets-schema.ts`: File uploads
  - `recordings-schema.ts`: Screen recordings
- All schemas are imported into `src/db/index.ts` and merged into a single schema object
- Migrations stored in `src/db/drizzle/` (auto-generated)

**Authentication:**
- Supports both JWT (cookie-based) and API key authentication
- API keys format: `ak_` prefix, hashed before storage
- Middleware: `src/middleware/auth.ts` handles both auth methods
- JWT tokens stored in cookies with refresh token mechanism
- Team-based access control in `src/middleware/team-auth.ts`

**API Structure:**
- Routes defined in `src/routes/` (auth, notes, tasks, teams, etc.)
- Controllers in `src/controllers/` contain business logic
- All routes use `authMiddleware` for authentication
- Main app setup in `src/app.ts`, entry point in `src/main.ts`
- Migrations run automatically on startup via `runMigrations()`

**Key Features:**
- File uploads to AWS S3 (via `assets` routes)
- Screen recordings with metadata
- Global search across notes, tasks, and tags
- Role-based team access (owner, admin, member)

### Frontend (apps/client)

**State Management:**
- Context-based architecture in `src/context/`:
  - `NewAuthContext`: Authentication state and JWT management
  - `TeamContext`: Current team, team switching, team list
  - `NotesContext`: Notes state, CRUD operations
  - `FavoritesContext`: Favorite notes management
  - `UserContext`: User profile data
- Contexts provide centralized state and API calls for their domain

**Routing:**
- React Router v7 with route definitions in `components/navigation/routes`
- Protected routes wrapped with `<Navigation>` component
- Public routes: `/login`, `/signup`, `/verify-email`, `/share/*`
- Main routes: `/`, `/tasks/:id`, `/note/:id`, `/recordings/:id`

**UI Components:**
- Radix UI primitives with Tailwind CSS styling
- Custom components in `src/components/`
- Rich text editor: BlockNote (in `components/editor/`)
- Drag-and-drop: `@dnd-kit` for Kanban boards and tree views
- Theme provider supports dark/light/system modes

**Key Pages:**
- `Index.tsx`: Home dashboard with recent notes and assigned tasks
- `tasks.tsx`: Kanban board with drag-and-drop task management
- `note.tsx`: Rich text note editor with auto-save (200ms debounce)
- `recordings.tsx`: Screen recording list and management

### MCP Server (apps/mcp-server)

**Purpose:**
- Provides Claude Desktop integration via Model Context Protocol
- Read-only access to notes and tasks using API key authentication
- Respects Task Notes access control (personal/team permissions)

**Available Tools:**
- `list_notes`, `get_note`, `get_recent_notes`
- `list_tasks`, `get_task`, `get_assigned_tasks`
- `list_teams`

## Important Patterns

### Database Queries
- Use Drizzle's query builder, not raw SQL
- Always import schema from `src/schema/` files
- Use `eq()`, `and()`, `or()` from `drizzle-orm` for conditions
- Example: `db.select().from(notes).where(eq(notes.userId, userId))`

### API Routes
- All routes require authentication via `authMiddleware`
- Team routes also check membership via `checkTeamAuth`
- Return format: `{ success: boolean, data?: any, message?: string }`
- Error responses: `{ success: false, message: string }`

### Frontend API Calls
- API client classes in `src/lib/*-api.ts` (e.g., `notes-api.ts`, `tasks-api.ts`)
- Base URL from `VITE_API_BASE_URL` environment variable
- Credentials included in all requests (`credentials: 'include'`)
- Error handling shows toast notifications via `react-hot-toast`

### Notes Hierarchy
- Notes have `parent_id` for tree structure
- Notes can be linked to tasks via `task_id`
- Use `moveNote` and `moveNoteToParent` endpoints for reordering
- Archived notes excluded from default queries

### Team Context
- `currentTeam = null` means personal workspace
- `currentTeam = <Team>` means team workspace
- Team switching via `switchTeam(teamId)` updates context and navigates
- All API calls include `teamId` parameter when in team context

## Environment Variables

Copy `.env.example` and configure:

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for signing JWT tokens
- `VITE_API_BASE_URL`: API base URL for client (default: http://localhost:3000)

**Optional:**
- `NODE_ENV`: development/production
- `API_PORT`: API server port (default: 3000)
- Microsoft Entra ID OAuth variables (`VITE_ENTRA_*`)

## Development Workflow

1. **Starting fresh:**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   make migrations-apply
   npm run dev
   ```

2. **Making schema changes:**
   ```bash
   # 1. Edit schema file in apps/api/src/schema/
   # 2. Generate migration
   make migrations-create
   # 3. Review migration in apps/api/src/db/drizzle/
   # 4. Apply migration
   make migrations-apply
   ```

3. **Adding new routes:**
   - Create controller in `apps/api/src/controllers/`
   - Create route file in `apps/api/src/routes/`
   - Register route in `apps/api/src/app.ts`
   - Add corresponding API client in `apps/client/src/lib/`

4. **Adding new pages:**
   - Create page component in `apps/client/src/pages/`
   - Add route definition in `apps/client/src/components/navigation/routes.ts`
   - Add navigation link if needed in sidebar components

## Database Schema Key Points

- **Users**: Standard user table with email, password hash, role (user/admin)
- **Teams**: Workspaces with members, roles, and settings
- **Notes**: Hierarchical structure with `parent_id`, optional `task_id` link
- **Tasks**: Belong to stages, have priority, assignees, due dates
- **Tags**: Many-to-many with notes via `note_tags` junction table
- **API Keys**: For MCP server and external integrations, never expire unless revoked

## Testing the Application

- Backend: Currently no test suite configured
- Frontend: Vitest configured but no tests written yet
- Manual testing:
  1. Create user via `/signup`
  2. Create team, invite members
  3. Create notes with hierarchy
  4. Create tasks and organize in Kanban board
  5. Test drag-and-drop, favorites, search
