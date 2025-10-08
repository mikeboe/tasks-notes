#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

// Types for API responses
interface Note {
  id: string;
  title: string;
  content?: any;
  searchableContent?: string;
  userId: string;
  teamId: string | null;
  parentId: string | null;
  order: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  createdById: string;
  priority: string | null;
  statusId: string;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
  assignees?: Array<{ id: string; name: string; email: string }>;
  tags?: Array<{ id: string; name: string }>;
  status?: { id: string; name: string; order: number };
  created_by?: { id: string; name: string; email: string };
}

interface Team {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
  joinedAt?: string;
}

class TaskNotesServer {
  private server: Server;
  private apiClient: AxiosInstance;
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    // Get configuration from environment variables
    this.apiKey = process.env.TASK_NOTES_API_KEY || '';
    this.apiUrl = process.env.TASK_NOTES_API_URL || 'http://localhost:3000';

    if (!this.apiKey) {
      throw new Error('TASK_NOTES_API_KEY environment variable is required');
    }

    // Initialize API client
    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'task-notes-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'list_notes',
          description:
            'List all notes for the authenticated user. Optionally filter by teamId to get team-specific notes. If no teamId is provided, returns personal notes only.',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: {
                type: 'string',
                description: 'Optional team ID to filter notes by team',
              },
            },
          },
        },
        {
          name: 'get_note',
          description:
            'Get a specific note by ID. Returns the full note content including title, content, and metadata.',
          inputSchema: {
            type: 'object',
            properties: {
              noteId: {
                type: 'string',
                description: 'The ID of the note to retrieve',
              },
            },
            required: ['noteId'],
          },
        },
        {
          name: 'list_tasks',
          description:
            'List all tasks for the authenticated user. Optionally filter by teamId, priority, status, or assignee. If no teamId is provided, returns personal tasks only.',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: {
                type: 'string',
                description: 'Optional team ID to filter tasks by team',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Optional priority filter',
              },
              status_id: {
                type: 'string',
                description: 'Optional status ID filter',
              },
              assignee_id: {
                type: 'string',
                description: 'Optional assignee user ID filter',
              },
            },
          },
        },
        {
          name: 'get_task',
          description:
            'Get a specific task by ID. Returns the full task details including assignees, tags, comments, and linked notes.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The ID of the task to retrieve',
              },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'list_teams',
          description:
            'List all teams that the authenticated user is a member of. Returns team details and membership information.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_recent_notes',
          description:
            'Get recently updated notes. Optionally filter by teamId and limit the number of results.',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: {
                type: 'string',
                description: 'Optional team ID to filter notes by team',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of notes to return (default: 5)',
                default: 5,
              },
            },
          },
        },
        {
          name: 'get_assigned_tasks',
          description:
            'Get tasks assigned to the authenticated user. Optionally filter by teamId.',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: {
                type: 'string',
                description: 'Optional team ID to filter tasks by team',
              },
            },
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_notes':
            return await this.listNotes(args as { teamId?: string });

          case 'get_note':
            return await this.getNote(args as { noteId: string });

          case 'list_tasks':
            return await this.listTasks(
              args as {
                teamId?: string;
                priority?: string;
                status_id?: string;
                assignee_id?: string;
              }
            );

          case 'get_task':
            return await this.getTask(args as { taskId: string });

          case 'list_teams':
            return await this.listTeams();

          case 'get_recent_notes':
            return await this.getRecentNotes(
              args as { teamId?: string; limit?: number }
            );

          case 'get_assigned_tasks':
            return await this.getAssignedTasks(args as { teamId?: string });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message || error.message;

          if (status === 401) {
            throw new Error(`Authentication failed: ${message}. Please check your API key.`);
          } else if (status === 403) {
            throw new Error(`Access denied: ${message}`);
          } else if (status === 404) {
            throw new Error(`Not found: ${message}`);
          } else {
            throw new Error(`API error: ${message}`);
          }
        }
        throw error;
      }
    });
  }

  private async listNotes(args: { teamId?: string }) {
    const params: Record<string, string> = {};
    if (args.teamId) {
      params.teamId = args.teamId;
    }

    const response = await this.apiClient.get<Note[]>('/notes', { params });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getNote(args: { noteId: string }) {
    const response = await this.apiClient.get<Note>(`/notes/${args.noteId}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listTasks(args: {
    teamId?: string;
    priority?: string;
    status_id?: string;
    assignee_id?: string;
  }) {
    const params: Record<string, string> = {};
    if (args.teamId) params.teamId = args.teamId;
    if (args.priority) params.priority = args.priority;
    if (args.status_id) params.status_id = args.status_id;
    if (args.assignee_id) params.assignee_id = args.assignee_id;

    const response = await this.apiClient.get<Task[]>('/tasks', { params });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTask(args: { taskId: string }) {
    const response = await this.apiClient.get<Task>(`/tasks/${args.taskId}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listTeams() {
    const response = await this.apiClient.get<{ success: boolean; data: Team[] }>('/teams');

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response.data.data, null, 2),
        },
      ],
    };
  }

  private async getRecentNotes(args: { teamId?: string; limit?: number }) {
    const params: Record<string, string> = {};
    if (args.teamId) params.teamId = args.teamId;
    if (args.limit !== undefined) params.limit = String(args.limit);

    const response = await this.apiClient.get<Note[]>('/notes/recent', { params });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getAssignedTasks(args: { teamId?: string }) {
    const params: Record<string, string> = {};
    if (args.teamId) params.teamId = args.teamId;

    const response = await this.apiClient.get<Task[]>('/tasks/assigned', { params });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Log to stderr (stdout is used for MCP protocol)
    console.error('Task Notes MCP Server running on stdio');
    console.error(`API URL: ${this.apiUrl}`);
  }
}

// Start the server
const server = new TaskNotesServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
