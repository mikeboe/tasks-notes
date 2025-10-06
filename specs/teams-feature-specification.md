# Teams Feature Specification

## Overview
This specification outlines the implementation of a multi-user teams feature for the task-notes application. Teams will allow users to collaborate by sharing notes and tasks within team contexts. Users can belong to multiple teams and switch between them via URL-based routing.

## Feature Requirements

### Core Functionality
1. **Team Management**
   - Users can create new teams
   - Users can view all teams they belong to
   - Users can switch between teams
   - Teams are identified by a unique ID in the URL
   - Team selection persists based on URL routing

2. **Team Properties**
   - Team has a name (required)
   - Team has a unique ID (UUID, auto-generated)
   - Team can have multiple members (many-to-many relationship with users)
   - Team can optionally have a logo/icon (future enhancement)

3. **Team Context**
   - Notes created within a team context are visible to all team members
   - Tasks created within a team context are visible to all team members
   - Tags created within a team context are available to all team members
   - Task stages/columns are team-specific

---

## Database Schema Changes

### New Tables

#### `teams` Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields:**
- `id`: Unique identifier for the team
- `name`: Team name
- `created_by_id`: Reference to the user who created the team
- `created_at`: Timestamp when team was created
- `updated_at`: Timestamp when team was last updated

#### `team_members` Table (Junction Table)
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

**Fields:**
- `id`: Unique identifier
- `team_id`: Reference to team
- `user_id`: Reference to user
- `role`: User's role in the team (owner, admin, member)
- `joined_at`: Timestamp when user joined the team

**Unique Constraint:** A user can only be a member of a team once

### Schema Modifications

#### Update Existing Tables
The following tables need a `team_id` column to support team context:

1. **`notes` table**
```sql
ALTER TABLE notes ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
```
- `team_id`: NULL for personal notes, UUID for team notes

2. **`tasks` table**
```sql
ALTER TABLE tasks ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
-- Note: organizationId column already exists but appears unused, consider renaming or using team_id
```
- `team_id`: NULL for personal tasks, UUID for team tasks

3. **`task_stages` table**
```sql
ALTER TABLE task_stages ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
-- Note: organizationId column already exists, consider renaming to team_id
```
- `team_id`: NULL for personal/default stages, UUID for team-specific stages

4. **`tags` table**
```sql
ALTER TABLE tags ADD COLUMN team_id UUID REFERENCES tags(id) ON DELETE CASCADE;
-- Note: organizationId column already exists, consider renaming to team_id
```
- `team_id`: NULL for personal tags, UUID for team tags

**Migration Note:** The existing `organizationId` fields in `tasks`, `task_stages`, and `tags` tables can be renamed to `team_id` for consistency, or we keep `team_id` as the new standard and deprecate `organizationId`.

---

## API Endpoints

### Teams Management

