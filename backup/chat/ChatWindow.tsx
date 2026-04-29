import { useEffect, useRef } from "react";
import { format, isSameDay, isValid } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { chatService } from "../../lib/chatService";
import { echo as Echo } from "../../lib/echo";
import type { Conversation, Message, User } from "../../lib/types";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

// [JEBRED] Fungsi Bantuan: Ubah File ke Base64 (Kunci kesuksesan Foto Profil)
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); 
    reader.onerror = error => reject(error);
});

// [JEBRED] LOGIKA UTAMA: Upload ke GAS via Base64. (Anti-CORS, Terbukti Jalan!)
const uploadToGas = async (file: File) => {
    const gasUrl = import.meta.env.VITE_GAS_STORAGE_URL;
    if (!gasUrl) throw new Error("VITE_GAS_STORAGE_URL is not defined");
    
    console.log("📤 Uploading to GAS:", file.name);
    
    // 1. Ubah file jadi teks Base64
    const base64Data = await toBase64(file);
    
    // 2. Siapkan payload persis seperti foto profil
    const payload = {
        base64Data: base64Data,
        mimeType: file.type,
        fileName: `chat_${Date.now()}_${file.name}`
    };

    // 3. Tembak ke GAS.
    // PENTING: Jangan set Content-Type: application/json biar gak kena CORS Preflight.
    // fetch defaultnya akan kirim text/plain kalau body-nya string.
    const response = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`HTTP Error dari GAS: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.message || 'Unknown error from GAS');
    }
    
    console.log("✅ GAS response:", result);
    
    // 4. Balikin result yang berisi url
    return result;
};

const dayLabel = (d: Date) => {
  const today = new Date();
  if (isSameDay(d, today)) return "Hari ini";
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (isSameDay(d, y)) return "Kemarin";
  return format(d, "d MMMM yyyy", { locale: idLocale });
};

interface Props {
  conversation: Conversation;
  me?: User;
  onBack?: () => void;
}

export const ChatWindow = ({ conversation, me: propMe, onBack }: Props) => {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user: contextUser } = useAuth();
  const me = propMe || contextUser;

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', conversation.id],
    queryFn: () => chatService.listMessages(conversation.id.toString()),
    enabled: !!conversation.id,
  });

  useEffect(() => {
    const messageChannel = `conversation.${conversation.id}`;
    chatService.markAsRead(conversation.id.toString());
    const handleMessageSent = (e: any) => {
      const newMsg = e.message || e;
      queryClient.setQueryData(['messages', conversation.id], (oldData: Message[] = []) => {
        if (oldData.some(m => m.id.toString() === newMsg.id.toString())) return oldData;
        return [...oldData, newMsg];
      });
      chatService.markAsRead(conversation.id.toString());
    };
    const handleStatusUpdate = (e: any) => {
       if (e.status === 'read') {
          queryClient.setQueryData(['messages', conversation.id], (oldData: Message[] = []) => 
            oldData.map(m => ({ ...m, status: 'read' }))
          );
       } else if (e.status === 'delivered') {
          queryClient.setQueryData(['messages', conversation.id], (oldData: Message[] = []) =>
            oldData.map(m => m.status === 'sent' ? { ...m, status: 'delivered' } : m)
          );
       }
    };
    Echo.private(messageChannel).listen('MessageSent', handleMessageSent);
    Echo.private(messageChannel).listen('MessageStatusUpdated', handleStatusUpdate);
    return () => Echo.leave(messageChannel);
  }, [conversation.id, queryClient]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (vars: { body: string; type: string; attachment?: any; tempId: string }) => {
      console.log("🔄 sendMessageMutation called with:", vars);
      return chatService.sendMessage(conversation.id.toString(), vars);
    },
    onSuccess: (realMessage, variables) => {
      console.log("✅ onSuccess: Message created", realMessage.id);
      queryClient.setQueryData(['messages', conversation.id], (old: Message[] = []) =>
        old.map(msg => (msg.id === variables.tempId ? realMessage : msg))
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any, variables) => {
      console.error("❌ onError:", error);
      queryClient.setQueryData(['messages', conversation.id], (old: Message[] = []) =>
        old.filter(msg => msg.id !== variables.tempId)
      );
      toast.error(error.message || "Gagal mencatat pesan di server.");
    },
    onSettled: (data, error, variables) => {
      if (variables.attachment?.optimisticUrl) {
        URL.revokeObjectURL(variables.attachment.optimisticUrl);
      }
    }
  });

  const handleSend = async (body: string, attachmentFile?: File) => {
    if ((!body && !attachmentFile) || !me?.id) return;

    const tempId = crypto.randomUUID();
    const messageType = attachmentFile ? (attachmentFile.type.startsWith("image/") ? "image" : "file") : "text";
    const optimisticUrl = attachmentFile ? URL.createObjectURL(attachmentFile) : undefined;
    
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversation.id.toString(),
      sender_id: me.id.toString(),
      type: messageType,
      body,
      created_at: new Date().toISOString(),
      status: "sending",
      attachment: attachmentFile ? {
          name: attachmentFile.name,
          mime: attachmentFile.type,
          size: attachmentFile.size,
          url: optimisticUrl, 
      } : undefined,
    };
    queryClient.setQueryData(['messages', conversation.id], (oldData: Message[] = []) => [...oldData, optimisticMessage]);

    try {
        let finalAttachmentData = null;

        if (attachmentFile) {
            console.log("📎 Upload file:", attachmentFile.name);
            // EKSEKUSI JALUR SAKTI
            const gasResult = await uploadToGas(attachmentFile);
            
            // Siapkan data untuk dikirim ke Laravel
            finalAttachmentData = {
                fileId: gasResult.url, // ✅ GAS return .url yang berisi Google Drive link
                name: attachmentFile.name,
                mime: attachmentFile.type,
                size: attachmentFile.size,
                url: gasResult.url, // Backup
                optimisticUrl: optimisticUrl
            };
            
            console.log("✅ File uploaded, finalAttachmentData:", finalAttachmentData);
        }
        
        console.log("🔄 Calling sendMessageMutation");
        sendMessageMutation.mutate({
            body,
            type: messageType,
            attachment: finalAttachmentData,
            tempId,
        });

    } catch (error: any) {
        console.error("❌ Upload/Send failed:", error);
        toast.error(error.message || "Gagal mengirim file.");
        queryClient.setQueryData(['messages', conversation.id], (old: Message[] = []) =>
            old.filter(msg => msg.id !== tempId)
        );
    }
  };
  
  if (!me) return <div className="flex h-full items-center justify-center">Memuat profil...</div>;

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-[#efeae2] dark:bg-[#0b141a]">
      <ChatHeader 
        conversation={conversation} 
        meId={me.id.toString()}
        onBack={onBack}
        onCall={() => toast.info("Fitur panggilan suara segera hadir")}
        onVideo={() => toast.info("Fitur panggilan video segera hadir")}
      />
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto py-4 chat-pattern">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Memuat obrolan…</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const msgDate = new Date(m.created_at);
              const showDay = !prev || !isSameDay(new Date(prev.created_at), msgDate);
              const sender = conversation.participants?.find(p => p.id.toString() === m.sender_id.toString());
              return (
                <div key={m.id} className="flex flex-col gap-1">
                  {showDay && isValid(msgDate) && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-lg bg-white/90 dark:bg-gray-800/90 px-4 py-1 text-[11px] font-bold text-muted-foreground shadow-sm uppercase">
                        {dayLabel(msgDate)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={m}
                    meId={me.id.toString()}
                    showAuthor={conversation.is_group && m.sender_id.toString() !== me.id.toString()}
                    authorName={sender?.name || "User"}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <MessageComposer
        onSend={handleSend}
        isSending={sendMessageMutation.isPending}
        me={me}
        conversationId={conversation.id.toString()}
        onVoice={() => toast.info("Fitur voice note segera hadir")}
      />
    </section>
  );
};