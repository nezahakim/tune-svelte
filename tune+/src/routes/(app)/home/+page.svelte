<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { socketStore } from '$lib/stores/socketStore';
    import { chats } from '$lib/stores/chatStore';
    import type { Chat } from '$lib/types';
	import { session } from '$lib/stores/session';
	import axios from 'axios';

    let selectedCategory = $state('all');
    let searchQuery = $state('');
    let socket: any;
    let userId = $state()
    
    const API_BASE_URL = 'http://localhost:3000'

    // Filter categories
    const categories = ['all', 'groups', 'channels', 'private'];

    const filteredChats = $derived($chats
        // First sort by lastMessage.createdAt
        .sort((a, b) => {
            const dateA = new Date(a.lastMessage?.createdAt || 0).getTime();
            const dateB = new Date(b.lastMessage?.createdAt || 0).getTime();
            return dateB - dateA; // Most recent first
        })
        // Then apply filters
        .filter(chat => {
            if (selectedCategory === 'all') return true;
            return chat.chatType === selectedCategory;
        })
        .filter(chat => 
            getName(chat).toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMessage?.message.toLowerCase().includes(searchQuery.toLowerCase())
        ))


    onMount(() => {
        socket = socketStore.connect();
        
        // Listen for new chats
        socket.on('chatCreated', (chat: Chat) => {
            chats.addChat(chat);
        });

        // Fetch initial chats
        if($session.user && $session.user.id){
            getInitialChats($session.user.id);
            userId = $session.user.id
        }
        
    });

    onDestroy(() => {
        socketStore.disconnect();
    });


    // Fetch Initial chat data
    async function getInitialChats(userId: string) {
      try {
        const response = await axios.get(`${API_BASE_URL}/get-chats/${userId}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.data) {
            chats.addChats(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching receiver data:', error);
      }
    }

    async function handleChatClick(chatId: string, participants:any) {

        let id = participants[0]?._id === userId ? participants[1]?._id : participants[0]?._id;

        try {
            socket.emit('joinChat', chatId);
            // goto(`/chats/${id}`);
            window.location.href = `/chats/${id}`
        } catch (error) {
            console.error('Failed to join chat:', error);
        }
    }

    function handleCategoryChange(category: string) {
        selectedCategory = category;
    }

    function handleCreateNewChat() {
        goto('/chats/new');
    }

    function getUserColor(){
        if($session.user){
            return $session.user.preferences?.color;
        }
    }

    function getPreferenceColor(chat: Chat) {
        if (chat.chatType === 'private') {
            return chat.participants[0]?._id === userId ? chat.participants[1].preferences?.color : chat.participants[0].preferences?.color;
        }else{
            return 'gray-900';
        }
    }

    function getName(chat: Chat){
        if (chat?.chatType === 'private') {
            return chat.participants[0]?._id === userId ? chat.participants[1]?.name : chat.participants[0]?.name;
        }else{
            return chat.name;
        }
    }

    function getAvatar(chat: Chat) {
        if (chat.chatType === 'private') {
            return chat.participants[0]?._id === userId ? chat.participants[1]?.avatar : chat.participants[0]?.avatar;
        }else{
            return chat.avatar;
        }
    }

    function getLastMessage(chat: Chat){
        if(chat.chatType === 'private'){
            return {
                message: chat.lastMessage.message,
                user: chat.lastMessage?.user?._id === userId ?'Me:': ''
            }
        }else{
            return {
                message: chat.lastMessage.message,
                user: chat.lastMessage?.user?._id === userId ?'Me': chat.lastMessage.user.name.split(' ')[0]
            }
        }
    }

    function getUnreadCount(chat: Chat){
        return chat.unreadCount;
    }

</script>
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_consider_explicit_label -->
<main class="h-full flex flex-col justify-between ">
    <header class="flex items-center justify-between p-4"> 
        <div class="flex items-center gap-2">
            <img class="w-[24px] h-[24px] bg-{getUserColor()} rounded-[8px] p-1" src="/favicon.png" alt="Tune+ Logo">
            <span class="font-bold">Tune+</span>
        </div>
        <i class=" w-[24px] h-[24px] text-{getUserColor()} fa-solid fa-ellipsis-vertical"></i>
    </header>

    <div class="w-full flex flex-col gap-1">
        <div class="w-full relative flex items-center px-4 py-3">
            <input 
                class="w-full bg-gray-200 py-2 px-4 rounded-xl"
                type="text"
                bind:value={searchQuery}
                placeholder="Search..."
            />
            <i class="fas fa-magnifying-glass text-{getUserColor()} absolute right-6"></i>
        </div>

        <div class=" border-b-1 border-gray-200 py-1">
            <ul class="flex items-center justify-between">
                {#each categories as category}
                    <li class="w-full">
                        <button 
                            class="w-full p-2 text-center text-[14px] font-medium rounded-2xl
                                {selectedCategory === category ? 'bg-gray-300 text-white' : ''}"
                            onclick={() => handleCategoryChange(category)}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                    </li>
                {/each}
            </ul>
        </div>
    </div>

    <div class="w-full h-full overflow-y-auto max-h-[calc(100vh-100px)] scroll-smooth overscroll-behavior-y: contain will-change-scroll scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200">
        {#each filteredChats as chat (chat.id)}
            <div
                class="flex items-center gap-3 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
                onclick={() => handleChatClick(chat.id, chat.participants)}
            >
                <div class="flex items-center justify-center w-[40px] h-[40px] bg-{getPreferenceColor(chat)} ml-4 rounded-xl relative">
                    <img class="w-[40px] h-[40px] rounded-xl" src={getAvatar(chat)} alt={chat.name}>
                    {#if chat.isOnline}
                        <span class="w-[10px] h-[10px] bg-blue-500 rounded-full absolute bottom-1 right-1"></span>
                    {/if}
                </div>
                <div class="py-2 border-b-1 border-gray-300 w-full">
                    <div class="flex justify-between items-center">
                        <h1 class="font-semibold text-{getPreferenceColor(chat)} text-[14px]">{getName(chat)}</h1>
                        {#if chat.lastMessage.createdAt}
                            <span class="text-xs text-gray-500 mr-4 ">
                                {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        {/if}
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="flex items-center font-light text-[14px] text-gray-600">
                            <p class="font-bold text-[12px]">{getLastMessage(chat).user}</p> {getLastMessage(chat).message}
                        </span>
                        {#if chat.unreadCount}
                            <span class="bg-{getUserColor()} text-white rounded-full px-2 py-1 text-xs mr-4">
                                {getUnreadCount(chat)}
                            </span>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}

        {#if filteredChats.length === 0}
            <div class="flex items-center justify-center h-full">
                <p class="text-gray-500">No chats found</p>
            </div>
        {/if}
    </div>

    <div class="absolute bottom-0 right-0 m-5">
        <button
            class="w-[50px] h-[50px] bg-{getUserColor()} rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors duration-200"
            onclick={handleCreateNewChat}
        >
            <i class="fas fa-plus"></i>
        </button>
    </div>
</main>