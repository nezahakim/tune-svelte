<script lang="ts">
    import { session } from "$lib/stores/session";
    import { goto } from "$app/navigation";

    async function handleLogout() {
        const success = session.logout();
        if (success) {
            goto("/login");
        }
    }

    handleLogout();
</script>