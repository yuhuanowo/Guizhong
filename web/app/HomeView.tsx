"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, ExternalLink, Activity, Server, Zap, MessageSquare, Clock, Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface HomeViewProps {
  stats: {
    totalChats: number;
    totalUsers: number;
    totalTokens: number;
    lastActive: string;
    status: string;
    latency: string;
  };
}

export default function HomeView({ stats }: HomeViewProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-4 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-100">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-violet-500/5 rounded-full blur-[100px] opacity-20 pointer-events-none" />
      
      <div className="w-full max-w-4xl text-center space-y-12 relative z-10">
        
        {/* Logo / Icon */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-28 h-28 bg-zinc-900/50 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl shadow-indigo-500/10 overflow-hidden"
        >
          <Image src="/logo.png" alt="Guizhong Logo" width={112} height={112} className="w-full h-full object-cover" priority />
        </motion.div>
        
        {/* Title */}
        <header className="space-y-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-50">
              Guizhong Discord Bot
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
              Advanced AI Interaction & Management Bot for Discord. Experience seamless conversations with multiple AI models, rich text formatting, and more.
            </p>
          </motion.div>
          
          {/* Status Grid */}
          <motion.section 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            aria-label="System Statistics"
          >
            {[
              { label: "Status", value: stats.status, icon: Activity },
              { label: "Total Chats", value: stats.totalChats.toLocaleString(), icon: MessageSquare },
              { label: "Users", value: stats.totalUsers.toLocaleString(), icon: Server },
              { label: "Tokens", value: (stats.totalTokens / 1000).toFixed(1) + 'k', icon: Zap },
              { label: "Last Active", value: stats.lastActive, icon: Clock },
              { label: "Latency", value: stats.latency, icon: Activity }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl border border-white/5 bg-zinc-900/30 backdrop-blur-md hover:bg-zinc-900/50 hover:border-white/10 transition-all group">
                <item.icon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-50 transition-colors" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{item.label}</span>
                  <span className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-50 transition-colors">{item.value}</span>
                </div>
              </div>
            ))}
          </motion.section>
        </header>

        {/* Actions */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Link 
            href="https://discord.com/oauth2/authorize?client_id=1082152889209860247" 
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-zinc-50 text-zinc-950 font-medium hover:bg-zinc-200 transition-all active:scale-95 w-full sm:w-auto shadow-lg shadow-zinc-500/10"
          >
            <span>Invite Bot</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="https://www.yuhuanstudio.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-zinc-900/50 backdrop-blur-sm text-zinc-50 font-medium hover:bg-zinc-900 border border-white/10 hover:border-white/20 transition-all active:scale-95 w-full sm:w-auto"
          >
            <span>Official Website</span>
            <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-zinc-600 pt-12"
        >
          &copy; {new Date().getFullYear()} Yuhuan Studio. All rights reserved.
        </motion.p>
      </div>
    </main>
  );
}
