"use server";

import dbConnect from "@/lib/db";
import { ChatLog, Memory } from "@/lib/models";
import { auth } from "@/auth";

export async function getUserProfileData() {
  const session = await auth();
  if (!session?.user?.id) return null;

  await dbConnect();

  const userId = session.user.id;

  // Parallelize queries for performance
  const [stats, modelUsage, memoryDoc, firstChat] = await Promise.all([
    ChatLog.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: null,
          totalChats: { $sum: 1 },
          totalTokens: { $sum: "$usage.total_tokens" },
          lastActive: { $max: "$timestamp" },
          avgLatency: { $avg: "$processing_time_ms" },
          imageCount: { 
            $sum: { 
              $cond: [{ $and: [{ $ne: ["$generated_image", null] }, { $ne: ["$generated_image", ""] }] }, 1, 0] 
            } 
          },
          searchCount: {
             $sum: {
                $cond: [{ $gt: [{ $size: { $ifNull: ["$search_results", []] } }, 0] }, 1, 0]
             }
          }
        }
      }
    ]),
    ChatLog.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: "$model", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    Memory.findOne({ user_id: userId }).lean(),
    ChatLog.findOne({ user_id: userId }).sort({ timestamp: 1 }).select("timestamp").lean()
  ]);

  const userStats = stats[0] || { 
    totalChats: 0, 
    totalTokens: 0, 
    lastActive: null, 
    avgLatency: 0,
    imageCount: 0,
    searchCount: 0
  };

  return {
    stats: {
      ...userStats,
      lastActive: userStats.lastActive ? userStats.lastActive.toISOString() : null,
      memberSince: firstChat?.timestamp ? firstChat.timestamp.toISOString() : new Date().toISOString(),
    },
    topModels: modelUsage.map((m: any) => ({ name: m._id, count: m.count })),
    memory: memoryDoc?.memory || null,
    discordId: userId
  };
}
