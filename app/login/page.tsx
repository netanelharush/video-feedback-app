"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push("/");
        return;
      }

      setLoading(false);
    }

    checkSession();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim() || sending) return;

    setSending(true);
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.push("/");
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      setMessage("החשבון נוצר. אם Supabase מבקש אימות מייל, אשר את המייל ואז התחבר.");
      setMode("login");
    } catch (error: any) {
      setMessage(error.message || "משהו השתבש. נסה שוב.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05050a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_34%)]" />
        <div className="relative rounded-[32px] border border-white/10 bg-white/[0.06] px-10 py-8 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white" />
          <h1 className="text-2xl font-black">טוען את flow.il</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050a] text-white" dir="rtl">
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes floatLogo {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(2deg);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.08);
          }
        }

        @keyframes gridMove {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 56px 56px;
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        .login-enter {
          animation: fadeUp 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .login-enter-delay-1 {
          animation-delay: 90ms;
        }

        .login-enter-delay-2 {
          animation-delay: 180ms;
        }

        .login-enter-delay-3 {
          animation-delay: 270ms;
        }

        .floating-logo {
          animation: floatLogo 5s ease-in-out infinite;
          will-change: transform;
        }

        .glow-pulse {
          animation: glowPulse 4s ease-in-out infinite;
        }

        .moving-grid {
          animation: gridMove 18s linear infinite;
        }

        .shine-button {
          position: relative;
          overflow: hidden;
        }

        .shine-button::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: shine 2.6s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="glow-pulse pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.22),transparent_30%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.12),transparent_35%)]" />
      <div className="moving-grid pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="pointer-events-none fixed right-[10%] top-[15%] h-24 w-24 rounded-full bg-blue-500/20 blur-2xl glow-pulse" />
      <div className="pointer-events-none fixed bottom-[12%] left-[12%] h-32 w-32 rounded-full bg-purple-500/20 blur-3xl glow-pulse" />

      <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-2 lg:px-8">
        <div className="login-enter hidden lg:block">
          <div className="mb-8 flex items-center gap-4">
            <img
              src="/logo.png"
              alt="flow.il"
              className="floating-logo h-16 w-16 object-contain drop-shadow-[0_0_32px_rgba(120,119,255,0.55)]"
            />
            <div>
              <h1 className="text-5xl font-black tracking-tight">flow.il</h1>
              <p className="mt-1 text-zinc-400">סקור. הערות. אישור. פשוט.</p>
            </div>
          </div>

          <div className="login-enter login-enter-delay-1 rounded-[40px] border border-white/10 bg-white/[0.045] p-8 shadow-2xl shadow-black/30 backdrop-blur-2xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-blue-950/30">
            <div className="mb-6 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-300">
              סביבת סקירת וידאו ללקוחות
            </div>
            <h2 className="text-5xl font-black leading-tight">
              כל ההערות על הסרטון במקום אחד.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
              העלה סרטון, קבל פידבק לפי זמן, סמן תיקונים ואשר גרסאות בצורה נקייה ומהירה.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <p className="text-2xl font-black">01</p>
                <p className="text-xs text-zinc-500">העלאה</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <p className="text-2xl font-black">02</p>
                <p className="text-xs text-zinc-500">פידבק</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                <p className="text-2xl font-black">03</p>
                <p className="text-xs text-zinc-500">אישור</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="login-enter mb-6 flex items-center justify-center gap-4 lg:hidden">
            <img
              src="/logo.png"
              alt="flow.il"
              className="floating-logo h-16 w-16 object-contain drop-shadow-[0_0_32px_rgba(120,119,255,0.55)]"
            />
            <div>
              <h1 className="text-4xl font-black tracking-tight">flow.il</h1>
              <p className="text-sm text-zinc-400">סקור. הערות. אישור. פשוט.</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="login-enter login-enter-delay-2 rounded-[40px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] lg:p-8"
          >
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black">
                {mode === "login" ? "ברוך הבא" : "יצירת חשבון"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {mode === "login"
                  ? "התחבר כדי להמשיך לסביבת העבודה שלך"
                  : "צור חשבון חדש והתחל לעבוד"}
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-300">אימייל</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:-translate-y-0.5 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                  dir="ltr"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-300">סיסמה</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:-translate-y-0.5 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                  dir="ltr"
                />
              </label>
            </div>

            {message && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-relaxed text-zinc-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !email.trim() || !password.trim()}
              className="shine-button mt-6 w-full rounded-2xl bg-white px-8 py-4 font-black text-black shadow-2xl shadow-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-white/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending
                ? "רגע..."
                : mode === "login"
                  ? "התחברות"
                  : "יצירת חשבון"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode((current) => (current === "login" ? "signup" : "login"));
                setMessage("");
              }}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-8 py-4 font-bold text-zinc-200 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/15 active:scale-95"
            >
              {mode === "login" ? "אין לך חשבון? צור חשבון" : "יש לך חשבון? התחבר"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
