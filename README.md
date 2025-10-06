# Task Notes

A collaborative productivity application that combines Kanban-style task management with hierarchical note-taking. Organize your work in personal or team workspaces with rich-text notes, task boards, and powerful cross-linking capabilities.

## Features

### Task Management
- **Kanban Board** with drag-and-drop task organization
- **Customizable stages** for workflow tracking
- **Task properties**: priority levels, dates, assignees, tags, checklists, and comments
- **Task filtering** by assignee, priority, and status
- **Link notes to tasks** for quick reference

### Notes
- **Rich-text editor** powered by BlockNote with full formatting support
- **Hierarchical organization** with parent-child relationships
- **Drag-and-drop reordering** in tree view
- **Auto-save** with 200ms debounce
- **Favorites and recent notes** for quick access
- **Archive and duplicate** notes

### Teams & Collaboration
- **Team workspaces** with role-based access (owner, admin, member)
- **Personal workspace** for individual tasks and notes
- **Team switcher** to toggle between workspaces
- **Invite members** via email

### Search
- **Global search** across notes, tasks, and tags
- **Command palette** with keyboard shortcuts
- **Relevance-based results** with context snippets

### Authentication
- Local authentication (email/password)
- Microsoft OAuth integration
- Email verification and password reset
- JWT-based sessions with refresh tokens

## Tech Stack

### Backend
- **Express** with TypeScript
- **PostgreSQL** + Drizzle ORM
- **better-auth** & Passport.js for authentication
- **AWS S3** for file storage
- **Pino** for logging

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** + Radix UI components
- **BlockNote** rich-text editor
- **@dnd-kit** for drag-and-drop
- **React Router** for navigation

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL database
- AWS S3 bucket (optional, for file uploads)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd task-notes-mono
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
make migrations-create
```

5. Start development servers:
```bash
npm run dev
```

The API will run on `http://localhost:3000` and the client on `http://localhost:5173`.

## Project Structure

```
task-notes-mono/
├── apps/
│   ├── api/          # Express backend
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── schema/
│   │   │   └── main.ts
│   │   └── package.json
│   └── client/       # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── main.tsx
│       └── package.json
└── package.json
```

## Available Scripts

### Root
- `npm run dev` - Start both API and client in development mode
- `npm run build` - Build all workspaces

### API (apps/api)
- `npm run dev` - Start API server with hot reload
- `npm run build` - Build for production
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Drizzle Studio

### Client (apps/client)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

ISC
