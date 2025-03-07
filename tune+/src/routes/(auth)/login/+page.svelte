<script lang="ts">
    import axios from "axios";
    import { goto } from "$app/navigation";
    import { session } from "$lib/stores/session";
    import { onMount } from "svelte";
  
    // Form states
    let loading = $state(false);
    let error = $state("");
    
    // Form data
    let identifier = $state("");
    let password = $state("");
    
    // Check session on mount
    onMount(() => {
      // If user is already authenticated, redirect to home
      if ($session.authenticated && $session.user) {
        goto('/home');
      }
    });
    
    // Validation state
    let validation = $state({
      identifier: { valid: true, message: "" },
      password: { valid: true, message: "" }
    });
  
    // Validation functions
    function validateIdentifier() {
      validation.identifier.valid = identifier.length >= 3;
      validation.identifier.message = validation.identifier.valid ? "" : "Please enter a valid email or username";
      return validation.identifier.valid;
    }
  
    function validatePassword() {
      validation.password.valid = password.length >= 6;
      validation.password.message = validation.password.valid ? "" : "Password must be at least 6 characters";
      return validation.password.valid;
    }
  
    // Login submission
    async function handleLogin(e: SubmitEvent) {
      e.preventDefault();
      
      if (!validateIdentifier() || !validatePassword()) {
        return;
      }
  
      loading = true;
      error = "";
  
      try {
        const response = await axios.post('http://localhost:3000/auth/login', {
          identifier,
          password
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        response.data.user = response.data.data;
        if (response.data.success && response.data.user && response.data.token) {
          // Set session data
          session.login({
            id: response.data.user._id,
            name: response.data.user.name,
            username: response.data.user.username,
            email: response.data.user.email,
            avatar: response.data.user.avatar,
            preferences: response.data.user.preferences,
          }, response.data.token);
          
          // Set Authorization header for future requests
          // axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          
          // Redirect to home page
          goto('/home');
        } else {
          error = response.data.message || "Please try again later";
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          error = "Invalid credentials";
        } else if (err.response?.status === 403) {
          error = "Account is locked. Please contact support.";
        } else {
          error = "An error occurred. Please try again later.";
        }
        console.error('Login error:', err);
      } finally {
        loading = false;
      }
    }
</script>

<main class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
  <div class="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
    <div class="p-8">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-800">Welcome Back</h2>
        <p class="text-gray-600 mt-2">Sign in to your account</p>
      </div>
      
      {#if error}
        <div class="mb-6 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      {/if}
      
      <form onsubmit={handleLogin} class="space-y-6">
        <div>
          <label for="identifier" class="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
          <input 
            id="identifier"
            type="text" 
            bind:value={identifier} 
            onblur={validateIdentifier}
            placeholder="Enter email or username" 
            class={`w-full px-4 py-3 rounded-lg border ${validation.identifier.valid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
            disabled={loading}
          />
          {#if !validation.identifier.valid}
            <p class="mt-1 text-sm text-red-600">{validation.identifier.message}</p>
          {/if}
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            id="password"
            type="password" 
            bind:value={password} 
            onblur={validatePassword}
            placeholder="Enter your password" 
            class={`w-full px-4 py-3 rounded-lg border ${validation.password.valid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
            disabled={loading}
          />
          {#if !validation.password.valid}
            <p class="mt-1 text-sm text-red-600">{validation.password.message}</p>
          {/if}
        </div>
        
        <button 
          type="submit"
          class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {#if loading}
            <span class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          {:else}
            Sign In
          {/if}
        </button>
        
        <div class="text-center mt-4">
          <p class="text-sm text-gray-600">
            Don't have an account? 
            <a href="/signup" class="text-blue-600 hover:underline">Sign up</a>
          </p>
          <a href="/forgot-password" class="block mt-2 text-sm text-blue-600 hover:underline">
            Forgot your password?
          </a>
        </div>
      </form>
    </div>
  </div>
</main>