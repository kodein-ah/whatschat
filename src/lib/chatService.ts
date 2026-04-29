import { api } from "./api";
import type { Conversation, Message, User } from "./types";
import { mockConversations, mockMessages, mockMe } from "./mockData";

const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== "false";

const mockStore: Record<string, Message[]> = JSON.parse(
  JSON.stringify(mockMessages)
);

export const chatService = {
  /**
   * ✅ Get current user profile
   */
  async me(): Promise<User> {
    if (USE_MOCK) return mockMe;
    
    try {
      const { data } = await api.get<User>("/me");
      console.log("✅ [Me] Fetched current user:", data);
      return data;
    } catch (error) {
      console.error("❌ [Me] Error:", error);
      throw error;
    }
  },

  /**
   * ✅ Get all conversations for current user
   */
  async listConversations(): Promise<Conversation[]> {
    if (USE_MOCK) {
      console.log("[Mock] Returning mock conversations");
      return mockConversations;
    }

    try {
      const { data } = await api.get<any[]>("/conversations");

      console.log("✅ [ListConversations] Raw response:", data);

      if (!Array.isArray(data)) {
        console.warn("[ListConversations] Response is not array:", data);
        return [];
      }

      const conversations = data.map(c => ({
        ...c,
        id: c.id.toString(),
        participants: c.participants ? c.participants.map((p: any) => ({
          ...p,
          id: p.id.toString(),
          avatar: p.avatar || null
        })) : [],
        is_group: c.is_group || false,
        last_message: c.last_message || null,
        unread_count: c.unread_count || 0,
        updated_at: c.updated_at || new Date().toISOString()
      }));

      console.log("✅ [ListConversations] Formatted:", conversations);
      return conversations;

    } catch (error) {
      console.error("❌ [ListConversations] Error:", error);
      throw error;
    }
  },

  /**
   * ✅ Get messages from conversation
   */
  async listMessages(conversationId: string): Promise<Message[]> {
    if (USE_MOCK) {
      console.log(`[Mock] Returning mock messages for conversation ${conversationId}`);
      return mockStore[conversationId] ?? [];
    }

    try {
      // ✅ PERBAIKAN: Validasi conversationId
      if (!conversationId) {
        throw new Error("conversationId tidak boleh kosong");
      }

      const { data } = await api.get<any[]>(
        `/conversations/${conversationId}/messages`
      );

      console.log(`✅ [ListMessages] Conversation ${conversationId}:`, data?.length || 0, "messages");

      if (!Array.isArray(data)) {
        console.warn(`[ListMessages] Response is not array:`, data);
        return [];
      }

      const messages = data.map(m => {
        // ✅ PERBAIKAN: Safe ID conversion
        const messageId = String(m.id || "");
        const senderId = String(m.sender_id || "");
        const convId = String(m.conversation_id || conversationId);

        return {
          ...m,
          id: messageId,
          sender_id: senderId,
          conversation_id: convId,
          // ✅ PERBAIKAN: Handle attachment format dari backend
          attachment: m.attachment ? {
            url: m.attachment.url || m.attachment_url,
            name: m.attachment.name || m.attachment_name || "file",
            size: m.attachment.size || m.attachment_size || 0,
            mime: m.attachment.mime || m.attachment_mime || "application/octet-stream",
            fileId: m.attachment.fileId || undefined
          } : undefined
        };
      });

      console.log(`✅ [ListMessages] Formatted ${messages.length} messages`);
      return messages;

    } catch (error: any) {
      console.error(`❌ [ListMessages] Error for conversation ${conversationId}:`, error?.message);
      throw error;
    }
  },

  /**
   * ✅ FIXED: Start new conversation with user
   * 
   * Flow:
   * 1. Validate userId exists & is numeric
   * 2. POST to /conversations/start dengan { user_id: userId }
   * 3. Backend creates conversation if not exists
   * 4. Return conversation dengan participants & messages
   */
  async startConversation(userId: string | number): Promise<Conversation> {
    if (USE_MOCK) {
      throw new Error("[Mock] Start conversation not available in mock mode");
    }

    try {
      // ✅ PERBAIKAN 1: Validasi input
      if (!userId) {
        console.error("❌ [StartConversation] userId tidak ada:", userId);
        throw new Error("User ID tidak valid");
      }

      // ✅ PERBAIKAN 2: Convert ke number jika string
      const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;

      if (isNaN(numericUserId)) {
        console.error("❌ [StartConversation] userId bukan number:", userId);
        throw new Error("User ID harus numeric");
      }

      console.log("📤 [StartConversation] Sending request with userId:", numericUserId);

      // ✅ PERBAIKAN 3: Call API dengan proper payload
      const { data } = await api.post<any>("/conversations/start", {
        user_id: numericUserId
      });

      console.log("✅ [StartConversation] Response received:", data);

      // ✅ PERBAIKAN 4: Format response dengan safety checks
      const conversation: Conversation = {
        id: String(data.id || ""),
        is_group: Boolean(data.is_group || false),
        name: String(data.name || "Chat"),
        avatar: data.avatar || null,
        participants: Array.isArray(data.participants) 
          ? data.participants.map((p: any) => ({
              id: String(p.id || ""),
              name: String(p.name || "User"),
              email: p.email || "",
              avatar: p.avatar || null,
              online: Boolean(p.online || false),
              status: p.status || ""
            }))
          : [],
        last_message: data.last_message || null,
        unread_count: Number(data.unread_count || 0),
        updated_at: data.updated_at || new Date().toISOString()
      };

      console.log("✅ [StartConversation] Formatted conversation:", conversation.id);
      return conversation;

    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMsg = errorData?.message || error.message || "Unknown error";
      const errorStatus = error.response?.status;

      console.error("❌ [StartConversation] Error:", {
        status: errorStatus,
        message: errorMsg,
        userId
      });

      throw error;
    }
  },

  /**
   * ✅ PERBAIKAN: Send message to conversation
   * 
   * Supports:
   * - Text messages
   * - File attachments (pre-uploaded)
   * 
   * ⭐ PENTING: pastikan conversationId dan attachment data valid
   */
  async sendMessage(
    conversationId: string,
    payload: {
      type: Message["type"];
      body: string;
      attachment?: any;
      senderId?: string;
      tempId?: string;
    }
  ): Promise<Message> {
    if (USE_MOCK) {
      console.log(`[Mock] Sending message to conversation ${conversationId}`);
      const msg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: payload.senderId ?? mockMe.id,
        type: payload.type,
        body: payload.body,
        created_at: new Date().toISOString(),
        status: "sent",
      };
      mockStore[conversationId] = [...(mockStore[conversationId] ?? []), msg];
      return msg;
    }

    try {
      // ✅ PERBAIKAN 1: Validasi conversationId
      if (!conversationId) {
        console.error("❌ [SendMessage] conversationId tidak ada!");
        throw new Error("conversationId tidak boleh kosong");
      }

      // ✅ PERBAIKAN 2: Validasi body atau attachment ada
      if (!payload.body && !payload.attachment) {
        console.error("❌ [SendMessage] Body dan attachment kosong!");
        throw new Error("Body atau attachment harus ada");
      }

      console.log(`📤 [SendMessage] Sending to conversation ${conversationId}`, {
        type: payload.type,
        bodyLength: payload.body?.length || 0,
        hasAttachment: !!payload.attachment,
        tempId: payload.tempId
      });

      // ✅ PERBAIKAN 3: Extract attachment data dengan safety checks
      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentSize = null;
      let attachmentMime = null;

      if (payload.attachment && (payload.attachment.url || payload.attachment.fileId)) {
        // Gunakan fileId jika ada (untuk GAS upload), else gunakan url
        attachmentUrl = payload.attachment.fileId || payload.attachment.url;
        attachmentName = payload.attachment.name || "file";
        attachmentSize = payload.attachment.size || 0;
        attachmentMime = payload.attachment.mime || "application/octet-stream";

        console.log("📎 [SendMessage] Attachment data:", {
          url: attachmentUrl,
          name: attachmentName,
          size: attachmentSize,
          mime: attachmentMime
        });
      }

      // ✅ PERBAIKAN 4: Build request body dengan hanya field yang needed
      const requestBody = {
        type: payload.type,
        body: payload.body || "",
        ...(attachmentUrl && { attachment_url: attachmentUrl }),
        ...(attachmentName && { attachment_name: attachmentName }),
        ...(attachmentSize && { attachment_size: attachmentSize }),
        ...(attachmentMime && { attachment_mime: attachmentMime })
      };

      console.log(`📋 [SendMessage] Request body:`, requestBody);

      // ✅ PERBAIKAN 5: Call API
      const { data } = await api.post<any>(
        `/conversations/${conversationId}/messages`,
        requestBody
      );

      console.log("✅ [SendMessage] Response received:", data?.id);

      // ✅ PERBAIKAN 6: Format response dengan safety checks
      const message: Message = {
        id: String(data.id || payload.tempId || ""),
        conversation_id: String(data.conversation_id || conversationId),
        sender_id: String(data.sender_id || ""),
        type: data.type || payload.type,
        body: data.body || payload.body || "",
        // ✅ PERBAIKAN 7: Handle attachment response format
        attachment: data.attachment ? {
          url: data.attachment.url || data.attachment_url,
          name: data.attachment.name || data.attachment_name || "file",
          size: data.attachment.size || data.attachment_size || 0,
          mime: data.attachment.mime || data.attachment_mime || "application/octet-stream",
          fileId: data.attachment.fileId || undefined
        } : undefined,
        status: data.status || "sent",
        created_at: data.created_at || new Date().toISOString()
      };

      console.log("✅ [SendMessage] Message formatted:", message.id);
      return message;

    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMsg = errorData?.message || error.message || "Unknown error";

      console.error("❌ [SendMessage] Error:", {
        status: error.response?.status,
        message: errorMsg,
        conversationId,
        payload: {
          type: payload.type,
          bodyLength: payload.body?.length || 0
        }
      });

      throw error;
    }
  },

  /**
   * ✅ Mark conversation as read (Centang 2 Biru)
   */
  async markAsRead(conversationId: string): Promise<void> {
    if (USE_MOCK) {
      console.log(`[Mock] Marking conversation ${conversationId} as read`);
      return;
    }

    try {
      if (!conversationId) {
        console.warn("⚠️ [MarkAsRead] conversationId tidak ada");
        return;
      }

      await api.post(`/conversations/${conversationId}/read`);
      console.log(`✅ [MarkAsRead] Conversation ${conversationId} marked as read`);
    } catch (error) {
      console.warn(`⚠️ [MarkAsRead] Error:`, error);
      // Don't throw - ini bukan critical operation
    }
  },

  /**
   * ✅ Mark conversation as delivered (Centang 2 Abu-abu)
   */
  async markAsDelivered(conversationId: string): Promise<void> {
    if (USE_MOCK) {
      console.log(`[Mock] Marking conversation ${conversationId} as delivered`);
      return;
    }

    try {
      if (!conversationId) {
        console.warn("⚠️ [MarkAsDelivered] conversationId tidak ada");
        return;
      }

      await api.post(`/conversations/${conversationId}/delivered`);
      console.log(`✅ [MarkAsDelivered] Conversation ${conversationId} marked as delivered`);
    } catch (error) {
      console.warn(`⚠️ [MarkAsDelivered] Error:`, error);
      // Don't throw - ini bukan critical operation
    }
  }
};