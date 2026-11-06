import routes from './routes.js';
import { supabase } from './supabase.js';
import { auth } from './auth.js';

import { store } from './store.js';
export { store } from './store.js';

const GUILD_ID = '1488342205386068089';
const MOD_ROLE_ID = '1489765408205574325';

const app = Vue.createApp({
    data: () => ({ 
        store,
        user: null
    }),
    computed: {
        username() {
            return store.profile?.display_name ||
                   store.profile?.username ||
                   this.user?.display_name ||
                   this.user?.username ||
                   this.user?.user_metadata?.full_name || 
                   this.user?.user_metadata?.custom_claims?.global_name || 
                   'Usuário';
        },
        avatarUrl() {
            return store.profile?.avatar_url ||
                   this.user?.avatar_url ||
                   this.user?.user_metadata?.avatar_url || 
                   'https://cdn.discordapp.com/embed/avatars/0.png';
        },
        isMod() {
            return store.isMod;
        }
    },
    async mounted() {
        // Checa login da conta local do TACL
        const localUser = await auth.getProfile();
        if (localUser) {
            this.user = localUser;
            store.profile = localUser;
        }

        // Checa sessão do Discord / Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            store.isMod = await this.checkIsMod(session);
            if (!localUser) {
                this.user = session.user;
                this.loadProfile(session);
            }
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                store.isMod = await this.checkIsMod(session);
                const currentLocal = await auth.getProfile();
                if (!currentLocal) {
                    this.user = session.user;
                    setTimeout(() => this.loadProfile(session), 0);
                }
            } else {
                store.isMod = false;
                sessionStorage.removeItem('is_mod');
                const currentLocal = await auth.getProfile();
                if (!currentLocal) {
                    this.user = null;
                    store.profile = null;
                }
            }
        });
    },
    methods: {
        async loadProfile(session) {
            if (!session) return;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
            if (data && !store.profile) {
                store.profile = data;
            }
        },
        async checkIsMod(session) {
            const providerToken = session?.provider_token;
            if (!providerToken) return false;

            const cachedMod = sessionStorage.getItem('is_mod');
            if (cachedMod !== null) return cachedMod === 'true';

            try {
                const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`, {
                    headers: {
                        Authorization: `Bearer ${providerToken}`
                    }
                });

                if (!response.ok) return false;

                const memberData = await response.json();
                const isMod = memberData.roles && memberData.roles.includes(MOD_ROLE_ID);
                
                sessionStorage.setItem('is_mod', isMod);
                return isMod;
            } catch (err) {
                console.error('Erro ao verificar cargo do Discord:', err);
                return false;
            }
        },
        async loginWithDiscord() {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    scopes: 'identify guilds guilds.members.read',
                    redirectTo: window.location.origin + window.location.pathname
                }
            });
            if (error) alert('Erro ao autenticar com o Discord: ' + error.message);
        },
        async logout() {
            auth.logout();
            await supabase.auth.signOut();
            this.user = null;
            store.profile = null;
            store.isMod = false;
            sessionStorage.removeItem('is_mod');
        }
    }
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);
app.mount('#app');
