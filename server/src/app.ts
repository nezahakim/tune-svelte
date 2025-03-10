import express from "express";
import { createServer } from "http";
import Auth from './auth/index';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { SocketHandler } from './io/index';

import UserController from "./db/controllers/user";
import ChatController from "./db/controllers/chat";

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', Auth);

app.get('/', (req, res) => {
    res.json("Hello, how are you ?");
});

app.get('/users', async (req, res)=>{

    const users =  new UserController()

    if(users){
        const result = await users.getUsers()
        res.json(result)
    }

})

app.get('/check-chat-status/:myId/:userId', async (req, res)=>{
    const myId = req.params.myId;
    const userId = req.params.userId;

    const chats = new ChatController()
    if(chats){
        const result = await chats.checkChatStatus(myId, userId);
        res.json(result)
    }
})

app.get('/get-user/:id', async (req, res)=>{    
    const id = new ObjectId(req.params.id);
    const user = new UserController();
    if(user){
        const result = await user.getUserById(id);
        res.json(result)
    }
})

app.get('/get-chats/:id',async(req, res)=>{
    const id = req.params.id;
    const chats = new ChatController();
    if(chats){
        const result = await chats.getChats(id);
        res.json(result)
    }
})

app.get('/get-chat-messages/:id', async(req, res)=>{
    const id = req.params.id;
    const chats = new ChatController();
    if(chats && id){
        const result = await chats.getChatMessages(new ObjectId(id));
        res.json(result)
    }
})

app.get('/get-chats',async(req, res)=>{
    const chats = new ChatController();
    if(chats){
        const result = await chats.get_Chats();
        res.json(result)
    }
})

app.get('/delete-chats',async(req, res)=>{
    const chats = new ChatController();
    if(chats){
        const result = await chats.deleteAllChats();
        res.json(result)
    }
})

app.get('/get-messages/:id', async(req, res)=>{   
    const id = new ObjectId(req.params.id);
    const chats = new ChatController();
    if(chats){
        const result = await chats.getChatMessages(id);
        res.json(result)
    }
})

// Initialize Socket.IO
const socketHandler = new SocketHandler(httpServer);
socketHandler.initialize();

// Use httpServer instead of app.listen
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});