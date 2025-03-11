import { writable, get } from 'svelte/store';
import { io, Socket } from 'socket.io-client';
import { session } from '$lib/stores/session';
import { browser } from '$app/environment';
import { API_BASE_URL } from '$lib/API_BASE';

const SOCKET_URL = API_BASE_URL;

function createSocketStore() {
    const { subscribe, set, update } = writable<Socket | null>(null);

    return {
        subscribe,
        connect: () => {
            if (!browser) return null;
            
            const currentSession = get(session);
            const isAuthenticated = session.isAuthenticated();

            if (!isAuthenticated || !currentSession.user?.id) {
                console.error('Cannot connect socket: User not authenticated');
                return null;
            }

            const socket = io(SOCKET_URL, {
                auth: {
                    userId: currentSession.user.id,
                    token: currentSession.token
                }
            });

            set(socket);
            return socket;
        },
        disconnect: () => {
            update(socket => {
                if (socket) socket.disconnect();
                return null;
            });
        }
    };
}

export const socketStore = createSocketStore();