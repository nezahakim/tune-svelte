import { Server, Socket } from "socket.io";
import { Server as HTTPServer } from 'http';
import ChatController from "../db/controllers/chat";
import { ObjectId } from "mongodb";
import type { User } from "../lib/types";
import UserController from "../db/controllers/user";

interface RoomParticipant {
    userId: string;
    peerId: string;
    user: User;
}

export class SocketHandler {
    private io: Server;
    private chatController: ChatController;
    private roomParticipants: Record<string, RoomParticipant[]> = {};


    constructor(server: HTTPServer) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE"]
            },
            transports: ['websocket'],
        });

        this.io.use((socket, next) => {
            const auth = socket.handshake.auth;
            if (!auth.userId) {
                return next(new Error("Authentication failed"));
            }
            
            socket.id = auth.userId;
            next();
        })

        this.chatController = new ChatController();
    }

    private handleAudioEvents(socket: Socket): void {
        // Join audio room
        socket.on("joinRoom", (roomId: string, peerId: string, user: User) => {
            // console.log(`User ${socket.id} joined room ${roomId} with peer ID ${peerId}`, user);
            socket.join(roomId);
            
            // Store participant information
            if (!this.roomParticipants[roomId]) {
                this.roomParticipants[roomId] = [];
            }
            
            // Check if user is already in room (might be rejoining after refresh)
            const existingParticipantIndex = this.roomParticipants[roomId].findIndex(
                p => p.userId === socket.id
            );
            
            if (existingParticipantIndex >= 0) {
                this.roomParticipants[roomId][existingParticipantIndex] = {
                    userId: socket.id,
                    peerId,
                    user
                };
            } else {
                this.roomParticipants[roomId].push({
                    userId: socket.id,
                    peerId,
                    user
                });
            }
            
            // Emit to all other users in the room
            this.io.in(roomId).emit("userJoined", {
                userId: socket.id,
                user: user
            });
            
        });
        
        // Get room participants (for users joining or refreshing)
        socket.on("getRoomParticipants", (roomId: string) => {
            if (this.roomParticipants[roomId]) {
                this.io.in(roomId).emit("roomParticipants", this.roomParticipants[roomId]);
            } else {
                this.io.in(roomId).emit("roomParticipants", []);
            }
        });
        
        // Leave room
        socket.on("leaveRoom", (roomId: string, userId: string) => {
            console.log(`User ${userId} left room ${roomId}`);
            socket.leave(roomId);
            
            // Remove from participants list
            if (this.roomParticipants[roomId]) {
                this.roomParticipants[roomId] = this.roomParticipants[roomId].filter(
                    p => p.userId !== userId
                );
                
                // If room is empty, clean up
                if (this.roomParticipants[roomId].length === 0) {
                    delete this.roomParticipants[roomId];
                }
            }
            
            // Notify others
            socket.to(roomId).emit("user-disconnected", userId);
        });
        
        // User speaking status
        socket.on("userSpeaking", (roomId: string, data: { userId: string, speaking: boolean }) => {
            socket.to(roomId).emit("userSpeaking", data);
        });
        
        // Emoji reactions
        socket.on("emojiReaction", (roomId: string, data: { userId: string, emoji: string }) => {
            this.io.in(roomId).emit("emojiReaction", data);
        });
        
        // Pass speaking turn
        socket.on("passSpeaking", (roomId: string, userId: string) => {
            socket.to(roomId).emit("passSpeaking", userId);
        });
    }

    private handleChatEvents(socket: Socket): void {

        // Join chat room
        socket.on("joinChat", async (chatId: string) => {
            try {
                const objectId = new ObjectId(chatId);
                const chatResponse = await this.chatController.getChat(objectId);
                
                if (chatResponse.success) {
                    await socket.join(chatId);
                    const messagesResponse = await this.chatController.getChatMessages(objectId);
                    socket.emit("chatJoined", {
                        chat: chatResponse.data,
                        messages: messagesResponse.data
                    });
                } else {
                    socket.emit("error", { message: chatResponse.message });
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to join chat" });
            }
        });

        socket.on("getChats", async (userId: string) => {
            try {
                const chatsResponse = await this.chatController.getChats(userId);  
                if (chatsResponse.success) {
                    socket.emit("chats", chatsResponse.data);
                } else {
                    socket.emit("error", { message: chatsResponse.message });
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to get chats" });
            }
        });

        socket.on("getChatMessages", async (chatId: string) => {
            try {
                const messagesResponse = await this.chatController.getChatMessages(new ObjectId(chatId));
                if (messagesResponse.success) {
                    socket.emit("chatMessages", messagesResponse.data);
                } else {
                    socket.emit("error", { message: messagesResponse.message });
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to get chat messages" });
            }
        });

        // Create new chat
        socket.on("createChat", async (chatData) => {
            try {
                const chatResponse = await this.chatController.createChat(chatData);
                if (chatResponse.success) {
                    const chatId = chatResponse.data._id.toString();
                    socket.join(chatId);
                    this.io.in(chatId).emit("chatCreated", chatResponse.data);

                    // chatData.participants.forEach((participantId: string) => {
                    //     this.io.to(chatId).emit("chatCreated", chatResponse.data);
                    // });
                } else {
                    socket.emit("error", { message: chatResponse.message });
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to create chat" });
            }
        });

        // Send message
        socket.on("sendMessage", async (messageData) => {
            try {
                let {chatId,from,message,createdAt} = messageData
                let ChatId = new ObjectId(chatId)
                let From = new ObjectId(from)

                let MessageData = {
                    chatId: ChatId,
                    from: From,
                    message,
                    createdAt
                }

                const messageResponse = await this.chatController.createChatMessage(MessageData);
                if (messageResponse.success) {
                    console.log('Mesage')
                    socket.emit('new-message', messageResponse.data)
                    this.io.in(messageData.chatId).emit("newMessage", messageResponse.data);
                } else {
                    socket.emit("error", { message: messageResponse.message });
                }
            } catch (error) {
                console.log(error)
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // React to message
        socket.on("addReaction", async ({ messageId, reaction }) => {
            try {
                const reactionResponse = await this.chatController.addReaction(
                    new ObjectId(messageId),
                    reaction
                );
                if (reactionResponse.success) {
                    this.io.to(messageId).emit("reactionAdded", {
                        messageId,
                        reaction
                    });
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to add reaction" });
            }
        });

        // Mark message as read
        socket.on("readMessage", async ({ messageId, userId, chatId}) => {
            try {
                const readResponse = await this.chatController.readMessage(
                    new ObjectId(messageId),
                    new ObjectId(userId)
                );
                
                const user = new UserController();
                const result = await user.getUserById(new ObjectId(userId));

                if (readResponse.success) {
                    this.io.in(chatId).emit("messageRead", {
                        messageId,
                        user: result.data
                    });
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to mark message as read" });
            }
        });

        // Delete message
        socket.on("deleteMessage", async (messageId) => {
            try {
                const deleteResponse = await this.chatController.deleteChatMessage(new ObjectId(messageId));
                if (deleteResponse.success) {
                    this.io.to(messageId).emit("messageDeleted", messageId);
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to delete message" });
            }
        });

        socket.on("userTyping", ({ chatId, userId }) => {
            // this.io.to(chatId).emit("user-Typing", userId);
            socket.to(chatId).emit("user-Typing", userId)
        });

        // Leave chat
        socket.on("leaveChat", async (chatId: string) => {
            try {
                await socket.leave(chatId);
                socket.emit("leftChat", chatId);
            } catch (error) {
                socket.emit("error", { message: "Failed to leave chat" });
            }
        });
    }

    private handleUserEvents(socket: Socket): void {
        socket.on("getUnreadMessages", async (userId: string) => {
            try {
                const unreadResponse = await this.chatController.getUnreadMessages(new ObjectId(userId));
                if (unreadResponse.success) {
                    socket.emit("unreadMessages", unreadResponse.data);
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to get unread messages" });
            }
        });
    }

    private handleConnection(socket: Socket): void {
        console.log(`Client connected: ${socket.id}`);
        
        this.handleAudioEvents(socket);
        this.handleChatEvents(socket);
        this.handleUserEvents(socket);

        socket.on("disconnect", (error) => {
            console.log(error)
            console.log(`Client disconnected: ${socket.id}`);
        });
    }

    public initialize(): void {
        this.io.on("connection", (socket: Socket) => {
            this.handleConnection(socket);
        });
    }
}