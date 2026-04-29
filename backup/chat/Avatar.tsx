import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  className?: string;
}

const palette = [
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-indigo-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-violet-400 to-fuchsia-600",
  "from-lime-400 to-green-600",
];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const Avatar = ({ name = "User", src, size = 48, online, className }: AvatarProps) => {
  const [imgError, setImgError] = useState(false);
  const safeName = name || "User";
  
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = safeName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  const grad = palette[hash(safeName) % palette.length];

  return (
    <div 
      className={cn("relative shrink-0 overflow-hidden rounded-full bg-muted border border-border/50", className)} 
      style={{ width: size, height: size }}
    >
      {src && !imgError ? (
        <img 
          src={src} 
          alt={safeName} 
          className="h-full w-full object-cover" 
          referrerPolicy="no-referrer"
          loading="eager" // Paksa muat secepatnya
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center font-semibold text-white bg-gradient-to-br",
            grad
          )}
          style={{ fontSize: size * 0.38 }}
        >
          {initials || "?"}
        </div>
      )}
      
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full border-2 border-background bg-emerald-500 shadow-sm"
          style={{ width: size * 0.26, height: size * 0.26 }}
        />
      )}
    </div>
  );
};