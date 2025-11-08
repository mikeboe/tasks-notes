import { useChat } from '@/context/ChatContext';
import { ChatHeader } from './ChatHeader';
import { ChatConversation } from './ChatConversation';
import { ChatInput } from './ChatInput';
import { cn } from '@/lib/utils';

export function ChatContainer() {
  const { isOpen, isDocked } = useChat();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-background border shadow-xl',
        'transition-all duration-300 ease-in-out',
        isDocked
          ? 'fixed right-0 top-0 h-screen w-[400px] border-l z-40'
          : 'fixed bottom-6 right-6 w-[400px] h-[600px] rounded-lg z-50',
        'sm:w-[400px]', // Desktop
        'max-sm:!fixed max-sm:!inset-0 max-sm:!w-full max-sm:!h-full max-sm:!rounded-none max-sm:!bottom-0 max-sm:!right-0' // Mobile full screen
      )}
    >
      <ChatHeader />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatConversation />
        <ChatInput />
      </div>
    </div>
  );
}
