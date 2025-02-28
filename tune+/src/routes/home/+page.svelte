<script lang="ts">
   import { io } from "socket.io-client";

   const socket = io('http://localhost:3000')

   socket.on('connect',()=>{
    console.log('Connected!')
   })

   let user_id: string = 'abc'

   socket.on('chat-list', (user_id)=>{
    
   })

</script>

<main class="h-full flex flex-col justify-between">

    <header class="flex items-center justify-between p-4"> 
        <!-- logo -->
         <div class="flex items-center gap-2">
            <img class="w-[24px] h-[24px] bg-blue-500 rounded-[8px] p-1" src="/favicon.png" alt="Img">
            <span class="font-bold">Tune+</span>
         </div>

         <!-- more -->
         <i class="w-[24px] h-[24px] text-blue-500 fa-solid fa-ellipsis-vertical"></i>
    </header>

    <!-- SEARCH AND FILTER -->
    <div class="w-full flex flex-col gap-1">
        <!-- search -->
         <div class="w-full relative flex items-center px-4 py-3">
            <input class="w-full bg-gray-200 py-2 px-4 rounded-xl" type="text"  placeholder="Search..."/>
            <i class="fas fa-magnifying-glass text-blue-500 absolute right-6"></i>
         </div>
        <!-- Categories -->
        <div class="border-b-1 border-gray-200 py-1">
            <ul class="flex items-center justify-between">
                <li class="bg-gray-300 mx-4 text-white rounded-2xl w-1/3 p-2 text-center text-[14px] font-medium"> <button>All</button> </li>
                <li class="w-full p-2 text-center text-[14px] font-medium"> <button>Groups</button> </li>
                <li class="w-full p-2 text-center text-[14px] font-medium"> <button>Channels</button> </li>
                <li class="w-full p-2 text-center text-[14px] font-medium"> <button>Personal</button> </li>
            </ul>
        </div>
    </div>

    <!-- CHAT LIST -->

    <div class="w-full overflow-y-auto max-h-[calc(100vh-100px)] scroll-smooth overscroll-behavior-y: contain will-change-scroll scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200 ">
        <!-- SINGLE CHAT -->
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

    <!-- Floating button -->
    <div class="absolute bottom-0 right-0 m-5">
        <div class="w-[50px] h-[50px] bg-blue-500 rounded-full flex items-center justify-center">
            <i class="fas fa-plus"></i>
        </div>
    </div>

</main>