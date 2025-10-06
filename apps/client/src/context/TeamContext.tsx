import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TeamsApi, type Team } from '@/lib/teams-api';
import { useAuth } from './NewAuthContext';

interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  switchTeam: (teamId: string | null) => void;
  createTeam: (name: string) => Promise<Team>;
  refreshTeams: () => Promise<void>;
  setCurrentTeamById: (teamId: string | null) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: React.ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId?: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch all teams
  const refreshTeams = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const fetchedTeams = await TeamsApi.getTeams();
      setTeams(fetchedTeams);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Fetch teams on mount and when auth status changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refreshTeams();
    } else {
      setTeams([]);
      setCurrentTeam(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, refreshTeams]);

  // Sync current team with URL teamId parameter
  useEffect(() => {
    if (!teamId) {
      setCurrentTeam(null);
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
    } else if (teams.length > 0) {
      // Team not found in user's teams
      setCurrentTeam(null);
    }
  }, [teamId, teams]);

  // Set current team by ID (used when URL changes)
  const setCurrentTeamById = useCallback((teamId: string | null) => {
    if (!teamId) {
      setCurrentTeam(null);
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
    } else {
      // Team not found in user's teams
      setCurrentTeam(null);
    }
  }, [teams]);

  // Switch to a different team (navigates to team context)
  const switchTeam = useCallback((teamId: string | null) => {
    if (teamId) {
      navigate(`/${teamId}`);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Create a new team
  const createTeam = useCallback(async (name: string): Promise<Team> => {
    try {
      const newTeam = await TeamsApi.createTeam({ name });
      await refreshTeams();
      return newTeam;
    } catch (err) {
      console.error('Failed to create team:', err);
      throw err;
    }
  }, [refreshTeams]);

  const value: TeamContextType = {
    currentTeam,
    teams,
    isLoading,
    error,
    switchTeam,
    createTeam,
    refreshTeams,
    setCurrentTeamById,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

// Custom hook to use team context
export const useTeams = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeams must be used within a TeamProvider');
  }
  return context;
};

export default TeamProvider;
