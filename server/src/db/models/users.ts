import type { ObjectId } from "mongodb";

export interface User{
    _id?: ObjectId;
    name?: string;
    username?: string;
    email: string;
    phone: {code: number, number: number};
    bio?: string;
    joinDate?: Date;
}