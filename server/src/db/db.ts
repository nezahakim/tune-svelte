import { MongoClient } from "mongodb";

let MONGO_URI =  process.env.MONGO_URI

if(!MONGO_URI){
    throw Error(
        "Needed a connection string from MongoDB"
    )
}

const client: MongoClient = await MongoClient.connect(MONGO_URI);
if(client){
    console.log("Connected to DB")
}
export default client;