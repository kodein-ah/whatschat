import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MoreVertical, Phone, Search, Video } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar } from "./Avatar";
import type { Conversation, User } from "../../lib/types"; // Tambah User
import { useOnlineStatus } from "../../contexts/OnlineStatusContext";
import { echo as Echo } from "../../lib/echo"; // Import Echo

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

  const partner = conversation.participants?.find(p => p.id.toString() !== meId.toString());
  
  const displayName = conversation.is_group ? (conversation.name || "Grup") : (partner?.name || "User");
  const displayAvatar = conversation.is_group ? conversation.avatar : (partner?.avatar || null);

  const isPartnerOnline = !conversation.is_group && partner ? onlineUserIds.includes(partner.id) : false;

  // [JEBRED] LOGIC UNTUK MENDENGARKAN BISIKAN "TYPING"
  useEffect(() => {
    // Hanya dengarkan di chat personal, bukan grup
    if (conversation.is_group || !partner) {
      return;
    }

    const channel = Echo.private(`conversation.${conversation.id}`);

    channel.listenForWhisper('typing', (user: Pick<User, 'id' | 'name'>) => {
      // Jangan tampilkan status jika kita sendiri yang ngetik
      if (user.id.toString() === meId) {
        return;
      }
      
      // Tampilkan status "sedang mengetik..."
      setTypingUser(user);

      // Hapus timer lama jika ada bisikan baru masuk
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timer baru untuk menghapus status setelah 1.5 detik
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser(null);
      }, 1500);
    });

    // Cleanup function saat komponen dihancurkan
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      Echo.leave(`conversation.${conversation.id}`);
    };
  }, [conversation.id, conversation.is_group, partner, meId]);

  // [JEBRED] Tentukan teks status yang akan ditampilkan
  const getStatusText = () => {
    // Prioritas utama: jika partner sedang mengetik
    if (typingUser && partner && typingUser.id === partner.id) {
      return <span className="text-emerald-400 font-semibold">sedang mengetik...</span>;
    }
    // Prioritas kedua: jika partner sedang online
    if (isPartnerOnline) {
      return "online";
    }
    // Pilihan terakhir: fallback
    return "klik untuk info";
  };

  return (
    <header className="flex items-center gap-2 bg-[hsl(var(--chat-header))] px-2 py-2 text-white md:px-4 shrink-0 shadow-sm z-10">
      {onBack && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="text-white hover:bg-white/10 md:hidden rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      
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

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" onClick={onVideo} className="text-white hover:bg-white/10 rounded-full">
          <Video className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onCall} className="text-white hover:bg-white/10 rounded-full">
          <Phone className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" onClick={onSearch} className="hidden text-white hover:bg-white/10 md:inline-flex rounded-full">
          <Search className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};