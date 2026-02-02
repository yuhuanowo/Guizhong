import React, { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import dbConnect from "@/lib/db";
import ChatLog, { IChatLogData } from "@/lib/models";
import ChatView from "./ChatView";

const getChat = cache(async (id: string) => {
  await dbConnect();
  
  let chat = await ChatLog.findOne({ interaction_id: id }).lean() as unknown as (IChatLogData & { _id: any }) | null;
  
  // If not found, try by _id (MongoDB ObjectId) just in case
  if (!chat && id.match(/^[0-9a-fA-F]{24}$/)) {
    chat = await ChatLog.findById(id).lean() as unknown as (IChatLogData & { _id: any }) | null;
  }
  
  if (chat) {
    // Fetch history recursively
    const history: (Omit<IChatLogData, 'timestamp'> & { _id: string; timestamp: string })[] = [];
    let currentParentId = chat.parent_id;
    let depth = 0;
    const MAX_DEPTH = 20; // Prevent infinite loops

    while (currentParentId && depth < MAX_DEPTH) {
      const parentChat = await ChatLog.findOne({ interaction_id: currentParentId }).lean() as unknown as (IChatLogData & { _id: any }) | null;
      
      if (!parentChat) break;

      history.unshift({
        ...parentChat,
        _id: parentChat._id.toString(),
        timestamp: parentChat.timestamp.toISOString(),
        search_results: parentChat.search_results?.map((result: any) => ({
          title: result.title,
          url: result.url,
          contentSnippet: result.contentSnippet,
          source: result.source || result.icon || ''
        }))
      });

      currentParentId = parentChat.parent_id;
      depth++;
    }

    return {
      ...chat,
      _id: chat._id.toString(),
      timestamp: chat.timestamp.toISOString(),
      search_results: chat.search_results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        contentSnippet: result.contentSnippet,
        source: result.source || result.icon || ''
      })),
      history
    };
  }
  
  return null;
});

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import crypto from "crypto";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const chat = await getChat(id);

  if (!chat) {
    return {
      title: "Chat Not Found",
    };
  }

  const title = chat.title || (chat.prompt.length > 50 ? `${chat.prompt.substring(0, 50)}...` : chat.prompt);

  return {
    title: title,
    description: `View AI conversation with ${chat.model}`,
    openGraph: {
      title: title,
      description: `View AI conversation with ${chat.model}`,
      type: "article",
    },
  };
}

export default async function ChatPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { token } = await searchParams;
  const chat = await getChat(id);

  if (!chat) {
    notFound();
  }

  const session = await auth();
  const secret = process.env.CHAT_ACCESS_SECRET || "CHANGE_THIS_TO_A_SECURE_SECRET";
  const expectedToken = crypto.createHmac('sha256', secret).update(id).digest('hex');
  
  const isValidToken = token === expectedToken;
  const isOwner = session?.user?.id === chat.user_id;

  if (!isOwner && !isValidToken) {
    if (!session) {
       redirect(`/login?callbackUrl=/chat/${id}`);
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-zinc-400">You do not have permission to view this chat.</p>
          <Link href="/dashboard" className="text-indigo-400 hover:underline">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  const accessMethod = isOwner ? 'owner' : 'token';

  return <ChatView chat={chat} accessMethod={accessMethod} user={session?.user} />;
}
