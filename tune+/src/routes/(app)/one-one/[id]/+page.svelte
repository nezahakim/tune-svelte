<script lang='ts'>
    import { session } from '$lib/stores/session';
    import { socketStore } from '$lib/stores/socketStore';
    import { fade, scale, fly } from 'svelte/transition';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { onMount, onDestroy } from 'svelte';
    import type { Peer, MediaConnection } from 'peerjs';

    // Types
    interface ConnectedUser {
        id: string;
        name: string;
        avatar?: string;
        isSpeaking: boolean;
    }

    // Runes state management
    let peer = $state<Peer | null>(null);
    let localStream = $state<MediaStream | null>(null);
    let peerConnections = $state<Record<string, MediaConnection>>({});
    let connectedUsers = $state<Record<string, ConnectedUser>>({});
    let isMuted = $state(false);
    let visible = $state(false);
    let activeEmoji = $state('fa-face-grin');
    let audioContext = $state<AudioContext | null>(null);
    let audioAnalyser = $state<AnalyserNode | null>(null);
    let callStartTime = $state(Date.now());
    let callDuration = $state('00:00');
    let durationInterval = $state<number | null>(null);
   
    // Constants and variables
    const userId = $session.user?.id || null;
    const userName = $session.user?.name || 'Me';
    const userAvatar = $session.user?.avatar;
    const receiverId = $page.params.id;
    const roomId = `room-${'12'}`;
    
    // Get socket connection
    const socket = socketStore.connect();
    
    // Animation values for speaking indicators
    let speakingHeight1 = $state(20);
    let speakingHeight2 = $state(10);
    let speakingHeight3 = $state(20);
    
    // Calculate speaking user
    const speakingUser = $derived(Object.values(connectedUsers).find(user => user.isSpeaking));
    
    // Set up animation loop for speaking indicator
    const animationInterval = setInterval(() => {
        speakingHeight1 = speakingHeight1 === 20 ? 10 : 20;
        speakingHeight2 = speakingHeight2 === 10 ? 20 : 10;
        speakingHeight3 = speakingHeight3 === 20 ? 10 : 20;
    }, 500);

    // Update call duration
    function updateDuration() {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        callDuration = `${minutes}:${seconds}`;
    }

    const emojis = [
        { icon: 'fa-face-grin', id: 'smile' },
        { icon: 'fa-face-grin-beam-sweat', id: 'sweat' },
        { icon: 'fa-face-grin-squint-tears', id: 'laugh' },
        { icon: 'fa-heart', id: 'heart' }
    ];

    onMount(async () => {
        if (browser) {
            try {
                // Start duration timer
                callStartTime = Date.now();
                durationInterval = setInterval(updateDuration, 1000) as unknown as number;

                const options = {
                    mimeTye: 'video/mp4',
                    frameRate: 60,
                    audioBitsPerSecond: 2_500_000,
                    videoBitsPerSecond: 2_500_000,
                    audio: true,
                }
                
                
                // Initialize media stream
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: {frameRate: options.frameRate},
                    audio: true
                });

                
                // Initialize speech detection
                setupSpeechDetection();
                
                // Add ourselves to the connected users
                connectedUsers[userId] = {
                    id: userId,
                    name: userName,
                    avatar: userAvatar,
                    isSpeaking: false
                };
                
                // Initialize peer connection
                const { default: PeerJS } = await import('peerjs');
                peer = new PeerJS(userId);
                
                // When peer connection is established
                peer.on('open', (id) => {
                    console.log(`Peer connection established with ID: ${id}`);
                    
                    // Join the room with our complete user data
                    if (socket) {
                        const userData = {
                            id: userId,
                            name: userName,
                            avatar: userAvatar
                        };
                        
                        socket.emit('joinRoom', roomId, id, userData);
                        
                        // Request current room participants
                        socket.emit('getRoomParticipants', roomId);
                    }
                });
                
                // Handle incoming calls
                peer.on('call', (call) => {
                    // Answer the call with our stream
                    call.answer(localStream);
                    
                    // Handle the remote stream
                    call.on('stream', (remoteStream) => {
                        addAudioStream(call.peer, remoteStream);
                    });
                    
                    // Save the peer connection
                    peerConnections[call.peer] = call;
                });
                
                // Listen for other users joining
                socket?.on('userJoined', (data) => {
                    const { userId: joinedId, user } = data;
                    console.log(`User joined with ID: ${joinedId}`, user);
                    
                    // Add the user to our connected users with their full profile
                    if (!connectedUsers[joinedId]) {
                        connectedUsers[joinedId] = {
                            id: joinedId,
                            name: user.name || `User ${joinedId.substring(0, 5)}`,
                            avatar: user.avatar,
                            isSpeaking: false
                        };
                    }
                    
                    // Connect to the new user
                    if (localStream) {
                        connectToNewUser(joinedId, localStream);
                    }
                });
                
                // Listen for room participants list (for users who refresh)
                socket?.on('roomParticipants', (participants) => {
                    console.log('Received room participants:', participants);
                    
                    // Add all participants to connected users
                    participants.forEach(participant => {
                        if (participant.userId !== userId && !connectedUsers[participant.userId]) {
                            connectedUsers[participant.userId] = {
                                id: participant.userId,
                                name: participant.user.name || `User ${participant.userId.substring(0, 5)}`,
                                avatar: participant.user.avatar,
                                isSpeaking: false
                            };
                            
                            // Connect to this participant
                            if (localStream) {
                                connectToNewUser(participant.userId, localStream);
                            }
                        }
                    });
                });
                
                // Handle user disconnections
                socket?.on('user-disconnected', (id) => {
                    console.log(`User disconnected: ${id}`);
                    
                    // Close the peer connection
                    if (peerConnections[id]) {
                        peerConnections[id].close();
                        delete peerConnections[id];
                    }
                    
                    // Remove from connected users
                    if (connectedUsers[id]) {
                        delete connectedUsers[id];
                    }
                    
                    // Remove audio element
                    const audioElement = document.getElementById(`audio-${id}`);
                    if (audioElement) {
                        audioElement.remove();
                    }
                });
                
                // Create our own audio element (muted)
                if (localStream) {
                    addAudioStream(userId, localStream, true);
                }
            } catch (err) {
                console.error('Failed to initialize audio call:', err);
            }
        }
    });

    onDestroy(() => {
        // Clean up resources
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        
        if (peer) {
            peer.destroy();
        }
        
        if (audioContext) {
            audioContext.close();
        }
        
        // Clear intervals
        clearInterval(animationInterval);
        if (durationInterval) clearInterval(durationInterval);
        
        // Notify other users we're leaving
        socket?.emit('leaveRoom', roomId, userId);
    });

    function setupSpeechDetection() {
        if (!localStream) return;
        
        try {
            // Create audio context and analyzer
            audioContext = new AudioContext();
            audioAnalyser = audioContext.createAnalyser();
            
            // Connect the stream to the analyzer
            const source = audioContext.createMediaStreamSource(localStream);
            source.connect(audioAnalyser);
            
            // Configure analyzer
            audioAnalyser.fftSize = 256;
            const bufferLength = audioAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Start detection loop
            const detectSpeech = () => {
                if (!audioAnalyser) return;
                
                audioAnalyser.getByteFrequencyData(dataArray);
                
                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                
                // Check if speaking (and not muted)
                const isSpeaking = average > 30 && !isMuted;
                
                // Update speaking status
                if (connectedUsers[userId] && connectedUsers[userId].isSpeaking !== isSpeaking) {
                    connectedUsers[userId].isSpeaking = isSpeaking;
                    // Emit speaking status to others
                    socket?.emit('userSpeaking', roomId, {
                        userId: userId,
                        speaking: isSpeaking
                    });
                }
                
                // Continue detection
                requestAnimationFrame(detectSpeech);
            };
            
            // Start detection
            requestAnimationFrame(detectSpeech);
            
            // Listen for speaking events from other users
            socket?.on('userSpeaking', (data) => {
                const { userId: speakingUserId, speaking } = data;
                if (connectedUsers[speakingUserId]) {
                    connectedUsers[speakingUserId].isSpeaking = speaking;
                }
            });
        } catch (err) {
            console.error('Failed to setup speech detection:', err);
        }
    }

    function addAudioStream(userId: string, stream: MediaStream, muted: boolean = false) {
        // Check if audio element already exists
        let audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
        
        if (!audioElement) {
            // Create new audio element
            audioElement = document.createElement('audio');
            audioElement.id = `audio-${userId}`;
            audioElement.autoplay = true;
            
            // Add to audio grid
            const audioGrid = document.getElementById('audio-grid');
            if (audioGrid) {
                audioGrid.appendChild(audioElement);
            }
        }
        
        // Set properties
        audioElement.srcObject = stream;
        audioElement.muted = muted;
    }

    function connectToNewUser(userId: string, stream: MediaStream) {
        if (!peer) return;
        
        // Call the user
        const call = peer.call(userId, stream);
        
        // Handle the remote stream
        call.on('stream', (remoteStream) => {
            addAudioStream(userId, remoteStream);
        });
        
        // Handle disconnection
        call.on('close', () => {
            const audioElement = document.getElementById(`audio-${userId}`);
            if (audioElement) {
                audioElement.remove();
            }
            
            if (connectedUsers[userId]) {
                delete connectedUsers[userId];
            }
        });
        
        // Save the connection
        peerConnections[userId] = call;
    }
    
    function toggleMute() {
        if (localStream) {
            // Toggle mute state for all audio tracks
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            
            // Update mute state
            isMuted = !isMuted;
            
            // If muting, make sure speaking indicator is off
            if (isMuted && connectedUsers[userId]) {
                connectedUsers[userId].isSpeaking = false;
                socket?.emit('userSpeaking', roomId, {
                    userId: userId,
                    speaking: false
                });
            }
        }
    }
    
    function handleReact(emoji: string) {
        activeEmoji = emoji;
        visible = true;
        
        // Send reaction to others
        socket?.emit('emojiReaction', roomId, {
            userId: userId,
            emoji: emoji
        });
        
        // Hide after delay
        setTimeout(() => {
            visible = false;
        }, 2000);
    }
    
    function handlePass() {
        // Pass speaking turn to someone else
        socket?.emit('passSpeaking', roomId, userId);
    }
    
    // Listen for emoji reactions from others
    socket?.on('emojiReaction', (data) => {
        if (data.userId !== userId) {
            activeEmoji = data.emoji;
            visible = true;
            
            // Hide after delay
            setTimeout(() => {
                visible = false;
            }, 2000);
        }
    });
