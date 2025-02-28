import type { ObjectId } from "mongodb";

export interface Chat{
    _id: ObjectId;
    chatType: string;
    chatParticipants?: []
}

export interface ChatMessage{
    _id: ObjectId;
    chatId: ObjectId;
    from: ObjectId;
    to: ObjectId;
    message: string;
    createdAt: Date;
}