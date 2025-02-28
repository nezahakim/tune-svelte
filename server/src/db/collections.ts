import client from "./db";

const db =  client.db("NotifyTune")

export const usersCollection = db.collection("users")