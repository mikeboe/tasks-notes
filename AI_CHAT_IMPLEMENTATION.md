# AI Chat Feature Implementation Plan

## Overview

This document outlines the implementation plan for adding an AI chat assistant to Task Notes. The feature will be context-aware, able to reference and manipulate documents, and provide both simple Q&A ("ask" mode) and agentic capabilities ("agent" mode) similar to GitHub Copilot or Claude Code.

## Features

### Core Capabilities
- **Ask Mode**: Simple Q&A with direct LLM invocation, read-only access to documents
- **Agent Mode**: Full agentic capabilities with tool calling, can search and fetch notes
- **Context Awareness**: Understands current UI location, selected notes, and workspace
- **Streaming Responses**: Real-time character-by-character streaming with tool call visibility
- **Conversation Persistence**: All conversations stored in database with message history
- **Team Integration**: Works in both personal and team workspaces
- **Flexible UI**: Floating button, expandable panel, or docked sidebar (resizable)

### User Experience
- Floating button on bottom-right to open assistant
- Mode switcher between "ask" and "agent"
- Model selection (GPT-4, Claude, etc.)
- Conversation history sidebar
- Real-time streaming with tool call visualization
- Reasoning display (collapsible)
- Source citations from notes

---

## Backend Implementation

### 1. Database Schema

**File:** `apps/api/src/schema/chat-schema.ts`

#### Conversations Table
```typescript
{
  id: uuid (primary key)
  user_id: uuid (foreign key to users) - NOT NULL
  team_id: uuid (foreign key to teams) - NULLABLE
  title: string (nullable, auto-generated from first message)
  created_at: timestamp
  updated_at: timestamp
}

Indexes:
- user_id, team_id (composite for filtering)
- created_at (for sorting)
```

#### Messages Table (Linked List Structure)
```typescript
{
  id: uuid (primary key)
  conversation_id: uuid (foreign key to conversations) - NOT NULL
  parent_id: uuid (foreign key to messages) - NULLABLE
  role: enum ('user', 'assistant', 'system')
  content: text
  message_type: enum ('content', 'tool_call', 'tool_result')
  metadata: jsonb {
    model?: string
    reasoning?: string
    sources?: Array<{id: string, title: string, type: string}>
    tool_name?: string
    tool_args?: object
    tool_result?: any
    error?: string
  }
  created_at: timestamp
  order: integer (for sorting within conversation)
}

Indexes:
- conversation_id, order (composite for efficient retrieval)
- parent_id (for threading support)
```

**Relations:**
- Conversations belong to user (required) and team (optional)
- Messages belong to conversation
- Messages can have parent message (for future threading)
- On conversation delete: CASCADE delete all messages

---

### 2. Agent Tools

**Directory:** `apps/api/src/agent/tools/`

#### Notes Tools (`notes-tools.ts`)

**Tool: getNoteById**
```typescript
Purpose: Fetch a single note by ID
Input: { noteId: string, teamId?: string }
Returns: Full note object with content
Access Control: Check user has access to note
```

**Tool: searchNotes**
```typescript
Purpose: Search notes using searchable_content field
Input: { query: string, teamId?: string, limit?: number }
Returns: Array of matching notes with excerpts
Uses: Full-text search on searchable_content
```

**Tool: listNotes**
```typescript
Purpose: Get all notes with optional filters
Input: {
  teamId?: string,
  parentId?: string,
  archived?: boolean,
  limit?: number,
  offset?: number
}
Returns: Array of notes (without full content, just metadata)
```

**Tool: getNotesByTag**
```typescript
Purpose: Filter notes by tag name
Input: { tagName: string, teamId?: string }
Returns: Array of notes with that tag
Uses: Join with note_tags and tags tables
```

**Tool: getRecentNotes**
```typescript
Purpose: Get recently modified notes
Input: { teamId?: string, limit?: number }
Returns: Array of notes sorted by updated_at
Default limit: 10
```

**Tool: getNoteHierarchy**
```typescript
Purpose: Get note with its children and parent
Input: { noteId: string, teamId?: string }
Returns: {
  note: Note,
  parent?: Note,
  children: Note[]
}
```

**Tool: getNoteContent**
```typescript
Purpose: Get full content of a note
Input: { noteId: string, teamId?: string }
Returns: Full note content (for large notes)
```

