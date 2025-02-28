import express from "express";
import UserController from "../db/controllers/user";
import type { User } from "../db/models/users";
import { generateRandomCode, sendVerificationEmail } from "../utils/verification";
import { ObjectId } from "mongodb";

const router = express.Router();
const user = new UserController();

// Use Redis or database in production
const verificationCodes = new Map();

router.post('/signup', async (req, res) => {
    if (!req.body) {
        return res.json({ success: false, message: "No data received" });
    }

    const { name, username, email, phone } = req.body;
    
    try {
        if (name && username && email && phone) {
            const USR: User = { name, username, email, phone };
            const result = await user.addUser(USR);
            
            if (result.success) {
                // Send verification email immediately after signup
                const verificationCode = generateRandomCode(6);
                verificationCodes.set(result.token, {
                    code: verificationCode,
                    expires: Date.now() + 15 * 60 * 1000 // 15 minutes
                });

                await sendVerificationEmail(email, verificationCode);
                
                return res.json({
                    success: true,
                    data: result.data,
                    token: result.token,
                    message: "User created successfully. Verification code sent to email."
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
    const { email, phone } = req.body;

    try {
        if (!email || !phone) {
            return res.json({ success: false, message: "Email and phone are required" });
        }

        const result = await user.getUserLogin({ email, phone });
        return res.json(result);
    } catch (error: any) {
        console.error("Login Error:", error);
        return res.json({ success: false, message: error.message || "Login failed" });
    }
});

router.post('/request-verification', async (req, res) => {
    const { token, email } = req.body;
    
    if (!token || !email) {
        return res.json({ success: false, message: "Token and email are required" });
    }

    try {
        const userId = new ObjectId(token);
        const userResult = await user.getUserById(userId);
        
        if (!userResult.success) {
            return res.json({ success: false, message: "User not found" });
        }
        
        const verificationCode = generateRandomCode(6);
        verificationCodes.set(token, {
            code: verificationCode,
            expires: Date.now() + 15 * 60 * 1000
        });
        
        await sendVerificationEmail(email, verificationCode);
        
        return res.json({ 
            success: true, 
            message: "Verification code sent successfully" 
        });
    } catch (error: any) {
        console.error("Verification Request Error:", error);
        return res.json({ 
            success: false, 
            message: error.message || "Failed to send verification code" 
        });
    }
});

router.post('/verify-code', async (req, res) => {
    const { token, code } = req.body;
    
    if (!token || !code) {
        return res.json({ success: false, message: "Token and code are required" });
    }

    try {
        const storedData = verificationCodes.get(token);
        
        if (!storedData) {
            return res.json({ 
                success: false, 
                message: "No verification in progress" 
            });
        }
        
        if (Date.now() > storedData.expires) {
            verificationCodes.delete(token);
            return res.json({ 
                success: false, 
                message: "Verification code expired" 
            });
        }
        
        if (storedData.code !== code) {
            return res.json({ 
                success: false, 
                message: "Invalid verification code" 
            });
        }
        
        verificationCodes.delete(token);
        
        // Update user as verified in database if needed
        const userId = new ObjectId(token);
        await user.updateUser(userId, { verified: true });
        
        return res.json({ 
            success: true, 
            message: "Verification successful",
            token
        });
    } catch (error: any) {
        console.error("Code Verification Error:", error);
        return res.json({ 
            success: false, 
            message: error.message || "Verification failed" 
        });
    }
});

export default router;