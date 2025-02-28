 // Message interface
 export interface ChatMessage {
    text: string;
    sender: 'me' | 'neza';
    time: string;
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
}