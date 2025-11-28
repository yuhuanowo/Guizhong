"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Calendar, User, Bot, Sparkles, Clock, Cpu, Timer, Globe, Terminal, Server, 
  Info, X, ChevronDown, Copy, Check, Download, Hash, Eye, EyeOff, Type, Link as LinkIcon, Menu,
  Maximize2, ZoomIn, ZoomOut, RotateCcw
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

const getFaviconUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
};

const CodeBlock = ({ language, children }: { language: string, children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-2xl overflow-hidden border border-white/5 bg-zinc-900/50 shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/30 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400">{language || 'text'}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="Copy Code"
          aria-label="Copy Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-zinc-200" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1.25rem', background: 'transparent', fontSize: '0.875rem' }}
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

const MessageContent = ({ content, textSize, viewMode, openImagePreview }: any) => {
  if (viewMode === 'raw') {
     return (
        <pre className="whitespace-pre-wrap font-mono text-zinc-300 leading-relaxed" style={{ fontSize: `${textSize}px` }}>
          {content}
        </pre>
     );
  }

  return (
    <div 
      className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none"
      style={{ fontSize: `${textSize}px` }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <CodeBlock language={match[1]}>{String(children).replace(/\n$/, "")}</CodeBlock>
            ) : (
              <code className="bg-zinc-900/30 border border-white/5 text-zinc-200 px-1.5 py-0.5 rounded-lg text-[0.9em] font-mono" {...props}>
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-zinc-50 underline decoration-zinc-500/50 hover:decoration-zinc-400/50 transition-colors" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-2xl border border-white/5 bg-zinc-900/30 shadow-lg shadow-black/10 backdrop-blur-sm">
              <table className="w-full text-left border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-zinc-900/20 border-b border-white/5" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 font-medium text-zinc-300 text-sm" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 border-b border-white/5 text-zinc-400 text-sm" {...props} />
          ),
          img: ({ node, ...props }) => (
            <img 
              {...props} 
              className="rounded-2xl border border-white/5 cursor-zoom-in shadow-lg shadow-black/10 hover:border-white/10 transition-colors"
              onClick={() => props.src && openImagePreview(props.src as string)}
            />
          )
        }}
      >
        {preprocessLaTeX(content)}
      </ReactMarkdown>
    </div>
  );
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
  
  const [expandedSearch, setExpandedSearch] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const toggleSearch = (id: string) => {
    setExpandedSearch(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openImagePreview = (src: string) => {
    setPreviewImage(src);
    setImageScale(1);
    setImageRotation(0);
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
  };

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
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
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
              className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
                      {JSON.stringify(chat, (key, value) => {
                        if (key === 'generated_image' && typeof value === 'string' && value.length > 100) {
                          return value.substring(0, 50) + '...' + value.substring(value.length - 20);
                        }
                        return value;
                      }, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
               <button onClick={() => setImageScale(s => Math.max(0.5, s - 0.5))} className="p-2 rounded-full bg-zinc-800/50 text-zinc-200 hover:bg-zinc-700"><ZoomOut className="w-5 h-5" /></button>
               <button onClick={() => setImageScale(s => Math.min(5, s + 0.5))} className="p-2 rounded-full bg-zinc-800/50 text-zinc-200 hover:bg-zinc-700"><ZoomIn className="w-5 h-5" /></button>
               <button onClick={() => setImageRotation(r => r + 90)} className="p-2 rounded-full bg-zinc-800/50 text-zinc-200 hover:bg-zinc-700"><RotateCcw className="w-5 h-5" /></button>
               <a href={previewImage} download="generated-image.png" className="p-2 rounded-full bg-zinc-800/50 text-zinc-200 hover:bg-zinc-700"><Download className="w-5 h-5" /></a>
               <button onClick={closeImagePreview} className="p-2 rounded-full bg-zinc-800/50 text-zinc-200 hover:bg-red-500/20 hover:text-red-400"><X className="w-5 h-5" /></button>
            </div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden"
            >
               <motion.img 
                 src={previewImage} 
                 alt="Preview" 
                 className="max-w-full max-h-full object-contain transition-transform duration-200"
                 style={{ transform: `scale(${imageScale}) rotate(${imageRotation}deg)` }}
                 drag
                 dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
               />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Integrated Navbar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl supports-backdrop-filter:bg-zinc-950/60"
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

      <main className="container max-w-6xl mx-auto px-4 py-12 space-y-12">
        
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
                  className="px-6 py-4 bg-zinc-900/80 text-zinc-50 rounded-4xl rounded-tr-sm border border-white/5 shadow-lg shadow-black/10 backdrop-blur-sm"
                >
                  <MessageContent 
                    content={msg.prompt} 
                    textSize={textSize} 
                    viewMode="rendered" 
                    openImagePreview={openImagePreview} 
                  />
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
                  className="relative px-8 py-8 bg-zinc-950/40 text-zinc-50 rounded-4xl rounded-tl-sm border border-white/5 shadow-xl shadow-black/10 overflow-hidden backdrop-blur-md"
                >
                  <MessageContent 
                    content={msg.reply} 
                    textSize={textSize} 
                    viewMode={viewMode} 
                    openImagePreview={openImagePreview} 
                  />

                  {/* Generated Image */}
                  {msg.generated_image && (
                    <div className="mt-6">
                      <div className="inline-flex flex-col gap-2 max-w-md">
                        <div className="flex items-center gap-2 px-1">
                          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-xs font-medium text-zinc-400">Generated Image</span>
                        </div>
                        <div 
                          className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 cursor-zoom-in group/image shadow-lg hover:shadow-violet-500/10 transition-all"
                          onClick={() => openImagePreview(msg.generated_image)}
                        >
                          <img 
                            src={msg.generated_image} 
                            alt="Generated Content" 
                            className="w-full h-auto"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                             <div className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white transform scale-90 group-hover/image:scale-100 transition-transform">
                                <Maximize2 className="w-6 h-6" />
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Video */}
                  {msg.generated_video && (
                    <div className="mt-6">
                      <div className="inline-flex flex-col gap-2 max-w-md">
                        <div className="flex items-center gap-2 px-1">
                          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-xs font-medium text-zinc-400">Generated Video</span>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 shadow-lg">
                          <video 
                            src={msg.generated_video} 
                            controls 
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {msg.search_results && msg.search_results.length > 0 && (
                    <div className="mt-6">
                      {/* Header */}
                      <motion.button 
                        onClick={() => toggleSearch(msg.interaction_id || index.toString())}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/50 border border-white/5 hover:border-white/10 backdrop-blur-md transition-all text-xs font-medium text-zinc-400 hover:text-zinc-200 select-none w-fit shadow-sm"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${expandedSearch[msg.interaction_id || index.toString()] ? 'rotate-180' : ''}`} />
                        <span>{msg.search_results.length} Sources</span>
                        
                        {!expandedSearch[msg.interaction_id || index.toString()] && (
                          <motion.div 
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="flex items-center overflow-hidden"
                          >
                            <div className="w-px h-3 bg-white/10 mx-1 shrink-0" />
                            <div className="flex -space-x-1.5 opacity-80">
                              {msg.search_results.slice(0, 5).map((result: any, i: number) => (
                                <img 
                                  key={i}
                                  src={getFaviconUrl(result.url) || result.source} 
                                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                  alt="" 
                                  className="w-4 h-4 rounded-full ring-2 ring-zinc-900 bg-zinc-800 object-cover" 
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </motion.button>

                      {/* List Content */}
                      <AnimatePresence initial={false}>
                        {expandedSearch[msg.interaction_id || index.toString()] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-1 pl-1 pt-2 pb-1">
                              {msg.search_results.map((result: any, i: number) => (
                                <motion.a 
                                  key={i} 
                                  href={result.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2, delay: i * 0.03 }}
                                  className="group/link relative flex gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors"
                                >
                                  {/* Number & Icon */}
                                  <div className="flex flex-col items-center gap-2 pt-0.5">
                                    <div className="w-4 h-4 rounded-full flex items-center justify-center overflow-hidden opacity-60 group-hover/link:opacity-100 transition-opacity shrink-0 ring-1 ring-white/10 group-hover/link:ring-indigo-500/50">
                                      <img 
                                        src={getFaviconUrl(result.url) || result.source} 
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                        alt="" 
                                        className="w-full h-full object-cover" 
                                      />
                                      <Globe className="hidden w-3 h-3 text-zinc-500 absolute" />
                                    </div>
                                    {/* Static Line with Hover Effect */}
                                    <div className="w-px h-full bg-white/10 group-hover/link:bg-indigo-500/30 transition-colors" />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0 pb-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-[10px] font-mono text-zinc-500 group-hover/link:text-zinc-300 transition-colors truncate">
                                        {new URL(result.url).hostname.replace(/^www\./, '')}
                                      </span>
                                      {result.date && (
                                        <span className="text-[10px] text-zinc-600 shrink-0">
                                          {new Date(result.date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <h4 className="text-sm font-medium text-zinc-300 group-hover/link:text-indigo-300 transition-colors leading-snug mb-1.5">
                                      {result.title}
                                    </h4>
                                    
                                    {result.contentSnippet && (
                                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed group-hover/link:text-zinc-400 transition-colors">
                                        {result.contentSnippet}
                                      </p>
                                    )}
                                  </div>
                                </motion.a>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
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
