import { auth } from '../auth.js';
import { supabase } from '../supabase.js';
import { store } from '../main.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    template: `
        <div style="min-height: 85vh; padding: 40px 20px; box-sizing: border-box; background: var(--bg, #18181b); color: #fff;">
            <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px;">
                
                <!-- CABEÇALHO DO PERFIL -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 30px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <img 
                            :src="currentAvatar" 
                            alt="Avatar" 
                            style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #5865F2;"
                        />
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h1 style="font-size: 1.8rem; font-weight: bold; margin: 0;">{{ currentDisplayName }}</h1>
                                <span v-if="store.isMod" style="background: #ff4757; color: #fff; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: bold;">
                                    MODERADOR
                                </span>
                            </div>
                            <p style="color: #888; font-size: 0.9rem; margin-top: 4px;">{{ userHandle }}</p>
                        </div>
                    </div>

                    <button 
                        @click="handleLogout" 
                        style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #ccc; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: bold;"
                    >
                        Sair da Conta
                    </button>
                </div>

                <!-- ALERTA DE SENHA TEMPORÁRIA PENDENTE -->
                <div v-if="hasTempPassword" style="background: rgba(234, 179, 8, 0.15); border: 1px solid #eab308; color: #fef08a; padding: 14px 18px; border-radius: 8px; font-size: 0.95rem; line-height: 1.5;">
                    ⚠️ <strong>Você está usando uma senha provisória de migração!</strong><br>
                    Por favor, defina uma nova senha pessoal abaixo para manter sua conta segura.
                </div>

                <!-- ALERTA DE SUCESSO / ERRO -->
                <div v-if="feedback.text" :style="{
                    background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid ' + (feedback.type === 'success' ? '#22c55e' : '#ef4444'),
                    color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                }">
                    {{ feedback.text }}
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
                    
                    <!-- EDIÇÃO DE DADOS (NOME E FOTO) -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                        <h2 style="font-size: 1.3rem; font-weight: bold; margin: 0;">Editar Perfil</h2>
                        <p style="color: #888; font-size: 0.85rem; margin: 0;">Atualize seu nome de jogador e foto de perfil.</p>

                        <form @submit.prevent="saveProfile" style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px;">Nome de Jogador (Nick):</label>
                                <input 
                                    type="text" 
                                    v-model="form.display_name" 
                                    required 
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px;">Link da Imagem (Avatar URL):</label>
                                <input 
                                    type="url" 
                                    v-model="form.avatar_url" 
                                    placeholder="https://exemplo.com/foto.png" 
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                                />
                            </div>

                            <button 
                                type="submit" 
                                :disabled="savingProfile" 
                                style="background: #3b82f6; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 6px;"
                            >
                                {{ savingProfile ? 'Salvando...' : 'Salvar Perfil' }}
                            </button>
                        </form>
                    </div>

                    <!-- VINCULAR DISCORD E NOTIFICAÇÕES -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <img src="/assets/discord.svg" style="width: 24px; height: 24px;" alt="Discord">
                                <h2 style="font-size: 1.3rem; font-weight: bold; margin: 0;">Conexão Discord</h2>
                            </div>
                            <p style="color: #888; font-size: 0.85rem; line-height: 1.5;">
                                Conecte seu Discord para receber notificações na sua <strong>DM do Discord</strong> pelo bot quando o seu recorde for aprovado ou recusado pela moderação.
                            </p>

                            <div style="margin-top: 16px; padding: 14px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <span style="font-size: 0.85rem; color: #aaa;">Status:</span>
                                    <span :style="{
                                        color: isDiscordLinked ? '#22c55e' : '#f59e0b',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem'
                                    }">
                                        {{ isDiscordLinked ? '● Conectado' : '○ Não conectado' }}
                                    </span>
                                </div>
                                <div v-if="discordUsername" style="font-size: 0.85rem; color: #ccc;">
                                    Usuário: <strong>{{ discordUsername }}</strong>
                                </div>
                                <div v-if="discordId" style="font-size: 0.75rem; color: #666; margin-top: 2px;">
                                    ID: {{ discordId }}
                                </div>
                            </div>
                        </div>

                        <button 
                            @click="linkDiscord" 
                            type="button" 
                            style="background: #5865F2; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;"
                        >
                            <img src="/assets/discord.svg" style="width: 18px; height: 18px;" alt="">
                            {{ isDiscordLinked ? 'Reconectar / Atualizar Discord' : 'Vincular com Discord' }}
                        </button>
                    </div>

                    <!-- ALTERAÇÃO DE SENHA -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                        <h2 style="font-size: 1.3rem; font-weight: bold; margin: 0;">Segurança da Conta</h2>
                        <p style="color: #888; font-size: 0.85rem; margin: 0;">
                            Altere sua senha de acesso a qualquer momento.
                        </p>

                        <form @submit.prevent="changePassword" style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px;">Nova Senha:</label>
                                <input 
                                    type="password" 
                                    v-model="newPassword" 
                                    required 
                                    minlength="4" 
                                    placeholder="Mínimo 4 caracteres" 
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                                />
                            </div>

                            <button 
                                type="submit" 
                                :disabled="savingPassword" 
                                style="background: #10b981; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;"
                            >
                                {{ savingPassword ? 'Atualizando...' : 'Atualizar Senha' }}
                            </button>
                        </form>
                    </div>

                </div>

                <!-- SEÇÃO MEUS RECORDES SUBMETIDOS -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h2 style="font-size: 1.3rem; font-weight: bold; margin: 0;">Meus Recordes Enviados</h2>
                            <p style="color: #888; font-size: 0.85rem; margin-top: 4px;">Histórico de envios vinculados ao seu nick.</p>
                        </div>
                        <router-link to="/submit" style="background: #5865F2; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: bold;">
                            + Novo Recorde
                        </router-link>
                    </div>

                    <div v-if="loadingRecords" style="text-align: center; padding: 20px;">
                        <Spinner></Spinner>
                    </div>

                    <div v-else-if="userSubmissions.length === 0" style="text-align: center; padding: 30px; color: #777;">
                        Nenhum recorde enviado até o momento.
                    </div>

                    <div v-else style="display: flex; flex-direction: column; gap: 10px;">
                        <div 
                            v-for="sub in userSubmissions" 
                            :key="sub.id" 
                            style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);"
                        >
                            <div>
                                <span style="font-weight: bold; font-size: 1.05rem;">{{ sub.level_name || ('Nível #' + sub.level_id) }}</span>
                                <span style="margin-left: 10px; color: #38bdf8; font-weight: bold;">{{ sub.percent }}%</span>
                                <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">
                                    {{ sub.hz }}Hz · {{ sub.mobile ? 'Mobile' : 'PC' }} · 
                                    <a :href="sub.video_link" target="_blank" style="color: #5865F2;">Vídeo</a>
                                </div>
                            </div>

                            <div>
                                <span :style="{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    background: sub.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : (sub.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'),
                                    color: sub.status === 'approved' ? '#4ade80' : (sub.status === 'rejected' ? '#f87171' : '#facc15')
                                }">
                                    {{ sub.status === 'approved' ? 'Aprovado' : (sub.status === 'rejected' ? 'Recusado' : 'Pendente') }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `,
    data() {
        return {
            store,
            account: null,
            discordSession: null,
            form: {
                display_name: '',
                avatar_url: ''
            },
            newPassword: '',
            savingProfile: false,
            savingPassword: false,
            loadingRecords: true,
            userSubmissions: [],
            feedback: { text: '', type: 'success' }
        };
    },
    computed: {
        currentDisplayName() {
            return this.form.display_name ||
                   this.account?.display_name ||
                   this.account?.username ||
                   this.discordSession?.user?.user_metadata?.full_name ||
                   'Jogador';
        },
        currentAvatar() {
            return this.form.avatar_url ||
                   this.account?.avatar_url ||
                   this.discordSession?.user?.user_metadata?.avatar_url ||
                   'https://cdn.discordapp.com/embed/avatars/0.png';
        },
        userHandle() {
            if (this.account?.username) {
                return `@${this.account.username}`;
            }
            return 'Conectado via Discord';
        },
        hasTempPassword() {
            return Boolean(this.account?.has_temp_password);
        },
        isDiscordLinked() {
            return Boolean(
                this.account?.discord_id ||
                this.discordSession?.user?.app_metadata?.provider === 'discord'
            );
        },
        discordUsername() {
            return this.account?.discord_username ||
                   this.discordSession?.user?.user_metadata?.custom_claims?.global_name ||
                   this.discordSession?.user?.user_metadata?.full_name ||
                   null;
        },
        discordId() {
            return this.account?.discord_id ||
                   this.discordSession?.user?.user_metadata?.sub ||
                   null;
        }
    },
    async mounted() {
        // Checa conta do sistema TACL
        const account = await auth.getProfile();
        
        // Checa sessão Discord no Supabase se houver
        const { data: { session } } = await supabase.auth.getSession();
        this.discordSession = session;

        if (!account && !session) {
            this.$router.push('/login');
            return;
        }

        this.account = account;

        // Se tem conta logada e acabou de autorizar no Discord, vincula automaticamente
        if (account && session?.user?.app_metadata?.provider === 'discord') {
            const discordId = session.user.user_metadata?.sub;
            const discordName = session.user.user_metadata?.custom_claims?.global_name || session.user.user_metadata?.full_name;
            const discordAvatar = session.user.user_metadata?.avatar_url;
            try {
                this.account = await auth.linkDiscord({
                    discord_id: discordId,
                    discord_username: discordName,
                    discord_avatar: discordAvatar
                });
            } catch (e) {
                console.warn('Erro ao auto-vincular Discord:', e);
            }
        }

        this.form.display_name = this.account?.display_name || session?.user?.user_metadata?.full_name || '';
        this.form.avatar_url = this.account?.avatar_url || session?.user?.user_metadata?.avatar_url || '';

        await this.fetchMySubmissions();
    },
    methods: {
        async saveProfile() {
            this.savingProfile = true;
            this.feedback = { text: '', type: 'success' };

            try {
                if (this.account) {
                    const updated = await auth.updateProfile({
                        display_name: this.form.display_name,
                        avatar_url: this.form.avatar_url
                    });
                    this.account = updated;
                    store.profile = updated;
                }
                this.feedback = { text: 'Perfil salvo com sucesso!', type: 'success' };
            } catch (err) {
                this.feedback = { text: 'Erro ao salvar perfil: ' + err.message, type: 'error' };
            } finally {
                this.savingProfile = false;
            }
        },
        async changePassword() {
            if (!this.newPassword || this.newPassword.length < 4) {
                this.feedback = { text: 'A senha deve ter pelo menos 4 caracteres.', type: 'error' };
                return;
            }

            this.savingPassword = true;
            this.feedback = { text: '', type: 'success' };

            try {
                if (this.account) {
                    const updated = await auth.updateProfile({
                        new_password: this.newPassword
                    });
                    this.account = updated;
                    store.profile = updated;
                }
                this.feedback = { text: 'Senha alterada com sucesso!', type: 'success' };
                this.newPassword = '';
            } catch (err) {
                this.feedback = { text: 'Erro ao trocar senha: ' + err.message, type: 'error' };
            } finally {
                this.savingPassword = false;
            }
        },
        async linkDiscord() {
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: {
                        scopes: 'identify guilds guilds.members.read',
                        redirectTo: window.location.origin + window.location.pathname + '#/perfil'
                    }
                });
                if (error) throw error;
            } catch (err) {
                this.feedback = { text: 'Erro ao conectar Discord: ' + err.message, type: 'error' };
            }
        },
        async fetchMySubmissions() {
            this.loadingRecords = true;
            try {
                const nick = this.currentDisplayName;
                const { data, error } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('user_name', nick)
                    .order('id', { ascending: false });

                if (error) throw error;
                this.userSubmissions = data || [];
            } catch (err) {
                console.error('Erro ao buscar recordes do usuário:', err);
            } finally {
                this.loadingRecords = false;
            }
        },
        async handleLogout() {
            auth.logout();
            await supabase.auth.signOut();
            store.profile = null;
            store.isMod = false;
            this.$root.user = null;
            this.$router.push('/');
        }
    }
};
