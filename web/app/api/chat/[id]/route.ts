import dbConnect from "@/lib/db";
import ChatLog from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await dbConnect();
    
    // Try to find by interaction_id first (which is the message ID)
    let chat = await ChatLog.findOne({ interaction_id: id });
    
    // If not found, try by _id (MongoDB ObjectId) just in case
    if (!chat && id.match(/^[0-9a-fA-F]{24}$/)) {
      chat = await ChatLog.findById(id);
    }

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Fetch history
    let history = [];
    let currentParentId = chat.parent_id;
    let depth = 0;
    const limit = 20;

    while (currentParentId && depth < limit) {
      const parentChat = await ChatLog.findOne({ interaction_id: currentParentId, user_id: chat.user_id });
      if (!parentChat) break;
      
      history.unshift(parentChat);
      currentParentId = parentChat.parent_id;
      depth++;
    }

    return NextResponse.json({ ...chat.toObject(), history });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
