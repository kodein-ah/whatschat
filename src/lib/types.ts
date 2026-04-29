export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type MessageType = "text" | "image" | "file" | "voice";

export interface User {
  id: string | number;
  name: string;
  email?: string;
  phone_number?: string;
  avatar?: string | null;
  status?: string;
  online?: boolean;
  last_seen?: string;
}

export interface Attachment {
  url?: string;
  name?: string;
  size?: number;
  mime?: string;
  fileId?: string;
  optimisticUrl?: string;
}

export interface Message {
  id: string | number;
  conversation_id: string | number;
  sender_id: string | number;
  sender?: User | null;
  type: MessageType;
  body: string;
  attachment?: Attachment;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_mime?: string;
  duration?: number;
  created_at: string;
  status: MessageStatus;
}

export interface Conversation {
  id: string | number;
  is_group: boolean;
  name: string;
  avatar?: string | null;
  participants: User[];
  messages?: Message[];
  last_message?: Message | null;
  unread_count: number;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
}