#### Implementation Notes
- All tools must check user permissions (personal vs team access)
- All tools must respect archived status unless explicitly requested
- Tools should validate inputs and return structured errors
- Search results should include relevance scoring
- Large content should be truncated with "fetch full note" suggestion

---

### 3. API Routes

**File:** `apps/api/src/routes/chat.ts`

#### POST `/api/chat/ask`
```typescript
Request Body: {
  conversationId?: string  // null for new conversation
  message: string
  model: LlmModelName
  context?: {
    route?: string         // Current UI route
    noteIds?: string[]     // Selected notes to add to context
    teamId?: string        // Current team context
  }
}

Response: SSE Stream
Event types:
- data: {"type": "content", "delta": "text chunk"}
- data: {"type": "done"}
- data: {"type": "error", "message": "error text"}

Behavior:
- Create conversation if conversationId is null
- Fetch selected notes and add to context
- Direct LLM invocation (no agent)
- Stream text responses character by character
- Save user message and assistant message to DB
- Return conversationId in first event
```

#### POST `/api/chat/agent`
```typescript
Request Body: {
  conversationId?: string
  message: string
  model: LlmModelName
  context?: {
    route?: string
    noteIds?: string[]
    teamId?: string
  }
}

Response: SSE Stream
Event types:
- data: {"type": "conversation", "conversationId": "uuid"}
- data: {"type": "content", "delta": "text chunk"}
- data: {"type": "reasoning", "content": "thinking process"}
- data: {"type": "tool_call", "name": "searchNotes", "args": {...}}
- data: {"type": "tool_result", "name": "searchNotes", "result": {...}}
- data: {"type": "sources", "sources": [{id, title, type}]}
- data: {"type": "done"}
- data: {"type": "error", "message": "error text"}

Behavior:
- Create conversation if needed
- Invoke deep-agent with notes tools
- Stream all agent events (tool calls, reasoning, content)
- Save all messages including tool calls to DB
- Extract and format sources from tool results
```

#### GET `/api/chat/conversations`
```typescript
Query Params: {
  teamId?: string
  limit?: number (default: 50)
  offset?: number (default: 0)
}

Response: {
  success: true,
  data: {
    conversations: Array<{
      id: string
      title: string
      created_at: string
      updated_at: string
      message_count: number
      last_message_preview: string
    }>,
    total: number
  }
}

Behavior:
- Filter by user_id and optional team_id
- Sort by updated_at DESC
- Include message count and preview
```

#### GET `/api/chat/conversations/:id`
```typescript
Response: {
  success: true,
  data: {
    conversation: Conversation
    messages: Message[]
  }
}

Behavior:
- Check user has access to conversation
- Return full conversation with all messages
- Messages sorted by order ASC
```

#### POST `/api/chat/conversations`
```typescript
Request Body: {
  title?: string
  teamId?: string
}

Response: {
  success: true,
  data: { conversation: Conversation }
}

Behavior:
- Create new conversation for user
- Title optional, can be auto-generated later
```

#### DELETE `/api/chat/conversations/:id`
```typescript
Response: {
  success: true,
  message: "Conversation deleted"
}

Behavior:
- Check user owns conversation
- CASCADE delete all messages
```

#### GET `/api/chat/conversations/:id/messages`
```typescript
Query Params: {
  limit?: number (default: 50)
  offset?: number (default: 0)
}

Response: {
  success: true,
  data: {
    messages: Message[],
    total: number,
    hasMore: boolean
  }
}

Behavior:
- Paginated message retrieval
- Ordered by order ASC
- Include metadata (tool calls, reasoning, sources)
```

---

### 4. Services

**File:** `apps/api/src/services/chat-service.ts`

#### ChatService Class

**Method: streamAskResponse**
```typescript
async streamAskResponse(
  userId: string,
  conversationId: string | null,
  message: string,
  model: LlmModelName,
  context: ChatContext,
  res: Response
): Promise<void>

Behavior:
- Create/load conversation
- Fetch context notes if provided
- Build prompt with context
- Invoke LLM via useLLM()
- Stream response as SSE events
- Save user message and assistant message to DB
- Handle errors gracefully
```

**Method: streamAgentResponse**
```typescript
async streamAgentResponse(
  userId: string,
  conversationId: string | null,
  message: string,
  model: LlmModelName,
  context: ChatContext,
  res: Response
): Promise<void>

Behavior:
- Create/load conversation
- Fetch context notes if provided
- Build agent prompt
- Invoke deep-agent with notes tools
- Stream all events (content, tool calls, reasoning)
- Parse and format tool calls for frontend
- Extract sources from tool results
- Save all messages/tool calls to DB
- Handle errors and tool failures
```

