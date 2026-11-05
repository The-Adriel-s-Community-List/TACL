import { supabase } from '../supabase.js';

export default {
    template: `
        <main class="page-mod" style="padding: 40px; max-width: 1000px; margin: 0 auto;">
            <h1 style="font-size: 2.2rem; margin-bottom: 10px; font-weight: bold; color: #fff;">Painel de Moderação</h1>
            <p style="color: #aaa; margin-bottom: 30px;">
                Gerencie os recordes enviados pelos jogadores. Aceite para irem para a lista ou remova os inválidos.
            </p>

            <div v-if="loading" style="text-align: center; padding: 40px; color: #fff;">
                <p>Carregando submissões...</p>
            </div>

            <div v-else-if="submissions.length === 0" style="text-align: center; padding: 40px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="color: #aaa;">Nenhuma submissão pendente no momento.</p>
            </div>

            <div v-else style="display: flex; flex-direction: column; gap: 15px;">
                <div 
                    v-for="sub in submissions" 
                    :key="sub.id" 
                    style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);"
                >
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div>
                            <strong style="font-size: 1.2rem; color: #fff;">{{ sub.user_name }}</strong> 
                            <span style="color: #aaa; margin-left: 6px;">completou</span> 
                            <span style="color: #5865F2; font-weight: bold; margin-left: 6px;">{{ sub.level_name || ('Level ID: ' + sub.level_id) }}</span> 
                            <span style="background: rgba(88, 101, 242, 0.2); color: #7289da; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; margin-left: 10px;">{{ sub.percent }}%</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #888; display: flex; gap: 15px;">
                            <span>Hz: <strong>{{ sub.hz }}Hz</strong></span>
                            <span>Mobile: <strong>{{ sub.mobile ? 'Sim' : 'Não' }}</strong></span>
                            <a :href="sub.video_link" target="_blank" style="color: #5865F2; text-decoration: underline;">Ver Vídeo Prova</a>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button 
                            @click="updateStatus(sub.id, 'approved')" 
                            style="background: #2ecc71; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;"
                        >
                            Aceitar
                        </button>
                        <button 
                            @click="updateStatus(sub.id, 'rejected')" 
                            style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;"
                        >
                            Recusar / Apagar
                        </button>
                    </div>
                </div>
            </div>
        </main>
    `,
    data() {
        return {
            submissions: [],
            loading: true
        };
    },
    async mounted() {
        await this.fetchSubmissions();
    },
    methods: {
        async fetchSubmissions() {
            this.loading = true;
            try {
                // Busca apenas os recordes pendentes para moderação
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
        async updateStatus(id, newStatus) {
            try {
                if (newStatus === 'rejected') {
                    // Se recusar, podemos deletar direto ou mudar o status para rejected. Vamos deletar para limpar a base:
                    const { error } = await supabase
                        .from('submissions')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                } else {
                    // Se aceitar, muda o status para 'approved' para aparecer na List
                    const { error } = await supabase
                        .from('submissions')
                        .update({ status: 'approved' })
                        .eq('id', id);

                    if (error) throw error;
                }

                // Remove da lista da tela instantaneamente
                this.submissions = this.submissions.filter(s => s.id !== id);
                alert(newStatus === 'approved' ? 'Recorde aceito com sucesso!' : 'Recorde recusado e removido.');
            } catch (err) {
                alert('Erro ao atualizar status: ' + err.message);
            }
        }
    }
};
