# Task Notes MCP Server

Model Context Protocol (MCP) server for Task Notes - provides read-only access to notes and tasks via API key authentication.

## Installation

```bash
npm install -g @task-notes/mcp-server
```

## Configuration

The server requires two environment variables:

- `TASK_NOTES_API_KEY`: Your Task Notes API key (required)
- `TASK_NOTES_API_URL`: Base URL of the Task Notes API (default: `http://localhost:3000`)

### Getting an API Key

1. Log in to Task Notes
2. Go to your profile settings
3. Navigate to the API section
4. Click "Generate API Key"
5. Copy the generated key (it starts with `ak_`)

## Usage

### With Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "task-notes": {
      "command": "task-notes-mcp",
      "env": {
        "TASK_NOTES_API_KEY": "ak_your_api_key_here",
        "TASK_NOTES_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Direct Usage (for development)

```bash
TASK_NOTES_API_KEY=ak_your_key TASK_NOTES_API_URL=http://localhost:3000 task-notes-mcp
```

## Available Tools

### `list_notes`
List all notes for the authenticated user.

**Parameters:**
- `teamId` (optional): Team ID to filter notes by team. If not provided, returns personal notes.

### `get_note`
Get a specific note by ID.

**Parameters:**
- `noteId` (required): The ID of the note to retrieve

### `list_tasks`
List all tasks for the authenticated user.

**Parameters:**
- `teamId` (optional): Team ID to filter tasks by team
- `priority` (optional): Filter by priority (low, medium, high)
- `status_id` (optional): Filter by status ID
- `assignee_id` (optional): Filter by assignee user ID

### `get_task`
Get a specific task by ID.

**Parameters:**
- `taskId` (required): The ID of the task to retrieve

### `list_teams`
List all teams that the authenticated user is a member of.

### `get_recent_notes`
Get recently updated notes.

**Parameters:**
- `teamId` (optional): Team ID to filter notes by team
- `limit` (optional): Maximum number of notes to return (default: 5)

### `get_assigned_tasks`
Get tasks assigned to the authenticated user.

**Parameters:**
- `teamId` (optional): Team ID to filter tasks by team

## Privacy & Access Control

The MCP server respects the Task Notes access control model:

- **Personal Notes/Tasks**: Only accessible to the owner
- **Team Notes/Tasks**: Only accessible to team members
- **Private Teams**: Not accessible by users who are not members

All requests are authenticated using your API key, which is tied to your user account.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Type checking
npm run type-check
```


## License

ISC
