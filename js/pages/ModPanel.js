import { supabase } from '../supabase.js';
import { auth } from '../auth.js';

export default {
    template: `
        <div style="width: 100%; min-height: 90vh; padding: 40px 20px; box-sizing: border-box; background: var(--bg, #1e1e1e); color: #fff;">
            <div style="width: 100%; max-width: 1400px; margin: 0 auto;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 25px;">
                    <div>
                        <h1 style="font-size: 2.2rem; font-weight: bold; margin: 0;">Painel de Moderação</h1>
                        <p style="color: #aaa; margin-top: 6px; font-size: 1rem;">
                            Gerenciamento de recordes, notificações e migração de contas dos jogadores.
                        </p>
                    </div>

                    <!-- SELETOR DE ABA -->
                    <div style="display: flex; gap: 8px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 8px;">
                        <button 
                            @click="tab = 'submissions'" 
                            :style="{
                                background: tab === 'submissions' ? '#5865F2' : 'transparent',
                                color: tab === 'submissions' ? '#fff' : '#aaa',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }"
                        >
                            Recordes Pendentes ({{ submissions.length }})
                        </button>
                        <button 
                            @click="tab = 'migration'; loadLeaderboardPlayers()" 
                            :style="{
                                background: tab === 'migration' ? '#5865F2' : 'transparent',
                                color: tab === 'migration' ? '#fff' : '#aaa',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }"
                        >
                            Migração de Contas ({{ leaderboardPlayers.length }})
                        </button>
                    </div>
                </div>

                <!-- ALERTA DE NOTIFICAÇÃO -->
                <div v-if="notice" style="background: rgba(88, 101, 242, 0.2); border: 1px solid #5865F2; color: #c7d2fe; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px;">
                    {{ notice }}
                </div>

                <!-- ABA 1: SUBMISSÕES DE RECORDES -->
                <div v-if="tab === 'submissions'">
                    <div v-if="loading" style="text-align: center; padding: 40px;">
                        <p>Carregando submissões...</p>
                    </div>

                    <div v-else-if="submissions.length === 0" style="text-align: center; padding: 40px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <p style="color: #aaa;">Nenhuma submissão pendente no momento.</p>
                    </div>

                    <div v-else style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                        <div 
                            v-for="sub in submissions" 
                            :key="sub.id" 
                            style="display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); width: 100%; box-sizing: border-box; flex-wrap: wrap; gap: 16px;"
                        >
                            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 280px;">
                                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                                    <strong style="font-size: 1.25rem; color: #fff;">{{ sub.user_name }}</strong> 
                                    <span style="color: #aaa;">completou</span> 
                                    <span style="color: #5865F2; font-weight: bold;">{{ sub.level_name || ('Level ID: ' + sub.level_id) }}</span> 
                                    <span style="background: rgba(88, 101, 242, 0.2); color: #7289da; padding: 2px 10px; border-radius: 4px; font-weight: bold; font-size: 0.9rem;">{{ sub.percent }}%</span>
                                </div>
                                <div style="font-size: 0.9rem; color: #888; display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                                    <span>Hz: <strong>{{ sub.hz }}Hz</strong></span>
                                    <span>Mobile: <strong>{{ sub.mobile ? 'Sim' : 'Não' }}</strong></span>
                                    <a :href="sub.video_link" target="_blank" style="color: #5865F2; text-decoration: underline;">Ver Vídeo Prova</a>
                                </div>
                            </div>

                            <div style="display: flex; gap: 12px; flex-shrink: 0;">
                                <button 
                                    @click="updateStatus(sub, 'approved')" 
                                    style="background: #2ecc71; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;"
                                >
                                    Aceitar
                                </button>
                                <button 
                                    @click="updateStatus(sub, 'rejected')" 
                                    style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;"
                                >
                                    Recusar / Apagar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ABA 2: GERADOR DE CONTAS DOS JOGADORES DA LEADERBOARD -->
                <div v-else-if="tab === 'migration'">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h2 style="font-size: 1.3rem; font-weight: bold; margin-top: 0; margin-bottom: 8px;">Contas Criadas para os Jogadores Antigos</h2>
                        <p style="color: #aaa; font-size: 0.9rem; line-height: 1.5; margin-bottom: 16px;">
                            Todas as contas abaixo <strong>já foram provisionadas no sistema</strong> com as senhas provisórias indicadas! Basta copiar os dados e enviar a cada jogador no Discord. Ao fazer login, eles podem trocar a senha e vincular o Discord deles no perfil!
                        </p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button 
                                @click="copyAllAccounts" 
                                style="background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;"
                            >
                                Copiar Todas as Contas (Texto Formatado)
                            </button>
                            <button 
                                @click="loadLeaderboardPlayers" 
                                style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;"
                            >
                                🔄 Recarregar Lista
                            </button>
                        </div>
                    </div>

                    <div v-if="loadingPlayers" style="text-align: center; padding: 30px; color: #aaa;">
                        <p>Carregando contas dos jogadores...</p>
                    </div>

                    <div v-else-if="leaderboardPlayers.length === 0" style="text-align: center; padding: 40px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <p style="color: #aaa; margin-bottom: 12px;">Nenhuma conta encontrada ou houve um atraso no carregamento.</p>
                        <button @click="loadLeaderboardPlayers" style="background: #5865F2; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            Carregar Contas Novamente
                        </button>
                    </div>

                    <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
                        <div 
                            v-for="p in leaderboardPlayers" 
                            :key="p.user" 
                            style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 8px;"
                        >
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size: 1.1rem; color: #fff;">{{ p.display_name || p.user }}</strong>
                                <span :style="{
                                    background: p.has_changed_password ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                    color: p.has_changed_password ? '#4ade80' : '#facc15',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }">
                                    {{ p.has_changed_password ? 'Senha alterada' : 'Senha temporária' }}
                                </span>
                            </div>
                            
                            <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-size: 0.85rem; font-family: monospace;">
                                <div style="color: #bbb;">Usuário: <span style="color: #fff; font-weight: bold;">{{ p.user }}</span></div>
                                <div style="color: #bbb; margin-top: 4px;">Senha: <span :style="{ color: p.temp_password ? '#22c55e' : '#a5b4fc', fontWeight: 'bold' }">{{ p.temp_password || '*(Alterada pelo usuário)*' }}</span></div>
                                <div style="margin-top: 6px; font-size: 0.8rem;">
                                    Discord: 
                                    <span v-if="p.discord_linked" style="color: #4ade80; font-weight: bold;">
                                        ● Conectado ({{ p.discord_username ? ('@' + p.discord_username) : ('ID: ' + p.discord_id) }})
                                    </span>
                                    <span v-else style="color: #facc15;">
                                        ○ Não vinculado
                                    </span>
                                </div>
                            </div>

                            <button 
                                @click="copySingleAccount(p)" 
                                style="background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold; align-self: flex-start; margin-top: 4px;"
                            >
                                Copiar Mensagem para Envio
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `,
    data() {
        return {
            tab: 'submissions',
            submissions: [],
            leaderboardPlayers: [],
            loading: true,
            loadingPlayers: false,
            notice: ''
        };
    },
    async mounted() {
        await this.fetchSubmissions();
        await this.loadLeaderboardPlayers();
    },
    methods: {
        async fetchSubmissions() {
            this.loading = true;
            try {
                const { data, error } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('status', 'pending')
                    .order('id', { ascending: false });

                if (error) throw error;
                this.submissions = data || [];
            } catch (err) {
                console.error('Erro ao buscar submissões:', err.message);
            } finally {
                this.loading = false;
            }
        },
        async updateStatus(sub, newStatus) {
            try {
                if (newStatus === 'rejected') {
                    const { error } = await supabase
                        .from('submissions')
                        .delete()
                        .eq('id', sub.id);

                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('submissions')
                        .update({ status: 'approved' })
                        .eq('id', sub.id);

                    if (error) throw error;
                }

                this.submissions = this.submissions.filter(s => s.id !== sub.id);
                
                await this.notifyDiscordBot(sub, newStatus);

                this.showNotice(newStatus === 'approved' ? `Recorde de ${sub.user_name} aceito com sucesso!` : `Recorde de ${sub.user_name} recusado.`);
            } catch (err) {
                this.showNotice('Erro ao atualizar status: ' + err.message);
            }
        },
        async notifyDiscordBot(sub, status) {
            try {
                const accounts = await auth.getMigrationAccounts();
                const matched = accounts.find(a => a.user.toLowerCase() === sub.user_name.toLowerCase());

                console.log(`[DISCORD NOTIFICAÇÃO] Recorde: ${status} | Jogador: ${sub.user_name} | Discord: ${matched?.discord_linked ? 'Vinculado' : 'Pendente'}`);

                if (window.DISCORD_BOT_WEBHOOK_URL) {
                    await fetch(window.DISCORD_BOT_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_name: sub.user_name,
                            level_name: sub.level_name,
                            percent: sub.percent,
                            status: status
                        })
                    });
                }
            } catch (e) {
                console.warn('Erro na notificação do Discord:', e);
            }
        },
        async loadLeaderboardPlayers() {
            this.loadingPlayers = true;
            try {
                const accounts = await auth.getMigrationAccounts();
                this.leaderboardPlayers = accounts || [];
            } catch (e) {
                console.error('Erro ao carregar contas de migração:', e);
            } finally {
                this.loadingPlayers = false;
            }
        },
        copySingleAccount(p) {
            const pass = p.temp_password || '*(senha pessoal já definida pelo usuário)*';
            const text = `Sua conta na TACL foi criada!\nUsuário: ${p.user}\nSenha provisória: ${pass}\nAcesse e troque sua senha em: ${window.location.origin}/#/perfil`;
            navigator.clipboard.writeText(text);
            this.showNotice(`Dados de ${p.user} copiados para a área de transferência!`);
        },
        copyAllAccounts() {
            const lines = this.leaderboardPlayers.map(p => {
                const pass = p.temp_password || '*(já alterada)*';
                return `${p.user} | ${pass}`;
            });
            const text = "USUÁRIO | SENHA PROVISÓRIA\n" + lines.join("\n");
            navigator.clipboard.writeText(text);
            this.showNotice(`Lista completa com ${lines.length} contas copiada!`);
        },
        showNotice(msg) {
            this.notice = msg;
            setTimeout(() => {
                if (this.notice === msg) this.notice = '';
            }, 5000);
        }
    }
};
