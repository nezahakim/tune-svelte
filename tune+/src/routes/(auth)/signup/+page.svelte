<!-- <script lang='ts'>
	import type { User } from "$lib/types";
	import axios from "axios";

    let {
        name,
        username,
        email,
        phone
    } = $state<User>({
        name:'',
        username:'',
        email:'',
        phone:{code: 250, number:0}
    })

    
    async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    
    const userData = {
        name,
        username,
        email,
        phone
    }

    try {
        const response = await axios.post('http://localhost:3000/auth/signup', userData, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        
        if(response.data.success) {
            console.log('Success:', response.data)

        }
    } catch (error: any) {
        console.log('Error:', error.response?.data || error.message)
        // Handle error state
    }
}

</script>


<main class="flex flex-col items-center justify-between w-full h-full">
   
        <form onsubmit={handleSubmit} class="flex flex-col items-start justify-end">
            <label class="flex flex-col items-start bg-amber-100 p-4 gap-2">
                <span class="text-[14px] font-semibold">Name</span>
                <input bind:value={name} type="text" class="outline-none p-2 border-2 rounded-2xl">
            </label>
            <label class="flex flex-col items-start bg-amber-100 p-4 gap-2">
                <span class="text-[14px] font-semibold">Usename</span>
                <input bind:value={username} type="text" class="outline-none p-2 border-2 rounded-2xl">
            </label>
            <label class="flex flex-col items-start bg-amber-100 p-4 gap-2">
                <span class="text-[14px] font-semibold">Email</span>
                <input bind:value={email} type="text" class="outline-none p-2 border-2 rounded-2xl">
            </label>
            <div class="flex flex-col items-start bg-amber-100 p-4 gap-2">
                <span class="text-[14px] font-semibold">Phone</span>
               
                <div class="flex items-center gap-3">

                <div class="flex flex-col w-[50px]">
                 <span>code</span>
                <select bind:value={phone.code} name="phoneCode" id="" class="w-[60px] py-2 border-2 rounded-2xls">
                    <option value="+250">+250</option>
                    <option value="+250">+255</option>
                </select>
                </div>

                <div class="flex flex-col">
                    <span>Number</span>
                    <input bind:value={phone.number} type="number" class="outline-none p-2 border-2 rounded-2xl">
                </div>

               </div>
            </div>
            <button>Create Account</button>
        </form>
</main> -->

