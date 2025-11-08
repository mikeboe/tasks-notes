import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  chatAPI,
  type ChatMode,
  type LlmModelName,
  type Conversation,
  type ConversationWithPreview,
  type Message,
  type ChatEvent,
  type ChatContext as ChatContextType,
  ChatApiError,
} from '@/lib/chat-api';
import { useTeamContext } from '@/hooks/use-team-context';
import { toast } from 'react-hot-toast';

interface ChatState {
  // Conversations
  conversations: ConversationWithPreview[];
  currentConversation: Conversation | null;
  messages: Message[];

  // UI State
  isOpen: boolean;
  isDocked: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;

  // Settings
  chatMode: ChatMode;
  selectedModel: LlmModelName;

  // Current streaming state
  streamingMessageContent: string;
  streamingReasoning: string;
  streamingToolCalls: Array<{ name: string; args: Record<string, any> }>;
  streamingSources: Array<{ id: string; title: string; type: string }>;
}

interface ChatContextValue extends ChatState {
  // Actions
  sendMessage: (content: string, noteIds?: string[]) => Promise<void>;
  createConversation: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  toggleMode: () => void;
  setModel: (model: LlmModelName) => void;
  toggleChat: () => void;
  toggleDocked: () => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  IS_DOCKED: 'chat-is-docked',
  SELECTED_MODEL: 'chat-selected-model',
  CHAT_MODE: 'chat-mode',
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId } = useTeamContext();
  const location = useLocation();

  // Load persisted settings
  const [isDocked, setIsDocked] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.IS_DOCKED);
    return stored ? JSON.parse(stored) : false;
  });

  const [selectedModel, setSelectedModel] = useState<LlmModelName>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
    return (stored as LlmModelName) || 'gpt-4o-mini';
  });

  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_MODE);
    return (stored as ChatMode) || 'ask';
  });

  const [state, setState] = useState<ChatState>({
    conversations: [],
    currentConversation: null,
    messages: [],
    isOpen: false,
    isDocked,
    isStreaming: false,
    isLoading: false,
    error: null,
    chatMode,
    selectedModel,
    streamingMessageContent: '',
    streamingReasoning: '',
    streamingToolCalls: [],
    streamingSources: [],
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_DOCKED, JSON.stringify(isDocked));
  }, [isDocked]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_MODE, chatMode);
  }, [chatMode]);

  // Load conversations when teamId changes
  useEffect(() => {
    if (state.isOpen) {
      loadConversations();
    }
  }, [teamId]);

  /**
   * Load conversations
   */
  const loadConversations = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { conversations } = await chatAPI.getConversations(teamId || undefined);
      setState(prev => ({ ...prev, conversations, isLoading: false }));
    } catch (error) {
      const message = error instanceof ChatApiError ? error.message : 'Failed to load conversations';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
    }
  }, [teamId]);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const conversation = await chatAPI.createConversation(undefined, teamId || undefined);
      setState(prev => ({
        ...prev,
        currentConversation: conversation,
        messages: [],
        isLoading: false,
      }));

      // Reload conversations list
      await loadConversations();
    } catch (error) {
      const message = error instanceof ChatApiError ? error.message : 'Failed to create conversation';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
    }
  }, [teamId, loadConversations]);

  /**
   * Select a conversation
   */
  const selectConversation = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { conversation, messages } = await chatAPI.getConversation(id);
      setState(prev => ({
        ...prev,
        currentConversation: conversation,
        messages,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof ChatApiError ? error.message : 'Failed to load conversation';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
    }
  }, []);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await chatAPI.deleteConversation(id);

      // Update state
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.filter(c => c.id !== id),
        currentConversation: prev.currentConversation?.id === id ? null : prev.currentConversation,
        messages: prev.currentConversation?.id === id ? [] : prev.messages,
      }));

      toast.success('Conversation deleted');
    } catch (error) {
      const message = error instanceof ChatApiError ? error.message : 'Failed to delete conversation';
      toast.error(message);
    }
  }, []);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (content: string, noteIds?: string[]) => {
    if (!content.trim()) return;

    // Create conversation if none exists
    let conversationId = state.currentConversation?.id;
    if (!conversationId) {
      await createConversation();
      // Wait for state to update
      conversationId = state.currentConversation?.id;
    }

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: conversationId || '',
      role: 'user',
      content,
      messageType: 'content',
      order: state.messages.length,
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true,
      error: null,
      streamingMessageContent: '',
      streamingReasoning: '',
      streamingToolCalls: [],
      streamingSources: [],
    }));

    // Build context
    const context: ChatContextType = {
      route: location.pathname,
      noteIds,
      teamId: teamId || undefined,
    };

    // Stream response
    try {
      const onEvent = (event: ChatEvent) => {
        switch (event.type) {
          case 'conversation':
            // Update conversation ID if new
            if (!conversationId) {
              setState(prev => ({
                ...prev,
                currentConversation: {
                  ...prev.currentConversation!,
                  id: event.conversationId,
                },
              }));
            }
            break;

          case 'content':
            setState(prev => ({
              ...prev,
              streamingMessageContent: prev.streamingMessageContent + event.delta,
            }));
            break;

          case 'reasoning':
            setState(prev => ({
              ...prev,
              streamingReasoning: event.content,
            }));
            break;

          case 'tool_call_start':
            // Tool call started - can show a loading indicator
            setState(prev => ({
              ...prev,
              streamingToolCalls: [
                ...prev.streamingToolCalls,
                { name: event.name, args: {} },
              ],
            }));
            break;

          case 'tool_call':
            // Complete tool call with args - update or add
            setState(prev => {
              const existingIndex = prev.streamingToolCalls.findIndex(tc => tc.name === event.name);
              const updatedToolCalls = [...prev.streamingToolCalls];

              if (existingIndex >= 0) {
                updatedToolCalls[existingIndex] = { name: event.name, args: event.args };
              } else {
                updatedToolCalls.push({ name: event.name, args: event.args });
              }

              return {
                ...prev,
                streamingToolCalls: updatedToolCalls,
              };
            });
            break;

          case 'tool_result':
            // Tool result is handled internally, just log for now
            console.log('Tool result:', event.name, event.result);
            break;

          case 'sources':
            setState(prev => ({
              ...prev,
              streamingSources: event.sources,
            }));
            break;

          case 'done':
            // Add assistant message using current state from prev
            setState(prev => {
              const assistantMessage: Message = {
                id: `temp-${Date.now()}-assistant`,
                conversationId: conversationId || '',
                role: 'assistant',
                content: prev.streamingMessageContent,
                messageType: 'content',
                metadata: {
                  model: selectedModel,
                  reasoning: prev.streamingReasoning || undefined,
                  sources: prev.streamingSources.length > 0 ? prev.streamingSources : undefined,
                },
                order: prev.messages.length + 1,
                createdAt: new Date().toISOString(),
              };

              return {
                ...prev,
                messages: [...prev.messages, assistantMessage],
                isStreaming: false,
                streamingMessageContent: '',
                streamingReasoning: '',
                streamingToolCalls: [],
                streamingSources: [],
              };
            });

            // Reload conversations to update preview
            loadConversations();
            break;

          case 'error':
            setState(prev => ({
              ...prev,
              error: event.message,
              isStreaming: false,
            }));
            toast.error(event.message);
            break;
        }
      };

      if (chatMode === 'ask') {
        await chatAPI.sendAskMessage(content, selectedModel, conversationId, context, onEvent);
      } else {
        await chatAPI.sendAgentMessage(content, selectedModel, conversationId, context, onEvent);
      }
    } catch (error) {
      const message = error instanceof ChatApiError ? error.message : 'Failed to send message';
      setState(prev => ({
        ...prev,
        error: message,
        isStreaming: false,
      }));
      toast.error(message);
    }
  }, [
    state.currentConversation,
    state.messages,
    state.streamingMessageContent,
    state.streamingReasoning,
    state.streamingSources,
    chatMode,
    selectedModel,
    teamId,
    location.pathname,
    createConversation,
    loadConversations,
  ]);

  /**
   * Toggle chat mode
   */
  const toggleMode = useCallback(() => {
    setChatMode(prev => {
      const newMode = prev === 'ask' ? 'agent' : 'ask';
      setState(s => ({ ...s, chatMode: newMode }));
      return newMode;
    });
  }, []);

  /**
   * Set model
   */
  const setModel = useCallback((model: LlmModelName) => {
    setSelectedModel(model);
    setState(prev => ({ ...prev, selectedModel: model }));
  }, []);

  /**
   * Toggle chat open/closed
   */
  const toggleChat = useCallback(() => {
    setState(prev => {
      const newIsOpen = !prev.isOpen;
      // Load conversations when opening
      if (newIsOpen && prev.conversations.length === 0) {
        loadConversations();
      }
      return { ...prev, isOpen: newIsOpen };
    });
  }, [loadConversations]);

  /**
   * Toggle docked mode
   */
  const toggleDocked = useCallback(() => {
    setIsDocked(prev => {
      const newIsDocked = !prev;
      setState(s => ({ ...s, isDocked: newIsDocked }));
      return newIsDocked;
    });
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: ChatContextValue = {
    ...state,
    sendMessage,
    createConversation,
    selectConversation,
    deleteConversation,
    loadConversations,
    toggleMode,
    setModel,
    toggleChat,
    toggleDocked,
    clearError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
