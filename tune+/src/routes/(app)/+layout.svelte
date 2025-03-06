<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session';
	import { onMount } from 'svelte';


    onMount(() => {
      // If user is not already authenticated, redirect to login
      if (!$session.authenticated && !$session.user) {
        goto('/login');
      }
    });

    let { children } =  $props();
    
</script>

{@render children()}