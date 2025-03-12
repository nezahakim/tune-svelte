<script lang="ts">
	import { goto } from '$app/navigation';
	import { API_BASE_URL } from '$lib/API_BASE';
    import { onMount } from 'svelte'

    let users = $state([]);

    onMount(async () => {
        try {
            const response = await fetch(API_BASE_URL+'/users',{
                method:'GET',
                headers:{
                    'Content-Type':'application/json'
                },
            });
            users = await response.json();
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    });

    async function handleUserClick(userId: string) {
        goto(`/chats/${userId}`);
    }

</script>
<main>
    <h1>Users</h1>
    
    {#each users.data as user}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="bg-blue-500 p-4 mt-1 font-bold text-white rounded-2xl" onclick={() => handleUserClick(user?._id)}>
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
        </div>
    {/each}

</main>