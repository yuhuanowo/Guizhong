"use client";

import { useState } from "react";
import { IChatLogData } from "@/lib/models";
import { motion } from "framer-motion";
import { MessageSquare, Image as ImageIcon, Video, Calendar, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import UserMenu from "@/components/UserMenu";

interface DashboardViewProps {
  chats: IChatLogData[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function DashboardView({ chats, user }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"history" | "library">("history");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter(chat => {
    const matchesSearch = (chat.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           chat.reply?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeTab === "library") {
      return matchesSearch && (chat.generated_image || chat.generated_video);
    }
    return matchesSearch;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
              <span>Guizhong</span>
            </Link>
            <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-full border border-white/5">
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === "history" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === "library" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Library
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="pl-4 border-l border-white/5">
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChats.map((chat, i) => (
            <motion.div
              key={chat.interaction_id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden hover:bg-zinc-900/50 hover:border-white/10 transition-all"
            >
              {/* Media Preview for Library/History */}
              {(chat.generated_image || chat.generated_video) && (
                <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                  {chat.generated_image ? (
                    <Image 
                      src={chat.generated_image} 
                      alt="Generated Content" 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : chat.generated_video ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Video className="w-8 h-8 text-zinc-500" />
                    </div>
                  ) : null}
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                    {chat.generated_image ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    <span>Generated</span>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(chat.timestamp).toLocaleDateString()}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    {chat.model}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-200 line-clamp-2">
                    {chat.prompt}
                  </p>
                  <p className="text-xs text-zinc-400 line-clamp-3">
                    {chat.reply}
                  </p>
                </div>

                <Link 
                  href={`/chat/${chat.interaction_id || (chat as any)._id}`}
                  className="absolute inset-0 z-10"
                >
                  <span className="sr-only">View Chat</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredChats.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <p>No history found.</p>
          </div>
        )}
      </div>
    </main>
  );
}