**Method: createConversation**
```typescript
async createConversation(
  userId: string,
  teamId: string | null,
  title?: string
): Promise<Conversation>
```

**Method: getConversations**
```typescript
async getConversations(
  userId: string,
  teamId: string | null,
  limit: number,
  offset: number
): Promise<{ conversations: Conversation[], total: number }>
```

**Method: getConversation**
```typescript
async getConversation(
  conversationId: string,
  userId: string
): Promise<{ conversation: Conversation, messages: Message[] }>
```

**Method: saveMessage**
```typescript
async saveMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  messageType: MessageType,
  metadata?: object,
  parentId?: string
): Promise<Message>
```

**Method: deleteConversation**
```typescript
async deleteConversation(
  conversationId: string,
  userId: string
): Promise<void>
```

**Method: updateConversationTitle**
```typescript
async updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void>

Behavior:
- Auto-generate title from first user message
- Use LLM to create concise title (max 50 chars)
```

---

### 5. Streaming Implementation

**SSE Format:**
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// Send events:
res.write(`data: ${JSON.stringify(event)}\n\n`);

// End stream:
res.write(`data: {"type": "done"}\n\n`);
res.end();
```

**Event Types:**
```typescript
type ChatEvent =
  | { type: 'conversation', conversationId: string }
  | { type: 'content', delta: string }
  | { type: 'reasoning', content: string }
  | { type: 'tool_call', name: string, args: object }
  | { type: 'tool_result', name: string, result: any }
  | { type: 'sources', sources: Source[] }
  | { type: 'done' }
  | { type: 'error', message: string };
```

**Error Handling:**
- Catch all errors and send error event
- Close stream gracefully
- Mark conversation with error state
- Log errors for debugging

---

## Frontend Implementation

### 1. Chat Context

**File:** `apps/client/src/context/ChatContext.tsx`

```typescript
interface ChatContextType {
  // State
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  isStreaming: boolean
  chatMode: 'ask' | 'agent'
  selectedModel: LlmModelName
  isOpen: boolean
  isDocked: boolean
  isLoading: boolean
  error: string | null

  // Actions
  sendMessage: (content: string, noteIds?: string[]) => Promise<void>
  createConversation: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  loadConversations: () => Promise<void>
  toggleMode: () => void
  setModel: (model: LlmModelName) => void
  toggleChat: () => void
  toggleDocked: () => void
  clearError: () => void
}
```

**Implementation Details:**
- Use React Context + useReducer for state management
- Persist isDocked and selectedModel to localStorage
- Load conversations on mount
- Handle streaming updates in real-time
- Manage optimistic UI updates
- Error recovery and retry logic

---

### 2. Chat API Client

**File:** `apps/client/src/lib/chat-api.ts`

```typescript
class ChatAPI {
  private baseUrl: string;

  async sendMessage(
    conversationId: string | null,
    message: string,
    mode: 'ask' | 'agent',
    model: LlmModelName,
    context?: ChatContext,
    onEvent?: (event: ChatEvent) => void
  ): Promise<void>

  async getConversations(
    teamId?: string,
    limit?: number,
    offset?: number
  ): Promise<{ conversations: Conversation[], total: number }>

  async getConversation(id: string): Promise<{
    conversation: Conversation,
    messages: Message[]
  }>

  async createConversation(
    teamId?: string,
    title?: string
  ): Promise<Conversation>

  async deleteConversation(id: string): Promise<void>

  async getMessages(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<{ messages: Message[], total: number, hasMore: boolean }>
}
```

**Streaming Implementation:**
```typescript
private async streamRequest(
  url: string,
  body: object,
  onEvent: (event: ChatEvent) => void
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const event = JSON.parse(data);
          onEvent(event);
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      }
    }
  }
}
```

---

### 3. UI Components

**Directory:** `apps/client/src/components/chat/`

#### ChatButton.tsx
```typescript
// Floating button on bottom-right
// Shows unread indicator if needed
// Opens chat on click
// Hidden when chat is docked
```

#### ChatContainer.tsx
```typescript
// Main wrapper component
// Handles floating vs docked modes
// Manages resize for docked mode
// Mobile: full-screen overlay
// Desktop: floating panel or right sidebar

Modes:
- Closed: Only button visible
- Floating: 400px x 600px panel, bottom-right
- Docked: Right sidebar, resizable (300px - 800px)

