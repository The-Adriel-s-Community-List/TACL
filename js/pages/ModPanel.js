import { supabase } from '../supabase.js';
import { fetchLeaderboard } from '../content.js';

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
                            Migração de Contas
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
                        <h2 style="font-size: 1.3rem; font-weight: bold; margin-top: 0; margin-bottom: 8px;">Migração dos Jogadores do Sistema Antigo</h2>
                        <p style="color: #aaa; font-size: 0.9rem; line-height: 1.5; margin-bottom: 16px;">
                            Aqui estão todos os jogadores identificados nos arquivos estáticos da Leaderboard. Você pode gerar a lista com login e senha temporária para passar aos jogadores no Discord. Quando eles entrarem na <strong>Área do Usuário (/perfil)</strong>, eles poderão alterar a senha e vincular o Discord deles!
                        </p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button 
                                @click="copyAllAccounts" 
                                style="background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;"
                            >
                                Copiar Todas as Contas (Texto Formatado)
                            </button>
                        </div>
                    </div>

                    <div v-if="loadingPlayers" style="text-align: center; padding: 30px;">
                        Carregando jogadores da leaderboard...
                    </div>

                    <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
                        <div 
                            v-for="(p, index) in leaderboardPlayers" 
                            :key="p.user" 
                            style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 8px;"
                        >
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size: 1.1rem; color: #fff;">#{{ index + 1 }} {{ p.user }}</strong>
                                <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">
                                    {{ p.total }} pts
                                </span>
                            </div>
                            
                            <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-size: 0.85rem; font-family: monospace;">
                                <div style="color: #bbb;">E-mail: <span style="color: #fff;">{{ getSuggestedEmail(p.user) }}</span></div>
                                <div style="color: #bbb; margin-top: 4px;">Senha temp: <span style="color: #22c55e; font-weight: bold;">{{ getSuggestedPassword(p.user) }}</span></div>
                            </div>

                            <button 
                                @click="copySingleAccount(p)" 
                                style="background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold; align-self: flex-start; margin-top: 4px;"
                            >
                                Copiar Dados de Acesso
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
                
                // Disparo de notificação para o Discord bot se houver discord_id ou webhook configurado
                await this.notifyDiscordBot(sub, newStatus);

                this.showNotice(newStatus === 'approved' ? `Recorde de ${sub.user_name} aceito com sucesso!` : `Recorde de ${sub.user_name} recusado.`);
            } catch (err) {
                this.showNotice('Erro ao atualizar status: ' + err.message);
            }
        },
        async notifyDiscordBot(sub, status) {
            try {
                // Tenta achar o discord_id do usuário na tabela de profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('discord_id, display_name')
                    .eq('display_name', sub.user_name)
                    .maybeSingle();

                const discordId = profile?.discord_id || sub.discord_id;
                
                console.log(`[DISCORD NOTIFICATION] Status: ${status} | Jogador: ${sub.user_name} | Discord ID: ${discordId || 'Não vinculado'}`);

                // Se houver endpoint ou webhook configurado, podemos disparar aqui
                if (window.DISCORD_BOT_WEBHOOK_URL && discordId) {
                    await fetch(window.DISCORD_BOT_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            discord_id: discordId,
                            user_name: sub.user_name,
                            level_name: sub.level_name,
                            percent: sub.percent,
                            status: status
                        })
                    });
                }
            } catch (e) {
                console.warn('Não foi possível enviar webhook do Discord:', e);
            }
        },
        async loadLeaderboardPlayers() {
            if (this.leaderboardPlayers.length > 0) return;
            this.loadingPlayers = true;
            try {
                const [players] = await fetchLeaderboard();
                this.leaderboardPlayers = players || [];
            } catch (e) {
                console.error('Erro ao carregar leaderboard:', e);
            } finally {
                this.loadingPlayers = false;
            }
        },
        getSuggestedEmail(name) {
            const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return `${clean || 'player'}@tacl.list`;
        },
        getSuggestedPassword(name) {
            const clean = name.replace(/\s+/g, '');
            return `TACL#${clean}2026`;
        },
        copySingleAccount(p) {
            const email = this.getSuggestedEmail(p.user);
            const pass = this.getSuggestedPassword(p.user);
            const text = `Sua conta na TACL foi criada!\nNick: ${p.user}\nE-mail: ${email}\nSenha provisória: ${pass}\nAcesse e troque sua senha em: ${window.location.origin}/#/perfil`;
            navigator.clipboard.writeText(text);
            this.showNotice(`Dados de ${p.user} copiados para a área de transferência!`);
        },
        copyAllAccounts() {
            const lines = this.leaderboardPlayers.map(p => {
                const email = this.getSuggestedEmail(p.user);
                const pass = this.getSuggestedPassword(p.user);
                return `${p.user} | ${email} | ${pass}`;
            });
            const text = "NICK | EMAIL | SENHA PROVISÓRIA\n" + lines.join("\n");
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
