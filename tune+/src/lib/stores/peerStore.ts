// import { writable, get, derived } from 'svelte/store';
// import Peer from 'peerjs';
// import { session } from '$lib/stores/session';
// import { socketStore } from '$lib/stores/socketStore';
// import type { Socket } from 'socket.io-client';

// interface UserStatus {
//     id: string;
//     name: string;
//     status: 'online' | 'speaking' | 'idle' | 'away' | 'offline';
//     lastActivity: number;
//     emoji?: string;
//     isMuted: boolean;
// }

// interface PeerState {
//     peer: Peer | null;
//     audioConnection: any | null;
//     localStream: MediaStream | null;
//     remoteStream: MediaStream | null;
//     error: string | null;
//     audioAnalyser: AnalyserNode | null;
//     audioContext: AudioContext | null;
//     audioData: Uint8Array | null;
//     localUserStatus: UserStatus | null;
//     remoteUserStatus: UserStatus | null;
//     volumeLevel: number; // 0-100
//     isDenoiseActive: boolean;
//     isEchoCancellationActive: boolean;
//     isAutoGainActive: boolean;
// }

// function createPeerStore() {
//     const { subscribe, set, update } = writable<PeerState>({
//         peer: null,
//         audioConnection: null,
//         localStream: null,
//         remoteStream: null,
//         error: null,
//         audioAnalyser: null,
//         audioContext: null,
//         audioData: null,
//         localUserStatus: null,
//         remoteUserStatus: null,
//         volumeLevel: 75,
//         isDenoiseActive: true,
//         isEchoCancellationActive: true,
//         isAutoGainActive: true
//     });

//     let socket: Socket | null = null;
//     let audioVisualizerInterval: number | null = null;
//     let userStatusInterval: number | null = null;
//     let speakingDetectionInterval: number | null = null;
    
//     // Voice activity detection threshold
//     const VAD_THRESHOLD = 15;
    
//     // Speech detection with debounce
//     let isSpeaking = false;
//     let speakingTimeout: number | null = null;

//     const initializeAudioStream = async (constraints = {}) => {
//         const defaultConstraints = {
//             audio: {
//                 echoCancellation: true,
//                 noiseSuppression: true,
//                 autoGainControl: true
//             },
//             video: false
//         };

//         const mergedConstraints = { ...defaultConstraints, ...constraints };

//         try {
//             return await navigator.mediaDevices.getUserMedia(mergedConstraints);
//         } catch (error) {
//             console.error('Audio stream error:', error);
//             throw error;
//         }
//     };

//     const setupAudioAnalysis = (stream: MediaStream) => {
//         try {
//             const audioContext = new AudioContext();
//             const analyser = audioContext.createAnalyser();
//             analyser.fftSize = 256;
            
//             const source = audioContext.createMediaStreamSource(stream);
//             source.connect(analyser);
            
//             const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
//             update(state => ({
//                 ...state,
//                 audioContext,
//                 audioAnalyser: analyser,
//                 audioData: dataArray
//             }));
            
//             if (audioVisualizerInterval) clearInterval(audioVisualizerInterval);
            
//             // Set up audio visualization
//             audioVisualizerInterval = setInterval(() => {
//                 const state = get(peerStore);
//                 if (state.audioAnalyser && state.audioData) {
//                     state.audioAnalyser.getByteFrequencyData(state.audioData);
                    
//                     // Detect if user is speaking based on audio levels
//                     const average = Array.from(state.audioData).reduce((a, b) => a + b, 0) / state.audioData.length;
                    
//                     if (average > VAD_THRESHOLD) {
//                         if (!isSpeaking) {
//                             isSpeaking = true;
//                             update(s => {
//                                 if (s.localUserStatus) {
//                                     return {
//                                         ...s,
//                                         localUserStatus: {
//                                             ...s.localUserStatus,
//                                             status: 'speaking',
//                                             lastActivity: Date.now()
//                                         }
//                                     };
//                                 }
//                                 return s;
//                             });
                            
//                             // Emit speaking status to peer
//                             socket?.emit('user:status', {
//                                 status: 'speaking',
//                                 peerId: get(peerStore).localUserStatus?.id
//                             });
//                         }
                        
//                         // Reset timeout
//                         if (speakingTimeout) clearTimeout(speakingTimeout);
                        
