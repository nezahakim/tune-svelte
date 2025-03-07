import type { Chat, ChatMessage } from "../models/chats";
import { ObjectId } from "mongodb";
import { chatsCollection, chatMessagesCollection } from "../collections";
import UserController from "./user";

interface ChatResponse {
    success: boolean;
    data?: any;
    message?: string;
}

interface LastMessage {
    user: string | ObjectId;
    message: string;
}

const user = new UserController();

class ChatController{

    public async createChat(chat: Chat): Promise<ChatResponse> {
        try {
            const result = await chatsCollection.insertOne(chat);
            const insertedChat = await chatsCollection.findOne({ _id: result.insertedId });
            return {
                success: true,
                data: insertedChat
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async getChat(chatId: ObjectId): Promise<ChatResponse> {
        try {
            const chat = await chatsCollection.findOne({ _id: chatId });
            return {
                success: true,
                data: chat
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async get_Chats(): Promise<ChatResponse> {
        try {
            const chats = await chatsCollection.find({}).toArray();
            return {
                success: true,
                data: chats
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async deleteAllChats(): Promise<ChatResponse> {
            try {
                const result = await chatsCollection.deleteMany({});
                return {
                    success: result.acknowledged && result.deletedCount > 0,
                    message: result.deletedCount > 0 ? 'All users deleted successfully' : 'No users found'
                };
            } catch (error) {
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error occurred'
                };
            }
    }

    // public async getChats(userId: string): Promise<ChatResponse> {
    //     try {
    //         const chats = await chatsCollection.find({ participants: userId  }).toArray();
    //         // const ReceiverInfo = ;
            
    //         const ChatData = chats.map((chat: Chat) => {
    //             return {
    //                 id: chat._id,
    //                 name: chat.chatName,
    //                 lastMessage: chat.lastMessage,
    //                 avatar: user.getUserById(chat?.participants[1]).data.avatar,
    //                 participants: [chat?.participants[0], await user.getUserById(chat?.participants[1])],
    //                 unreadCount: await chatMessagesCollection.countDocuments({ chatId: chat._id, readBy: { $nin: [userId] } }),
    //                 createdAt: chat.createdAt
    //             }
    //         })

    //         return {
    //             success: true,
    //             data: chats
    //         }
    //     } catch (error: any) {
    //         return {
    //             success: false,
    //             message: error.message
    //         }
    //     }
    // }

    public async getChats(userId: string): Promise<ChatResponse> {
        try {
            const chats = await chatsCollection.find({ participants: userId }).toArray();
            
            const ChatData = await Promise.all(chats.map(async (chat: Chat) => {
                const receiverUser = await user.getUserById(new ObjectId(chat?.participants[1]));
                const senderUser = await user.getUserById(new ObjectId(chat?.participants[0]));

                if (!receiverUser.success || !senderUser.success) {
                    throw new Error(`Failed to get user info for ID: ${chat?.participants[1]} or ${chat?.participants[0]}`);
                }
    
                return {
                    id: chat._id,
                    chatType: chat.chatType,
                    name: chat.chatType === "private" ? receiverUser.data.name :chat.chatName,
                    lastMessage: chat.lastMessage,
                    participants: [
                        senderUser.data, 
                        receiverUser.data
                    ],
                    unreadCount: await chatMessagesCollection.countDocuments({ 
                        chatId: chat._id, 
                        readBy: { $nin: [userId] } 
                    }),
                    createdAt: chat.createdAt
                };
            }));

            return {
                success: true,
                data: ChatData
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    public async updateChat(chatId: ObjectId, chat: Chat): Promise<ChatResponse> {
        try {
            const result = await chatsCollection.updateOne({ _id: chatId }, { $set: chat });
            if (result.modifiedCount === 1) {
                return {
                    success: true
                }
            } else {
                return {
                    success: false,
                    message: "Chat not updated"
                }
            } 
        }catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async deleteChat(chatId: ObjectId): Promise<ChatResponse> {
        try {
            const result = await chatsCollection.deleteOne({ _id: chatId });
            if (result.deletedCount === 1) {
                return {
                    success: true
                }
            } else {
                return {
                    success: false,
                    message: "Chat not deleted"
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async createChatMessage(message: ChatMessage): Promise<ChatResponse> {
        try {
            const result = await chatMessagesCollection.insertOne(message);
            const insertedMessage = await chatMessagesCollection.findOne({ _id: result.insertedId });

           
            
            // Inside createChatMessage method
            if (!insertedMessage) {
                throw new Error('Failed to insert message');
            }

            const getUserData = await user.getUserById(insertedMessage.from);
            if (!getUserData.success) {
                throw new Error('Failed to get user data');
            }

            const updateLastMessage = await chatsCollection.updateOne(
                { _id: insertedMessage.chatId },
                { 
                    $set: {
                        lastMessage: {
                            user: getUserData.data,
                            message: insertedMessage.message,
                            createdAt: insertedMessage.createdAt
                        }
                    }
                }
            );

            if (!updateLastMessage.acknowledged) {
                throw new Error('Failed to update last message in chat');
            }

            return {
                success: true,
                data: insertedMessage
            }

        } catch (error: any) {
            // console.log(error)
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async getChatMessages(chatId: ObjectId): Promise<ChatResponse> {
        try {
            const messages = await chatMessagesCollection.find({ chatId }).toArray();
            return {
                success: true,
                data: messages
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async updateChatMessage(messageId: ObjectId, message: ChatMessage): Promise<ChatResponse> {
        try {
            const result = await chatMessagesCollection.updateOne({ _id: messageId }, { $set: message });
            if (result.modifiedCount === 1) {
                return {
                    success: true
                }
            } else {
                return {
                    success: false,
                    message: "Message not updated"
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async deleteChatMessage(messageId: ObjectId): Promise<ChatResponse> {
        try {
            const result = await chatMessagesCollection.deleteOne({ _id: messageId });
            if (result.deletedCount === 1) {
                return {
                    success: true
                }
            } else {
                return {
                    success: false,
                    message: "Message not deleted"
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async addReaction(messageId: ObjectId, reaction: { id: ObjectId, emoji: string }): Promise<ChatResponse> {
        try {
            const result = await chatMessagesCollection.updateOne({ _id: messageId }, { $push: { reactions: reaction } as any });
            if (result.modifiedCount === 1) {
                return {
                    success: true
                }
            } else {
                return {
                    success: false,
                    message: "Reaction not added"
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async removeReaction(messageId: ObjectId, reactionId: ObjectId): Promise<ChatResponse> {
        try {
            const result = await chatMessagesCollection.updateOne({ _id: messageId }, { $pull: { reactions: { id: reactionId } as any } });
            if (result.modifiedCount === 1) {
                return {
                    success: true
                }
            } else {
                return {
                    success: false,
                    message: "Reaction not removed"
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async readMessage(messageId: ObjectId, userId: ObjectId): Promise<ChatResponse> {
        try {
            const User = await user.getUserById(userId);
            if (!User.success) {
                return {
                    success: false,
                    message: "User not found"
                }
            }
            const result = await chatMessagesCollection.updateOne({ _id: messageId }, { $push: { readBy: User.data } });
            if (result.modifiedCount === 1) {
                return {
                    success: true
                }
            } else {
                return {
                    success: false,
                    message: "Message not read"
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }
     
    public async getUnreadMessages(userId: ObjectId): Promise<ChatResponse> { 
        try {
            const User = await user.getUserById(userId);
            if (!User.success) {
                return {
                    success: false,
                    message: "User not found"
                }
            }
            const messages = await chatMessagesCollection.find({ readBy: { $nin: [User.data] } }).toArray();
            return {
                success: true,
                data: messages
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async getReactions(messageId: ObjectId): Promise<ChatResponse> {
        try {
            const message = await chatMessagesCollection.findOne({ _id: messageId });
            return {
                success: true,
                data: message?.reactions
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async getReactionsByEmoji(messageId: ObjectId, emoji: string): Promise<ChatResponse> {
        try {
            const message = await chatMessagesCollection.findOne({ _id: messageId });
            const reactions = message?.reactions.filter((reaction: { emoji: string; }) => reaction.emoji === emoji);
            return {
                success: true,
                data: reactions
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    public async checkChatStatus(myId: string, userId: string): Promise<ChatResponse> {
        try {
            const chats = await chatsCollection.find({ participants: { $all: [myId, userId] } }).toArray();
            if (chats.length > 0) {
                return {
                    success: true,
                    data: chats[0]
                }
            } else {
                return {
                    success: false,
                    message: "Chat not found"
                }
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            }
        }

    }

}

export default ChatController;