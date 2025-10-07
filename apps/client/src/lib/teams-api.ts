import { config } from "@/config";
import { authenticatedRequest } from "./auth-api";
const API_URL = config.apiUrl || 'http://localhost:3000';

export interface Team {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  role?: 'owner' | 'admin' | 'member';
  joinedAt?: string;
  memberCount?: number;
}

export interface TeamMember {
  id?: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamDetails extends Team {
  members: TeamMember[];
}

export interface CreateTeamRequest {
  name: string;
}

export interface UpdateTeamRequest {
  name: string;
}

export interface AddTeamMemberRequest {
  user_id?: string;
  email?: string;
  role?: 'admin' | 'member';
}

export interface UpdateTeamMemberRequest {
  role: 'owner' | 'admin' | 'member';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

export const TeamsApi = {
  /**
   * Get all teams for the current user
   */
  getTeams: async (): Promise<Team[]> => {
    const response = await authenticatedRequest(`${API_URL}/teams`);
    const json: ApiResponse<Team[]> = await response.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to fetch teams');
    }

    return json.data;
  },

  /**
   * Get single team details by ID
   */
  getTeam: async (teamId: string): Promise<TeamDetails> => {
    const response = await authenticatedRequest(`${API_URL}/teams/${teamId}`);
    const json: ApiResponse<TeamDetails> = await response.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to fetch team');
    }

    return json.data;
  },

  /**
   * Create a new team
   */
  createTeam: async (data: CreateTeamRequest): Promise<Team> => {
    const response = await authenticatedRequest(`${API_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const json: ApiResponse<Team> = await response.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to create team');
    }

    return json.data;
  },

  /**
   * Update team details
   */
  updateTeam: async (teamId: string, data: UpdateTeamRequest): Promise<Team> => {
    const response = await authenticatedRequest(`${API_URL}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const json: ApiResponse<Team> = await response.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to update team');
    }

    return json.data;
  },

  /**
   * Delete a team
   */
  deleteTeam: async (teamId: string): Promise<void> => {
    const response = await authenticatedRequest(`${API_URL}/teams/${teamId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const json: ApiResponse = await response.json();
      throw new Error(json.message || 'Failed to delete team');
    }
  },

  /**
   * Get all members of a team
   */
  getTeamMembers: async (teamId: string): Promise<TeamMember[]> => {
    const response = await authenticatedRequest(`${API_URL}/teams/${teamId}/members`);
    const json: ApiResponse<TeamMember[]> = await response.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to fetch team members');
    }

    return json.data;
  },

  /**
   * Add a member to a team
   */
  addTeamMember: async (teamId: string, data: AddTeamMemberRequest): Promise<void> => {
    const response = await authenticatedRequest(`${API_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const json: ApiResponse = await response.json();

    if (!json.success) {
      throw new Error(json.message || 'Failed to add team member');
    }
  },

  /**
   * Update a team member's role
   */
  updateTeamMember: async (
    teamId: string,
    userId: string,
    data: UpdateTeamMemberRequest
  ): Promise<void> => {
    const response = await authenticatedRequest(`${API_URL}/teams/${teamId}/members/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const json: ApiResponse = await response.json();

    if (!json.success) {
      throw new Error(json.message || 'Failed to update team member');
    }
  },

  /**
   * Remove a member from a team
   */
  removeTeamMember: async (teamId: string, userId: string): Promise<void> => {
    const response = await authenticatedRequest(`${API_URL}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const json: ApiResponse = await response.json();
      throw new Error(json.message || 'Failed to remove team member');
    }
  },

  /**
   * Get teams for a specific user
   */
  getUserTeams: async (userId: string): Promise<Team[]> => {
    const response = await authenticatedRequest(`${API_URL}/teams/user/${userId}`);
    const json: ApiResponse<Team[]> = await response.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to fetch user teams');
    }

    return json.data;
  },
};