//                         // Set timeout to revert to "online" status after 1.5 seconds of silence
//                         speakingTimeout = setTimeout(() => {
//                             isSpeaking = false;
//                             update(s => {
//                                 if (s.localUserStatus) {
//                                     return {
//                                         ...s,
//                                         localUserStatus: {
//                                             ...s.localUserStatus,
//                                             status: 'online',
//                                             lastActivity: Date.now()
//                                         }
//                                     };
//                                 }
//                                 return s;
//                             });
                            
//                             // Emit online status to peer
//                             socket?.emit('user:status', {
//                                 status: 'online',
//                                 peerId: get(peerStore).localUserStatus?.id
//                             });
//                         }, 1500);
//                     }
//                 }
//             }, 100);
            
//         } catch (error) {
//             console.error('Audio analysis setup error:', error);
//         }
//     };
    
//     const setupRemoteAudioAnalysis = (stream: MediaStream) => {
//         try {
//             const audioContext = new AudioContext();
//             const analyser = audioContext.createAnalyser();
//             analyser.fftSize = 256;
            
//             const source = audioContext.createMediaStreamSource(stream);
//             const gainNode = audioContext.createGain();
            
//             // Connect the nodes: source -> gain -> analyser
//             source.connect(gainNode);
//             gainNode.connect(analyser);
            
//             // Also connect to output so we can hear it
//             gainNode.connect(audioContext.destination);
            
//             // Set initial gain value
//             const volumeLevel = get(peerStore).volumeLevel / 100;
//             gainNode.gain.value = volumeLevel;
            
//             const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
//             if (speakingDetectionInterval) clearInterval(speakingDetectionInterval);
            
//             // Set up remote speaking detection
//             speakingDetectionInterval = setInterval(() => {
//                 if (analyser) {
//                     analyser.getByteFrequencyData(dataArray);
//                     const average = Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length;
                    
//                     // Update remote user speaking status based on audio levels
//                     if (average > VAD_THRESHOLD) {
//                         update(s => {
//                             if (s.remoteUserStatus) {
//                                 return {
//                                     ...s,
//                                     remoteUserStatus: {
//                                         ...s.remoteUserStatus,
//                                         status: 'speaking',
//                                         lastActivity: Date.now()
//                                     }
//                                 };
//                             }
//                             return s;
//                         });
//                     } else {
//                         // If not speaking for a moment, update status
//                         update(s => {
//                             if (s.remoteUserStatus && s.remoteUserStatus.status === 'speaking') {
//                                 return {
//                                     ...s,
//                                     remoteUserStatus: {
//                                         ...s.remoteUserStatus,
//                                         status: 'online',
//                                         lastActivity: Date.now()
//                                     }
//                                 };
//                             }
//                             return s;
//                         });
//                     }
//                 }
//             }, 200);
            
//             // Subscribe to volume changes and update gain
//             const unsubscribe = peerStore.subscribe(state => {
//                 if (gainNode && state.volumeLevel) {
//                     const volume = state.volumeLevel / 100;
//                     gainNode.gain.value = volume;
//                 }
//             });
            
//         } catch (error) {
//             console.error('Remote audio analysis setup error:', error);
//         }
//     };

//     return {
//         subscribe,
        
//         init: async () => {
//             const currentSession = get(session);
//             if (!session.isAuthenticated() || !currentSession.user?.id) {
//                 throw new Error('User not authenticated');
//             }

//             socket = socketStore.connect();
//             if (!socket) {
//                 throw new Error('Socket connection failed');
//             }
            
//             // Set up status for local user
//             update(state => ({
//                 ...state,
//                 localUserStatus: {
//                     id: currentSession.user!.id,
//                     name: currentSession.user!.name || 'Me',
//                     status: 'online',
//                     lastActivity: Date.now(),
//                     isMuted: false
//                 }
//             }));

//             update(state => {
//                 try {
//                     const peer = new Peer(currentSession.user!.id, {
//                         config: {
//                             iceServers: [
//                                 { urls: 'stun:stun.l.google.com:19302' },
//                                 { urls: 'stun:global.stun.twilio.com:3478' },
//                                 {
//                                     urls: 'turn:numb.viagenie.ca',
//                                     username: 'webrtc@live.com',
//                                     credential: 'muazkh'
//                                 }
//                             ]
//                         },
//                         debug: 2
//                     });

