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
                    {{ tab === 'login' ? 'Entre com seu e-mail ou via Discord para gerenciar seus recordes.' : 'Crie sua conta para registrar recordes e gerenciar seu perfil na lista.' }}
                </p>

                <!-- MENSAGEM DE ERRO OU SUCESSO -->
                <div v-if="error" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 14px; border-radius: 6px; font-size: 0.9rem; margin-bottom: 16px;">
                    {{ error }}
                </div>
                <div v-if="success" style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #86efac; padding: 10px 14px; border-radius: 6px; font-size: 0.9rem; margin-bottom: 16px;">
                    {{ success }}
                </div>

                <!-- FORMULÁRIO EMAIL & SENHA -->
                <form @submit.prevent="handleSubmit" style="display: flex; flex-direction: column; gap: 14px;">
                    <div v-if="tab === 'register'">
                        <label style="font-size: 0.85rem; color: #bbb; display: block; margin-bottom: 6px;">Nick / Nome de Jogador:</label>
                        <input 
                            type="text" 
                            v-model="username" 
                            required 
                            placeholder="Ex: Mamamia898" 
                            style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                        />
                    </div>

                    <div>
                        <label style="font-size: 0.85rem; color: #bbb; display: block; margin-bottom: 6px;">E-mail:</label>
                        <input 
                            type="email" 
                            v-model="email" 
                            required 
                            placeholder="seu@email.com" 
                            style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                        />
                    </div>

                    <div>
                        <label style="font-size: 0.85rem; color: #bbb; display: block; margin-bottom: 6px;">Senha:</label>
                        <input 
                            type="password" 
                            v-model="password" 
                            required 
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
            email: '',
            password: '',
            username: '',
            loading: false,
            error: '',
            success: ''
        };
    },
    methods: {
        async handleSubmit() {
            this.loading = true;
            this.error = '';
            this.success = '';

            try {
                if (this.tab === 'login') {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: this.email,
                        password: this.password,
                    });
                    if (error) throw error;
                    this.success = 'Login realizado com sucesso! Redirecionando...';
                    setTimeout(() => {
                        this.$router.push('/perfil');
                    }, 800);
                } else {
                    const { data, error } = await supabase.auth.signUp({
                        email: this.email,
                        password: this.password,
                        options: {
                            data: {
                                full_name: this.username,
                                display_name: this.username
                            }
                        }
                    });
                    if (error) throw error;

                    if (data?.user) {
                        // Salvar na tabela profiles se disponível
                        await supabase.from('profiles').upsert({
                            user_id: data.user.id,
                            display_name: this.username,
                            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                        });
                    }

                    this.success = 'Conta criada com sucesso! Você já pode entrar.';
                    this.tab = 'login';
                }
            } catch (err) {
                this.error = err.message || 'Ocorreu um erro na autenticação.';
            } finally {
                this.loading = false;
            }
        },
        async loginWithDiscord() {
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: {
                        scopes: 'identify guilds guilds.members.read',
                        redirectTo: window.location.origin + window.location.pathname
                    }
                });
                if (error) throw error;
            } catch (err) {
                this.error = 'Erro ao autenticar com o Discord: ' + err.message;
            }
        }
    }
};
