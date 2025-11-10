import { config } from "@/config";
import { authenticatedRequest } from "./auth-api";

const API_BASE_URL = config.apiUrl || "http://localhost:3000";
const CHAT_API_BASE = `${API_BASE_URL}/chat`;

// Types matching backend
export type LlmModelName = "o3-mini" | "gpt-4o" | "gpt-4o-mini" | "gpt-4.1" | "gpt-4.1-mini";
export type MessageRole = "user" | "assistant" | "system";
export type MessageType = "content" | "tool_call" | "tool_result";
export type ChatMode = "ask" | "agent";

export interface ChatContext {
  route?: string;
  noteIds?: string[];
  teamId?: string;
  collectionId?: string;
}

export interface MessageMetadata {
  model?: string;
  reasoning?: string;
  sources?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  tool_name?: string;
  tool_args?: Record<string, any>;
  tool_result?: any;
  error?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  parentId?: string;
  role: MessageRole;
  content: string;
  messageType: MessageType;
  metadata?: MessageMetadata;
  order: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  teamId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithPreview extends Conversation {
  messageCount: number;
  lastMessagePreview: string;
}

// SSE Event types
export type ChatEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "content"; delta: string }
  | { type: "reasoning"; content: string }
  | { type: "tool_call_start"; name: string; id?: string }
  | { type: "tool_call"; name: string; args: Record<string, any>; id?: string }
  | { type: "tool_result"; name: string; result: any }
  | { type: "sources"; sources: Array<{ id: string; title: string; type: string }> }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ChatApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ChatApiError";
  }
}

/**
 * Chat API Client
 */
export class ChatAPI {
  /**
   * Send a message in "ask" mode (no tools)
   */
  async sendAskMessage(
    message: string,
    model: LlmModelName,
    conversationId?: string,
    context?: ChatContext,
    onEvent?: (event: ChatEvent) => void
  ): Promise<void> {
    return this.streamMessage("/ask", message, model, conversationId, context, onEvent);
  }

  /**
   * Send a message in "agent" mode (with tools)
   */
  async sendAgentMessage(
    message: string,
    model: LlmModelName,
    conversationId?: string,
    context?: ChatContext,
    onEvent?: (event: ChatEvent) => void
  ): Promise<void> {
    return this.streamMessage("/agent", message, model, conversationId, context, onEvent);
  }

  /**
   * Generic streaming message handler
   */
  private async streamMessage(
    endpoint: string,
    message: string,
    model: LlmModelName,
    conversationId?: string,
    context?: ChatContext,
    onEvent?: (event: ChatEvent) => void
  ): Promise<void> {
    const url = `${CHAT_API_BASE}${endpoint}`;

    const body = {
      message,
      model,
      conversationId: conversationId || null,
      context,
    };

    try {
      const response = await authenticatedRequest(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new ChatApiError(errorMessage, response.status);
      }

      // Read SSE stream
      await this.readSSEStream(response, onEvent);
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      throw new ChatApiError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    }
  }

  /**
   * Read and parse SSE stream
   */
  private async readSSEStream(
    response: Response,
    onEvent?: (event: ChatEvent) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new ChatApiError("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data) as ChatEvent;
              onEvent?.(event);

              // Stop if done or error
              if (event.type === "done" || event.type === "error") {
                return;
              }
            } catch (e) {
              console.error("Failed to parse SSE event:", e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get all conversations
   */
  async getConversations(
    teamId?: string,
    limit = 50,
    offset = 0
  ): Promise<{ conversations: ConversationWithPreview[]; total: number }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (teamId) {
      params.append("teamId", teamId);
    }

    const url = `${CHAT_API_BASE}/conversations?${params}`;

    try {
      const response = await authenticatedRequest(url);

      if (!response.ok) {
        throw new ChatApiError(`HTTP ${response.status}`, response.status);
      }

      const data: ApiResponse<{
        conversations: ConversationWithPreview[];
        total: number;
      }> = await response.json();

      if (!data.success || !data.data) {
        throw new ChatApiError(data.message || "Failed to get conversations");
      }

      return data.data;
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      throw new ChatApiError(
        error instanceof Error ? error.message : "Failed to get conversations"
      );
    }
  }

  /**
   * Get a specific conversation with messages
   */
  async getConversation(
    conversationId: string
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const url = `${CHAT_API_BASE}/conversations/${conversationId}`;

    try {
      const response = await authenticatedRequest(url);

      if (!response.ok) {
        throw new ChatApiError(`HTTP ${response.status}`, response.status);
      }

      const data: ApiResponse<{
        conversation: Conversation;
        messages: Message[];
      }> = await response.json();

      if (!data.success || !data.data) {
        throw new ChatApiError(data.message || "Failed to get conversation");
      }

      return data.data;
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      throw new ChatApiError(
        error instanceof Error ? error.message : "Failed to get conversation"
      );
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    title?: string,
    teamId?: string
  ): Promise<Conversation> {
    const url = `${CHAT_API_BASE}/conversations`;

    try {
      const response = await authenticatedRequest(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, teamId }),
      });

      if (!response.ok) {
        throw new ChatApiError(`HTTP ${response.status}`, response.status);
      }

      const data: ApiResponse<{ conversation: Conversation }> =
        await response.json();

      if (!data.success || !data.data) {
        throw new ChatApiError(data.message || "Failed to create conversation");
      }

      return data.data.conversation;
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      throw new ChatApiError(
        error instanceof Error ? error.message : "Failed to create conversation"
      );
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const url = `${CHAT_API_BASE}/conversations/${conversationId}`;

    try {
      const response = await authenticatedRequest(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new ChatApiError(`HTTP ${response.status}`, response.status);
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new ChatApiError(data.message || "Failed to delete conversation");
      }
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      throw new ChatApiError(
        error instanceof Error ? error.message : "Failed to delete conversation"
      );
    }
  }

  /**
   * Get messages for a conversation (paginated)
   */
  async getMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const url = `${CHAT_API_BASE}/conversations/${conversationId}/messages?${params}`;

    try {
      const response = await authenticatedRequest(url);

      if (!response.ok) {
        throw new ChatApiError(`HTTP ${response.status}`, response.status);
      }

      const data: ApiResponse<{
        messages: Message[];
        total: number;
        hasMore: boolean;
      }> = await response.json();

      if (!data.success || !data.data) {
        throw new ChatApiError(data.message || "Failed to get messages");
      }

      return data.data;
    } catch (error) {
      if (error instanceof ChatApiError) {
        throw error;
      }
      throw new ChatApiError(
        error instanceof Error ? error.message : "Failed to get messages"
      );
    }
  }
}

// Export singleton instance
export const chatAPI = new ChatAPI();
