import { usersCollection } from "../collections";
import type { User } from "../models/users";
import type { ObjectId } from "mongodb";

interface UserResponse {
    success: boolean;
    data?: any;
    token?: string;
    message?: string;
}

class UserController {
    public async addUser(user: User): Promise<UserResponse> {
        try {
            const result = await usersCollection.insertOne(user);
            if (result.acknowledged) {
                const userData = await this.getUserById(result.insertedId);
                return {
                    success: true,
                    data: userData,
                    token: result.insertedId.toString()
                };
            }
            return {
                success: false,
                message: 'Failed to add user'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    public async deleteUser(_id: ObjectId): Promise<UserResponse> {
        try {
            const result = await usersCollection.deleteOne({ _id });
            return {
                success: result.acknowledged && result.deletedCount > 0,
                message: result.deletedCount > 0 ? 'User deleted successfully' : 'User not found'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    public async getUsers(): Promise<UserResponse> {
        try {
            const users = await usersCollection.find({}).toArray();
            return {
                success: true,
                data: users
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    public async deleteAllUsers(): Promise<UserResponse> {
        try {
            const result = await usersCollection.deleteMany({});
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

    public async getUserById(_id: ObjectId): Promise<UserResponse> {
        try {
            const user = await usersCollection.findOne({ _id });
            if (user) {
                return {
                    success: true,
                    data: user,
                    token: _id.toString()
                };
            }
            return {
                success: false,
                message: 'User not found'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    public async getUserLogin({identifier, password}: {identifier: string, password: string}): Promise<UserResponse> {
        try {
            const user = await usersCollection.findOne({ $or: [{ email: identifier }, { username: identifier }], password });
            if (user) {
                return {
                    success: true,
                    data: user,
                    token: user._id.toString()
                };
            }else{
                return {
                    success: false,
                    message: 'Invalid credentials'
                };
            }
           
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    public async updateUser(_id: ObjectId, user: User): Promise<UserResponse> {
        try {
            const result = await usersCollection.updateOne({ _id }, { $set: user });
            if (result.acknowledged) {
                const updatedUser = await this.getUserById(_id);
                return {
                    success: true,
                    data: updatedUser.data,
                    token: _id.toString()
                };
            }
            return {
                success: false,
                message: 'Failed to update user'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}

export default UserController;