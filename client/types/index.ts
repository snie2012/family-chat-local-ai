export interface User {
  id: string;
  username: string;
  displayName: string;
  isBot: boolean;
  isAdmin: boolean;
  avatarColor: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isStreaming: boolean;
  thinkingBody?: string;   // accumulated thinking tokens (client-only, not persisted)
  isThinking?: boolean;    // true while thinking tokens are still arriving
  createdAt: string;
  sender: User;
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  members: User[];
  lastMessage: Message | null;
}

export interface AuthPayload {
  token: string;
  user: User;
}
