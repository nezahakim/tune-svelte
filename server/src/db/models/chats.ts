import type { ObjectId } from "mongodb";
import type { User } from "../models/users";

export interface Chat{
    _id?: ObjectId;
    chatType: string;
    participants?: [];
    imageUrl?: string;
    chatName?: string;
    lastMessage?: string;
    createdAt: Date;
}

export interface ChatMessage{
    _id?: ObjectId;
    chatId: ObjectId;
    from: ObjectId;
    message: string;
    createdAt: Date;
    readBy?: User[];
    reactions?: {id: ObjectId, emoji: string }[];
}