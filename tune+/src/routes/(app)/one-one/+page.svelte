<script lang='ts'>
    import {fade, scale, fly} from 'svelte/transition'
  
    let visible = $state(false);
    let activeEmoji = $state('fa-face-grin');

    function handleReact(emoji: string) {
        activeEmoji = emoji;
        visible = true;
        
        setTimeout(() => {
            visible = false;
        }, 2000);
    }

    // Animation for speaking indicator
    let speakingHeight1 = $state(20);
    let speakingHeight2 = $state(10);
    let speakingHeight3 = $state(20);

    // Set up animation loop for speaking indicator
    setInterval(() => {
        speakingHeight1 = speakingHeight1 === 20 ? 10 : 20;
        speakingHeight2 = speakingHeight2 === 10 ? 20 : 10;
        speakingHeight3 = speakingHeight3 === 20 ? 10 : 20;
    }, 500);

    const emojis = [
        { icon: 'fa-face-grin', id: 'smile' },
        { icon: 'fa-face-grin-beam-sweat', id: 'sweat' },
        { icon: 'fa-face-grin-squint-tears', id: 'laugh' },
        { icon: 'fa-heart', id: 'heart' }
    ];
</script>

<main class="flex flex-col h-full w-full justify-between bg-gray-600">
    <div class="flex items-center justify-between w-full bg-gray-700 p-2 rounded-b-2xl">
        <a href="/home" class="flex items-center py-1 px-3 gap-1 bg-amber-200 rounded-4xl hover:bg-amber-300 transition-colors duration-200"
           on:mousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
           on:mouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
           on:mouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}>
            <i class="fas fa-angle-left"></i>
            <span class="text-[12px] font-extrabold">12:00</span>
        </a>

        <div class="py-1 px-3 flex items-center bg-amber-100 rounded-4xl gap-2">
            <div class="flex items-center justify-end w-full">
                <span class="bg-white ml-1 rounded-full h-[{speakingHeight1}px] w-[4px] text-white transition-all duration-300"></span>
                <span class="bg-white ml-1 rounded-full h-[{speakingHeight2}px] w-[4px] text-white transition-all duration-300"></span>
                <span class="bg-white ml-1 rounded-full h-[{speakingHeight3}px] w-[4px] text-white transition-all duration-300"></span>
             </div>
            <span class="text-[12px] font-bold flex gap-2">Neza<p class="text-amber-500">speaking...</p></span>
        </div>

        <button class="flex items-center py-1 px-3 gap-1 backdrop-blur-2xl shadow-3xl rounded-4xl bg-amber-100 hover:bg-amber-200 transition-colors duration-200"
                on:mousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                on:mouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
                on:mouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}>
             <i class="text-[12px] font-extrabold fas fa-plus"></i>
             <span class="text-[12px] font-normal">Add</span>
        </button>
    </div>
    
    <div class="shadow-4xl flex flex-col h-full w-full">
        <div class="h-full w-full flex flex-col items-center justify-center" in:fly={{ y: 20, duration: 500, delay: 200 }}>
            <div class="bg-gray-400 p-10 h-[90%] w-[90%] rounded-3xl flex flex-col items-center justify-center hover:bg-gray-500 transition-colors duration-300">
                <img class="w-[120px] h-[120px] rounded-full p-2 bg-white hover:rotate-3 hover:scale-105 transition-all duration-300" src="/1.jpg" alt="IMG">
                <span class="p-2 font-bold text-[14px] text-white">Neza Hakim</span>
             </div> 
        </div>
        <div class="h-full w-full flex flex-col items-center justify-center" in:fly={{ y: 20, duration: 500, delay: 400 }}>
            <div class="bg-gray-500 p-10 h-[90%] w-[90%] rounded-3xl flex flex-col items-center justify-center hover:bg-gray-600 transition-colors duration-300">
                <img class="w-[120px] h-[120px] rounded-full p-2 bg-white hover:rotate-3 hover:scale-105 transition-all duration-300" src="/1.jpg" alt="IMG">
                <span class="p-2 font-bold text-[14px] text-white">Me</span>
             </div> 
        </div>
     </div>

     <div class="rounded-t-2xl bg-gray-700 p-2 flex items-center justify-between">
         <ul class="flex items-center gap-2">
            {#each emojis as emoji}
                <li class="py-2 bg-gray-300 px-3 rounded-2xl text-blue-500 hover:bg-gray-200 transition-colors duration-200 transform hover:-translate-y-1"
                    on:mousedown={(e) => e.currentTarget.style.transform = "scale(1.1) translateY(-2px)"}
                    on:mouseup={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                    on:mouseleave={(e) => e.currentTarget.style.transform = ""}
                    on:click={() => handleReact(emoji.icon)}>
                    <i class="fas {emoji.icon}"></i>
                </li>
            {/each}
         </ul>

      
        <div class="text-[12px] gap-1 font-bold flex items-center bg-amber-200 p-2 rounded-2xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
             on:mousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
             on:mouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
             on:mouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}>
            <i class="text-[14px] font-bold px-1 fas fa-microphone-slash"></i>
            <span>Mute</span>
        </div>


        <div class="text-[12px] gap-1 font-bold flex items-center bg-amber-200 p-2 rounded-2xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
             on:mousedown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
             on:mouseup={(e) => e.currentTarget.style.transform = "scale(1)"}
             on:mouseleave={(e) => e.currentTarget.style.transform = "scale(1)"}>
            <i class="text-[14px] font-bold px-1 fas fa-right-long"></i>
            <span>Pass</span>
        </div>
     </div>

{#if visible}
     <div class="w-full h-full absolute bottom-0 right-0 flex items-center justify-center backdrop-blur-[3px]" 
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
</style>
