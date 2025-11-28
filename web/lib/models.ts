import mongoose, { Model, Document } from "mongoose";

export interface IChatLogData {
  user_id: string;
  model: string;
  prompt: string;
  reply: string;
  timestamp: Date;
  interaction_id: string;
  parent_id?: string;
  user_info?: {
    username: string;
    avatar_url: string;
    display_name: string;
  };
  guild_info?: {
    name: string;
    id: string;
    icon_url: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  options?: {
    enable_search: boolean;
    enable_system_prompt: boolean;
  };
  processing_time_ms?: number;
  search_results?: Array<{
    title: string;
    url: string;
    contentSnippet: string;
    source: string;
  }>;
  generated_image?: string;
  generated_video?: string;
  tool_used?: string;
}

export interface IChatLog extends Omit<Document, "model">, IChatLogData {}

const chatLogSchema = new mongoose.Schema<IChatLog>({
  user_id: String,
  model: String,
  prompt: String,
  reply: String,
  timestamp: { type: Date, default: Date.now },
  interaction_id: String,
  parent_id: String,
  user_info: {
    username: String,
    avatar_url: String,
    display_name: String
  },
  guild_info: {
    name: String,
    id: String,
    icon_url: String
  },
  usage: {
    prompt_tokens: Number,
    completion_tokens: Number,
    total_tokens: Number
  },
  options: {
    enable_search: Boolean,
    enable_system_prompt: Boolean
  },
  processing_time_ms: Number,
  search_results: [{
    title: String,
    url: String,
    contentSnippet: String,
    source: String
  }],
  generated_image: String,
  generated_video: String,
  tool_used: String
});

// Prevent overwriting the model if it's already compiled
const ChatLog: Model<IChatLog> = mongoose.models.ChatLog || mongoose.model<IChatLog>("ChatLog", chatLogSchema);

export default ChatLog;
