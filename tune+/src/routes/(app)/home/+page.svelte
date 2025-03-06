<!-- <script lang="ts">
  
</script>

<main class="h-full flex flex-col justify-between">

    <header class="flex items-center justify-between p-4"> 
         <div class="flex items-center gap-2">
            <img class="w-[24px] h-[24px] bg-blue-500 rounded-[8px] p-1" src="/favicon.png" alt="Img">
            <span class="font-bold">Tune+</span>
         </div>

         <i class="w-[24px] h-[24px] text-blue-500 fa-solid fa-ellipsis-vertical"></i>
    </header>

    <div class="w-full flex flex-col gap-1">
        <div class="w-full relative flex items-center px-4 py-3">
            <input class="w-full bg-gray-200 py-2 px-4 rounded-xl" type="text"  placeholder="Search..."/>
            <i class="fas fa-magnifying-glass text-blue-500 absolute right-6"></i>
         </div>
        <div class="border-b-1 border-gray-200 py-1">
            <ul class="flex items-center justify-between">
                <li class="bg-gray-300 mx-4 text-white rounded-2xl w-1/3 p-2 text-center text-[14px] font-medium"> <button>All</button> </li>
                <li class="w-full p-2 text-center text-[14px] font-medium"> <button>Groups</button> </li>
                <li class="w-full p-2 text-center text-[14px] font-medium"> <button>Channels</button> </li>
                <li class="w-full p-2 text-center text-[14px] font-medium"> <button>Personal</button> </li>
            </ul>
        </div>
    </div>


    <div class="w-full overflow-y-auto max-h-[calc(100vh-100px)] scroll-smooth overscroll-behavior-y: contain will-change-scroll scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200 ">
         {#each [1,2,3,4,1,1,1,1,1,1,1,,1,1,1,1,1,1,1,,1,1,1,1,1,1,,1,1,1,1,1,1,,1,1,1,1,1,1,1,1,1,1,1,1,,1,1,1,1] as index }
         <div class="flex items-center gap-3">
            <div class="w-[40pxs] h-[40px] bg-gray-200 p-1 ml-4 rounded-xl">
                <img class="w-[34px] h-[34px] rounded-xl" src="/1.jpg" alt="">
                <span class="w-[10px] h-[10px] bg-blue-500 rounded-full "></span>
            </div>
            <div class="py-2 border-b-1 border-gray-300 w-full">
                <h1 class="font-semibold text-amber-500 text-[14px]">Neza Hakim</h1>
                <span class=" font-light text-[14px] ">You: welcome to the new way of coding with me!</span>
            </div>
         </div>
         {/each}

    </div>

    <div class="absolute bottom-0 right-0 m-5">
        <div class="w-[50px] h-[50px] bg-blue-500 rounded-full flex items-center justify-center">
            <i class="fas fa-plus"></i>
        </div>
    </div>

</main> -->


<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { socketStore } from '$lib/stores/socketStore';
    import { chats } from '$lib/stores/chatStore';
    import type { Chat } from '$lib/types';
	import { session } from '$lib/stores/session';

    let selectedCategory = $state('all');
    let searchQuery = $state('');
    let socket: any;
    let userId = $state()

    // Filter categories
    const categories = ['all', 'groups', 'channels', 'personal'];

    const filteredChats = $derived($chats
        .filter(chat => {
            if (selectedCategory === 'all') return true;

            return chat.type === selectedCategory;
            
        })
        .filter(chat => 
            chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
        ))

    onMount(() => {
        socket = socketStore.connect();
        
        // Listen for new chats
        socket.on('chatCreated', (chat: Chat) => {
            chats.addChat(chat);
        });

        // Fetch initial chats
        if($session.user && $session.user.id){
            userId = $session.user.id

            socket.emit('getChats', $session.user.id)
            socket.on("chats", (Chats: Chat[]) => {
                chats.addChats(Chats);
                console.log(Chats)
            })

        }
        
    });

    onDestroy(() => {
        socketStore.disconnect();
    });

    async function handleChatClick(chatId: string, userId: string) {
        try {
            console.log(chatId, userId)
            socket.emit('joinChat', chatId);
            await goto(`/chats/${userId}`);
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
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<main class="h-full flex flex-col justify-between">
    <header class="flex items-center justify-between p-4"> 
        <div class="flex items-center gap-2">
            <img class="w-[24px] h-[24px] bg-blue-500 rounded-[8px] p-1" src="/favicon.png" alt="Tune+ Logo">
            <span class="font-bold">Tune+</span>
        </div>
        <i class="w-[24px] h-[24px] text-blue-500 fa-solid fa-ellipsis-vertical"></i>
    </header>

    <div class="w-full flex flex-col gap-1">
        <div class="w-full relative flex items-center px-4 py-3">
            <input 
                class="w-full bg-gray-200 py-2 px-4 rounded-xl"
                type="text"
                bind:value={searchQuery}
                placeholder="Search..."
            />
            <i class="fas fa-magnifying-glass text-blue-500 absolute right-6"></i>
        </div>

        <div class="border-b-1 border-gray-200 py-1">
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
                onclick={() => handleChatClick(chat.id,chat.participants[1]?._id)}
            >
                <div class="w-[40px] h-[40px] bg-gray-200 p-1 ml-4 rounded-xl relative">
                    <img class="w-[34px] h-[34px] rounded-xl" src={chat.avatar} alt={chat.name}>
                    {#if chat.isOnline}
                        <span class="w-[10px] h-[10px] bg-blue-500 rounded-full absolute bottom-1 right-1"></span>
                    {/if}
                </div>
                <div class="py-2 border-b-1 border-gray-300 w-full">
                    <div class="flex justify-between items-center">
                        <h1 class="font-semibold text-amber-500 text-[14px]">{chat.name}</h1>
                        {#if chat.timestamp}
                            <span class="text-xs text-gray-500">
                                {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        {/if}
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="flex items-center font-light text-[14px] text-gray-600">
                            <p class="font-bold text-[12px]">{chat.lastMessage?.user === userId ?'Me':(chat.name).split(' ')[0]}:</p>&nbsp;{chat.lastMessage?.message}
                        </span>
                        {#if chat.unreadCount}
                            <span class="bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
                                {chat.unreadCount}
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
            class="w-[50px] h-[50px] bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors duration-200"
            onclick={handleCreateNewChat}
        >
            <i class="fas fa-plus"></i>
        </button>
    </div>
</main>