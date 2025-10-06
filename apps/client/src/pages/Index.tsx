import { HomeSearch } from "@/components/home-search"
import { AssignedTasksSection } from "@/components/assigned-tasks-section"
import { RecentNotesSection } from "@/components/recent-notes-section"
import { useAuth } from "@/context/NewAuthContext"
import { useTeamContext } from "@/hooks/use-team-context"
import { useTeams } from "@/context/TeamContext"

const Index = () => {
  const { user } = useAuth()
  const { teamId } = useTeamContext()
  const { teams } = useTeams()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const getUserName = () => {
    if (user?.firstName) {
      return user.firstName
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return "there"
  }

  const currentTeam = teamId ? teams.find(t => t.id === teamId) : null

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Greeting Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {getGreeting()}, {getUserName()}!
        </h1>
        <p className="text-muted-foreground">
          {currentTeam
            ? `Welcome to ${currentTeam.name}. Here's what's happening today.`
            : "Welcome back to your personal workspace. Here's what's happening today."}
        </p>
      </div>

      {/* Search Section */}
      <div className="mb-8 flex justify-center">
        <HomeSearch />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <AssignedTasksSection />
        <RecentNotesSection />
      </div>
    </div>
  );
};

export default Index;