//                     peer.on('open', (id) => {
//                         console.log('Peer connected with ID:', id);
//                         socket?.emit('peer:ready', { 
//                             peerId: id,
//                             username: currentSession.user!.name || 'Anonymous',
//                             status: 'online'
//                         });
//                     });

//                     peer.on('error', (err) => {
//                         console.error('Peer error:', err);
//                         update(s => ({ ...s, error: err.type }));
//                     });

//                     peer.on('call', async (call) => {
//                         try {
//                             const stream = await initializeAudioStream({
//                                 audio: {
//                                     echoCancellation: state.isEchoCancellationActive,
//                                     noiseSuppression: state.isDenoiseActive,
//                                     autoGainControl: state.isAutoGainActive
//                                 }
//                             });
                            
//                             // Set up audio analysis for our own voice
//                             setupAudioAnalysis(stream);
                            
//                             call.answer(stream);
                            
//                             call.on('stream', (remoteStream) => {
//                                 // Set up audio analysis for remote user
//                                 setupRemoteAudioAnalysis(remoteStream);
                                
//                                 update(s => ({ ...s, remoteStream }));
//                             });

//                             call.on('close', () => {
//                                 update(s => ({
//                                     ...s,
//                                     remoteUserStatus: s.remoteUserStatus ? {
//                                         ...s.remoteUserStatus,
//                                         status: 'offline',
//                                         lastActivity: Date.now()
//                                     } : null
//                                 }));
//                             });

//                             call.on('error', (err) => {
//                                 console.error('Call error:', err);
//                                 update(s => ({ ...s, error: 'Call error: ' + err }));
//                             });

//                             update(s => ({ ...s, localStream: stream, audioConnection: call }));
                            
//                             // Request remote user information
//                             socket?.emit('user:info-request', { peerId: call.peer });
//                         } catch (error) {
//                             console.error('Error answering call:', error);
//                         }
//                     });
                    
//                     // Set up socket listeners for status updates
//                     socket?.on('user:status', (data) => {
//                         update(s => {
//                             if (s.remoteUserStatus && s.remoteUserStatus.id === data.peerId) {
//                                 return {
//                                     ...s,
//                                     remoteUserStatus: {
//                                         ...s.remoteUserStatus,
//                                         status: data.status,
//                                         lastActivity: Date.now()
//                                     }
//                                 };
//                             }
//                             return s;
//                         });
//                     });
                    
//                     // Handle emoji reactions
//                     socket?.on('user:reaction', (data) => {
//                         update(s => {
//                             if (s.remoteUserStatus && s.remoteUserStatus.id === data.peerId) {
//                                 return {
//                                     ...s,
//                                     remoteUserStatus: {
//                                         ...s.remoteUserStatus,
//                                         emoji: data.emoji,
//                                         lastActivity: Date.now()
//                                     }
//                                 };
//                             }
//                             return s;
//                         });
//                     });
                    
//                     // Handle user info response
//                     socket?.on('user:info', (data) => {
//                         update(s => ({
//                             ...s,
//                             remoteUserStatus: {
//                                 id: data.peerId,
//                                 name: data.username || 'Anonymous',
//                                 status: data.status || 'online',
//                                 lastActivity: Date.now(),
//                                 isMuted: data.isMuted || false
//                             }
//                         }));
//                     });
                    
//                     // Set up interval to check user idleness
//                     if (userStatusInterval) clearInterval(userStatusInterval);
//                     userStatusInterval = setInterval(() => {
//                         const state = get(peerStore);
                        
//                         // Check if user is idle (no activity for 2 minutes)
//                         if (
//                             state.localUserStatus && 
//                             state.localUserStatus.status !== 'away' && 
//                             Date.now() - state.localUserStatus.lastActivity > 2 * 60 * 1000
//                         ) {
//                             update(s => ({
//                                 ...s,
//                                 localUserStatus: s.localUserStatus ? {
//                                     ...s.localUserStatus,
//                                     status: 'away'
//                                 } : null
//                             }));
                            
//                             // Emit away status
//                             socket?.emit('user:status', {
//                                 status: 'away',
//                                 peerId: state.localUserStatus.id
//                             });
//                         }
//                     }, 30000); // Check every 30 seconds

