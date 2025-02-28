<script lang="ts">
    import axios from "axios";
    import { goto } from "$app/navigation";
    import { session } from "$lib/stores/session";
  
    // Form states
    let loading = $state(false);
    let error = $state("");
    let success = $state(false);
    let verificationSent = $state(false);
    let verificationCode = $state("");
  
    // Form data
    let email = $state("");
    let phone = $state({ code: 250, number: 0 });
    
    // Validation state
    let validation = $state({
      email: { valid: true, message: "" },
      phone: { valid: true, message: "" },
      code: { valid: true, message: "" }
    });
  
    // Basic validation functions
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
    
    function validateVerificationCode() {
      validation.code.valid = verificationCode.length === 6;
      validation.code.message = validation.code.valid ? "" : "Please enter the 6-digit verification code";
      return validation.code.valid;
    }
  
    // Login submission
    async function handleLogin(e: SubmitEvent) {
      e.preventDefault();
      
      // Validate inputs
      const isEmailValid = validateEmail();
      const isPhoneValid = validatePhone();
      
      if (!isEmailValid || !isPhoneValid) {
        return;
      }
  
      loading = true;
      error = "";
  
      const loginData = {
        email,
        phone
      };
  
      try {
        const response = await axios.post('http://localhost:3000/auth/login', loginData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        if (response.data.success) {
          // User found, now request verification
          console.log(response.data.data)
          requestVerification(response.data.data);
        } else {
          error = response.data || "Email and phone number don't match any account";
        }
      } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        error = error.response?.data?.message || "Something went wrong. Please try again.";
      } finally {
        loading = false;
      }
    }
    
    // Request verification code
    async function requestVerification(userData) {
      try {
        const response = await axios.post('http://localhost:3000/auth/request-verification', {
          token: userData._id,
          email: email
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          verificationSent = true;
          // Store user data temporarily
          sessionStorage.setItem('pendingUser', JSON.stringify(userData));
        } else {
          error = response.data || "Failed to send verification code";
          console.log(error)

        }
      } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        error = error.response?.data?.message || "Failed to send verification code. Please try again.";
      }
    }
    
    // Verify code and complete login
    async function verifyCode(e: SubmitEvent) {
      e.preventDefault();
      
      if (!validateVerificationCode()) {
        return;
      }
      
      loading = true;
      error = "";
      
      try {
        // Get stored user data
        const userData = JSON.parse(sessionStorage.getItem('pendingUser') || '{}');
        
        const response = await axios.post('http://localhost:3000/auth/verify-code', {
          userId: userData.id,
          code: verificationCode
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          success = true;
          
          // Login the user
          session.login({
            id: userData.id,
            name: userData.name,
            username: userData.username,
            email: userData.email
          }, response.data.token);
          
          // Clean up temporary storage
          sessionStorage.removeItem('pendingUser');
          
          // Redirect to dashboard
          setTimeout(() => {
            goto('/dashboard');
          }, 1500);
        } else {
          error = response.data || "Invalid verification code";
        }
      } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
        error = error.response?.data?.message || "Verification failed. Please try again.";
      } finally {
        loading = false;
      }
    }
    
    // Resend verification code
    async function resendCode() {
      const userData = JSON.parse(sessionStorage.getItem('pendingUser') || '{}');
      requestVerification(userData);
    }
  </script>
  
  <main class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
    <div class="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
      {#if !verificationSent}
        <!-- Login Form -->
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
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                id="email"
                type="email" 
                bind:value={email} 
                onblur={validateEmail}
                placeholder="your.email@example.com" 
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
            
            <button 
              type="submit"
              class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition"
              disabled={loading}
            >
              {#if loading}
                <span class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
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
            </div>
          </form>
        </div>
      {:else}
        <!-- Verification Form -->
        <div class="p-8">
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-800">Verify Your Email</h2>
            <p class="text-gray-600 mt-2">We've sent a verification code to {email}</p>
          </div>
          
          {#if error}
            <div class="mb-6 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          {/if}
          
          {#if success}
            <div class="mb-6 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
              Verification successful! Redirecting to dashboard...
            </div>
          {/if}
          
          <form onsubmit={verifyCode} class="space-y-6">
            <div>
              <label for="code" class="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input 
                id="code"
                type="text" 
                bind:value={verificationCode}
                onblur={validateVerificationCode}
                placeholder="000000" 
                maxlength="6"
                class={`w-full px-4 py-3 rounded-lg border text-center tracking-widest ${validation.code.valid ? 'border-gray-300 focus:border-blue-500' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
              />
              {#if !validation.code.valid}
                <p class="mt-1 text-sm text-red-600">{validation.code.message}</p>
              {/if}
            </div>
            
            <button 
              type="submit"
              class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition"
              disabled={loading}
            >
              {#if loading}
                <span class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              {:else}
                Verify
              {/if}
            </button>
            
            <div class="text-center mt-4">
              <button 
                type="button" 
                onclick={resendCode}
                class="text-sm text-blue-600 hover:underline"
              >
                Didn't receive a code? Resend
              </button>
            </div>
            
            <div class="text-center">
              <a href="/login" class="text-sm text-gray-600 hover:underline">
                Use a different account
              </a>
            </div>
          </form>
        </div>
      {/if}
    </div>
  </main>