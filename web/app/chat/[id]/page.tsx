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

interface PageProps {
  params: Promise<{
    id: string;
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

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;
  const chat = await getChat(id);

  if (!chat) {
    notFound();
  }

  return <ChatView chat={chat} />;
}
