import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Moon, Sun, User as UserIcon, Lock, ChevronRight, Camera, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/chat/Avatar";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [activeView, setActiveView] = useState<"menu" | "profile">("menu");
  const [name, setName] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setStatusMsg(user.status || "");
    }
  }, [user]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result?.toString().split(",")[1];
      const payload = {
        fileName: `avatar_${user?.id}.png`,
        mimeType: file.type,
        base64Data: base64Data
      };

      try {
        const gasUrl = import.meta.env.VITE_GAS_STORAGE_URL;
        const response = await fetch(gasUrl, { method: "POST", body: JSON.stringify(payload) });
        const result = await response.json();

        if (result.success) {
          await api.put('/me', { avatar: result.url }); 
          toast.success("Foto profil diperbarui!");
          setTimeout(() => { window.location.reload(); }, 1200);
        }
      } catch (err) {
        toast.error("Gagal mengunggah foto.");
      } finally {
        setIsUploading(false);
      }
    };
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/me', { name, status: statusMsg });
      toast.success("Profil disimpan!");
      setActiveView("menu");
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (err) {
      toast.error("Gagal menyimpan profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  if (loading || !user) return <div className="flex h-screen items-center justify-center">Memuat...</div>;

  // ==========================================
  // VIEW: EDIT PROFIL
  // ==========================================
  if (activeView === "profile") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground animate-in slide-in-from-right-8 duration-300">
        <header className="flex items-center gap-4 bg-[hsl(var(--chat-header))] px-4 py-3 text-white shadow-md sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setActiveView("menu")} className="text-white hover:bg-white/10 rounded-full shrink-0">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Profil</h1>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#111b21]">
          <div className="flex flex-col items-center justify-center py-10 bg-card border-b border-border/50">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              {isUploading && (
                <div className="absolute inset-0 z-20 bg-black/60 rounded-full flex flex-col items-center justify-center text-white text-xs">
                  <Loader2 className="h-8 w-8 animate-spin mb-1" />
                  Upload...
                </div>
              )}
              <Avatar src={user?.avatar} name={user?.name} size={160} className="border-4 border-background shadow-xl" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Camera className="h-10 w-10 text-white" />
              </div>
              <input type="file" ref={fileInputRef} onChange={onFileSelected} accept="image/*" className="hidden" />
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
              <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 block">Nama</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-lg font-medium outline-none border-b border-border focus:border-emerald-500 pb-1" required />
            </div>
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
              <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 block">Info</label>
              <input type="text" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} className="w-full bg-transparent text-lg font-medium outline-none border-b border-border focus:border-emerald-500 pb-1" />
            </div>
            <Button type="submit" disabled={isSaving || isUploading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-6 text-lg">
              Simpan Profil
            </Button>
          </form>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN MENU SETTINGS
  // ==========================================
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-4 bg-[hsl(var(--chat-header))] px-4 py-3 text-white shadow-md sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 rounded-full">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
      </header>

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#111b21]">
        {/* PROFIL SECTION */}
        <div onClick={() => setActiveView("profile")} className="bg-card flex items-center gap-4 p-4 mt-4 border-y border-border/50 cursor-pointer hover:bg-secondary/50">
          <Avatar src={user?.avatar} name={user?.name || "User"} size={64} />
          <div className="flex-1 min-w-0 ml-2">
            <h2 className="text-xl font-medium truncate">{user?.name}</h2>
            <p className="text-sm text-muted-foreground truncate">{user?.status || "Halo, saya pakai WhatChat!"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="bg-card mt-6 border-y border-border/50 flex flex-col">
          {/* MENU AKUN (LOCK ICON) - KEMBALI HADIR! */}
          <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border/50">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium">Akun</h3>
              <p className="text-sm text-muted-foreground">Privasi, keamanan, ganti nomor</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* MODE GELAP SECTION */}
          <div className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-4">
              {isDark ? <Moon className="h-6 w-6 text-muted-foreground" /> : <Sun className="h-6 w-6 text-muted-foreground" />}
              <h3 className="text-base font-medium">Mode Gelap</h3>
            </div>
            <button 
              onClick={toggleTheme} 
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-emerald-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}