Props:
- isOpen: boolean
- isDocked: boolean
- onClose: () => void
- onDockToggle: () => void
```

#### ChatHeader.tsx
```typescript
// Top bar with:
// - Conversation title
// - Mode switcher (Ask / Agent)
// - Dock/undock button
// - Minimize button
// - Close button

Props:
- mode: 'ask' | 'agent'
- onModeChange: (mode) => void
- isDocked: boolean
- onDockToggle: () => void
- onClose: () => void
```

#### ConversationList.tsx
```typescript
// Sidebar/dropdown with conversation history
// Search/filter conversations
// Delete conversation action
// New conversation button
// Show last message preview
// Highlight current conversation

Props:
- conversations: Conversation[]
- currentId: string | null
- onSelect: (id: string) => void
- onDelete: (id: string) => void
- onNew: () => void
```

#### ChatConversation.tsx
```typescript
// Scrollable message list
// Auto-scroll to bottom during streaming
// Manual scroll detection
// Loading skeleton for history
// Empty state

Props:
- messages: Message[]
- isStreaming: boolean
- isLoading: boolean
```

#### ChatMessage.tsx
```typescript
// Individual message display
// User vs Assistant styling
// Markdown rendering for content
// Timestamp
// Copy button
// Contains sub-components:
//   - ChatToolCall
//   - ChatReasoning

Props:
- message: Message
- isStreaming: boolean
```

#### ChatToolCall.tsx
```typescript
// Display tool call information
// Expandable/collapsible
// Show tool name, args, and result
// Visual indication of tool execution
// Error states

Props:
- toolName: string
- args: object
- result?: any
- error?: string
- isExecuting: boolean
```

#### ChatReasoning.tsx
```typescript
// Collapsible reasoning display
// Auto-expand during streaming
// Manual toggle after complete
// Markdown rendering

Props:
- content: string
- isStreaming: boolean
- defaultExpanded?: boolean
```

#### ChatInput.tsx
```typescript
// Text input with auto-resize
// Model selector dropdown
// Send button (disabled when empty)
// Character count (optional)
// File/note attachment button (future)
// Keyboard shortcuts:
//   - Enter: Send
//   - Shift+Enter: New line
//   - Esc: Clear input

Props:
- mode: 'ask' | 'agent'
- selectedModel: LlmModelName
- onModelChange: (model) => void
- onSend: (message: string) => void
- disabled: boolean
```

#### ChatSettings.tsx
```typescript
// Settings panel (optional)
// Model selection
// Temperature/parameters
// Context settings
// Keyboard shortcuts help

Props:
- model: LlmModelName
- onModelChange: (model) => void
```

---

### 4. Component Hierarchy

```
<ChatButton onClick={toggleChat} />

<ChatContainer isOpen={isOpen} isDocked={isDocked}>
  <ChatHeader
    mode={mode}
    onModeChange={toggleMode}
    isDocked={isDocked}
    onDockToggle={toggleDocked}
    onClose={toggleChat}
  />

  <div className="chat-body">
    {showConversationList && (
      <ConversationList
        conversations={conversations}
        currentId={currentConversation?.id}
        onSelect={selectConversation}
        onDelete={deleteConversation}
        onNew={createConversation}
      />
    )}

    <div className="chat-main">
      <ChatConversation
        messages={messages}
        isStreaming={isStreaming}
        isLoading={isLoading}
      >
        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg.id === lastMessageId}
          >
            {msg.message_type === 'tool_call' && (
              <ChatToolCall
                toolName={msg.metadata.tool_name}
                args={msg.metadata.tool_args}
                result={msg.metadata.tool_result}
                error={msg.metadata.error}
              />
            )}
            {msg.metadata.reasoning && (
              <ChatReasoning
                content={msg.metadata.reasoning}
                isStreaming={isStreaming}
              />
            )}
          </ChatMessage>
        ))}
      </ChatConversation>

      <ChatInput
        mode={mode}
        selectedModel={selectedModel}
        onModelChange={setModel}
        onSend={sendMessage}
        disabled={isStreaming}
      />
    </div>
  </div>
