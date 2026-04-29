import { ArrowLeft, CheckCircle2, Shield, Zap, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header Ala WhatsApp */}
      <header className="flex items-center gap-4 bg-[hsl(var(--chat-header))] px-4 py-3 text-white shadow-md sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)} 
          className="text-white hover:bg-white/10 rounded-full"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold tracking-wide">About WhatChat</h1>
      </header>

      {/* Konten Utama */}
      <main className="flex flex-1 flex-col items-center py-10 px-6 max-w-2xl mx-auto w-full">
        
        {/* Profile Section */}
        <div className="mb-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-6 h-40 w-40 overflow-hidden rounded-full border-[3px] border-emerald-500 shadow-xl bg-card">
            {/* GANTI URL FOTO DI BAWAH PAKE LINK FOTO ASLI LU */}
            <img 
              src="https://ui-avatars.com/api/?name=Idin+Iskandar&background=10b981&color=fff&size=256" 
              alt="Idin Iskandar" 
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="mb-1 text-3xl font-extrabold tracking-tight">Idin Iskandar</h2>
          <p className="text-base font-semibold text-emerald-600 uppercase tracking-widest">Master Architect & Developer</p>
        </div>
        
        {/* Description Card */}
        <div className="w-full rounded-2xl bg-card p-6 shadow-sm border border-border/50">
          <p className="text-muted-foreground leading-relaxed text-center mb-8">
            <b>WhatChat</b> adalah platform komunikasi real-time generasi baru. Dibangun dengan arsitektur modern untuk memastikan setiap pesan tersampaikan dengan cepat, aman, dan tanpa jeda.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Zap className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">Real-Time Messaging</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Shield className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">Secure Connection</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Globe className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">Seamless Sync</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">Optimistic UI</span>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-auto pt-10 pb-4 text-center">
          <div className="text-sm font-semibold text-foreground/80">WhatChat v1.0.0</div>
          <div className="text-xs text-muted-foreground mt-1">
            © {new Date().getFullYear()} Idin Iskandar. All rights reserved.
          </div>
        </div>

      </main>
    </div>
  );
}