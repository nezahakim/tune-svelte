  <script lang='ts'>
    import { fly, fade, scale } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';
    import type { ChatMessage, Gift, User } from '$lib/types';
    import { gifts } from '$lib/gifts';
    import { emojiCategories } from '$lib/emojis';
    import { session } from '$lib/stores/session';
    import { page } from '$app/stores';
    import axios from 'axios';
    import { socketStore } from '$lib/stores/socketStore';
    
    // Constants
    const API_BASE_URL = 'http://localhost:3000';
    const TYPING_TIMEOUT_DURATION = 3000;
    const GIFT_ANIMATION_DURATION = 3000;
    
    // Socket connection
    const socket = socketStore.connect();
    
    // State variables
    let message = $state<string>('');
    let messages = $state<ChatMessage[]>([]);
    let typing = $state(false);
    let typingTimeout: number | undefined;
    let unreadMessages = $state(0);
    let chatStatus = $state(false);
    let chatId = $state<string | undefined>(undefined);
    let receiverData = $state<User | undefined>(undefined);
    let isTyping = $state(false);
    let showEmojiPicker = $state(false);
    let attachmentMenuOpen = $state(false);
    let isRecording = $state(false);
    let showScrollButton = $state(false);
    let showGiftPicker = $state(false);
    let showGiftAnimation = $state(false);
    let currentGift = $state<Gift | null>(null);
    let currentEmojiCategory = $state(0);
    
    // User data from session store
    const userId = $session.user?.id;
    const user = $session.user?.id;
    const receiverId = $page.params.id;
    
    let chatContainer = $state<HTMLDivElement | null>(null);

function scrollToBottom() {
  if (chatContainer) {
    // Force immediate scroll first
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Then apply smooth scroll
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: 'smooth'
    });
    
    // Ensure scroll with RAF for dynamic content
    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer?.scrollHeight;
    });
  }
}