</ChatContainer>
```

---

### 5. Styling & Layout

#### Floating Mode
```css
.chat-floating {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 400px;
  height: 600px;
  max-height: calc(100vh - 100px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}
```

#### Docked Mode
```css
.chat-docked {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 400px;
  border-left: 1px solid var(--border);
  z-index: 100;
  resize: horizontal;
  min-width: 300px;
  max-width: 800px;
}
```

#### Mobile
```css
@media (max-width: 768px) {
  .chat-container {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
}
```

#### Button
```css
.chat-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 999;
}
```

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Create database schema and run migrations
2. Implement notes tools for agent
3. Create ChatService with basic functionality
4. Implement `/chat/ask` endpoint with streaming
5. Test streaming with simple responses

### Phase 2: Agent Integration
1. Integrate notes tools with deep-agent
2. Implement `/chat/agent` endpoint
3. Add tool call streaming and formatting
4. Test agent with note search and retrieval
5. Add reasoning extraction

### Phase 3: Conversation Management
1. Implement conversation CRUD endpoints
2. Add message persistence
3. Implement conversation listing
4. Add auto-title generation
5. Test full conversation flow

### Phase 4: Frontend Foundation
1. Create ChatContext
2. Implement ChatAPI client with streaming
3. Build basic ChatContainer (floating only)
4. Implement ChatMessage and ChatConversation
5. Add ChatInput with send functionality

### Phase 5: Advanced UI
1. Add docked mode with resize
2. Implement ConversationList
3. Add ChatToolCall and ChatReasoning components
4. Implement mode switcher (ask/agent)
5. Add model selection

### Phase 6: Polish & Features
1. Mobile responsive design
2. Keyboard shortcuts
3. Error handling and retry
4. Loading states and skeletons
5. Empty states and onboarding
6. Context awareness (current route, selected notes)
7. Source citations and links

### Phase 7: Testing & Optimization
1. Test streaming performance
2. Test with long conversations
3. Test tool calling reliability
4. Mobile testing
5. Accessibility testing
6. Performance optimization

---

## Technical Decisions

### Why SSE over WebSocket?
- Simpler implementation for one-way streaming
- Built-in reconnection in browsers
- Works with standard HTTP/HTTPS
- Easier to debug and monitor

### Why Linked List for Messages?
- Future-proof for threading support
- Efficient retrieval with order field
- Allows for message relationships
- Supports branching conversations

### Why Two Modes (Ask vs Agent)?
- Clear user expectations
- Performance: Ask mode is faster
- Safety: Agent mode has more control
- Flexibility: Choose based on task

### Why Separate Tool Components?
- Modularity and reusability
- Different tool types need different display
- Easier to test and maintain
- Better user experience with specialized views

### Why Context-Aware?
- Understands user's current task
- Can reference visible notes
- Proactive suggestions
- Better relevance in responses

---

## Security Considerations

1. **Authentication**: All endpoints require auth via JWT or API key
2. **Authorization**: Check user/team access for all resources
3. **Input Validation**: Sanitize all user inputs
4. **Rate Limiting**: Prevent abuse of streaming endpoints
5. **Content Safety**: Filter harmful content in responses
6. **Tool Permissions**: Tools respect user access controls
7. **Data Privacy**: Conversations are user/team scoped
8. **SQL Injection**: Use parameterized queries (Drizzle handles this)

---

## Performance Considerations

1. **Streaming Chunks**: Send reasonable chunk sizes (not character-by-character over network)
2. **Database Queries**: Index frequently queried fields
3. **Message Loading**: Paginate long conversations
4. **Context Size**: Limit notes added to context
5. **Tool Results**: Truncate large results
6. **Frontend Rendering**: Use virtual scrolling for long conversations
7. **Caching**: Cache conversation lists
8. **Debouncing**: Debounce auto-save for draft messages

---

## Future Enhancements

1. **File Uploads**: Attach images/documents to messages
2. **Voice Input**: Speech-to-text for messages
3. **Message Threading**: Reply to specific messages
4. **Conversation Sharing**: Share conversations with team
5. **Export**: Export conversations as markdown
6. **Templates**: Pre-built prompt templates
7. **Shortcuts**: Quick actions for common tasks
8. **Task Creation**: Create tasks directly from chat
9. **Note Creation**: Create notes from responses
10. **Multi-Agent**: Multiple specialized agents
11. **Memory**: Long-term memory across conversations
12. **Feedback**: Thumbs up/down on responses
13. **Regenerate**: Regenerate last response
14. **Edit Message**: Edit and resend messages
15. **Code Execution**: Run code snippets safely

---

## Success Metrics

1. **Engagement**: Number of conversations per user
2. **Retention**: Users returning to chat feature
3. **Satisfaction**: User feedback and ratings
4. **Performance**: Average response time
5. **Accuracy**: Successful tool calls and note retrieval
6. **Adoption**: Percentage of users using chat
7. **Usage Patterns**: Ask vs Agent mode distribution

---

## Appendix

### Example Tool Call Flow

```
User: "Find all notes about the project roadmap"

1. Frontend sends to /chat/agent
2. Agent receives prompt
3. Agent decides to call searchNotes tool
4. Stream: { type: 'tool_call', name: 'searchNotes', args: { query: 'project roadmap' } }
5. Tool executes, finds 5 notes
6. Stream: { type: 'tool_result', name: 'searchNotes', result: [...5 notes...] }
7. Agent synthesizes response
8. Stream: { type: 'content', delta: 'I found 5 notes about the project roadmap...' }
9. Stream: { type: 'sources', sources: [...5 notes metadata...] }
10. Stream: { type: 'done' }
11. All saved to database
```

### Example Context Object

```typescript
{
  route: '/note/abc-123',           // User is viewing a note
  noteIds: ['abc-123', 'def-456'],  // Current note + related
  teamId: 'team-789',               // Working in team context
  recentNotes: [...],               // Last 5 viewed notes
  assignedTasks: [...]              // User's assigned tasks
}
```

### Example Conversation in Database

```
Conversation:
  id: conv-001
  user_id: user-123
  team_id: team-789
  title: "Project roadmap discussion"

Messages:
  1. id: msg-001, order: 0, role: user, content: "Find notes about roadmap"
  2. id: msg-002, order: 1, role: assistant, message_type: tool_call, metadata: { tool_name: 'searchNotes', ... }
  3. id: msg-003, order: 2, role: assistant, message_type: tool_result, metadata: { tool_result: [...] }
  4. id: msg-004, order: 3, role: assistant, message_type: content, content: "I found 5 notes..."
```

---

## Questions & Decisions Needed

1. **Rate Limits**: What limits for chat API? (e.g., 50 messages/hour per user)
2. **Context Window**: Max number of notes to include in context? (e.g., 10 notes)
3. **Conversation Limit**: Max conversations per user? (e.g., 100)
4. **Message History**: How far back to load? (e.g., last 100 messages)
5. **Model Costs**: Which models to enable? Budget per user?
6. **Tool Permissions**: Should agent be able to modify notes? (Start with read-only)
7. **Streaming Timeout**: Max time for streaming response? (e.g., 2 minutes)
8. **Mobile UX**: Full-screen only or try to fit floating mode?

---

## Implementation Checklist

### Backend
- [ ] Create chat-schema.ts with conversations and messages tables
- [ ] Generate and apply database migration
- [ ] Implement notes-tools.ts with 7 tool functions
- [ ] Create ChatService class with streaming methods
- [ ] Implement /chat/ask endpoint
- [ ] Implement /chat/agent endpoint
- [ ] Implement conversation CRUD endpoints
- [ ] Add authentication middleware to all routes
- [ ] Add team authorization checks
- [ ] Test streaming responses
- [ ] Test tool calling
- [ ] Add error handling
- [ ] Add logging

### Frontend
- [ ] Create ChatContext with state management
- [ ] Implement ChatAPI client with streaming
- [ ] Create ChatButton component
- [ ] Create ChatContainer component (floating mode)
- [ ] Create ChatHeader component
- [ ] Create ChatConversation component
- [ ] Create ChatMessage component
- [ ] Create ChatInput component
- [ ] Create ChatToolCall component
- [ ] Create ChatReasoning component
- [ ] Add docked mode to ChatContainer
- [ ] Add resize functionality for docked mode
- [ ] Create ConversationList component
- [ ] Add mode switcher (ask/agent)
- [ ] Add model selection
- [ ] Implement auto-scroll behavior
- [ ] Add keyboard shortcuts
- [ ] Add mobile responsive styles
- [ ] Test streaming UI updates
- [ ] Add error handling and retry
- [ ] Add loading states

### Integration
- [ ] Test end-to-end conversation flow
- [ ] Test with multiple models
- [ ] Test tool calling from UI
- [ ] Test conversation persistence
- [ ] Test team vs personal context
- [ ] Test mobile experience
- [ ] Accessibility audit
- [ ] Performance testing
- [ ] Error recovery testing

---

*This implementation plan is subject to change based on technical discoveries and user feedback during development.*
