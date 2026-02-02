"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

interface LoginViewProps {
  callbackUrl?: string;
}

export default function LoginView({ callbackUrl }: LoginViewProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-4 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-100">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-violet-500/5 rounded-full blur-[100px] opacity-20 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="p-8 rounded-3xl border border-white/5 bg-zinc-900/30 backdrop-blur-md shadow-2xl shadow-indigo-500/10 space-y-8"
        >
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block">
              <div className="mx-auto w-20 h-20 bg-zinc-900/50 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden">
                <Image src="/logo.png" alt="Guizhong Logo" width={80} height={80} className="w-full h-full object-cover" />
              </div>
            </Link>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Welcome Back</h1>
              <p className="text-zinc-400 text-sm">Sign in to view your history and library</p>
            </div>
          </div>

          <button
            onClick={() => signIn("discord", { callbackUrl: callbackUrl || "/dashboard" })}
            className="group relative flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-all active:scale-95 w-full shadow-lg shadow-indigo-500/20"
          >
            <span>Sign in with Discord</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-xs text-zinc-600 mt-8"
        >
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </motion.p>
      </div>
    </main>
  );
}
