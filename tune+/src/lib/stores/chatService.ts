import { Socket } from 'socket.io-client';
import type { Chat, Message } from '$lib/types';

export class ChatService {
    constructor(private socket: Socket) {}

    joinChat(chatId: string): Promise<{ chat: Chat; messages: Message[] }> {
        return new Promise((resolve, reject) => {
            this.socket.emit('joinChat', chatId);

            this.socket.on('chatJoined', (data) => {
                resolve(data);
            });

            this.socket.on('error', (error) => {
                reject(error);
            });
        });
    }

    leaveChat(chatId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.emit('leaveChat', chatId);

            this.socket.on('leftChat', () => {
                resolve();
            });

            this.socket.on('error', (error) => {
                reject(error);
            });
        });
    }
}