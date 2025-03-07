import { session } from '$lib/stores/session';

function getUserColor(){
    if($session.user){
        return $session.user.preferences?.color;
    }
}