import { useAuth } from "@/context/NewAuthContext"
import { useTeamContext } from "@/hooks/use-team-context"
import { useTeams } from "@/context/TeamContext"
import { useChat } from "@/context/ChatContext"
import { ChatConversation } from "@/components/chat/ChatConversation"
import { ChatInput } from "@/components/chat/ChatInput"
import { ChatQuickActions } from "@/components/chat/ChatQuickActions"
import { Bot } from "lucide-react"

const Index = () => {
  const { user } = useAuth()
  const { teamId } = useTeamContext()
  const { teams } = useTeams()
  const { messages, currentConversation } = useChat()

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

  // Show quick actions when there are no messages or no conversation
  const showQuickActions = !currentConversation || messages.length === 0

  return (
    <div className="container mx-auto p-6 max-w-4xl h-[calc(100vh-4rem)] flex flex-col">
      {/* Header - only show when there are no messages */}
      {showQuickActions && (
        <div className="mb-4 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-primary">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {getGreeting()}, {getUserName()}!
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentTeam
                  ? `Ask me anything about ${currentTeam.name}`
                  : "Ask me anything about your notes and tasks"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area - takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Quick Actions - scrollable if needed */}
        {showQuickActions && (
          <div className="mb-4 shrink-0 overflow-y-auto">
            <ChatQuickActions />
          </div>
        )}

        {/* Conversation - grows to fill space, scrollable */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatConversation />
        </div>

        {/* Input - fixed at bottom */}
        <div className="shrink-0">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};

export default Index;
