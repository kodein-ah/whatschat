import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, MoreVertical, Search, Users, LogOut, Settings, UserPlus, Star, Info, Loader2, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation, User } from "@/lib/types";
import { ConversationList } from "./ConversationList";
import { useAuth } from "@/contexts/AuthContext";
import { chatService } from "@/lib/chatService";
import { searchService } from "@/services/searchService";
import { toast } from "sonner";

interface Props {
  me: User;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  onNewChat?: () => void;
}

export const Sidebar = ({ me, conversations, activeId, onSelect, onNewChat }: Props) => {
  const [q, setQ] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const { logout } = useAuth();
  const navigate = useNavigate();

  const filtered = conversations.filter((c) =>
    (c.name || "").toLowerCase().includes(q.toLowerCase())
  );

  // ✅ FIXED: Handle search di modal
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Masukkan pencarian");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const type = searchService.detectSearchType(searchQuery);
      
      // ✅ TAMBAHAN: Console log sebelum call API
      console.log("🔍 Searching with query:", searchQuery, "type:", type);
      
      const result = await searchService.searchUsers(searchQuery, type);
      
      // ✅ TAMBAHAN: Console log response dari backend
      console.log("📡 Backend response:", result);
      console.log("📡 Response.users:", result.users);
      console.log("📡 Response.data:", result.data);
      
      setSearchResults(result.users || []);

      if (!result.users || result.users.length === 0) {
        console.warn("⚠️ No users found!");
        toast.info("Pengguna tidak ditemukan");
      }
    } catch (err: any) {
      console.error("❌ Search error:", err);
      toast.error("Gagal mencari pengguna");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // ✅ FIXED: Mulai chat dengan user yang dipilih
  const startChatWithUser = async (selectedUser: User) => {
    try {
      // ✅ STEP 1: Validasi user_id
      if (!selectedUser.id) {
        toast.error("User ID tidak valid");
        return;
      }

      // ✅ STEP 2: Call chatService dengan user_id (bukan email)
      const newConv = await chatService.startConversation(selectedUser.id);
      
      // ✅ STEP 3: Update UI & state
      setIsNewChatOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      
      if (onNewChat) onNewChat();
      if (onSelect) onSelect(newConv);
      
      toast.success(`Chat dimulai dengan ${selectedUser.name}`);
    } catch (err: any) {
      console.error("❌ Chat error:", err);
      
      // ✅ STEP 4: Handle error dengan lebih detail
      if (err.response?.status === 404) {
        toast.error("User tidak ditemukan");
      } else if (err.response?.status === 422) {
        toast.error(err.response?.data?.message || "Data tidak valid");
      } else {
        toast.error("Gagal memulai percakapan");
      }
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "about") {
      navigate('/about');
    } else if (action === "settings") {
      navigate('/settings');
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-[hsl(var(--chat-sidebar))] md:w-[380px] md:border-r md:border-border">
      
      {/* HEADER SIDEBAR */}
      <div className="flex items-center justify-between bg-[hsl(var(--chat-header))]/95 px-4 py-3 text-white">
        <div 
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0" 
          onClick={() => navigate('/settings')}
        >
          <Avatar 
            name={me.name} 
            src={me.avatar} 
            size={40} 
            online 
            className="group-hover:ring-2 group-hover:ring-emerald-400 transition-all shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate leading-tight text-[15px]">{me.name}</div>
            <div className="text-[11px] text-white/60 truncate">{me.status || "online"}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsNewChatOpen(true)}>
            <MessageSquarePlus className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-52 bg-card text-foreground shadow-xl border-border/50">
              <DropdownMenuItem onClick={() => handleMenuAction('new_group')} className="cursor-pointer py-2.5">
                <Users className="mr-3 h-4 w-4" />
                <span>Grup baru</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleMenuAction('about')} className="cursor-pointer py-2.5">
                <Info className="mr-3 h-4 w-4" />
                <span>About App</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleMenuAction('starred')} className="cursor-pointer py-2.5">
                <Star className="mr-3 h-4 w-4" />
                <span>Berbintang</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleMenuAction('settings')} className="cursor-pointer py-2.5">
                <Settings className="mr-3 h-4 w-4" />
                <span>Pengaturan</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={logout} className="cursor-pointer py-2.5 text-red-500 focus:text-red-500 font-medium">
                <LogOut className="mr-3 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari chat..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* LIST CHAT */}
<ConversationList
  conversations={filtered}
  activeId={activeId}
  onSelect={onSelect}
  meId={me.id?.toString() || String(me.id)}
/>

      {/* MODAL NEW CHAT - UPGRADED */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mulai Chat Baru</DialogTitle>
            <DialogDescription>
              Cari pengguna berdasarkan nama, email, atau nomor HP.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSearch} className="flex flex-col gap-4 py-4">
            <div className="flex gap-2">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama, email, atau nomor HP..."
                className="flex-1 border border-border p-3 rounded-lg text-foreground bg-background focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
              <Button 
                type="submit" 
                disabled={isSearching || !searchQuery.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
              </Button>
            </div>
          </form>

          {/* Search Results */}
          {hasSearched && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startChatWithUser(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Avatar 
                        name={user.name} 
                        src={user.avatar} 
                        size={40}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email || user.phone_number}
                        </p>
                      </div>
                      <MessageSquarePlus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Pengguna tidak ditemukan
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  );
};