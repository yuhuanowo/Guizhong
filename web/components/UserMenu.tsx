"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, LayoutDashboard, Settings, User, ChevronDown, 
  Bell, Home, Brain, Activity, MessageSquare, Hash, Cpu, X,
  Zap, Image as ImageIcon, Globe, Calendar, BarChart3, Clock
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { getUserProfileData } from "@/app/actions";
import { getModelEmojiUrl } from "@/lib/utils";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openProfile = async () => {
    setIsOpen(false);
    setShowProfileModal(true);
    if (!profileData) {
      setLoadingProfile(true);
      try {
        const data = await getUserProfileData();
        setProfileData(data);
      } catch (error) {
        console.error("Failed to fetch profile data", error);
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group"
        >
          <div className="relative">
            {user.image ? (
              <Image 
                src={user.image} 
                alt={user.name || "User"} 
                width={32} 
                height={32} 
                className="rounded-full ring-2 ring-white/10 group-hover:ring-white/20 transition-all" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center ring-2 ring-white/10">
                <User className="w-4 h-4 text-zinc-400" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full"></div>
          </div>
          
          <div className="hidden md:flex flex-col items-start text-left">
            <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
              {user.name}
            </span>
          </div>
          
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-60 bg-zinc-950 border border-white/10 rounded-xl shadow-xl z-50 p-1.5 origin-top-right"
            >
              <div className="px-2.5 py-2 mb-1">
                <p className="text-sm font-medium text-zinc-200 truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate font-mono">{user.email}</p>
              </div>

              <div className="space-y-0.5">
                <Link 
                  href="/" 
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
                
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                <button 
                  onClick={openProfile}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors text-left"
                >
                  <User className="w-4 h-4" />
                  <span>Profile & Stats</span>
                </button>
              </div>

              <div className="h-px bg-white/5 my-1.5 mx-1" />

              <button 
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-zinc-900/30">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {user.image ? (
                      <Image 
                        src={user.image} 
                        alt={user.name || "User"} 
                        width={48} 
                        height={48} 
                        className="rounded-xl ring-1 ring-white/10 bg-zinc-900" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                        <User className="w-6 h-6 text-zinc-400" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-950 rounded-full"></div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-50">{user.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                      <span>{user.email}</span>
                      {profileData?.discordId && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                          <span>{profileData.discordId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500 text-xs font-mono">Loading profile data...</p>
                  </div>
                ) : profileData ? (
                  <div className="space-y-6">
                    
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Interactions</span>
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-sm font-medium text-zinc-200">{profileData.stats.totalChats.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Cost (Tokens)</span>
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-sm font-medium text-zinc-200">{(profileData.stats.totalTokens / 1000).toFixed(1)}k</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Creativity</span>
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                          <span className="text-sm font-medium text-zinc-200">{profileData.stats.imageCount}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Latency</span>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-sm font-medium text-zinc-200">{(profileData.stats.avgLatency / 1000).toFixed(2)}s</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Model Usage */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Top Models</h4>
                        <div className="space-y-2">
                          {profileData.topModels.map((model: any, index: number) => {
                            const iconUrl = getModelEmojiUrl(model.name);
                            return (
                              <div key={model.name} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/20 border border-white/5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-1.5 rounded-lg ${index === 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {iconUrl ? (
                                      <Image 
                                        src={iconUrl} 
                                        alt={model.name} 
                                        width={14} 
                                        height={14} 
                                        className="w-3.5 h-3.5 object-contain" 
                                        unoptimized 
                                      />
                                    ) : (
                                      <Cpu className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-zinc-300 truncate">{model.name}</span>
                                </div>
                                <span className="text-xs font-mono text-zinc-500">{Math.round((model.count / profileData.stats.totalChats) * 100)}%</span>
                              </div>
                            );
                          })}
                          {profileData.topModels.length === 0 && (
                            <div className="p-4 text-center text-zinc-500 text-xs">No data available</div>
                          )}
                        </div>
                      </div>

                      {/* Activity Stats */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Activity</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/20 border border-white/5">
                            <div className="p-1.5 rounded-lg bg-zinc-900/50 text-zinc-500">
                              <Globe className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs text-zinc-500">Web Searches</span>
                              <span className="block text-sm font-medium text-zinc-200">{profileData.stats.searchCount}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/20 border border-white/5">
                            <div className="p-1.5 rounded-lg bg-zinc-900/50 text-zinc-500">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs text-zinc-500">Member Since</span>
                              <span className="block text-sm font-medium text-zinc-200">{new Date(profileData.stats.memberSince).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/20 border border-white/5">
                            <div className="p-1.5 rounded-lg bg-zinc-900/50 text-zinc-500">
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs text-zinc-500">Last Active</span>
                              <span className="block text-sm font-medium text-zinc-200">
                                {profileData.stats.lastActive ? new Date(profileData.stats.lastActive).toLocaleDateString() : 'Never'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Memory Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Neural Memory</h4>
                      </div>
                      <div className="rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border-b border-white/5">
                          <Brain className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-xs font-medium text-zinc-400">Long-term Context</span>
                          {profileData.memory && (
                            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
                              Active
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          {profileData.memory ? (
                            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-mono text-[13px]">
                              {profileData.memory}
                            </p>
                          ) : (
                            <div className="text-center py-8 text-zinc-500">
                              <p className="text-xs">No long-term memories formed yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-12 text-red-400 text-sm">
                    Failed to load profile data.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

