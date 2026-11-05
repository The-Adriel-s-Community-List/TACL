import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Un from './pages/Un.js';
import Submit from './pages/Submit.js';
import ModPanel from './pages/ModPanel.js';
import { supabase } from './supabase.js';

const GUILD_ID = '1488342205386068089';
const MOD_ROLE_ID = '1489765408205574325';

async function checkDiscordModRole() {
    // 1. Verifica se já está guardado no cache da sessão
    const cachedMod = sessionStorage.getItem('is_mod');
    if (cachedMod !== null) return cachedMod === 'true';

    // 2. Se não estiver no cache, obtém a sessão ativa
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.provider_token) return false;

    try {
        const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`, {
            headers: {
                Authorization: `Bearer ${session.provider_token}`
            }
        });

        if (!response.ok) return false;

        const memberData = await response.json();
        const isMod = memberData.roles && memberData.roles.includes(MOD_ROLE_ID);
        
        sessionStorage.setItem('is_mod', isMod);
        return isMod;
    } catch (err) {
        console.error('Erro ao verificar cargo na rota:', err);
        return false;
    }
}

export default [
    { path: '/', component: List },
    { path: '/un', component: Un },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/submit', component: Submit },
    { 
        path: '/mod', 
        component: ModPanel,
        beforeEnter: async (to, from, next) => {
            const isMod = await checkDiscordModRole();
            if (isMod) {
                next();
            } else {
                alert('Acesso negado: precisas de estar no servidor do Discord com o cargo List Mod para aceder a esta área.');
                next('/');
            }
        }
    },
];
