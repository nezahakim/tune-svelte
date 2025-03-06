import { writable } from 'svelte/store';
import type { Chat } from '$lib/types';

function createChatStore() {
    const { subscribe, set, update } = writable<Chat[]>([]);

    return {
        subscribe,
        set,
        update,
        
        // Initialize chats with an array of chats
        addChats: (initialChats: Chat[]) => {
            set(initialChats);
        },

        // Add a single chat
        addChat: (chat: Chat) => update(chats => [...chats, chat]),

        // Update chat with more flexible update mechanism
        updateChat: (chatId: string, changes: Partial<Chat>) => 
            update(chats => chats.map(chat => 
                chat.id === chatId ? { ...chat, ...changes } : chat
            )),

        // Update chat content specifically
        updateChatContent: (chatId: string, newContent: string) =>
            update(chats => chats.map(chat =>
                chat.id === chatId ? { ...chat, content: newContent } : chat
            )),

        // Remove a chat
        removeChat: (chatId: string) =>
            update(chats => chats.filter(chat => chat.id !== chatId)),

        // Clear all chats
        clearChats: () => set([]),

        // Update multiple chats at once
        updateMultipleChats: (updates: { id: string, changes: Partial<Chat> }[]) =>
            update(chats => chats.map(chat => {
                const updateForChat = updates.find(u => u.id === chat.id);
                return updateForChat ? { ...chat, ...updateForChat.changes } : chat;
            }))
    };
}

export const chats = createChatStore();