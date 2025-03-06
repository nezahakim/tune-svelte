import client from "./db";

const db =  client.db("NotifyTune")

export const usersCollection = db.collection("users")
export const chatsCollection = db.collection("chats")
export const chatMessagesCollection = db.collection("chatMessages")