//                     return { ...state, peer };
//                 } catch (error: any) {
//                     console.error('Peer initialization error:', error);
//                     return { ...state, error: error.toString() };
//                 }
//             });
//         },
        
//         call: async (remotePeerId: string) => {
//             try {
//                 const state = get(peerStore);
//                 if (!state.peer) throw new Error('Peer not initialized');
                
//                 const stream = await initializeAudioStream({
//                     audio: {
//                         echoCancellation: state.isEchoCancellationActive,
//                         noiseSuppression: state.isDenoiseActive,
//                         autoGainControl: state.isAutoGainActive
//                     }
//                 });
                
//                 // Set up audio analysis for local stream
//                 setupAudioAnalysis(stream);
                
//                 const call = state.peer.call(remotePeerId, stream);
                
//                 call.on('stream', (remoteStream) => {
//                     // Set up audio analysis for remote stream
//                     setupRemoteAudioAnalysis(remoteStream);
                    
//                     update(s => ({ ...s, remoteStream }));
//                 });

//                 call.on('close', () => {
//                     update(s => ({
//                         ...s,
//                         remoteUserStatus: s.remoteUserStatus ? {
//                             ...s.remoteUserStatus,
//                             status: 'offline',
//                             lastActivity: Date.now()
//                         } : null
//                     }));
//                 });

//                 update(state => ({ 
//                     ...state, 
//                     localStream: stream, 
//                     audioConnection: call 
//                 }));
                
//                 // Request remote user info
//                 socket?.emit('user:info-request', { peerId: remotePeerId });
//             } catch (error: any) {
//                 console.error('Call error:', error);
//                 update(state => ({ ...state, error: error.toString() }));
//             }
//         },
        
//         toggleMute: () => {
//             update(state => {
//                 if (state.localStream) {
//                     const audioTracks = state.localStream.getAudioTracks();
//                     const isMuted = !audioTracks[0].enabled;
                    
//                     // Toggle mute state
//                     audioTracks.forEach(track => {
//                         track.enabled = isMuted;
//                     });
                    
//                     // Update mute status and emit to peer
//                     if (state.localUserStatus) {
//                         socket?.emit('user:status', {
//                             peerId: state.localUserStatus.id,
//                             isMuted: !isMuted
//                         });
                        
//                         return {
//                             ...state,
//                             localUserStatus: {
//                                 ...state.localUserStatus,
//                                 isMuted: !isMuted
//                             }
//                         };
//                     }
//                 }
//                 return state;
//             });
//         },
        
//         setVolume: (level: number) => {
//             update(state => ({ ...state, volumeLevel: level }));
//         },
        
//         toggleNoiseSuppression: () => {
//             update(state => {
//                 const newState = !state.isDenoiseActive;
                
//                 // We need to recreate the stream with new constraints
//                 if (state.localStream) {
//                     state.localStream.getTracks().forEach(track => track.stop());
                    
//                     initializeAudioStream({
//                         audio: {
//                             echoCancellation: state.isEchoCancellationActive,
//                             noiseSuppression: newState,
//                             autoGainControl: state.isAutoGainActive
//                         }
//                     }).then(newStream => {
//                         // Replace stream in active connection
//                         if (state.audioConnection) {
//                             state.peer?.call(state.audioConnection.peer, newStream);
//                         }
                        
//                         setupAudioAnalysis(newStream);
                        
//                         update(s => ({ ...s, localStream: newStream }));
//                     });
//                 }
                
//                 return { ...state, isDenoiseActive: newState };
//             });
//         },
        
//         toggleEchoCancellation: () => {
//             update(state => {
//                 const newState = !state.isEchoCancellationActive;
                
//                 if (state.localStream) {
//                     state.localStream.getTracks().forEach(track => track.stop());
                    
//                     initializeAudioStream({
//                         audio: {
//                             echoCancellation: newState,
//                             noiseSuppression: state.isDenoiseActive,
//                             autoGainControl: state.isAutoGainActive
//                         }
//                     }).then(newStream => {
//                         if (state.audioConnection) {
//                             state.peer?.call(state.audioConnection.peer, newStream);
//                         }
                        
//                         setupAudioAnalysis(newStream);
                        
