import type { ObjectId } from "mongodb";

export interface User{
    _id?: ObjectId;
    name?: string;
    username?: string;
    email: string;
    phone?: {code: number, number: number};
    password?: string;
    avatar?: string;
    preferences?: {
        theme: 'light' | 'dark';
        color: string;
    };
    bio?: string;
    joinDate?: Date;
}