#### `POST /api/teams`
Create a new team
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "name": "My Team"
  }
  ```
- **Response:** 201 Created
  ```json
  {
    "id": "uuid",
    "name": "My Team",
    "created_by_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
  ```
- **Auto-behavior:** Creator is automatically added as team member with role "owner"

#### `GET /api/teams`
Get all teams for the authenticated user
- **Auth Required:** Yes
- **Response:** 200 OK
  ```json
  [
    {
      "id": "uuid",
      "name": "Team A",
      "role": "owner",
      "member_count": 5,
      "created_at": "timestamp"
    },
    {
      "id": "uuid",
      "name": "Team B",
      "role": "member",
      "member_count": 3,
      "created_at": "timestamp"
    }
  ]
  ```

#### `GET /api/teams/:teamId`
Get team details
- **Auth Required:** Yes (must be team member)
- **Response:** 200 OK
  ```json
  {
    "id": "uuid",
    "name": "My Team",
    "created_by_id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "members": [
      {
        "user_id": "uuid",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "owner",
        "joined_at": "timestamp"
      }
    ]
  }
  ```

#### `PUT /api/teams/:teamId`
Update team details
- **Auth Required:** Yes (must be owner or admin)
- **Request Body:**
  ```json
  {
    "name": "Updated Team Name"
  }
  ```
- **Response:** 200 OK (returns updated team object)

#### `DELETE /api/teams/:teamId`
Delete a team
- **Auth Required:** Yes (must be owner)
- **Response:** 204 No Content
- **Note:** Cascading delete will remove all team members, team notes, team tasks, etc.

### Team Members Management

#### `POST /api/teams/:teamId/members`
Add a user to a team
- **Auth Required:** Yes (must be owner or admin)
- **Request Body:**
  ```json
  {
    "user_id": "uuid",
    "role": "member"
  }
  ```
- **Alternative:** Email-based invitation
  ```json
  {
    "email": "user@example.com",
    "role": "member"
  }
  ```
- **Response:** 201 Created

#### `GET /api/teams/:teamId/members`
Get all members of a team
- **Auth Required:** Yes (must be team member)
- **Response:** 200 OK
  ```json
  [
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "owner",
      "joined_at": "timestamp"
    }
  ]
  ```

#### `PUT /api/teams/:teamId/members/:userId`
Update a team member's role
- **Auth Required:** Yes (must be owner or admin)
- **Request Body:**
  ```json
  {
    "role": "admin"
  }
  ```
- **Response:** 200 OK

#### `DELETE /api/teams/:teamId/members/:userId`
Remove a user from a team
- **Auth Required:** Yes (must be owner or admin, or the user themselves)
- **Response:** 204 No Content

### Modified Endpoints for Team Context

All existing endpoints that deal with notes, tasks, tags, and task stages need to support team context:

#### Notes Endpoints
- `GET /api/teams/:teamId/notes` - Get all notes for a team
- `POST /api/teams/:teamId/notes` - Create a note in team context
- All other note operations remain at `/api/notes/:id` but check team membership

#### Tasks Endpoints
- `GET /api/teams/:teamId/tasks` - Get all tasks for a team
- `GET /api/teams/:teamId/tasks/assigned` - Get assigned tasks in team
- `POST /api/teams/:teamId/tasks` - Create a task in team context
- All other task operations remain at `/api/tasks/:id` but check team membership

#### Task Stages Endpoints
- `GET /api/teams/:teamId/task-stages` - Get task stages for a team
- `POST /api/teams/:teamId/task-stages` - Create task stage in team

#### Tags Endpoints
- `GET /api/teams/:teamId/tags` - Get tags for a team
- `POST /api/teams/:teamId/tags` - Create tag in team context

### Validation & Authorization
- Users can only access teams they are members of
- Only owners and admins can modify team settings
- Only owners can delete teams
- Users can only create notes/tasks in teams they belong to
- Team context is enforced for all resource access

---

## Frontend Implementation

### URL Structure

The team ID should be part of the URL to make team context explicit and shareable:

```
/:teamId/                          - Team home/dashboard
/:teamId/notes/:noteId             - Note view within team
/:teamId/tasks                     - Tasks kanban board for team
/:teamId/tasks/:taskId             - Task detail within team
```

**Personal/Default Context:**
```
/                                  - Personal home (no team)
/notes/:noteId                     - Personal note
/tasks                             - Personal tasks
/tasks/:taskId                     - Personal task detail
```

### React Router Changes

Update `apps/client/src/components/navigation/routes.tsx`:

```tsx
export const mainRoutes: RouteElement[] = [
  // Personal context routes
  {
    path: "/",
    element: <ProtectedRoute><Index /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/notes/:id",
    element: <ProtectedRoute><NotePage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/tasks",
    element: <ProtectedRoute><TasksPage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/tasks/:id",
    element: <ProtectedRoute><TaskDetailPage /></ProtectedRoute>,
    visible: true,
  },

  // Team context routes
  {
    path: "/:teamId",
    element: <ProtectedRoute><Index /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/:teamId/notes/:id",
    element: <ProtectedRoute><NotePage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/:teamId/tasks",
    element: <ProtectedRoute><TasksPage /></ProtectedRoute>,
    visible: true,
  },
  {
    path: "/:teamId/tasks/:id",
    element: <ProtectedRoute><TaskDetailPage /></ProtectedRoute>,
    visible: true,
  },

  // Auth routes
  {
    path: "/signup",
    element: <RegisterPage />,
    visible: true,
  },
  {
    path: "/login",
    element: <LoginPage />,
    visible: true,
  },
  {
    path: "*",
    element: <NotFound />,
    visible: true,
  },
];
```

### Team Context Hook

Create `apps/client/src/hooks/use-team-context.tsx`:

```tsx
import { useParams } from 'react-router-dom';

