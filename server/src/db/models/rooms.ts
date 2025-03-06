import type { ObjectId } from "mongodb";

export interface Room{
    _id?: ObjectId;
    title: string;
    discription: string;
    rules: [];
    createdAt: Date;
}

export interface RoomParticipant{
    _id?: ObjectId;
    roomId: ObjectId;
    participantId: ObjectId;
    role: string;
    joinDate: Date;
}

