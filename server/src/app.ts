import  express from "express";
import Auth from './auth/index'
import cors from 'cors'


const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/auth', Auth);

app.get('/',(req, res)=>{
    res.json("Hello, how are you ?")
})


app.listen(3000, ()=>{
    console.log("localhost:3000")
})
