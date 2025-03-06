import express from "express";
import UserController from "../db/controllers/user";
import type { User } from "../db/models/users";

const router = express.Router();
const user = new UserController();

router.post('/signup', async (req, res) => {
    if (!req.body) {
        return res.json({ success: false, message: "No data received" });
    }

    const { name, username, email, phone, password } = req.body;
    
    try {
        if (name && username && email && phone && password) {
            const USR: User = { name, username, email, phone, password};
            const result = await user.addUser(USR);
            
            if (result.success) {
                return res.json({
                    success: true,
                    data: result.data,
                    token: result.token,
                    message: "User created successfully."
                });
            }
            
            return res.json({ success: false, message: "Failed to create user" });
        }
        
        return res.json({ success: false, message: "All fields are required" });
    } catch (error: any) {
        console.error("Signup Error:", error);
        return res.json({ success: false, message: error.message || "An error occurred" });
    }
});

router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    try {
        if (!identifier || !password) {
            return res.json({ success: false, message: "Email and Password are required" });
        }

        const result = await user.getUserLogin({ identifier, password });
        return res.json(result);

    } catch (error: any) {
        console.error("Login Error:", error);
        return res.json({ success: false, message: error.message || "Login failed" });
    }
});

router.get('/delete/all', async (_req, res) => {
    try {
        const result = await user.deleteAllUsers();
        return res.json(result);
    } catch (error: any) {
        console.error("Delete All Error:", error);
        return res.json({ success: false, message: error.message || "An error occurred" });
    }
});

export default router;