//                         update(s => ({ ...s, localStream: newStream }));
//                     });
//                 }
                
//                 return { ...state, isEchoCancellationActive: newState };
//             });
//         },
        
//         sendReaction: (emoji: string) => {
//             const state = get(peerStore);
//             if (state.localUserStatus) {
//                 socket?.emit('user:reaction', {
//                     peerId: state.localUserStatus.id,
//                     emoji: emoji
//                 });
                
//                 return emoji;
//             }
//             return null;
//         },
        
//         getAudioLevels: () => {
//             const state = get(peerStore);
//             if (state.audioData) {
//                 // Normalize the data to 0-100 range for easier use in UI
//                 const average = Array.from(state.audioData).reduce((a, b) => a + b, 0) / state.audioData.length;
//                 return Math.min(100, Math.floor(average * 3)); // Multiply by 3 to make it more visible
//             }
//             return 0;
//         },
        
//         disconnect: () => {
//             // Clear all intervals
//             if (audioVisualizerInterval) clearInterval(audioVisualizerInterval);
//             if (userStatusInterval) clearInterval(userStatusInterval);
//             if (speakingDetectionInterval) clearInterval(speakingDetectionInterval);
//             if (speakingTimeout) clearTimeout(speakingTimeout);
            
//             update(state => {
//                 // Close audio context
//                 if (state.audioContext) {
//                     state.audioContext.close();
//                 }
                
//                 // Close connection and clean up
//                 state.audioConnection?.close();
//                 state.localStream?.getTracks().forEach(track => track.stop());
//                 state.peer?.destroy();
                
//                 // Emit offline status
//                 if (state.localUserStatus) {
//                     socket?.emit('user:status', {
//                         peerId: state.localUserStatus.id,
//                         status: 'offline'
//                     });
//                 }
                
//                 return {
//                     peer: null,
//                     audioConnection: null,
//                     localStream: null,
//                     remoteStream: null,
//                     error: null,
//                     audioAnalyser: null,
//                     audioContext: null,
//                     audioData: null,
//                     localUserStatus: null,
//                     remoteUserStatus: null,
//                     volumeLevel: 75,
//                     isDenoiseActive: true,
//                     isEchoCancellationActive: true,
//                     isAutoGainActive: true
//                 };
//             });
//         }
//     };
// }

// // Create the store
// export const peerStore = createPeerStore();

// // Create a derived store for audio visualization data
// export const audioLevels = derived(peerStore, ($peerStore) => {
//     if ($peerStore.audioData) {
//         const levels = Array.from($peerStore.audioData).map(value => Math.min(100, Math.floor(value * 2)));
        
//         // Return an array of 5 levels for visualization (reducing the data)
//         const step = Math.floor(levels.length / 5);
//         return [0, 1, 2, 3, 4].map(i => levels[i * step] || 0);
//     }
//     return [0, 0, 0, 0, 0];
// });

// // Create a derived store for speaking status
// export const isSpeaking = derived(peerStore, ($peerStore) => {
//     return $peerStore.localUserStatus?.status === 'speaking';
// });

// // Remote user status
// export const remoteUser = derived(peerStore, ($peerStore) => {
//     return $peerStore.remoteUserStatus;
// });


import { writable, get, derived } from 'svelte/store';
import Peer from 'peerjs';
import type{ MediaConnection } from 'peerjs';
import { session } from '$lib/stores/session';
import { socketStore } from '$lib/stores/socketStore';
import type { Socket } from 'socket.io-client';

interface PeerState {
    peer: Peer | null;
    audioConnection: MediaConnection | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    localAudioLevel: number;
    remoteAudioLevel: number;
    isMuted: boolean;
    status: 'disconnected' | 'connecting' | 'connected';
    error: string | null;
    remotePeerId: string | null;
}

