import { Server } from "socket.io";
import express from 'express'

const app = new express()

const server = createServer(app)



server.listen(3000, ()=>{
    console.log("SERVER ON 3000")
})