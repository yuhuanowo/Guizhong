"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Calendar, User, Bot, Sparkles, Clock, Cpu, Timer, Globe, Terminal, Server, 
  Info, X, ChevronDown, Copy, Check, Download, Hash, Eye, EyeOff, Type, Link as LinkIcon, Menu 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { IChatLogData } from "@/lib/models";

interface ChatViewProps {
  chat: Omit<IChatLogData, "timestamp"> & { timestamp: string; _id: string; history?: any[] };
}

const modelEmojiMap: Record<string, string> = {
  'gpt-4': '1402509357631017083',
  'gpt-4o': '1403243749236150435',
  'gpt-4o-mini': '1425123222902407198',
  'gpt-4.1': '1403243798536130642',
  'gpt-4.1-mini': '1425121129093267527',
  'gpt-4.1-nano': '1425121237142601749',
  'gpt-5': '1403242839214653603',
  'gpt-5-chat': '1425121355371905064',
  'gpt-5-mini': '1425121271242559569',
  'gpt-5-nano': '1425121335994224670',
  'gpt-oss': '1425121439773888644',
  'o1': '1425120921777213500',
  'o1-preview': '1425120996125446224',
  'o1-mini': '1425121008754626610',
  'o3': '1424711069770846321',
  'o3-mini': '1425121020469317703',
  'o4': '1403243776214040638',
  'llama': '1426094287652917353',
  'microsoft': '1426094300277768284',
  'qwen': '1427590458611204098',
  'deepseek': '1427590444497502281',
  'gemini': '1426093987156066334',
  'gemma': '1426121930192195627',
  'google': '1427590471613415474',
  'grok': '1427590430790254703',
  'groq': '1427590414566948924',
  'minimax': '1427590399681368175',
  'mistral': '1426094310356549632',
  'openai': '1427590485198770247',
  'cohere': '1427590384158117959',
  'github': '1427590369478184991',
  'openrouter': '1427590357318893669',
  'ollama': '1427590342751813673',
  'zhipu': '1426396289913983026',
};

function getModelEmojiUrl(model: string): string | null {
  if (!model) return null;
  const lowerModel = model.toLowerCase();
  
  // Exact match
  if (modelEmojiMap[lowerModel]) {
    return `https://cdn.discordapp.com/emojis/${modelEmojiMap[lowerModel]}.png`;
  }

  // Fuzzy match
  for (const [key, id] of Object.entries(modelEmojiMap)) {
    if (lowerModel.includes(key)) {
      return `https://cdn.discordapp.com/emojis/${id}.png`;
    }
  }
  
  return null;
}

