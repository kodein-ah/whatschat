import { api } from "./api";
import type { Conversation, Message, User } from "./types";
import { mockConversations, mockMessages, mockMe } from "./mockData";

const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== "false";

const mockStore: Record<string, Message[]> = JSON.parse(
  JSON.stringify(mockMessages)
);

export const chatService = {
  // 1. Ambil data profil gue
  async me(): Promise<User> {
    if (USE_MOCK) return mockMe;
    const { data } = await api.get<User>("/me");
    return data;
  },

  // 2. Ambil daftar semua chat di sidebar
  async listConversations(): Promise<Conversation[]> {
    if (USE_MOCK) return mockConversations;
    const { data } = await api.get<Conversation[]>("/conversations");
    return data;
  },

  // 3. Ambil riwayat pesan dalam satu chat
  async listMessages(conversationId: string): Promise<Message[]> {
    if (USE_MOCK) return mockStore[conversationId] ?? [];
    const { data } = await api.get<Message[]>(
      `/conversations/${conversationId}/messages`
    );
    return data;
  },

  // 4. Mulai chat baru dengan cari email
  async startConversation(email: string): Promise<Conversation> {
    if (USE_MOCK) throw new Error("Mock mode active");
    const userRes = await api.get(`/search?email=${email}`);
    const targetUser = userRes.data;
    const { data } = await api.post<Conversation>("/conversations/start", {
      user_id: targetUser.id
    });
    return data;
  },

  /**
   * 5. KIRIM PESAN BARU (Teks atau File)
   * UPDATE: Menggunakan Base64 Proxy via GAS untuk menghancurkan Blocker Media Chat
   */
  async sendMessage(
    conversationId: string,
    payload: {
      type: Message["type"];
      body: string;
      attachment?: File;
      senderId?: string;
    }
  ): Promise<Message> {
    if (USE_MOCK) {
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

    let driveUrl = null;
    let fileName = null;
    let fileSize = null;
    let fileMime = null;

    // --- LOGIC UPLOAD MEDIA KE GOOGLE DRIVE VIA GAS (BASE64) ---
    if (payload.attachment) {
      const file = payload.attachment;
      fileName = file.name;
      fileSize = file.size;
      fileMime = file.type;

      // Konversi File ke Base64 (Promise Based)
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result?.toString().split(",")[1] || "");
        reader.onerror = (error) => reject(error);
      });

      try {
        const gasUrl = import.meta.env.VITE_GAS_STORAGE_URL;
        if (!gasUrl) throw new Error("GAS URL is not defined in .env.local");

        const gasRes = await fetch(gasUrl, {
          method: "POST",
          body: JSON.stringify({
            fileName: `chat_media_${Date.now()}_${fileName}`,
            mimeType: fileMime,
            base64Data: base64
          })
        });

        const gasData = await gasRes.json();
        if (gasData.success) {
          driveUrl = gasData.url; // URL dari Google Drive (lh3.googleusercontent.com)
        } else {
          console.error("GAS Server Side Error:", gasData.message);
        }
      } catch (err) {
        console.error("GAS Network Error:", err);
      }
    }

    // --- KIRIM DATA KE BACKEND LARAVEL ---
    // Sekarang kita kirim JSON murni, bukan FormData lagi
    const { data } = await api.post<Message>(
      `/conversations/${conversationId}/messages`,
      {
        type: payload.type,
        body: payload.body,
        attachment_url: driveUrl,
        attachment_name: fileName,
        attachment_size: fileSize,
        attachment_mime: fileMime
      }
    );
    
    return data;
  },

  // 6. Tandai pesan sudah dibaca (Centang Biru)
  async markAsRead(conversationId: string): Promise<void> {
    if (USE_MOCK) return;
    try {
      await api.post(`/conversations/${conversationId}/read`);
    } catch (err) {
      console.error("Gagal update status baca:", err);
    }
  },

  // 7. Tandai pesan sampai di HP (Centang Dua Abu)
  async markAsDelivered(conversationId: string): Promise<void> {
    if (USE_MOCK) return;
    try {
      await api.post(`/conversations/${conversationId}/delivered`);
    } catch (err) {
      console.error("Gagal update status sampai:", err);
    }
  }
};