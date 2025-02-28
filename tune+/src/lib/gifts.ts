import type { Gift } from "./types";

 // Available gifts
 export const gifts: Gift[] = [
    { 
        id: 'heart', 
        name: 'Heart', 
        icon: 'fa-heart', 
        animation: 'fa-beat', 
        color: 'text-red-500',
        backgroundGradient: 'from-red-100 to-pink-100',
        particleEffect: 'hearts'
    },
    { 
        id: 'star', 
        name: 'Star', 
        icon: 'fa-star', 
        animation: 'fa-bounce', 
        color: 'text-yellow-400',
        backgroundGradient: 'from-yellow-100 to-amber-100',
        particleEffect: 'stars'
    },
    { 
        id: 'trophy', 
        name: 'Trophy', 
        icon: 'fa-trophy', 
        animation: 'fa-shake', 
        color: 'text-amber-500',
        backgroundGradient: 'from-amber-100 to-yellow-100',
        particleEffect: 'confetti'
    },
    { 
        id: 'cake', 
        name: 'Cake', 
        icon: 'fa-cake-candles', 
        animation: 'fa-flip', 
        color: 'text-pink-500',
        backgroundGradient: 'from-pink-100 to-red-100',
        particleEffect: 'balloons'
    },
    { 
        id: 'crown', 
        name: 'Crown', 
        icon: 'fa-crown', 
        animation: 'fa-spin', 
        color: 'text-purple-500',
        backgroundGradient: 'from-purple-100 to-indigo-100',
        particleEffect: 'diamonds'
    },
    { 
        id: 'gem', 
        name: 'Gem', 
        icon: 'fa-gem', 
        animation: 'fa-pulse', 
        color: 'text-blue-500',
        backgroundGradient: 'from-blue-100 to-cyan-100',
        particleEffect: 'sparkles'
    },
    { 
        id: 'rocket', 
        name: 'Rocket', 
        icon: 'fa-rocket', 
        animation: 'fa-fade', 
        color: 'text-orange-500',
        backgroundGradient: 'from-orange-100 to-red-100',
        particleEffect: 'fireworks'
    },
    { 
        id: 'rainbow', 
        name: 'Rainbow', 
        icon: 'fa-rainbow', 
        animation: 'fa-flip', 
        color: 'text-indigo-500',
        backgroundGradient: 'from-red-100 via-green-100 to-blue-100',
        particleEffect: 'rainbow'
    }
];