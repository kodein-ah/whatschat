import { useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
});

const Auth = () => {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Memuat…
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "register") {
        const parsed = registerSchema.parse({ name, email, password });
        await register(parsed.name, parsed.email, parsed.password);
        toast.success("Akun berhasil dibuat");
      } else {
        const parsed = loginSchema.parse({ email, password });
        await login(parsed.email, parsed.password);
        toast.success("Berhasil masuk");
      }
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.errors[0]?.message
          : err instanceof Error
            ? err.message
            : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="chat-pattern flex min-h-screen items-center justify-center p-4">
      <h1 className="sr-only">Login WhatChat — chat realtime</h1>
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-[var(--shadow-elevated)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            {mode === "login" ? "Masuk ke WhatChat" : "Buat akun WhatChat"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Masuk dengan email dan password Anda"
              : "Daftar gratis untuk mulai mengobrol"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nama lengkap</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Santoso"
                required
                maxLength={100}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anda@contoh.com"
              required
              maxLength={255}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
              maxLength={100}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" disabled={submitting} className="mt-2 h-11">
            {submitting ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Belum punya akun?{" "}
              <button
                onClick={() => setMode("register")}
                className="font-medium text-primary hover:underline"
              >
                Daftar
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{" "}
              <button
                onClick={() => setMode("login")}
                className="font-medium text-primary hover:underline"
              >
                Masuk
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default Auth;
