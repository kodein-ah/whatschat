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

interface Props {
  conversation: Conversation;
  me?: User;
  onBack?: () => void;
}

const dayLabel = (d: Date) => {
  const today = new Date();
  if (isSameDay(d, today)) return "Hari ini";
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (isSameDay(d, y)) return "Kemarin";
  return format(d, "d MMMM yyyy", { locale: idLocale });
};

// ✅ CONVERT FILE TO BASE64
const toBase64 = (file: File): Promise<string> => 
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

// ✅ UPLOAD TO GAS
const uploadToGas = async (file: File) => {
  const gasUrl = import.meta.env.VITE_GAS_STORAGE_URL;
  if (!gasUrl) throw new Error("VITE_GAS_STORAGE_URL not configured");
  
  console.log("📤 [GAS] Uploading:", file.name);
  
  const base64Data = await toBase64(file);
  const payload = {
    base64Data,
    mimeType: file.type,
    fileName: `chat_${Date.now()}_${file.name}`
  };

  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`GAS Error: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'GAS upload failed');
  }
  
  console.log("✅ [GAS] Response:", result);
  return result;
};

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

    return () => {
      Echo.leave(messageChannel);
    };
  }, [conversation.id, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (vars: { body: string; type: string; attachment?: any; tempId: string }) => 
      chatService.sendMessage(conversation.id.toString(), vars),
      
    onSuccess: (data, variables) => {
      console.log("✅ [Send] Message created:", data.id);
      // Replace temp message with real one from server
      queryClient.setQueryData(['messages', conversation.id], (old: Message[] = []) =>
        old.map(msg => msg.id === variables.tempId ? data : msg)
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any, variables) => {
      console.error("❌ [Send] Error:", error);
      queryClient.setQueryData(['messages', conversation.id], (old: Message[] = []) =>
        old.filter(msg => msg.id !== variables.tempId)
      );
      toast.error(error.message || "Gagal mengirim pesan");
    },
  });

  const handleSend = async (body: string, attachment?: File) => {
    if ((!body && !attachment) || !me?.id) return;
    
    const tempId = crypto.randomUUID();
    const messageType = attachment ? (attachment.type.startsWith("image/") ? "image" : "file") : "text";
    const optimisticUrl = attachment ? URL.createObjectURL(attachment) : undefined;

    // ✅ ADD OPTIMISTIC MESSAGE
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversation.id.toString(),
      sender_id: me.id.toString(),
      type: messageType,
      body,
      created_at: new Date().toISOString(),
      status: "sending",
      attachment: attachment ? {
        url: optimisticUrl,
        name: attachment.name,
        mime: attachment.type,
        size: attachment.size,
      } : undefined,
    };

    queryClient.setQueryData(['messages', conversation.id], (oldData: Message[] = []) => [...oldData, optimisticMessage]);

    try {
      let finalAttachmentData = null;

      // ✅ UPLOAD TO GAS IF FILE EXISTS
      if (attachment) {
        console.log("📎 [Upload] File:", attachment.name);
        const gasResult = await uploadToGas(attachment);
        
        finalAttachmentData = {
          url: gasResult.url, // ✅ CRITICAL: Use url field!
          name: attachment.name,
          mime: attachment.type,
          size: attachment.size,
        };
        
        console.log("✅ [Attachment] Data:", finalAttachmentData);
      }

      // ✅ SEND MESSAGE WITH ATTACHMENT DATA
      console.log("🔄 [Send] Calling mutation");
      sendMessageMutation.mutate({
        body,
        type: messageType,
        attachment: finalAttachmentData,
        tempId,
      });

    } catch (error: any) {
      console.error("❌ [Upload] Error:", error);
      toast.error(error.message || "Gagal upload file");
      // Remove optimistic message
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
        onVoice={() => toast.info("Fitur voice note segera hadir")}
        me={me}
        conversationId={conversation.id.toString()}
      />
    </section>
  );
};