export const useTeamContext = () => {
  const { teamId } = useParams<{ teamId?: string }>();

  return {
    teamId: teamId || null,
    isTeamContext: !!teamId,
  };
};
```

This hook can be used throughout the application to determine the current context.

### Team Switcher Component

Update `apps/client/src/components/team-switcher.tsx`:

#### New Props Interface
```tsx
interface Team {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  logo?: React.ElementType; // Optional for future enhancement
}

interface TeamSwitcherProps {
  teams: Team[];
  currentTeamId?: string | null;
  onTeamSelect: (teamId: string | null) => void;
  onCreateTeam: () => void;
}
```

#### Key Features
1. **Display Current Team:** Highlight the active team based on URL parameter
2. **Team List:** Show all teams the user belongs to
3. **Personal Context:** Include "Personal" option (no team)
4. **Create Team:** "Add team" button opens dialog/modal to create new team
5. **Navigation:** Clicking a team navigates to `/:teamId`

#### Implementation Pattern
```tsx
export function TeamSwitcher({ teams, currentTeamId, onTeamSelect, onCreateTeam }: TeamSwitcherProps) {
  const navigate = useNavigate();
  const { teamId } = useParams();

  const activeTeam = teams.find(t => t.id === teamId) || null;

  const handleTeamChange = (team: Team | null) => {
    if (team) {
      navigate(`/${team.id}`);
    } else {
      navigate('/'); // Personal context
    }
  };

  // ... rest of implementation
}
```

### Team Context Provider

Create `apps/client/src/context/TeamContext.tsx`:

```tsx
interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  isLoading: boolean;
  switchTeam: (teamId: string | null) => void;
  createTeam: (name: string) => Promise<Team>;
  refreshTeams: () => Promise<void>;
}
```

This context will:
- Fetch all teams on mount
- Manage current team state based on URL
- Provide team switching functionality
- Handle team creation

### API Integration

Create `apps/client/src/lib/teams-api.ts`:

```tsx
export const TeamsApi = {
  // Get all teams for current user
  getTeams: async (): Promise<Team[]> => { ... },

  // Get single team details
  getTeam: async (teamId: string): Promise<Team> => { ... },

  // Create new team
  createTeam: async (data: { name: string }): Promise<Team> => { ... },

  // Update team
  updateTeam: async (teamId: string, data: { name: string }): Promise<Team> => { ... },

  // Delete team
  deleteTeam: async (teamId: string): Promise<void> => { ... },

  // Team members
  getTeamMembers: async (teamId: string): Promise<TeamMember[]> => { ... },
  addTeamMember: async (teamId: string, data: { user_id: string, role: string }): Promise<void> => { ... },
  updateTeamMember: async (teamId: string, userId: string, data: { role: string }): Promise<void> => { ... },
  removeTeamMember: async (teamId: string, userId: string): Promise<void> => { ... },
};
```

### Modified API Calls

Update existing API services to include team context:

#### `apps/client/src/lib/notes-api.ts`
- Add optional `teamId` parameter to `getNotes()`, `createNote()`, etc.
- Pass team ID in API calls when in team context

#### `apps/client/src/lib/tasks-api.ts`
- Add optional `teamId` parameter to `getTasks()`, `createTask()`, etc.
- Pass team ID in API calls when in team context

### Component Updates

#### AppSidebar (`apps/client/src/components/app-sidebar.tsx`)
1. Integrate `TeamSwitcher` with real data from `TeamContext`
2. Pass current team and team list
3. Handle team creation dialog
4. Update navigation links to include teamId when in team context

#### Navigation Links
All navigation items in sidebar should respect team context:
- Tasks link: `/:teamId/tasks` or `/tasks`
- Notes links: `/:teamId/notes/:id` or `/notes/:id`

---

## Backend Implementation

### Drizzle Schema

Create `apps/api/src/schema/teams-schema.ts`:

```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';
import { z } from 'zod';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('member').notNull(), // 'owner', 'admin', 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export const addTeamMemberSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'member']).default('member'),
}).refine(data => data.user_id || data.email, {
  message: "Either user_id or email must be provided"
});

