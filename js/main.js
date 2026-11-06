import routes from './routes.js';
import { supabase } from './supabase.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    isMod: false,
    profile: null,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

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
                   this.user?.user_metadata?.full_name || 
                   this.user?.user_metadata?.custom_claims?.global_name || 
                   'Usuário';
        },
        avatarUrl() {
            return store.profile?.avatar_url ||
                   this.user?.user_metadata?.avatar_url || 
                   'https://cdn.discordapp.com/embed/avatars/0.png';
        },
        isMod() {
            return store.isMod;
        }
    },
    async mounted() {
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;
        if (session) {
            store.isMod = await this.checkIsMod(session);
        }
        this.loadProfile(session);

        supabase.auth.onAuthStateChange(async (_event, session) => {
            this.user = session?.user || null;
            if (session) {
                store.isMod = await this.checkIsMod(session);
            } else {
                store.isMod = false;
                sessionStorage.removeItem('is_mod');
            }
            // setTimeout evita travar o supabase-js ao chamá-lo de dentro deste callback
            setTimeout(() => this.loadProfile(session), 0);
        });
    },
    methods: {
        async loadProfile(session) {
            if (!session) {
                store.profile = null;
                return;
            }
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
            if (error) console.error('Erro ao carregar perfil:', error.message);
            store.profile = data || null;
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
