import { Server, Socket } from "socket.io";
import { Server as HTTPServer } from 'http';
import ChatController from "../db/controllers/chat";
import { ObjectId } from "mongodb";

export class SocketHandler {
    private io: Server;
    private chatController: ChatController;

    constructor(server: HTTPServer) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE"]
            }
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
                    chatData.participants.forEach((participantId: string) => {
                        this.io.to(participantId).emit("chatCreated", chatResponse.data);
                    });
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
                    this.io.to(messageData.chatId.toString()).emit("newMessage", messageResponse.data);
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
        socket.on("readMessage", async ({ messageId, userId }) => {
            try {
                const readResponse = await this.chatController.readMessage(
                    new ObjectId(messageId),
                    new ObjectId(userId)
                );
                if (readResponse.success) {
                    this.io.to(messageId).emit("messageRead", {
                        messageId,
                        userId
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
        
        this.handleChatEvents(socket);
        this.handleUserEvents(socket);

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    }

    public initialize(): void {
        this.io.on("connection", (socket: Socket) => {
            this.handleConnection(socket);
        });
    }
}