function handleScroll() {
  if (chatContainer) {
    const { scrollTop, scrollHeight, clientHeight } = chatContainer;
    showScrollButton = scrollHeight - scrollTop - clientHeight > 100;
  }
}
    
    // Fetch receiver's user data
    async function getReceiverData() {
      try {
        const response = await axios.get(`${API_BASE_URL}/get-user/${receiverId}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.data) {
          receiverData = response.data.data;
        }
      } catch (error) {
        console.error('Error fetching receiver data:', error);
      }
    }
    
    // Check if a chat exists between users
    async function checkChatStatus() {
      if (!userId || !receiverId) {
        console.error('Missing user or receiver ID');
        return;
      }
      
      try {
        const response = await axios.get(`${API_BASE_URL}/check-chat-status/${userId}/${receiverId}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        chatStatus = response.data.success;
        if (response.data.success && response.data.data?._id) {
          chatId = response.data.data._id;
        }
      } catch (error) {
        console.error('Error checking chat status:', error);
      }
    }
    
    // Initialize data on component mount
    onMount(async () => {

      if (!userId || !receiverId) {
        console.error('Missing user or receiver ID');
        return;
      }
      
      await Promise.all([
        getReceiverData(),
        checkChatStatus()
      ]);


      if (socket && chatId && chatId.length > 1) {

        // Join the chat room
      socket.emit('joinChat', chatId);
      
      // Listen for successful join
      socket.on('chatJoined', (data) => {
        if (data && Array.isArray(data.messages)) {
          messages = data.messages;
          scrollToBottom();
        } 
    })

      }

    });
    
    // Clean up event listeners and timeouts on component destroy
    onDestroy(() => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      if (socket && chatId) {
        socket.emit('leaveChat', chatId);
        socket.off('chatJoined');
        socket.off('newMessage');
        socket.off('messageRead');
        socket.off('userTyping');
        socket.off('chatMessages');
        socket.off('chatCreated');
      }
    });
    
    // Send a message
    async function handleSend(e: { preventDefault: () => void; }) {
      e.preventDefault();
      
      if (!userId || !receiverId) {
        console.error('Missing user or receiver ID');
        return;
      }
      
      if (message.trim() === '') {
        return;
      }
      
      const messageData = {
        chatId,
        from: userId,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      };
    
      try {
        if (chatId) {
          // Send message through existing chat
          socket?.emit('sendMessage', messageData);
          scrollToBottom();

        } else {
          // Create new chat first
          const chatData = {
            chatType: 'private',
            participants: [userId, receiverId],
            createdAt: new Date(),
          };
          
          socket?.emit('createChat', chatData);
          scrollToBottom();
        }
        
        // Clear input and typing indicator
        message = '';
        isTyping = false;
        
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }

      
    }
    
    // Handle typing indicator
    function handleTyping() {
      if (!chatId || !userId) return;
      
      if (!isTyping) {
        socket?.emit('userTyping', { chatId, userId });
        isTyping = true;
      }
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      typingTimeout = window.setTimeout(() => {
        isTyping = false;
      }, TYPING_TIMEOUT_DURATION);
    }
    
    // Toggle emoji picker
    function toggleEmojiPicker() {
      showEmojiPicker = !showEmojiPicker;
      attachmentMenuOpen = false;
      showGiftPicker = false;
    }
    
    // Add emoji to message
    function addEmoji(emoji: string) {
      message += emoji;
    }
    
    // Toggle attachment menu
    function toggleAttachmentMenu() {
      attachmentMenuOpen = !attachmentMenuOpen;
      showEmojiPicker = false;
      showGiftPicker = false;
    }
    
    // Toggle gift picker
    function toggleGiftPicker() {
      showGiftPicker = !showGiftPicker;
      showEmojiPicker = false;
      attachmentMenuOpen = false;
    }
    
    // Toggle voice recording
    function toggleRecording() {
      isRecording = !isRecording;
      message = isRecording ? "Recording audio..." : "";
    }
    
    // Send gift function
    function sendGift(gift: Gift) {
      if (!userId) return;
      
      // Show fullscreen animation
      currentGift = gift;
      showGiftAnimation = true;
      showGiftPicker = false;
      
      // Close animation after duration
      setTimeout(() => {
        showGiftAnimation = false;
        
        // Add gift message to chat
        const newMessage: ChatMessage = {
          message: `Sent a ${gift.name} gift!`,
          from: userId,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          gift: gift
        };
        
        messages = [...messages, newMessage];
        scrollToBottom();
        
        // Simulate response after delay (this would be removed in production)
        setTimeout(() => {
          isTyping = true;
          setTimeout(() => {
            isTyping = false;
            const responseMessage: ChatMessage = {
              message: `Thank you for the amazing ${gift.name} gift!`,
              from: userId, // This should be replaced with the receiver's ID in production
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'sent'
            };
            
            messages = [...messages, responseMessage];
            scrollToBottom();
          }, 2000);
        }, 1000);
      }, GIFT_ANIMATION_DURATION);
    }
    
    // Change emoji category
    function changeEmojiCategory(index: number) {
      currentEmojiCategory = index;
    }
    
    // Socket event handling
    $effect(() => {
      if (!socket || !chatId || !userId) return;
      
    //   // Join the chat room
    //   socket.emit('joinChat', chatId);
      
    //   // Listen for successful join
    //   socket.on('chatJoined', (data) => {
    //     if (data && Array.isArray(data.messages)) {
    //       messages = data.messages;
    //       scrollToBottom();
    //     }
    //   });
      
      // Listen for new messages
      socket.on('newMessage', (message: ChatMessage) => {
        if (!message) return;
        
        messages = [...messages, message];
        scrollToBottom();
        
        // If message is not from current user, mark as delivered
        if (message.from !== userId) {
          socket.emit('readMessage', { 
            messageId: message._id, 
            userId: userId 
          });
        }
      });
      
      // Listen for message status updates
      socket.on('messageRead', ({ messageId, userId }) => {
        if (!messageId || !userId) return;
        
        messages = messages.map(msg => 
          msg?._id === messageId 
            ? { ...msg, status: 'read', readBy: [...(msg.readBy || []), userId] }
            : msg
        );
      });
      
      // Listen for typing indicators
      socket.on('userTyping', (typingUserId: string) => {
        if (typingUserId !== userId) {
          isTyping = true;
          
          if (typingTimeout) {
            clearTimeout(typingTimeout);
          }
          
          typingTimeout = window.setTimeout(() => {
            isTyping = false;
          }, TYPING_TIMEOUT_DURATION);
        }
      });
    });
    
    // Load chat messages
    // $effect(() => {
    //   if (socket && chatId && chatId.length > 1) {s
    //     socket.emit('getChatMessages', chatId);
        
    //     socket.on('chatMessages', (chatMessages: ChatMessage[]) => {
    //       if (Array.isArray(chatMessages)) {
    //         messages = [...messages, ...chatMessages];
    //         scrollToBottom();
    //       }
    //     });
    //   }
    // });
    
    // Handle chat creation response
    $effect(() => {
      if (socket && !chatId) {
        socket.on('chatCreated', (data) => {
          if (data && data._id) {
            chatId = data._id;
            
            // If we have a pending message, send it now
            if (message.trim()) {
              socket.emit('sendMessage', {
                chatId: data._id,
                from: userId,
                message: message.trim(),
                createdAt: new Date().toISOString(),
              });
              
              message = '';
            }
          }
        });
      }
    });


    function getUserColor(){
        if($session.user){
            return $session.user.preferences?.color;
        }
    }

    </script>

  <!-- svelte-ignore a11y_consider_explicit_label -->
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <!-- svelte-ignore a11y_img_redundant_alt -->

  <main class="h-full flex flex-col justify-between bg-gray-100 relative">
      <!-- Header -->
      <header class="bg-white flex items-center justify-between p-3 shadow-md"> 
          <div class="flex items-center gap-2">
              <a href="/home" class="p-2 text-{receiverData?.preferences?.color} hover:bg-gray-100 rounded-full transition-colors duration-200">
                  <i class="fas fa-arrow-left"></i>
              </a>
              <div class="relative flex items-center justify-center w-[40px] h-[40px] bg-{receiverData?.preferences?.color} rounded-xl">
                  <img class="w-[38px] h-[38px] rounded-xl object-cover" src="{receiverData?.avatar}" alt="Profile Picture">
                  <span class="absolute bottom-0 right-0 w-3 h-3 bg-{getUserColor()} border-2 border-white rounded-full"></span>
              </div>
              <div class="flex flex-col">
                  <h1 class="font-semibold text-{receiverData?.preferences?.color} text-[14px]">{receiverData?.name}</h1>
                  <div class="flex items-center font-light text-[13px]">
                      {#if isTyping}
                          <span class="text-gray-600 italic">typing<span class="animate-pulse">...</span></span>
                      {:else}
                          <span class="text-gray-600">online</span>
                          <span class="flex items-center ml-1 w-[5px] h-[5px] bg-{getUserColor()} rounded-full"></span>
                      {/if}
                  </div>
              </div>
          </div>
        
          <div class="flex items-center gap-3">
              <button class="p-2 text-{getUserColor()} hover:bg-gray-100 rounded-full transition-colors duration-200">
                  <i class="fas fa-phone"></i>
              </button>
              <button class="p-2 text-{getUserColor()} hover:bg-gray-100 rounded-full transition-colors duration-200">
                  <i class="fas fa-video"></i>
              </button>
              <button class="p-2 text-{getUserColor()} hover:bg-gray-100 rounded-full transition-colors duration-200">
                  <i class="fas fa-ellipsis-v"></i>
              </button>
          </div>
      </header>
  
      <!-- Chat container -->
    {#if chatStatus === true}      
        <div 
            bind:this={chatContainer}
            onscroll={handleScroll}
            class="h-full flex flex-col px-3 py-2 overflow-y-auto max-h-[calc(100vh-120px)] overscroll-behavior-y: contain scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-gray-100 bg-gray-50 bg-opacity-50"
        >
            <!-- Date separator -->
            <div class="flex justify-center my-2">
                <span class="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs">Today</span>
            </div>
    
            {#each messages as msg, i}
                <!-- Message component with animation -->
                <div
                    class="flex flex-col mb-2 max-w-[80%] {msg.from === user ? 'ml-auto' : 'mr-auto'}"
                    in:fly={{ y: 20, duration: 300 }}
                >
                    <!-- Sender indicator if needed -->
                    {#if i === 0 || messages[i-1].from !== msg.from}
                        <div class="flex items-center {msg.from === user ? 'justify-end' : 'justify-start'}">
                            <hr class="border-gray-400 {msg.from === user ? 'flex-grow' : 'w-5'}" />
                            <span class="{msg.from === user ? 'text-'+getUserColor() : 'text-'+receiverData?.preferences?.color} px-2 font-bold text-[10px]">
                                {msg.from === user ? 'Me' : receiverData?.username}
                            </span>
                            <hr class="border-gray-400 {msg.from === user ? 'w-5' : 'flex-grow'}" />
                        </div>
                    {/if}
    
                    <!-- Message bubble -->
                    <div 
                        class="px-3 py-2 rounded-lg {msg.from === user ? 
                            'text-gray-800 bg-'+getUserColor()+' bg-opacity-5 ...' : 
                            'bg-blue-100 text-gray-800'} shadow-sm"
                    >
                        {#if msg.gift}
                            <div class="my-2 p-3 bg-gradient-to-br {msg.gift.backgroundGradient} rounded-lg shadow-sm flex flex-col items-center justify-center">
                                <i class="fas {msg.gift.icon} {msg.gift.animation} {msg.gift.color} text-4xl mb-2"></i>
                                <span class="text-sm font-medium">{msg.gift.name} Gift</span>
                            </div>
                        {/if}
                        <p class="text-[14px]">{msg.message}</p>
                    </div>
    
                    <!-- Message info -->
                    <div class="flex items-center mt-1 {msg.from === user ? 'justify-end' : 'justify-start'} text-[10px] text-gray-500">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {#if msg.from === user}
                            <span class="ml-1">
                                {#if msg.status === 'sent'}
                                    <i class="fas fa-check"></i>
                                {:else if msg.status === 'delivered'}
                                    <i class="fas fa-check-double"></i>
                                {:else if msg.status === 'read'}
                                    <i class="fas fa-check-double text-{getUserColor()}"></i>
                                {/if}
                            </span>
                        {/if}
                    </div>
                </div>
            {/each}
    
            <!-- Typing indicator -->
            {#if isTyping}
                <div class="flex items-center gap-2 mb-2 max-w-[80%] mr-auto" in:fade>
                    <div class="px-3 py-2 rounded-lg bg-gray-200 flex items-center gap-1">
                        <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0s;"></span>
                        <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s;"></span>
                        <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.4s;"></span>
                    </div>
                </div>
            {/if}
        </div>
    {:else}
    
    <div class="flex flex-col items-center justify-center h-full">
        <p class="text-gray-500">No chats found!</p>
        <p class="text-gray-500">Say Hello to Neza Hakim!</p>
    </div>

    {/if}

      <!-- Scroll to bottom button -->
      {#if showScrollButton}
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button 
              onclick={scrollToBottom}
              class="absolute bottom-16 right-4 bg-{getUserColor()} text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors duration-200"
              in:scale
              out:fade
          >
              <i class="fas fa-arrow-down"></i>
          </button>
      {/if}
  
      <!-- Emoji picker -->
      {#if showEmojiPicker}
          <div 
              class="bg-white border border-gray-200 rounded-lg shadow-lg absolute bottom-16 left-0 right-0 mx-2 max-h-64 overflow-hidden"
              in:fly={{ y: 10, duration: 200 }}
              out:fade
          >
              <!-- Category tabs -->
              <div class="flex border-b border-gray-200 overflow-x-auto scrollbar-thin bg-gray-50">
                  {#each emojiCategories as category, index}
                      <button 
                          onclick={() => changeEmojiCategory(index)}
                          class="p-2 whitespace-nowrap text-sm {currentEmojiCategory === index ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}"
                      >
                          {category.name}
                      </button>
                  {/each}
              </div>
              
              <!-- Emoji grid -->
              <div class="p-2 max-h-52 overflow-y-auto scrollbar-thin">
                  <div class="grid grid-cols-8 gap-1">
                      {#each emojiCategories[currentEmojiCategory].emojis as emoji}
                          <button 
                              onclick={() => addEmoji(emoji)}
                              class="hover:bg-gray-100 p-2 text-xl rounded transition-colors duration-200 flex items-center justify-center"
                          >
                              {emoji}
                          </button>
                      {/each}
                  </div>
              </div>
          </div>
      {/if}
  
      <!-- Attachment menu -->
      {#if attachmentMenuOpen}
          <div 
              class="bg-white border border-gray-200 rounded-lg shadow-lg p-2 absolute bottom-16 left-12 flex gap-3"
              in:fly={{ y: 10, duration: 200 }}
              out:fade
          >
              <button class="p-2 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition-colors duration-200">
                  <i class="fas fa-image"></i>
              </button>
              <button class="p-2 bg-green-100 text-green-500 rounded-full hover:bg-green-200 transition-colors duration-200">
                  <i class="fas fa-camera"></i>
              </button>
              <button class="p-2 bg-blue-100 text-blue-500 rounded-full hover:bg-blue-200 transition-colors duration-200">
                  <i class="fas fa-file"></i>
              </button>
              <button class="p-2 bg-purple-100 text-purple-500 rounded-full hover:bg-purple-200 transition-colors duration-200">
                  <i class="fas fa-map-marker-alt"></i>
              </button>
          </div>
      {/if}
  
      <!-- Gift picker -->
      {#if showGiftPicker}
          <div 
              class="bg-white border border-gray-200 rounded-lg shadow-lg p-3 absolute bottom-16 left-0 right-0 mx-2"
              in:fly={{ y: 10, duration: 200 }}
              out:fade
          >
              <div class="flex justify-between items-center mb-2 border-b pb-2">
                  <span class="font-medium text-gray-700">Send a Gift</span>
                  <button onclick={toggleGiftPicker} class="text-gray-500 hover:text-gray-700">
                      <i class="fas fa-times"></i>
                  </button>
              </div>
              <div class="grid grid-cols-4 gap-3">
                  {#each gifts as gift}
                      <button 
                          onclick={() => sendGift(gift)}
                          class="flex flex-col items-center p-2 rounded-lg bg-gradient-to-br {gift.backgroundGradient} hover:shadow-md transition-all duration-200"
                      >
                          <i class="fas {gift.icon} {gift.color} text-2xl mb-1 {gift.animation}"></i>
                          <span class="text-xs font-medium">{gift.name}</span>
                      </button>
                  {/each}
              </div>
          </div>
      {/if}
  
      <!-- Input area -->
      <form onsubmit={handleSend} class="bg-white p-2 flex items-center gap-2 border-t border-gray-200">
          <!-- Gift button -->
          <button 
              type="button" 
              onclick={toggleGiftPicker}
              class="p-2 text-{getUserColor()} hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
              <i class="fas fa-gift"></i>
          </button>
          
          <button 
              type="button" 
              onclick={toggleAttachmentMenu}
              class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
              <i class="fas fa-paperclip"></i>
          </button>
          
          <button 
              type="button" 
              onclick={toggleEmojiPicker}
              class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
              <i class="fas fa-smile"></i>
          </button>
          
          <div class="relative flex-grow">
              <input 
                  bind:value={message} 
                  oninput={handleTyping}
                  class="p-2 pl-4 pr-10 w-full h-[40px] outline-none border border-gray-300 rounded-full focus:border-{getUserColor()} focus:ring-2 focus:ring-blue-100 transition-all duration-200" 
                  placeholder={isRecording ? "Recording audio..." : "Write a message..."}
                  disabled={isRecording}
              />
              
              {#if isRecording}
                  <div class="absolute right-3 top-2">
                      <span class="flex h-3 w-3">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                  </div>
              {/if}
          </div>
          
          {#if message.trim() !== ''}
              <button 
                  type="submit" 
                  class="p-2 bg-{getUserColor()} text-white rounded-full hover:bg-blue-600 transition-colors duration-200 w-10 h-10 flex items-center justify-center"
              >
                  <i class="fas fa-paper-plane"></i>
              </button>
          {:else}
              <button 
                  type="button" 
                  onclick={toggleRecording}
                  class="p-2 {isRecording ? 'bg-red-500' : 'bg-gray-200'} {isRecording ? 'text-white' : 'text-gray-500'} rounded-full hover:{isRecording ? 'bg-red-600' : 'bg-gray-300'} transition-colors duration-200 w-10 h-10 flex items-center justify-center"
              >
                  <i class="fas {isRecording ? 'fa-stop' : 'fa-microphone'}"></i>
              </button>
          {/if}
      </form>
  
      <!-- Fullscreen gift animation -->
      {#if showGiftAnimation && currentGift}
          <div 
              class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70"
              in:fade={{ duration: 300 }}
              out:fade={{ duration: 500 }}
          >
              <div class="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
                  <!-- Background gradient -->
                  <div class="absolute inset-0 bg-gradient-to-br {currentGift.backgroundGradient} opacity-30"></div>
                  
                  <!-- Particle effects -->
                  <div class="gift-particles absolute inset-0" data-effect={currentGift.particleEffect}></div>
                  
                  <!-- Gift icon with animation -->
                  <div class="transform scale-in-center">
                      <div class="relative flex flex-col items-center justify-center">
                          <div class="absolute -inset-10 bg-white rounded-full opacity-20 animate-pulse"></div>
                          <div class="absolute -inset-5 bg-white rounded-full opacity-30 animate-pulse" style="animation-delay: 0.3s"></div>
                          <i class="fas {currentGift.icon} {currentGift.animation} {currentGift.color} text-9xl mb-6 z-10"></i>
                      </div>
                      <h2 class="text-center text-white text-2xl font-bold mb-1">{currentGift.name} Gift!</h2>
                      <p class="text-center text-white text-lg opacity-90">Neza will love this!</p>
                  </div>
              </div>
          </div>
      {/if}
  </main> 
  
  <style lang="css">
      /* Animation for typing dots */
      .animate-bounce {
          animation: bounce 1.4s infinite;
      }
      
      @keyframes bounce {
          0%, 100% {
              transform: translateY(0);
          }
          50% {
              transform: translateY(-4px);
          }
      }
      
      /* Scale in animation for gift */
      .scale-in-center {
          animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }
      
      @keyframes scale-in-center {
          0% {
              transform: scale(0);
              opacity: 0;
          }
          100% {
              transform: scale(1);
              opacity: 1;
          }
      }
      
      /* Particle effects for gifts */
      .gift-particles[data-effect="hearts"]::before,
      .gift-particles[data-effect="hearts"]::after {
          content: '❤️';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles[data-effect="stars"]::before,
      .gift-particles[data-effect="stars"]::after {
          content: '⭐';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles[data-effect="confetti"]::before,
      .gift-particles[data-effect="confetti"]::after {
          content: '🎊';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles[data-effect="balloons"]::before,
      .gift-particles[data-effect="balloons"]::after {
          content: '🎈';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles[data-effect="diamonds"]::before,
      .gift-particles[data-effect="diamonds"]::after {
          content: '💎';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles[data-effect="sparkles"]::before,
      .gift-particles[data-effect="sparkles"]::after {
          content: '✨';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles[data-effect="fireworks"]::before,
      .gift-particles[data-effect="fireworks"]::after {
          content: '🎆';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles[data-effect="rainbow"]::before,
      .gift-particles[data-effect="rainbow"]::after {
          content: '🌈';
          position: absolute;
          font-size: 20px;
          animation: float-up 3s linear infinite;
          opacity: 0;
      }
      
      .gift-particles::before {
          left: 25%;
          animation-delay: 0.2s;
      }
      
      .gift-particles::after {
          right: 25%;
          animation-delay: 0.7s;
      }
      
      @keyframes float-up {
          0% {
              bottom: -10%;
              opacity: 0;
          }
          50% {
              opacity: 1;
          }
          100% {
              bottom: 110%;
              opacity: 0;
          }
      }
      
     /* Generate 10 particles with different positions */
     .gift-particles::before:nth-of-type(1) { left: 10%; animation-delay: 0.1s; }
.gift-particles::before:nth-of-type(2) { left: 20%; animation-delay: 0.2s; }
.gift-particles::before:nth-of-type(3) { left: 30%; animation-delay: 0.3s; }
.gift-particles::before:nth-of-type(4) { left: 40%; animation-delay: 0.4s; }
.gift-particles::before:nth-of-type(5) { left: 50%; animation-delay: 0.5s; }
.gift-particles::before:nth-of-type(6) { left: 60%; animation-delay: 0.6s; }
.gift-particles::before:nth-of-type(7) { left: 70%; animation-delay: 0.7s; }
.gift-particles::before:nth-of-type(8) { left: 80%; animation-delay: 0.8s; }
.gift-particles::before:nth-of-type(9) { left: 90%; animation-delay: 0.9s; }
.gift-particles::before:nth-of-type(10) { left: 100%; animation-delay: 1s; }

.gift-particles::after:nth-of-type(1) { right: 10%; animation-delay: 0.6s; }
.gift-particles::after:nth-of-type(2) { right: 20%; animation-delay: 0.7s; }
.gift-particles::after:nth-of-type(3) { right: 30%; animation-delay: 0.8s; }
.gift-particles::after:nth-of-type(4) { right: 40%; animation-delay: 0.9s; }
.gift-particles::after:nth-of-type(5) { right: 50%; animation-delay: 1s; }
.gift-particles::after:nth-of-type(6) { right: 60%; animation-delay: 1.1s; }
.gift-particles::after:nth-of-type(7) { right: 70%; animation-delay: 1.2s; }
.gift-particles::after:nth-of-type(8) { right: 80%; animation-delay: 1.3s; }
.gift-particles::after:nth-of-type(9) { right: 90%; animation-delay: 1.4s; }
.gift-particles::after:nth-of-type(10) { right: 100%; animation-delay: 1.5s; }

    
    /* Custom scrollbar styling */
    .scrollbar-thin::-webkit-scrollbar {
        width: 4px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-track {
        background: #f1f1f1;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
</style>