export const updateTeamMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

// Type exports
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
```

### Database Migrations

Create migration file (e.g., `0009_add_teams.sql`):

```sql
-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create team_members junction table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Add team_id to existing tables
ALTER TABLE notes ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE task_stages ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE tags ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_notes_team_id ON notes(team_id);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_task_stages_team_id ON task_stages(team_id);
CREATE INDEX idx_tags_team_id ON tags(team_id);
```

### Controllers

Create `apps/api/src/controllers/teams.ts`:

```typescript
import { Request, Response } from 'express';
import { db } from '../db';
import { teams, teamMembers, createTeamSchema, updateTeamSchema, addTeamMemberSchema, updateTeamMemberSchema } from '../schema/teams-schema';
import { users } from '../schema/auth-schema';
import { eq, and } from 'drizzle-orm';

export const createTeam = async (req: Request, res: Response) => {
  // Validate request body
  // Create team
  // Add creator as owner
  // Return created team
};

export const getTeams = async (req: Request, res: Response) => {
  // Get all teams where user is a member
  // Include member count and user's role
};

export const getTeamById = async (req: Request, res: Response) => {
  // Verify user is team member
  // Get team details including all members
};

export const updateTeam = async (req: Request, res: Response) => {
  // Verify user is owner or admin
  // Update team
};

export const deleteTeam = async (req: Request, res: Response) => {
  // Verify user is owner
  // Delete team (cascades to members, notes, tasks, etc.)
};

export const addTeamMember = async (req: Request, res: Response) => {
  // Verify user is owner or admin
  // Add member to team
  // Support both user_id and email
};

export const getTeamMembers = async (req: Request, res: Response) => {
  // Verify user is team member
  // Return all team members with user details
};

export const updateTeamMember = async (req: Request, res: Response) => {
  // Verify user is owner or admin
  // Update member role
};

export const removeTeamMember = async (req: Request, res: Response) => {
  // Verify user is owner/admin or is removing themselves
  // Remove member from team
};
```

### Routes

Create `apps/api/src/routes/teams.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  getTeamMembers,
  updateTeamMember,
  removeTeamMember,
} from '../controllers/teams';

const router = Router();

router.use(authMiddleware);

// Team management
router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:teamId', getTeamById);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);

// Team members
router.post('/:teamId/members', addTeamMember);
router.get('/:teamId/members', getTeamMembers);
router.put('/:teamId/members/:userId', updateTeamMember);
router.delete('/:teamId/members/:userId', removeTeamMember);

export default router;
```

### Middleware

Create team authorization middleware `apps/api/src/middleware/team-auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { teamMembers } from '../schema/teams-schema';
import { eq, and } from 'drizzle-orm';

// Middleware to verify user is member of team
export const requireTeamMember = async (req: Request, res: Response, next: NextFunction) => {
  const teamId = req.params.teamId;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const membership = await db.select()
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ))
    .limit(1);

  if (!membership.length) {
    return res.status(403).json({ message: 'Not a member of this team' });
  }

  req.teamMembership = membership[0];
  next();
};

// Middleware to verify user is admin or owner
export const requireTeamAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.teamMembership) {
    return res.status(403).json({ message: 'Team membership required' });
  }

  if (!['owner', 'admin'].includes(req.teamMembership.role)) {
    return res.status(403).json({ message: 'Admin or owner role required' });
  }

  next();
};

