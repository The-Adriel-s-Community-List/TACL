import routes from './routes.js';
import { supabase } from './supabase.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ 
        store,
        user: null 
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
        // Pega a sessão atual do Supabase ao carregar o site
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;

        // Escuta os eventos de Login e Logout em tempo real
        supabase.auth.onAuthStateChange((_event, session) => {
            this.user = session?.user || null;
        });
    },
    methods: {
        async loginWithDiscord() {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) alert('Erro ao autenticar com o Discord: ' + error.message);
        },
        async logout() {
            await supabase.auth.signOut();
            this.user = null;
        }
    }
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);
app.mount('#app');