const CodeBlock = ({ language, children }: { language: string, children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/5">
        <span className="text-xs font-medium text-zinc-400 uppercase">{language || 'text'}</span>
        <button 
          onClick={handleCopy}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          title="Copy Code"
          aria-label="Copy Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '0.9rem' }}
        wrapLines={true}
        wrapLongLines={true}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

const preprocessLaTeX = (content: string) => {
  if (!content) return "";
  // Replace block math \[ ... \] with $$ ... $$
  const blockReplaced = content.replace(/\\\[([\s\S]*?)\\\]/g, (_, equation) => `$$${equation}$$`);
  // Replace inline math \( ... \) with $ ... $
  const inlineReplaced = blockReplaced.replace(/\\\(([\s\S]*?)\\\)/g, (_, equation) => `$${equation}$`);

  return inlineReplaced;
};

export default function ChatView({ chat }: ChatViewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [textSize, setTextSize] = useState(16); // Base text size in px
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [infoTab, setInfoTab] = useState<'general' | 'json'>('general');

  const copyToClipboard = (text: string, isPrompt: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPrompt) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedReply(true);
      setTimeout(() => setCopiedReply(false), 2000);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadChat = () => {
    const element = document.createElement("a");
    const file = new Blob([`# Prompt\n${chat.prompt}\n\n# Reply\n${chat.reply}`], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `chat-${chat.interaction_id}.md`;
    document.body.appendChild(element);
    element.click();
  };

  const modelEmojiUrl = getModelEmojiUrl(chat.model);
  const conversation = [...(chat.history || []), chat];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-100">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-zinc-500/5 blur-[120px] opacity-20" />
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-zinc-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5">
                    {modelEmojiUrl ? (
                      <Image src={modelEmojiUrl} alt={chat.model} width={32} height={32} className="w-8 h-8 object-contain" />
                    ) : (
                      <Info className="w-8 h-8 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-50">Chat Details</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{chat.interaction_id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInfoModal(false)}
                  className="p-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                {/* Tabs */}
                <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-white/5 w-fit">
                  <button 
                    onClick={() => setInfoTab('general')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${infoTab === 'general' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setInfoTab('json')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${infoTab === 'json' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Raw JSON
                  </button>
                </div>

                {infoTab === 'general' ? (
                  <div className="space-y-6">
                    
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Model</span>
                        <div className="flex items-center gap-1.5">
                          {modelEmojiUrl && <img src={modelEmojiUrl} className="w-3.5 h-3.5 object-contain opacity-70" />}
                          <span className="text-sm font-medium text-zinc-200 truncate">{chat.model}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Latency</span>
                        <div className="flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="text-sm font-medium text-zinc-200">{chat.processing_time_ms ? `${(chat.processing_time_ms / 1000).toFixed(2)}s` : '-'}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Tokens</span>
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="text-sm font-medium text-zinc-200">{chat.usage?.total_tokens || 0}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Time</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="text-sm font-medium text-zinc-200 truncate">{new Date(chat.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interaction ID */}
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/20 border border-white/5">
                      <div className="p-2 rounded-xl bg-zinc-900/50 text-zinc-500">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-500 block">Interaction ID</span>
                        <p className="font-mono text-xs text-zinc-300 truncate select-all">{chat.interaction_id}</p>
                      </div>
                    </div>

                    {/* Options & Context Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Options */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Options</h4>
                        <div className="space-y-2">
                           <div className={`flex items-center justify-between p-3 rounded-2xl border ${chat.options?.enable_search ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-zinc-900/20 border-white/5'}`}>
                              <div className="flex items-center gap-2.5">
                                <Globe className={`w-4 h-4 ${chat.options?.enable_search ? 'text-emerald-400' : 'text-zinc-600'}`} />
                                <span className={`text-sm font-medium ${chat.options?.enable_search ? 'text-emerald-100' : 'text-zinc-400'}`}>Web Search</span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${chat.options?.enable_search ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                           </div>
                           <div className={`flex items-center justify-between p-3 rounded-2xl border ${chat.options?.enable_system_prompt ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-zinc-900/20 border-white/5'}`}>
                              <div className="flex items-center gap-2.5">
                                <Terminal className={`w-4 h-4 ${chat.options?.enable_system_prompt ? 'text-indigo-400' : 'text-zinc-600'}`} />
                                <span className={`text-sm font-medium ${chat.options?.enable_system_prompt ? 'text-indigo-100' : 'text-zinc-400'}`}>System Prompt</span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${chat.options?.enable_system_prompt ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
                           </div>
                        </div>
                      </div>

                      {/* Context */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Context</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/20 border border-white/5">
                            {chat.user_info?.avatar_url ? (
                              <img src={chat.user_info.avatar_url} className="w-8 h-8 rounded-full ring-1 ring-white/10" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><User className="w-4 h-4 text-zinc-500" /></div>
                            )}
                            <div className="min-w-0">
                              <span className="block text-sm font-medium text-zinc-200 truncate">{chat.user_info?.display_name || "User"}</span>
                              <span className="block text-[10px] text-zinc-500 font-mono truncate">{chat.user_id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/20 border border-white/5">
                            {chat.guild_info?.icon_url ? (
                              <img src={chat.guild_info.icon_url} className="w-8 h-8 rounded-xl ring-1 ring-white/10" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center"><Server className="w-4 h-4 text-zinc-500" /></div>
                            )}
                            <div className="min-w-0">
                              <span className="block text-sm font-medium text-zinc-200 truncate">{chat.guild_info?.name || "Server"}</span>
                              <span className="block text-[10px] text-zinc-500 font-mono truncate">{chat.guild_info?.id}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Token Usage Bar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Token Usage</h4>
                        <span className="text-xs font-mono text-zinc-400">{chat.usage?.total_tokens || 0} total</span>
                      </div>
                      <div className="p-4 rounded-3xl bg-zinc-900/20 border border-white/5 space-y-3">
                        <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-indigo-500/50" 
                            style={{ width: `${chat.usage?.total_tokens ? ((chat.usage.prompt_tokens / chat.usage.total_tokens) * 100) : 0}%` }} 
                          />
                          <div 
                            className="h-full bg-violet-500/50" 
                            style={{ width: `${chat.usage?.total_tokens ? ((chat.usage.completion_tokens / chat.usage.total_tokens) * 100) : 0}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span className="text-zinc-400">Prompt: <span className="text-zinc-200 font-mono">{chat.usage?.prompt_tokens || 0}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="text-zinc-400">Completion: <span className="text-zinc-200 font-mono">{chat.usage?.completion_tokens || 0}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="relative group">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(chat, null, 2));
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="absolute top-2 right-2 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-50 transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                      title="Copy JSON"
                    >
                      {copiedJson ? <Check className="w-4 h-4 text-zinc-50" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-all bg-zinc-950/50 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                      {JSON.stringify(chat, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Integrated Navbar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/60"
      >
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Left: Brand & Model Info */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900/50 border border-white/10 group-hover:border-white/20 transition-colors backdrop-blur-sm overflow-hidden">
                <img src="/logo.png" alt="Guizhong" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-zinc-50 hidden sm:block">
                Guizhong
              </span>
            </Link>

            {/* Mobile: Compact Model Info & Stats */}
            <div className="flex md:hidden items-center gap-3 pl-3 border-l border-white/5 overflow-hidden">
               <button onClick={() => setShowInfoModal(true)} className="flex flex-col items-start justify-center gap-0.5 min-w-0" aria-label="Show Model Details">
                  <div className="flex items-center gap-1.5">
                    {modelEmojiUrl && <Image src={modelEmojiUrl} alt={chat.model} width={14} height={14} className="w-3.5 h-3.5 object-contain" />}
                    <span className="text-sm font-medium text-zinc-200 truncate max-w-[120px]">{chat.model}</span>
                    {/* Feature Dots */}
                    <div className="flex gap-1 ml-1">
                      {chat.options?.enable_search && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />}
                      {chat.options?.enable_system_prompt && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                    {chat.processing_time_ms && <span>{(chat.processing_time_ms / 1000).toFixed(2)}s</span>}
                    {chat.processing_time_ms && chat.usage?.total_tokens > 0 && <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />}
                    {chat.usage?.total_tokens > 0 && <span>{chat.usage.total_tokens} toks</span>}
                  </div>
               </button>
            </div>

            {/* Desktop: Model Badge & Stats */}
            <div className="hidden md:flex items-center gap-4 pl-6 border-l border-white/5">
              {/* Model */}
              <button 
                onClick={() => setShowInfoModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-white/5 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors group" 
                aria-label="Show Model Details"
              >
                {modelEmojiUrl ? (
                  <Image src={modelEmojiUrl} alt={chat.model} width={16} height={16} className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Cpu className="w-4 h-4 text-zinc-500" />
                )}
                <span>{chat.model}</span>
              </button>

              {/* Feature Badges (Redesigned) */}
              {(chat.options?.enable_search || chat.options?.enable_system_prompt) && (
                <div className="flex items-center gap-2">
                  {chat.options?.enable_search && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/90 text-xs font-medium">
                      <Globe className="w-3 h-3" />
                      <span>Web</span>
                    </div>
                  )}
                  {chat.options?.enable_system_prompt && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-indigo-400/90 text-xs font-medium">
                      <Terminal className="w-3 h-3" />
                      <span>System</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 ml-2">
                {chat.processing_time_ms && (
                  <div className="flex items-center gap-1.5" title="Latency">
                    <Timer className="w-3.5 h-3.5" />
                    <span className="font-mono">{(chat.processing_time_ms / 1000).toFixed(2)}s</span>
                  </div>
                )}
                {chat.usage?.total_tokens > 0 && (
                  <div className="flex items-center gap-1.5" title="Total Tokens">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-mono">{chat.usage.total_tokens}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            
            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-2">
               {/* View Mode */}
               <div className="flex items-center p-1 rounded-lg bg-zinc-900/50 border border-white/5">
                  <button 
                    onClick={() => setViewMode('rendered')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'rendered' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Rendered View"
                    aria-label="Switch to Rendered View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('raw')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'raw' ? 'bg-zinc-800 text-zinc-50 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Raw Markdown"
                    aria-label="Switch to Raw Markdown View"
                  >
                    <Terminal className="w-4 h-4" />
                  </button>
               </div>

               {/* Text Size */}
               <button 
                  onClick={() => setTextSize(prev => prev === 16 ? 18 : prev === 18 ? 14 : 16)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  title="Toggle Text Size"
                  aria-label="Toggle Text Size"
                >
                  <Type className="w-4 h-4" />
               </button>

               <div className="w-px h-4 bg-white/10 mx-1" />

               {/* Action Buttons */}
               <button onClick={() => setShowInfoModal(true)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors" title="Details" aria-label="Show Chat Details">
                  <Info className="w-4 h-4" />
               </button>
               <button onClick={copyLink} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors" title="Copy Link" aria-label="Copy Link to Clipboard">
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
               </button>
               <button onClick={downloadChat} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors" title="Download" aria-label="Download Chat Log">
                  <Download className="w-4 h-4" />
               </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
              aria-label="Toggle Mobile Menu"
            >
              {showDetails ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {showDetails && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/5 bg-zinc-950/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="p-4 space-y-6">
                
                {/* Mobile: Model & Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Model Info</span>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-900/50 border border-white/5">
                      {modelEmojiUrl && <Image src={modelEmojiUrl} alt={chat.model} width={14} height={14} className="w-3.5 h-3.5 object-contain" />}
                      <span className="text-sm text-zinc-200">{chat.model}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                     <div className="p-2 rounded-lg bg-zinc-900/30 border border-white/5 flex flex-col items-center gap-1">
                        <Timer className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs text-zinc-300">{chat.processing_time_ms ? `${(chat.processing_time_ms / 1000).toFixed(2)}s` : '-'}</span>
                     </div>
                     <div className="p-2 rounded-lg bg-zinc-900/30 border border-white/5 flex flex-col items-center gap-1">
                        <Hash className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs text-zinc-300">{chat.usage?.total_tokens || 0}</span>
                     </div>
                     <div className="p-2 rounded-lg bg-zinc-900/30 border border-white/5 flex flex-col items-center gap-1">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs text-zinc-300">{new Date(chat.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </div>
                  </div>
                </div>

                {/* Mobile: View Controls */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">View Options</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setViewMode('rendered')}
                      className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${viewMode === 'rendered' ? 'bg-zinc-800 border-zinc-700 text-zinc-50' : 'bg-zinc-900/20 border-white/5 text-zinc-400'}`}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">Rendered</span>
                    </button>
                    <button 
                      onClick={() => setViewMode('raw')}
                      className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${viewMode === 'raw' ? 'bg-zinc-800 border-zinc-700 text-zinc-50' : 'bg-zinc-900/20 border-white/5 text-zinc-400'}`}
                    >
                      <Terminal className="w-4 h-4" />
                      <span className="text-sm">Raw</span>
                    </button>
                  </div>
                </div>

                {/* Mobile: Actions */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setShowInfoModal(true)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900/20 border border-white/5 text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 transition-colors">
                      <Info className="w-5 h-5" />
                      <span className="text-xs">Details</span>
                    </button>
                    <button onClick={copyLink} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900/20 border border-white/5 text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 transition-colors">
                      {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <LinkIcon className="w-5 h-5" />}
                      <span className="text-xs">Copy Link</span>
                    </button>
                    <button onClick={downloadChat} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900/20 border border-white/5 text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 transition-colors">
                      <Download className="w-5 h-5" />
                      <span className="text-xs">Download</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="container max-w-6xl mx-auto px-4 py-12 space-y-10">
        
        {conversation.map((msg, index) => (
          <React.Fragment key={msg.interaction_id || index}>
            {/* User Message */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex flex-col items-end gap-2 group"
            >
              <div className="flex items-center justify-between w-full max-w-[85%] md:max-w-[80%] pl-4">
                <div className="flex-1"></div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                      onClick={() => copyToClipboard(msg.prompt, true)}
                      className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                      title="Copy Prompt"
                      aria-label="Copy Prompt"
                    >
                      {copiedPrompt ? <Check className="w-3.5 h-3.5 text-zinc-50" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-xs font-medium text-zinc-500">
                      {msg.user_info?.display_name || chat.user_info?.display_name || "User"}
                    </span>
                </div>
              </div>
              
              <div className="max-w-[85%] md:max-w-[80%]">
                <div 
                  className="px-6 py-4 bg-zinc-900/80 text-zinc-50 rounded-[2rem] rounded-tr-sm border border-white/5 shadow-sm backdrop-blur-sm"
                  style={{ fontSize: `${textSize}px` }}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.prompt}</p>
                </div>
              </div>
            </motion.div>

            {/* AI Response */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.1, duration: 0.3 }}
              className="flex flex-col items-start gap-2 group"
            >
              <div className="flex items-center justify-between w-full max-w-[95%] md:max-w-[90%] pr-4">
                <button 
                  onClick={() => setShowInfoModal(true)}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                  aria-label="Show Model Details"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900/50 border border-white/10 backdrop-blur-sm overflow-hidden">
                    {getModelEmojiUrl(msg.model) ? (
                      <Image src={getModelEmojiUrl(msg.model)!} alt={msg.model} width={24} height={24} className="w-6 h-6 object-contain" />
                    ) : (
                      <Bot className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-zinc-400">{msg.model}</span>
                </button>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                      onClick={() => copyToClipboard(msg.reply, false)}
                      className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                      title="Copy Reply"
                      aria-label="Copy Reply"
                    >
                      {copiedReply ? <Check className="w-3.5 h-3.5 text-zinc-50" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
              </div>
              
              <div className="w-full max-w-[95%] md:max-w-[90%]">
                <div 
                  className="relative px-8 py-8 bg-zinc-950/40 text-zinc-50 rounded-[2rem] rounded-tl-sm border border-white/5 shadow-sm overflow-hidden backdrop-blur-md"
                  style={{ fontSize: `${textSize}px` }}
                >
                  {viewMode === 'rendered' ? (
                    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-2xl prose-pre:backdrop-blur-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <CodeBlock language={match[1]}>{String(children).replace(/\n$/, "")}</CodeBlock>
                            ) : (
                              <code className="bg-zinc-900/50 border border-white/10 text-zinc-300 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono backdrop-blur-sm" {...props}>
                                {children}
                              </code>
                            );
                          },
                          // Custom styling for other elements
                          a: ({ node, ...props }) => <a className="text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/30 hover:decoration-indigo-500/50 transition-all" target="_blank" rel="noopener noreferrer" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-zinc-700 bg-zinc-900/30 pl-4 py-1 rounded-r-2xl italic text-zinc-400 backdrop-blur-sm" {...props} />,
                          table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm"><table className="w-full text-left border-collapse" {...props} /></div>,
                          th: ({ node, ...props }) => <th className="bg-zinc-900/50 p-3 font-semibold text-zinc-200 border-b border-white/5" {...props} />,
                          td: ({ node, ...props }) => <td className="p-3 border-b border-white/5 text-zinc-300" {...props} />,
                          hr: ({ node, ...props }) => <hr className="border-white/5 my-8" {...props} />,
                          img: ({ node, ...props }) => <img className="rounded-2xl border border-white/5 shadow-sm" loading="lazy" {...props} />,
                        }}
                      >
                        {preprocessLaTeX(msg.reply)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
                      {msg.reply}
                    </pre>
                  )}
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        ))}

      </main>
    </div>
  );
}
