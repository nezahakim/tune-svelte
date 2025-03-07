 export interface ChatMessage{
    _id: string;
    chatId: string;
    from: string;
    message: string;
    createdAt: Date;
    readBy: User[];
    reactions: {id: string, emoji: string }[];
    status: 'sent' | 'delivered' | 'read';
    gift?: Gift | null;
}

  // Gift interface
 export interface Gift {
    id: string;
    name: string;
    icon: string;
    animation: string;
    color: string;
    backgroundGradient: string;
    particleEffect: string;
}

export interface User{
    _id?: string;
    name: string;
    username: string;
    email: string;
    phone: {code: number, number: number};
    bio?: string;
    joinDate?: Date;
    avatar?: string;
    status?: 'online' | 'offline' | 'away';
    preferences?: {
        theme: 'light' | 'dark';
        color: string;
    };
}


export interface Chat {
    chatType: string;
	type: string;
    id: string;
    name: string;
    lastMessage: {
        user: User;
        message: string;
        createdAt: Date;
    };
    avatar: string;
    isOnline: boolean;
    participants: User[];
    unreadCount?: number;
    createdAt: Date;
}

export interface Message {
    _id: string;
    chatId: string;
    content: string;
    sender: string;
    timestamp: Date;
    read: boolean;
    reactions?: Array<{
        userId: string;
        type: string;
    }>;
}