</script>

<main class="flex flex-col h-full w-full justify-between bg-gray-600">
    <div class="flex items-center justify-between w-full bg-gray-700 p-2 rounded-b-2xl">
        <a href="/home" class="flex items-center py-1 px-3 gap-1 bg-amber-200 rounded-4xl hover:bg-amber-300 transition-colors duration-200"
           onmousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
           onmouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
           onmouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}>
            <i class="fas fa-angle-left"></i>
            <span class="text-xs font-extrabold">{callDuration}</span>
        </a>

        {#if speakingUser}
        <div class="py-1 px-3 flex items-center bg-amber-100 rounded-4xl gap-2">
            <div class="flex items-center justify-end w-full">
                <span class="bg-white ml-1 rounded-full h-[{speakingHeight1}px] w-1 text-white transition-all duration-300"></span>
                <span class="bg-white ml-1 rounded-full h-[{speakingHeight2}px] w-1 text-white transition-all duration-300"></span>
                <span class="bg-white ml-1 rounded-full h-[{speakingHeight3}px] w-1 text-white transition-all duration-300"></span>
             </div>
            <span class="text-xs font-bold flex gap-2">{(speakingUser.name).split(' ')[0]}<p class="text-amber-500">speaking...</p></span>
        </div>
        {/if}

        <button class="flex items-center py-1 px-3 gap-1 backdrop-blur-2xl shadow-3xl rounded-4xl bg-amber-100 hover:bg-amber-200 transition-colors duration-200"
                onmousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                onmouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
                onmouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}>
             <i class="text-xs font-extrabold fas fa-plus"></i>
             <span class="text-xs font-normal">Add</span>
        </button>
    </div>
    
    <div id="audio-grid" class="shadow-4xl flex flex-col h-full w-full">
        <!-- Grid container to display users in a grid instead of stack -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-full w-full">
                        
            <!-- Remote users -->
            {#each Object.values(connectedUsers).filter(u => u.id !== userId) as user, i (user.id)}
            <div class="flex flex-col items-center justify-center" in:fly={{ y: 20, duration: 500, delay: 200 + (i * 100) }}>
                <div class="bg-gray-400 p-6 h-full w-full rounded-3xl flex flex-col items-center justify-center hover:bg-gray-500 transition-colors duration-300">
                    <div class="relative">
                        <img class="w-24 h-24 rounded-full p-2 bg-white hover:rotate-3 hover:scale-105 transition-all duration-300" 
                             src={user.avatar || "/api/placeholder/120/120"} alt={`${user.name}'s profile`}>
                        {#if user.isSpeaking}
                        <div class="absolute -top-1 -right-1 bg-green-400 w-4 h-4 rounded-full animate-pulse"></div>
                        {/if}
                    </div>
                    <span class="p-2 font-bold text-sm text-white">{user.name}</span>
                </div> 
            </div>
            {/each}

            <!-- Local user -->
            <div class="flex flex-col items-center justify-center" in:fly={{ y: 20, duration: 500, delay: 200 }}>
                <div class="bg-gray-500 p-6 h-full w-full rounded-3xl flex flex-col items-center justify-center hover:bg-gray-600 transition-colors duration-300">
                    <div class="relative">
                        <!-- svelte-ignore hydration-attribute-changed -->
                        <img class="w-24 h-24 rounded-full p-2 bg-white hover:rotate-3 hover:scale-105 transition-all duration-300" 
                             src={userAvatar} alt="My profile">
                        {#if connectedUsers[userId]?.isSpeaking}
                        <div class="absolute -top-1 -right-1 bg-green-400 w-4 h-4 rounded-full animate-pulse"></div>
                        {/if}
                    </div>
                    <span class="p-2 font-bold text-sm text-white">
                        Me {isMuted ? '(Muted)' : ''}
                    </span>
                </div> 
            </div>

        </div>
     </div>

     <div class="rounded-t-2xl bg-gray-700 p-2 flex items-center justify-between">
         <ul class="flex items-center gap-2">
            {#each emojis as emoji}
                <li class="py-2 bg-gray-300 px-3 rounded-2xl text-blue-500 hover:bg-gray-200 transition-colors duration-200 transform hover:-translate-y-1"
                    onmousedown={(e) => e.currentTarget.style.transform = "scale(1.1) translateY(-2px)"}
                    onmouseup={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                    onmouseleave={(e) => e.currentTarget.style.transform = ""}
                    onclick={() => handleReact(emoji.icon)}>
                    <i class="fas {emoji.icon}"></i>
                </li>
            {/each}
         </ul>

        <button class="text-xs gap-1 font-bold flex items-center bg-amber-200 p-2 rounded-2xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
                onmousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                onmouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
                onmouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}
                onclick={toggleMute}>
            <i class="text-sm font-bold px-1 fas {isMuted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button class="text-xs gap-1 font-bold flex items-center bg-amber-200 p-2 rounded-2xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
                onmousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                onmouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
                onmouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}
                onclick={handlePass}>
            <i class="text-sm font-bold px-1 fas fa-right-long"></i>
            <span>Pass</span>
        </button>
     </div>

{#if visible}
     <div class="w-full h-full absolute bottom-0 right-0 flex items-center justify-center backdrop-blur-sm" 
          in:fade={{ duration: 200 }}
          out:fade={{ duration: 300 }}> 
        <i class="fas {activeEmoji} text-9xl animate-bounce"
           in:scale={{ start: 0.5, duration: 300 }}></i>
     </div>
{/if}
</main>

<style>
    /* Add custom animation for emoji bounce */
    .animate-bounce {
        animation: emoji-bounce 1s infinite;
    }
    
    @keyframes emoji-bounce {
        0%, 100% {
            transform: translateY(-5%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
        }
        50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
        }
    }
    
    /* Smooth transitions for all elements */
    * {
        transition-property: transform, background-color, box-shadow;
        transition-duration: 200ms;
    }
    
    /* Pulse animation for speaking indicators */
    .animate-pulse {
        animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
    
    /* Custom rounded corners for buttons */
    .rounded-4xl {
        border-radius: 1rem;
    }
    
    /* Custom shadow */
    .shadow-3xl {
        box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
    }
    
    .shadow-4xl {
        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
    }
</style>