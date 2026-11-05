import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Un from './pages/Un.js';
import ModPanel from './pages/ModPanel.js';
import Submit from './pages/Submit.js'; 

export default [
    { path: '/', component: List },
    { path: '/', component: List }, 
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/Un', component: Un },
    { path: '/mod', component: ModPanel },
    { path: '/submit', component: Submit }, 
];
