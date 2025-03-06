import ChatController from "../db/controllers/chat";
import type { ChatMessage } from "../db/models/chats";
import type { User } from "../db/models/users";
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

export class LiveChatHandler {
    private io: Server;
    private chatController: ChatController;

    constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.chatController = new ChatController();
        this.setupSocketEvents();
    }

    private setupSocketEvents(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log(`User connected: ${socket.id}`);

            // Join a chat
            socket.on('join_chat', (chatId: string) => {
                socket.join(chatId);
                console.log(`User ${socket.id} joined chat: ${chatId}`);
            });

            // Leave a chat
            socket.on('leave_chat', (chatId: string) => {
                socket.leave(chatId);
                console.log(`User ${socket.id} left chat: ${chatId}`);
            });

            // Handle new message
            socket.on('send_message', async (data: {
                content: string,
                chatId: string,
                sender: string, // sender's userId
                timestamp?: Date
            }) => {
                try {
                    const newMessage = await this.chatController.createMessage({
                        content: data.content,
                        sender: data.sender,
                        chat: data.chatId,
                        timestamp: data.timestamp || new Date()
                    });

                    this.io.to(data.chatId).emit('receive_message', newMessage);
                } catch (error) {
                    console.error('Error sending message:', error);
                    socket.emit('error', 'Failed to send message');
                }
            });

            // Handle typing indicator
            socket.on('typing', (data: { chatId: string, userId: string, username: string }) => {
                socket.to(data.chatId).emit('user_typing', {
                    userId: data.userId,
                    username: data.username
                });
            });

            // Handle stop typing
            socket.on('stop_typing', (data: { chatId: string, userId: string, username: string }) => {
                socket.to(data.chatId).emit('user_stop_typing', {
                    userId: data.userId,
                    username: data.username
                });
            });

            // Handle read receipts
            socket.on('mark_read', async (data: { 
                chatId: string, 
                userId: string, 
                messageId: string 
            }) => {
                try {
                    await this.chatController.markMessageAsRead(data.messageId, data.userId);
                    socket.to(data.chatId).emit('message_read', {
                        messageId: data.messageId,
                        userId: data.userId
                    });
                } catch (error) {
                    console.error('Error marking message as read:', error);
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
            });
        });
    }

    // Method to emit events to specific chats
    public emitToChat(chatId: string, event: string, data: any): void {
        this.io.to(chatId).emit(event, data);
    }
}

export default LiveChatHandler;