import React from "react";
import dbConnect from "@/lib/db";
import ChatLog from "@/lib/models";
import HomeView from "./HomeView";

// Force dynamic rendering to ensure stats are up-to-date
export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    await dbConnect();
    
    const totalChats = await ChatLog.countDocuments();
    const lastChat = await ChatLog.findOne().sort({ timestamp: -1 }).select('timestamp').lean();
    
    // New Stats
    const totalUsers = (await ChatLog.distinct('user_id')).length;
    const totalTokensResult = await ChatLog.aggregate([
      { $group: { _id: null, total: { $sum: "$usage.total_tokens" } } }
    ]);
    const totalTokens = totalTokensResult[0]?.total || 0;
    
    // Calculate a mock latency based on DB ping (simplified)
    const start = Date.now();
    await ChatLog.findOne().select('_id').lean();
    const latency = Date.now() - start;

    // Format last active time
    let lastActive = "Unknown";
    if (lastChat && lastChat.timestamp) {
      const diff = Date.now() - new Date(lastChat.timestamp).getTime();
      if (diff < 60000) lastActive = "Just now";
      else if (diff < 3600000) lastActive = `${Math.floor(diff / 60000)}m ago`;
      else if (diff < 86400000) lastActive = `${Math.floor(diff / 3600000)}h ago`;
      else lastActive = `${Math.floor(diff / 86400000)}d ago`;
    }

    return {
      totalChats,
      totalUsers,
      totalTokens,
      lastActive,
      status: "Online",
      latency: `${latency}ms`
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return {
      totalChats: 0,
      totalUsers: 0,
      totalTokens: 0,
      lastActive: "Offline",
      status: "Maintenance",
      latency: "---"
    };
  }
}

export default async function Home() {
  const stats = await getStats();
  return <HomeView stats={stats} />;
}

