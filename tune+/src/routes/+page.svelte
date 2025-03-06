<script lang='ts'>
import { goto } from '$app/navigation'

let timeToUpdate = $state<boolean>(false)

let workers = setTimeout(() => {
    timeToUpdate =  true
}, 3000);

$effect(()=>{
    if(timeToUpdate){
    goto("/home")

    return () =>{
        clearTimeout(workers)
    }
    }
})

</script>

<main class="flex flex-col justify-between w-full h-full items-center">
<!-- Intro -->
    <div class="h-[50vh] flex flex-col items-center justify-end">
        <div class="bg-blue-900 p-4 rounded-full m-1">
         <img alt="img" src="/favicon.png" />
        </div>
        <div class="p-2 text-[18px] font-semibold"> NotifyTune+ Mini </div>
    </div>

    <!-- Footer -->
    <footer class="flex flex-col items-center m-4 p-4">
        <h3 class=" font-light text-[14px] p-0">backed by</h3>
        <h1 class="font-bold text-[16px]">Notifycode Inc.</h1>
    </footer>
</main>