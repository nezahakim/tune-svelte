// import { writable, get } from 'svelte/store';
// import { io, Socket } from 'socket.io-client';
// import { session } from '$lib/stores/session';

// const SOCKET_URL = 'http://localhost:3000';

// function createSocketStore() {
//     const { subscribe, set, update } = writable<Socket | null>(null);

//     return {
//         subscribe,
//         connect: () => {
//             const currentSession = get(session);
            
//             // if (!currentSession.authenticated || !currentSession.user?.id) {
//                 if (!session.isAuthenticated()) {
//                 console.log(currentSession.authenticated, currentSession.user?.id);
//                 console.error('Cannot connect socket: User not authenticated');
//                 return null;
//             }

//             const socket = io(SOCKET_URL, {
//                 auth: {
//                     userId: currentSession.user.id,
//                 }
//             });

//             set(socket);
//             return socket;
//         },
//         disconnect: () => {
//             update(socket => {
//                 if (socket) socket.disconnect();
//                 return null;
//             });
//         }
//     };
// }

// export const socketStore = createSocketStore();

import { writable, get } from 'svelte/store';
import { io, Socket } from 'socket.io-client';
import { session } from '$lib/stores/session';
import { browser } from '$app/environment';

const SOCKET_URL = 'http://localhost:3000';

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