function createPeerStore() {
    const { subscribe, set, update } = writable<PeerState>({
        peer: null,
        audioConnection: null,
        localStream: null,
        remoteStream: null,
        localAudioLevel: 0,
        remoteAudioLevel: 0,
        isMuted: false,
        status: 'disconnected',
        error: null,
        remotePeerId: null
    });

    let socket: Socket | null = null;
    let localAudioAnalyzer: AnalyserNode | null = null;
    let remoteAudioAnalyzer: AnalyserNode | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrameId: number | null = null;

    // Function to analyze audio levels
    const startAudioLevelMonitoring = () => {
        if (!audioContext) {
            audioContext = new AudioContext();
        }

        const state = get(peerStore);
        
        // Set up local audio analysis
        if (state.localStream && !localAudioAnalyzer) {
            const localSource = audioContext.createMediaStreamSource(state.localStream);
            localAudioAnalyzer = audioContext.createAnalyser();
            localAudioAnalyzer.fftSize = 256;
            localSource.connect(localAudioAnalyzer);
        }
        
        // Set up remote audio analysis
        if (state.remoteStream && !remoteAudioAnalyzer) {
            const remoteSource = audioContext.createMediaStreamSource(state.remoteStream);
            remoteAudioAnalyzer = audioContext.createAnalyser();
            remoteAudioAnalyzer.fftSize = 256;
            remoteSource.connect(remoteAudioAnalyzer);
        }
        
        // Function to continuously analyze audio levels
        const analyzeAudioLevels = () => {
            const dataArrayLocal = new Uint8Array(localAudioAnalyzer?.frequencyBinCount || 0);
            const dataArrayRemote = new Uint8Array(remoteAudioAnalyzer?.frequencyBinCount || 0);
            
            localAudioAnalyzer?.getByteFrequencyData(dataArrayLocal);
            remoteAudioAnalyzer?.getByteFrequencyData(dataArrayRemote);
            
            // Calculate average volume level (0-100)
            const localLevel = dataArrayLocal.length > 0 
                ? (dataArrayLocal.reduce((a, b) => a + b, 0) / dataArrayLocal.length) * 0.39 
                : 0;
                
            const remoteLevel = dataArrayRemote.length > 0 
                ? (dataArrayRemote.reduce((a, b) => a + b, 0) / dataArrayRemote.length) * 0.39 
                : 0;
            
            update(s => ({ ...s, localAudioLevel: localLevel, remoteAudioLevel: remoteLevel }));
            
            animationFrameId = requestAnimationFrame(analyzeAudioLevels);
        };
        
        analyzeAudioLevels();
    };

    const stopAudioLevelMonitoring = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        
        localAudioAnalyzer = null;
        remoteAudioAnalyzer = null;
    };

    const initializeAudioStream = async () => {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
        } catch (error) {
            console.error('Audio stream error:', error);
            throw error;
        }
    };

    // Send reactions and other data through the data channel
    const createDataChannel = (peer: Peer, remotePeerId: string) => {
        const conn = peer.connect(remotePeerId);
        
        conn.on('open', () => {
            console.log('Data channel connected');
        });
        
        conn.on('data', (data: any) => {
            // Handle incoming data (reactions, etc.)
            if (data.type === 'reaction') {
                // Trigger reaction display in UI
                window.dispatchEvent(new CustomEvent('peerReaction', { 
                    detail: { emoji: data.emoji } 
                }));
            }
        });
        
        return conn;
    };

    return {
        subscribe,
        init: async () => {
            const currentSession = get(session);
            if (!session.isAuthenticated() || !currentSession.user?.id) {
                throw new Error('User not authenticated');
            }

            socket = socketStore.connect();
            if (!socket) {
                throw new Error('Socket connection failed');
            }

            update(state => ({ ...state, status: 'connecting' }));

            return new Promise<void>((resolve, reject) => {
                update(state => {
                    try {
                        const peer = new Peer(currentSession.user!.id, {
                            config: {
                                iceServers: [
                                    { urls: 'stun:stun.l.google.com:19302' },
                                    { urls: 'stun:global.stun.twilio.com:3478' }
                                ]
                            },
                            debug: 2
                        });

                        peer.on('open', (id) => {
                            console.log('Peer connected with ID:', id);
                            socket?.emit('peer:ready', { peerId: id });
                            update(s => ({ ...s, status: 'connected' }));
                            resolve();
                        });

                        peer.on('error', (err) => {
                            console.error('Peer error:', err);
                            update(s => ({ ...s, error: err.toString(), status: 'disconnected' }));
                            reject(err);
                        });

                        peer.on('connection', (conn) => {
                            conn.on('data', (data: any) => {
                                // Handle incoming data (reactions, etc.)
                                if (data.type === 'reaction') {
                                    // Trigger reaction display in UI
                                    window.dispatchEvent(new CustomEvent('peerReaction', { 
                                        detail: { emoji: data.emoji } 
                                    }));
                                }
                            });
                        });

                        peer.on('call', async (call) => {
                            try {
                                const stream = await initializeAudioStream();
                                call.answer(stream);
                                
                                call.on('stream', (remoteStream) => {
                                    update(s => ({ 
                                        ...s, 
                                        remoteStream,
                                        remotePeerId: call.peer,
                                        status: 'connected'
                                    }));
                                    
                                    // Start audio level monitoring
                                    startAudioLevelMonitoring();
                                    
                                    // Create data channel for reactions
                                    createDataChannel(peer, call.peer);
                                });

                                update(s => ({ ...s, localStream: stream, audioConnection: call }));
                            } catch (error) {
                                console.error('Error answering call:', error);
                                reject(error);
                            }
                        });

                        return { ...state, peer };
                    } catch (error: any) {
                        console.error('Peer initialization error:', error);
                        reject(error);
                        return { ...state, error: error.toString(), status: 'disconnected' };
                    }
                });
            });
        },
        
        call: async (remotePeerId: string) => {
            try {
                update(state => ({ ...state, status: 'connecting', remotePeerId }));
                
                const state = get(peerStore);
                if (!state.peer) throw new Error('Peer not initialized');
                
                const stream = await initializeAudioStream();
                const call = state.peer.call(remotePeerId, stream);
                
                // Create data channel for reactions
                const dataConnection = createDataChannel(state.peer, remotePeerId);
                
                return new Promise<void>((resolve, reject) => {
                    call.on('stream', (remoteStream) => {
                        update(s => ({ 
                            ...s, 
                            remoteStream, 
                            status: 'connected'
                        }));
                        
                        // Start audio level monitoring
                        startAudioLevelMonitoring();
                        resolve();
                    });
                    
                    call.on('error', (err) => {
                        update(s => ({ ...s, error: err.toString(), status: 'disconnected' }));
                        reject(err);
                    });
                    
                    call.on('close', () => {
                        update(s => ({ ...s, status: 'disconnected' }));
                    });

                    update(state => ({ ...state, localStream: stream, audioConnection: call }));
                });
            } catch (error: any) {
                console.error('Call error:', error);
                update(state => ({ 
                    ...state, 
                    error: error.toString(),
                    status: 'disconnected'
                }));
                throw error;
            }
        },

        toggleMute: () => {
            update(state => {
                if (state.localStream) {
                    const audioTracks = state.localStream.getAudioTracks();
                    const newMuteState = !state.isMuted;
                    
                    audioTracks.forEach(track => {
                        track.enabled = !newMuteState;
                    });
                    
                    return { ...state, isMuted: newMuteState };
                }
                return state;
            });
        },
        
        sendReaction: (emoji: string) => {
            const state = get(peerStore);
            if (state.peer && state.remotePeerId) {
                const conn = state.peer.connections[state.remotePeerId]?.[0];
                if (conn) {
                    conn.send({
                        type: 'reaction',
                        emoji
                    });
                }
            }
        },

        disconnect: () => {
            stopAudioLevelMonitoring();
            
            update(state => {
                state.audioConnection?.close();
                state.localStream?.getTracks().forEach(track => track.stop());
                state.peer?.destroy();
                return {
                    peer: null,
                    audioConnection: null,
                    localStream: null,
                    remoteStream: null,
                    localAudioLevel: 0,
                    remoteAudioLevel: 0,
                    isMuted: false,
                    status: 'disconnected',
                    error: null,
                    remotePeerId: null
                };
            });
        }
    };
}

export const peerStore = createPeerStore();

// Create a derived store for speech detection
export const speakingStore = derived(peerStore, ($peerStore) => {
    const SPEAKING_THRESHOLD = 15; // Threshold for considering someone is speaking
    
    return {
        isLocalSpeaking: $peerStore.localAudioLevel > SPEAKING_THRESHOLD && !$peerStore.isMuted,
        isRemoteSpeaking: $peerStore.remoteAudioLevel > SPEAKING_THRESHOLD,
        localAudioLevel: $peerStore.localAudioLevel,
        remoteAudioLevel: $peerStore.remoteAudioLevel
    };
});