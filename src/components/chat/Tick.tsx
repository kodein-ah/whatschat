import { Check, CheckCheck, Clock } from "lucide-react";
import type { MessageStatus } from "@/lib/types";

interface TickProps {
  status: MessageStatus;
  className?: string;
}

export const Tick = ({ status, className }: TickProps) => {
  // Status 'sending': Pesan baru dikirim (ikon jam)
  if (status === "sending") {
    return <Clock className={cn("h-3.5 w-3.5 text-muted-foreground", className)} />;
  }
  
  // Status 'sent': Pesan sampai ke server
  if (status === "sent") {
    return <Check className={cn("h-4 w-4", className)} style={{ color: "hsl(var(--tick-sent))" }} />;
  }
  
  // Status 'delivered': Pesan sudah masuk ke device penerima
  if (status === "delivered") {
    return <CheckCheck className={cn("h-4 w-4", className)} style={{ color: "hsl(var(--tick-sent))" }} />;
  }
  
  // Status 'read' (default): Pesan sudah dibaca (ikon centang dua biru)
  return <CheckCheck className={cn("h-4 w-4", className)} style={{ color: "hsl(var(--tick-read))" }} />;
};

// Pastikan import cn dari util lu biar bisa nambahin class custom kalau perlu
import { cn } from "@/lib/utils";