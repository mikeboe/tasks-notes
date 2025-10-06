import { useParams } from 'react-router-dom';

/**
 * Hook to get the current team context from URL
 * Returns teamId if in team context, null if in personal context
 */
export const useTeamContext = () => {
  const { teamId } = useParams<{ teamId?: string }>();

  return {
    teamId: teamId || null,
    isTeamContext: !!teamId,
  };
};