// Middleware to verify user is owner
export const requireTeamOwner = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.teamMembership) {
    return res.status(403).json({ message: 'Team membership required' });
  }

  if (req.teamMembership.role !== 'owner') {
    return res.status(403).json({ message: 'Owner role required' });
  }

  next();
};
```

### Update Existing Controllers

Modify existing controllers to support team context:

#### `apps/api/src/controllers/notes.ts`
- Add team ID filtering in `getNotes()`
- Set team ID when creating notes
- Verify team membership when accessing notes

#### `apps/api/src/controllers/tasks.ts`
- Add team ID filtering in `getTasks()`
- Set team ID when creating tasks
- Verify team membership when accessing tasks

#### `apps/api/src/controllers/task-stages.ts`
- Filter stages by team ID
- Create team-specific stages

#### `apps/api/src/controllers/tags.ts`
- Filter tags by team ID
- Create team-specific tags

---

## User Experience Flow

### Creating a Team
1. User clicks "Add team" in TeamSwitcher
2. Dialog/modal opens with team name input
3. User enters team name and submits
4. Team is created, user becomes owner
5. User is redirected to `/:teamId`
6. Default task stages are created for the team

### Switching Teams
1. User clicks on TeamSwitcher dropdown
2. List shows: "Personal" + all teams user belongs to
3. Current team/context is highlighted
4. User selects a different team
5. URL changes to `/:teamId`
6. All data (notes, tasks) now shows team context

### Team Context Awareness
- Sidebar TeamSwitcher always shows current context
- All navigation links respect current context
- Creating notes/tasks automatically uses current team context
- Breadcrumbs or header could show team name

---

## Security Considerations

1. **Team Membership Verification**
   - Every team-scoped API call must verify user is team member
   - Use middleware for consistent enforcement

2. **Role-Based Permissions**
   - Owner: Full control (delete team, manage all members)
   - Admin: Can add/remove members, manage content
   - Member: Can view and create content, cannot manage team

3. **Data Isolation**
   - Team data must be completely isolated from other teams
   - Personal data (teamId = null) must be isolated from all teams
   - SQL queries must always filter by teamId or check membership

4. **Cascading Deletes**
   - Deleting a team removes all associated data
   - Removing a user from team does NOT delete their created content
   - Consider soft deletes for audit trail

---

## Testing Considerations

### Backend Tests
- Team creation and auto-owner assignment
- Team membership verification
- Role-based access control
- Data isolation between teams
- Cascading deletes
- Personal vs team context separation

### Frontend Tests
- Team switcher UI
- URL-based team context
- Navigation with team IDs
- Team creation flow
- Permission-based UI rendering

---

## Future Enhancements

1. **Team Invitations**
   - Email-based team invitations
   - Invitation tokens and expiry
   - Invitation acceptance flow

2. **Team Settings**
   - Team description
   - Team logo/avatar
   - Team color theme
   - Default permissions

3. **Advanced Permissions**
   - Granular permissions per resource type
   - Custom roles
   - Resource-level permissions

4. **Activity Feed**
   - Team activity log
   - Member activity tracking
   - Notifications for team updates

5. **Team Templates**
   - Pre-configured task stages
   - Default tags
   - Template notes

---

## Implementation Checklist

### Database
- [ ] Create `teams` table
- [ ] Create `team_members` junction table
- [ ] Add `team_id` column to `notes` table
- [ ] Add `team_id` column to `tasks` table
- [ ] Add `team_id` column to `task_stages` table
- [ ] Add `team_id` column to `tags` table
- [ ] Add indexes for performance
- [ ] Create migration file
- [ ] Run migration

### Backend API
- [ ] Create teams schema file
- [ ] Create teams controller
- [ ] Create teams routes
- [ ] Create team authorization middleware
- [ ] Update notes controller for team context
- [ ] Update tasks controller for team context
- [ ] Update task-stages controller for team context
- [ ] Update tags controller for team context
- [ ] Add team-scoped routes to app.ts
- [ ] Add authorization checks to all team routes

### Frontend
- [ ] Create teams API service
- [ ] Create TeamContext provider
- [ ] Create useTeamContext hook
- [ ] Update TeamSwitcher component
- [ ] Add team creation dialog/modal
- [ ] Update routing configuration
- [ ] Update navigation links for team context
- [ ] Update AppSidebar integration
- [ ] Update notes API calls for team context
- [ ] Update tasks API calls for team context
- [ ] Update all pages to use team context
- [ ] Add team name to UI header/breadcrumb

### Testing
- [ ] Backend unit tests for teams CRUD
- [ ] Backend tests for team authorization
- [ ] Backend tests for data isolation
- [ ] Frontend tests for team switcher
- [ ] Frontend tests for team creation
- [ ] Integration tests for team workflows
- [ ] E2E tests for team switching

### Documentation
- [ ] API documentation for teams endpoints
- [ ] Update existing API docs for team-scoped endpoints
- [ ] User guide for teams feature
- [ ] Developer guide for team context usage