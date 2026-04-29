import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MoreVertical, Phone, Search, Video } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar } from "./Avatar";
import type { Conversation, User } from "../../lib/types";
import { useOnlineStatus } from "../../contexts/OnlineStatusContext";
import { echo as Echo } from "../../lib/echo";
import { toast } from "sonner";

interface Props {
  conversation: Conversation;
  meId: string;
  onBack?: () => void;
  onCall?: () => void;
  onVideo?: () => void;
  onSearch?: () => void;
}

export const ChatHeader = ({ 
  conversation, 
  meId,
  onBack, 
  onCall, 
  onVideo, 
  onSearch 
}: Props) => {
  const { onlineUserIds } = useOnlineStatus();
  const [typingUser, setTypingUser] = useState<Pick<User, 'id' | 'name'> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ PERBAIKAN 1: Safe partner lookup
  const partner = conversation.participants?.find(
    p => String(p.id || "").toString() !== String(meId || "").toString()
  );
  
  const displayName = conversation.is_group 
    ? (conversation.name || "Grup") 
    : (partner?.name || "User");
    
  const displayAvatar = conversation.is_group 
    ? conversation.avatar 
    : (partner?.avatar || null);

  // ✅ PERBAIKAN 2: Safe online status check
  const isPartnerOnline = !conversation.is_group && partner 
    ? onlineUserIds.includes(String(partner.id || "")) 
    : false;

  // ✅ PERBAIKAN 3: Listen to typing indicator via Echo
  useEffect(() => {
    // Hanya untuk private chat, bukan grup
    if (conversation.is_group || !partner) {
      console.log("ℹ️ [ChatHeader] Typing listener tidak aktif (group atau no partner)");
      return;
    }

    const channelName = `conversation.${conversation.id}`;
    console.log("👂 [ChatHeader] Listening to channel:", channelName);

    try {
      const channel = Echo.private(channelName);

      channel.listenForWhisper('typing', (user: Pick<User, 'id' | 'name'>) => {
        // ✅ Jangan tampilkan jika kita sendiri yang ngetik
        if (String(user.id || "").toString() === String(meId || "").toString()) {
          return;
        }
        
        console.log("⌨️ [ChatHeader] User typing:", user.name);
        
        setTypingUser(user);

        // Clear timer lama jika ada
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timer baru (1.5 detik)
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUser(null);
          console.log("⏱️ [ChatHeader] Typing timeout");
        }, 1500);
      });

    } catch (error) {
      console.warn("⚠️ [ChatHeader] Typing listener error:", error);
    }

    // ✅ Cleanup
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      try {
        Echo.leave(`conversation.${conversation.id}`);
      } catch (error) {
        console.warn("⚠️ [ChatHeader] Leave channel error:", error);
      }
    };
  }, [conversation.id, conversation.is_group, partner, meId]);

  // ✅ PERBAIKAN 4: Get status text
  const getStatusText = () => {
    // Priority 1: Typing indicator
    if (typingUser && partner && String(typingUser.id || "").toString() === String(partner.id || "").toString()) {
      return <span className="text-emerald-400 font-semibold">sedang mengetik...</span>;
    }
    
    // Priority 2: Online status
    if (isPartnerOnline) {
      return "online";
    }
    
    // Fallback
    return "klik untuk info";
  };

  return (
    <header className="flex items-center gap-2 bg-[hsl(var(--chat-header))] px-2 py-2 text-white md:px-4 shrink-0 shadow-sm z-10">
      {/* Back button */}
      {onBack && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="text-white hover:bg-white/10 md:hidden rounded-full"
          title="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      
      {/* Avatar + Info */}
      <Avatar 
        name={displayName} 
        src={displayAvatar} 
        size={40} 
        online={isPartnerOnline} 
      />
      
      <div className="min-w-0 flex-1 ml-1">
        <div className="truncate font-semibold text-[15px] leading-tight">{displayName}</div>
        <div className="truncate text-[11px] text-white/70">
          {getStatusText()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        {/* Video call */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onVideo} 
          className="text-white hover:bg-white/10 rounded-full"
          title="Panggilan video (coming soon)"
        >
          <Video className="h-5 w-5" />
        </Button>
        
        {/* Voice call */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCall} 
          className="text-white hover:bg-white/10 rounded-full"
          title="Panggilan suara (coming soon)"
        >
          <Phone className="h-5 w-5" />
        </Button>
        
        {/* Search */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onSearch} 
          className="hidden text-white hover:bg-white/10 md:inline-flex rounded-full"
          title="Cari pesan"
        >
          <Search className="h-5 w-5" />
        </Button>
        
        {/* More options */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => toast.info("Menu lainnya - fitur segera hadir")}
          className="text-white hover:bg-white/10 rounded-full"
          title="Opsi lainnya"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};