<script lang="ts">
    import type { User } from "$lib/types";
    import axios from "axios";
    import { goto } from "$app/navigation";
    // Import the custom session store
    import { session } from "$lib/stores/session";
  
    // Form steps
    const STEPS = {
      PERSONAL: 1,
      CONTACT: 2,
      CONFIRM: 3,
      SUCCESS: 4
    };
  
    // State management
    let currentStep = $state(STEPS.PERSONAL);
    let loading = $state(false);
    let error = $state("");
    let success = $state(false);
  
    let { name, username, email, phone } = $state<User>({
      name: "",
      username: "",
      email: "",
      phone: { code: 250, number: 0 }
    });
  
    // Validation state
    let validation = $state({
      name: { valid: true, message: "" },
      username: { valid: true, message: "" },
      email: { valid: true, message: "" },
      phone: { valid: true, message: "" }
    });
  
    // Basic validation functions
    function validateName() {
      validation.name.valid = name.trim().length >= 2;
      validation.name.message = validation.name.valid ? "" : "Name must be at least 2 characters";
      return validation.name.valid;
    }
  
    function validateUsername() {
      validation.username.valid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
      validation.username.message = validation.username.valid ? "" : "Username must be 3-20 characters (letters, numbers, underscore)";
      return validation.username.valid;
    }
  
    function validateEmail() {
      validation.email.valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      validation.email.message = validation.email.valid ? "" : "Please enter a valid email address";
      return validation.email.valid;
    }
  
    function validatePhone() {
      validation.phone.valid = phone.number.toString().length >= 9;
      validation.phone.message = validation.phone.valid ? "" : "Please enter a valid phone number";
      return validation.phone.valid;
    }
  
    // Navigation functions
    function nextStep() {
      if (currentStep === STEPS.PERSONAL) {
        if (validateName() && validateUsername()) {
          currentStep = STEPS.CONTACT;
        }
      } else if (currentStep === STEPS.CONTACT) {
        if (validateEmail() && validatePhone()) {
          currentStep = STEPS.CONFIRM;
        }
      }
    }
  
    function prevStep() {
      if (currentStep > STEPS.PERSONAL) {
        currentStep--;
      }
    }
  
    // Form submission
    async function handleSubmit(e: SubmitEvent) {
      e.preventDefault();
      
      if (currentStep !== STEPS.CONFIRM) {
        return nextStep();
      }
  
      // Final validation before submission
      if (!validateName() || !validateUsername() || !validateEmail() || !validatePhone()) {
        return;
      }
  
      loading = true;
      error = "";
  
      const userData = {
        name,
        username,
        email,
        phone
      };
  
      try {
        const response = await axios.post('http://localhost:3000/auth/signup', userData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        if (response.data.success) {
          // Update session with user data
          session.login({
            id: response.data.userId || 'temp-id',
            name,
            username,
            email
          }, response.data.token);
  
          success = true;
          currentStep = STEPS.SUCCESS;
        }
      } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        this.error = error.response?.data?.message || "Something went wrong. Please try again.";
      } finally {
        loading = false;
      }
    }
  
    // Navigate to dashboard after successful signup
    function goToDashboard() {
      goto('/home');
    }
  </script>
  
  <main class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
    <div class="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
      <!-- Progress indicator -->
      <div class="w-full bg-gray-100 px-8 py-5">
        <div class="flex items-center justify-between">
          <div class="flex flex-col items-center">
            <div class={`w-8 h-8 flex items-center justify-center rounded-full ${currentStep >= STEPS.PERSONAL ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>1</div>
            <span class="text-xs mt-1">Personal</span>
          </div>
          <div class={`flex-1 h-1 mx-2 ${currentStep >= STEPS.CONTACT ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div class="flex flex-col items-center">
            <div class={`w-8 h-8 flex items-center justify-center rounded-full ${currentStep >= STEPS.CONTACT ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>2</div>
            <span class="text-xs mt-1">Contact</span>
          </div>
          <div class={`flex-1 h-1 mx-2 ${currentStep >= STEPS.CONFIRM ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div class="flex flex-col items-center">
            <div class={`w-8 h-8 flex items-center justify-center rounded-full ${currentStep >= STEPS.CONFIRM ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>3</div>
            <span class="text-xs mt-1">Confirm</span>
          </div>
        </div>
      </div>
  
      <!-- Form content -->
      <form onsubmit={handleSubmit} class="p-8">
        {#if currentStep === STEPS.PERSONAL}
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Create your account</h2>
            <p class="text-gray-600 mt-1">Let's start with your personal information</p>
          </div>
  
          <div class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                id="name"
                type="text" 
                bind:value={name} 
                onblur={validateName}
                placeholder="John Doe" 
                class={`w-full px-4 py-3 rounded-lg border ${validation.name.valid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
              />
              {#if !validation.name.valid}
                <p class="mt-1 text-sm text-red-600">{validation.name.message}</p>
              {/if}
            </div>
  
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                id="username"
                type="text" 
                bind:value={username} 
                onblur={validateUsername}
                placeholder="johndoe" 
                class={`w-full px-4 py-3 rounded-lg border ${validation.username.valid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
              />
              {#if !validation.username.valid}
                <p class="mt-1 text-sm text-red-600">{validation.username.message}</p>
              {/if}
            </div>
          </div>
        {:else if currentStep === STEPS.CONTACT}
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Contact Details</h2>
            <p class="text-gray-600 mt-1">How can we reach you?</p>
          </div>
  
          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                id="email"
                type="email" 
                bind:value={email} 
                onblur={validateEmail}
                placeholder="john.doe@example.com" 
                class={`w-full px-4 py-3 rounded-lg border ${validation.email.valid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
              />
              {#if !validation.email.valid}
                <p class="mt-1 text-sm text-red-600">{validation.email.message}</p>
              {/if}
            </div>
  
            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div class="flex">
                <select 
                  bind:value={phone.code} 
                  class="px-3 py-3 rounded-l-lg border border-r-0 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-gray-50 text-gray-700"
                >
                  <option value={250}>+250</option>
                  <option value={255}>+255</option>
                  <option value={256}>+256</option>
                  <option value={254}>+254</option>
                  <option value={1}>+1</option>
                  <option value={44}>+44</option>
                </select>
                <input 
                  id="phone"
                  type="number" 
                  bind:value={phone.number} 
                  onblur={validatePhone}
                  placeholder="712345678" 
                  class={`flex-1 px-4 py-3 rounded-r-lg border ${validation.phone.valid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
                />
              </div>
              {#if !validation.phone.valid}
                <p class="mt-1 text-sm text-red-600">{validation.phone.message}</p>
              {/if}
            </div>
          </div>
        {:else if currentStep === STEPS.CONFIRM}
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Confirm Your Details</h2>
            <p class="text-gray-600 mt-1">Please review your information before submitting</p>
          </div>
  
          <div class="bg-gray-50 p-4 rounded-lg mb-6">
            <div class="flex flex-col gap-4">
              <div>
                <p class="text-sm text-gray-500">Name</p>
                <p class="font-medium">{name}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Username</p>
                <p class="font-medium">{username}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Email</p>
                <p class="font-medium">{email}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Phone</p>
                <p class="font-medium">+{phone.code} {phone.number}</p>
              </div>
            </div>
          </div>
  
          {#if error}
            <div class="mb-4 p-3 bg-red-50 text-red-800 rounded-lg">
              {error}
            </div>
          {/if}
        {:else if currentStep === STEPS.SUCCESS}
          <div class="text-center py-8">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-800">Account Created!</h2>
            <p class="text-gray-600 mt-2 mb-6">Welcome to our platform, {name}!</p>
            <button 
              type="button" 
              onclick={goToDashboard}
              class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition"
            >
              Go to Home
            </button>
          </div>
        {/if}
  
        {#if currentStep < STEPS.SUCCESS}
          <div class="flex justify-between mt-8">
            {#if currentStep > STEPS.PERSONAL}
              <button 
                type="button" 
                onclick={prevStep}
                class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition"
              >
                Back
              </button>
            {:else}
              <div></div>
            {/if}
  
            <button 
              type="submit"
              class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition"
              disabled={loading}
            >
              {#if loading}
                <span class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              {:else if currentStep === STEPS.CONFIRM}
                Create Account
              {:else}
                Continue
              {/if}
            </button>
          </div>
        {/if}
      </form>
    </div>
  </main>