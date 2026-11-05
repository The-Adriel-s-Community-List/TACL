import routes from './routes.js';
import { supabase } from './supabase.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
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
        user: null,
        isMod: false
    }),
    computed: {
        username() {
            return this.user?.user_metadata?.full_name || 
                   this.user?.user_metadata?.custom_claims?.global_name || 
                   'Usuário';
        },
        avatarUrl() {
            return this.user?.user_metadata?.avatar_url || 
                   'https://cdn.discordapp.com/embed/avatars/0.png';
        }
    },
    async mounted() {
        // Carrega sessão inicial
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;
        if (session) {
            this.isMod = await this.checkIsMod(session);
        }

        // Escuta mudanças de autenticação
        supabase.auth.onAuthStateChange(async (_event, session) => {
            this.user = session?.user || null;
            if (session) {
                this.isMod = await this.checkIsMod(session);
            } else {
                this.isMod = false;
            }
        });
    },
    methods: {
        async checkIsMod(session) {
            const providerToken = session?.provider_token;
            if (!providerToken) return false;

            try {
                const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`, {
                    headers: {
                        Authorization: `Bearer ${providerToken}`
                    }
                });

                if (!response.ok) return false;

                const memberData = await response.json();
                return memberData.roles && memberData.roles.includes(MOD_ROLE_ID);
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
            this.isMod = false;
        }
    }
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);
app.mount('#app');
