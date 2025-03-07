<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session';
  
  $effect.pre(() => { 
   
      // If user is not already authenticated, redirect to login
      if (!$session.authenticated && !$session.user) {
        goto('/login');
      }
    });
  

    let { children } =  $props();
    
</script>

{@render children()}