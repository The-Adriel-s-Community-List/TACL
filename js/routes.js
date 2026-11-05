import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Un from './pages/Un.js';
import ModPanel from './pages/ModPanel.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/Un', component: Un },
    { path: '/mod', component: ModPanel },
];
