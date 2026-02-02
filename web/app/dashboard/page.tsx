import { auth } from "@/auth"
import { redirect } from "next/navigation"
import dbConnect from "@/lib/db"
import ChatLog from "@/lib/models"
import DashboardView from "./DashboardView"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
}

// Force dynamic rendering to ensure we get the latest session and data
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  await dbConnect()

  // Fetch user's chat logs
  // Sort by timestamp descending
  const chats = await ChatLog.find({ user_id: session.user.id })
    .sort({ timestamp: -1 })
    .lean()

  // Serialize the data to pass to client component
  const serializedChats = chats.map(chat => ({
    ...chat,
    _id: (chat as any)._id.toString(),
    timestamp: chat.timestamp ? new Date(chat.timestamp).toISOString() : null,
  }))

  return (
    <DashboardView 
      chats={serializedChats as any} 
      user={session.user} 
    />
  )
}
