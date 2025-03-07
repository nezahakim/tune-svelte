<script lang="ts">
    import { session } from "$lib/stores/session";
    import { goto } from "$app/navigation";
	import { onMount } from "svelte";

    async function handleLogout() {
        const success = session.logout();
        if (success) {
            goto("/login");
        }
    }

    onMount(() => {
        handleLogout();
    });
</script>