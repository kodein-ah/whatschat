import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { phoneVerificationService } from "@/services/phoneVerificationService";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  phone_number: z
    .string()
    .trim()
    .min(10, "Nomor HP minimal 10 digit")
    .max(15, "Nomor HP maksimal 15 digit"),
});

const otpSchema = z.object({
  otp_code: z
    .string()
    .trim()
    .length(6, "Kode OTP harus 6 digit")
    .regex(/^\d+$/, "Kode OTP hanya berisi angka"),
});

type AuthStep = "form" | "otp-verification";

const Auth = () => {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [authStep, setAuthStep] = useState<AuthStep>("form");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // OTP states
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // General states
  const [submitting, setSubmitting] = useState(false);

  // Timer countdown untuk OTP (10 menit = 600 detik)
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Memuat…
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  // Handle Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Validasi form dulu
      const parsed = registerSchema.parse({
        name,
        email,
        password,
        phone_number: phoneNumber,
      });

      // Format phone number
      const formattedPhone =
        phoneVerificationService.formatPhoneNumber(parsed.phone_number);

      // Validate phone format
      if (!phoneVerificationService.validatePhoneNumber(formattedPhone)) {
        throw new Error(
          "Format nomor HP tidak valid. Gunakan 08xxx atau +62xxx"
        );
      }

      // Request OTP via backend
      const result = await phoneVerificationService.requestOTP(
        formattedPhone,
        parsed.email
      );

      if (result.success) {
        setPhoneNumber(formattedPhone);
        setOtpTimer(result.expires_in || 600); // 10 menit default
        setOtpAttempts(0);
        setOtpCode("");
        setAuthStep("otp-verification");
        toast.success("Kode OTP telah dikirim ke email Anda");
      } else {
        toast.error(result.message || "Gagal mengirim OTP");
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

  // Handle Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      // Validasi OTP format
      const parsed = otpSchema.parse({ otp_code: otpCode });

      // Verify OTP via backend
      const result = await phoneVerificationService.verifyOTP(
        phoneNumber,
        parsed.otp_code
      );

      if (result.success) {
        toast.success("Nomor HP berhasil diverifikasi");

        // Now create account
        await register(name, email, password, phoneNumber);
        toast.success("Akun berhasil dibuat");

        // Reset form
        setAuthStep("form");
        setMode("login");
        setName("");
        setEmail("");
        setPassword("");
        setPhoneNumber("");
        setOtpCode("");
      } else {
        setOtpAttempts(otpAttempts + 1);
        toast.error(result.message || "Kode OTP salah");
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
      setOtpLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOTP = async () => {
    setSubmitting(true);
    try {
      const result = await phoneVerificationService.resendOTP(
        phoneNumber,
        email
      );

      if (result.success) {
        setOtpTimer(result.expires_in || 600);
        setOtpAttempts(0);
        setOtpCode("");
        toast.success("Kode OTP baru telah dikirim");
      } else {
        toast.error(result.message || "Gagal mengirim ulang OTP");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Regular Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsed = loginSchema.parse({ email, password });
      await login(parsed.email, parsed.password);
      toast.success("Berhasil masuk");
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await handleLogin(e);
    } else {
      // Register mode - request OTP first
      await handleRequestOTP(e);
    }
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
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
            {mode === "login"
              ? "Masuk ke WhatChat"
              : authStep === "form"
                ? "Buat akun WhatChat"
                : "Verifikasi Nomor HP"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Masuk dengan email dan password Anda"
              : authStep === "form"
                ? "Daftar gratis untuk mulai mengobrol"
                : "Masukkan kode OTP yang dikirim ke email Anda"}
          </p>
        </div>

        <form
          onSubmit={authStep === "otp-verification" ? handleVerifyOTP : onSubmit}
          className="flex flex-col gap-4"
        >
          {/* REGISTER FORM (initial step) */}
          {mode === "register" && authStep === "form" && (
            <>
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
                <Label htmlFor="phone">Nomor HP</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08123456789"
                  required
                  maxLength={15}
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Format: 08xxx atau +62xxx (10-15 digit)
                </p>
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
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={submitting} className="mt-2 h-11">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim OTP…
                  </>
                ) : (
                  "Daftar & Verifikasi"
                )}
              </Button>
            </>
          )}

          {/* OTP VERIFICATION SCREEN */}
          {mode === "register" && authStep === "otp-verification" && (
            <>
              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-300">
                Kode OTP 6 digit telah dikirim ke email{" "}
                <span className="font-semibold">{email}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp">Kode OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(value);
                  }}
                  placeholder="000000"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              {/* Timer & Attempts */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {otpTimer > 0 ? (
                    <>
                      Kode berlaku:{" "}
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {formatTime(otpTimer)}
                      </span>
                    </>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      Kode sudah expired
                    </span>
                  )}
                </span>
                <span>Percobaan: {otpAttempts}/3</span>
              </div>

              <Button
                type="submit"
                disabled={otpLoading || otpAttempts >= 3}
                className="mt-2 h-11"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi…
                  </>
                ) : (
                  "Verifikasi OTP"
                )}
              </Button>

              {/* Resend OTP Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleResendOTP}
                disabled={submitting || otpTimer > 300}
                className="h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim…
                  </>
                ) : (
                  "Kirim Ulang OTP"
                )}
              </Button>

              {/* Back Button */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAuthStep("form");
                  setOtpCode("");
                  setOtpTimer(0);
                  setOtpAttempts(0);
                }}
                className="h-11"
              >
                Kembali ke Form Pendaftaran
              </Button>
            </>
          )}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <>
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
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" disabled={submitting} className="mt-2 h-11">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses…
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </>
          )}
        </form>

        {/* Mode Toggle */}
        {authStep === "form" && (
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
        )}
      </div>
    </main>
  );
};

export default Auth;