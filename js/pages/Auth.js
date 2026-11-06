import { auth } from '../auth.js';
import { supabase } from '../supabase.js';
import { store } from '../main.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    template: `
        <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box;">
            <div style="background: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 100%; max-width: 440px; padding: 32px; box-sizing: border-box; box-shadow: 0 10px 25px rgba(0,0,0,0.5); color: #fff;">
                
                <!-- TABS DE LOGIN / REGISTRO -->
                <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                    <button 
                        @click="tab = 'login'; error = ''; success = ''" 
                        :style="{
                            background: tab === 'login' ? '#5865F2' : 'transparent',
                            color: tab === 'login' ? '#fff' : '#aaa',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }"
                    >
                        Entrar
                    </button>
                    <button 
                        @click="tab = 'register'; error = ''; success = ''" 
                        :style="{
                            background: tab === 'register' ? '#5865F2' : 'transparent',
                            color: tab === 'register' ? '#fff' : '#aaa',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }"
                    >
                        Criar Conta
                    </button>
                </div>

                <h2 style="font-size: 1.5rem; margin-bottom: 8px; font-weight: bold;">
                    {{ tab === 'login' ? 'Acessar Conta' : 'Criar Nova Conta' }}
                </h2>
                <p style="color: #888; font-size: 0.9rem; margin-bottom: 20px;">
                    {{ tab === 'login' ? 'Entre apenas com seu nome de usuário e senha.' : 'Escolha seu nome de usuário e senha para criar sua conta instantaneamente.' }}
                </p>

                <!-- MENSAGEM DE ERRO OU SUCESSO -->
                <div v-if="error" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 14px; border-radius: 6px; font-size: 0.9rem; margin-bottom: 16px;">
                    {{ error }}
                </div>
                <div v-if="success" style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #86efac; padding: 10px 14px; border-radius: 6px; font-size: 0.9rem; margin-bottom: 16px;">
                    {{ success }}
                </div>

                <!-- FORMULÁRIO USUÁRIO & SENHA -->
                <form @submit.prevent="handleSubmit" style="display: flex; flex-direction: column; gap: 14px;">
                    <div>
                        <label style="font-size: 0.85rem; color: #bbb; display: block; margin-bottom: 6px;">Nome de Usuário (Nick):</label>
                        <input 
                            type="text" 
                            v-model="username" 
                            required 
                            placeholder="Ex: Mamamia898" 
                            style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                        />
                    </div>

                    <div>
                        <label style="font-size: 0.85rem; color: #bbb; display: block; margin-bottom: 6px;">Senha:</label>
                        <input 
                            type="password" 
                            v-model="password" 
                            required 
                            minlength="4"
                            placeholder="Sua senha secreta" 
                            style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                        />
                    </div>

                    <button 
                        type="submit" 
                        :disabled="loading" 
                        style="margin-top: 6px; background: #3b82f6; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s;"
                    >
                        <span v-if="!loading">{{ tab === 'login' ? 'Entrar' : 'Cadastrar' }}</span>
                        <span v-else>Carregando...</span>
                    </button>
                </form>

                <!-- DIVISOR -->
                <div style="display: flex; align-items: center; margin: 24px 0; color: #555;">
                    <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                    <span style="padding: 0 12px; font-size: 0.8rem; text-transform: uppercase;">ou continue com</span>
                    <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                </div>

                <!-- BOTÃO DISCORD -->
                <button 
                    @click="loginWithDiscord" 
                    type="button" 
                    style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: #5865F2; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: opacity 0.2s;"
                >
                    <img src="/assets/discord.svg" style="width: 20px; height: 20px;" alt="Discord">
                    Entrar com Discord
                </button>

            </div>
        </div>
    `,
    data() {
        return {
            tab: 'login',
            username: '',
            password: '',
            loading: false,
            error: '',
            success: ''
        };
    },
    methods: {
        async handleSubmit() {
            if (!this.username.trim()) {
                this.error = 'Por favor, informe seu nome de usuário.';
                return;
            }

            this.loading = true;
            this.error = '';
            this.success = '';

            try {
                if (this.tab === 'login') {
                    const user = await auth.login(this.username, this.password);
                    store.profile = user;
                    this.$root.user = user;
                    this.success = 'Login realizado com sucesso! Redirecionando...';
                    setTimeout(() => {
                        this.$router.push('/perfil');
                    }, 500);
                } else {
                    const user = await auth.register(this.username, this.password);
                    store.profile = user;
                    this.$root.user = user;
                    this.success = 'Conta criada com sucesso! Redirecionando para seu perfil...';
                    setTimeout(() => {
                        this.$router.push('/perfil');
                    }, 500);
                }
            } catch (err) {
                this.error = err.message || 'Ocorreu um erro na autenticação.';
            } finally {
                this.loading = false;
            }
        },
        async loginWithDiscord() {
            try {
                this.error = '';
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: {
                        skipBrowserRedirect: true,
                        scopes: 'identify guilds guilds.members.read',
                        redirectTo: window.location.origin + '/auth/callback'
                    }
                });
                if (error) throw error;
                if (data?.url) {
                    const popup = window.open(data.url, 'discord_auth_popup', 'width=600,height=750,menubar=no,toolbar=no');
                    if (!popup) {
                        this.error = 'O navegador bloqueou a janela pop-up do Discord. Permita pop-ups ou entre com usuário e senha.';
                    } else {
                        const messageHandler = async (event) => {
                            if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                                window.removeEventListener('message', messageHandler);
                                const { data: { session } } = await supabase.auth.getSession();
                                if (session) {
                                    this.$router.push('/perfil');
                                }
                            }
                        };
                        window.addEventListener('message', messageHandler);
                    }
                }
            } catch (e) {
                this.error = 'Erro ao autenticar com o Discord: ' + (e.message || e) + '. Use o login com Usuário e Senha!';
            }
        }
    }
};
