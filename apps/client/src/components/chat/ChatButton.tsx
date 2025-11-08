import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useChat } from '@/context/ChatContext';
import { Button } from '@/components/ui/button';

export function ChatButton() {
  const { isOpen, isDocked, toggleChat } = useChat();
  const location = useLocation();

  // Don't show button if chat is docked or open
  if (isOpen || isDocked) {
    return null;
  }

  // Don't show button on the Index page (root path)
  if (location.pathname === '/') {
    return null;
  }

  return (
    <Button
      onClick={toggleChat}
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
      aria-label="Open AI Assistant"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
