import { Plus } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';

interface NewChatButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function NewChatButton({
  variant = 'outline',
  size = 'default',
  showText = true,
  className
}: NewChatButtonProps) {
  const { createConversation, isLoading } = useChat();

  const handleNewChat = async () => {
    await createConversation();
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleNewChat}
      disabled={isLoading}
      className={className}
      aria-label="Start new conversation"
    >
      <Plus className={showText ? "h-4 w-4 mr-2" : "h-4 w-4"} />
      {showText && "New Chat"}
    </Button>
  );
}
