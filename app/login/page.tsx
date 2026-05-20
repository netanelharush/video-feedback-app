"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setLoading(true);

    if (isLogin) {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } else {
      const { error } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      alert("Account created!");

      window.location.href = "/";
    }

    setLoading(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center text-white">

      {/* MOVING GRID */}
      <div className="animated-grid opacity-30" />

      {/* TOP GLOW */}
      <motion.div
        animate={{
          opacity: [0.2, 0.45, 0.2],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
        }}
        className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-red-500/10 blur-[180px] rounded-full"
      />

      {/* BOTTOM GLOW */}
      <motion.div
        animate={{
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
        }}
        className="absolute bottom-[-250px] right-[-150px] w-[600px] h-[600px] bg-red-900/20 blur-[180px] rounded-full"
      />

      {/* LOGIN CARD */}
      <motion.div
        initial={{
          opacity: 0,
          y: 40,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.7,
        }}
        className="relative z-10 w-full max-w-md px-6"
      >

        <motion.div
          whileHover={{
            scale: 1.01,
          }}
          className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[32px] p-8 shadow-[0_0_80px_rgba(255,0,0,0.08)]"
        >

          {/* TITLE */}
          <motion.div
            initial={{
              opacity: 0,
              y: -20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
            }}
            className="text-center mb-10"
          >

            <h1 className="text-5xl font-black tracking-tight">
              FrameFlow
            </h1>

            <p className="text-zinc-400 mt-3 text-sm leading-relaxed">
              Professional Video Review Platform
            </p>

          </motion.div>

          {/* EMAIL */}
          <motion.input
            whileFocus={{
              scale: 1.02,
            }}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 transition-all mb-4"
          />

          {/* PASSWORD */}
          <motion.input
            whileFocus={{
              scale: 1.02,
            }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 transition-all"
          />

          {/* BUTTON */}
          <motion.button
            whileHover={{
              scale: 1.03,
              boxShadow:
                "0px 0px 40px rgba(239,68,68,0.4)",
            }}
            whileTap={{
              scale: 0.98,
            }}
            onClick={handleAuth}
            disabled={loading}
            className="w-full mt-6 bg-red-600 hover:bg-red-500 transition-all rounded-2xl py-4 font-bold text-lg"
          >
            {loading
              ? "Loading..."
              : isLogin
              ? "Login"
              : "Create Account"}
          </motion.button>

          {/* SWITCH */}
          <div className="mt-6 text-center text-zinc-400 text-sm">

            {isLogin
              ? "Don’t have an account?"
              : "Already have an account?"}

            <button
              onClick={() =>
                setIsLogin(!isLogin)
              }
              className="ml-2 text-red-400 hover:text-red-300 transition-colors"
            >
              {isLogin
                ? "Sign Up"
                : "Login"}
            </button>

          </div>

        </motion.div>

      </motion.div>

    </div>
  );
}