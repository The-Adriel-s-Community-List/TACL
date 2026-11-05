import { supabase } from "../supabase.js";
import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main class="page-mod">
            <div class="mod-container">
                <h2>Painel de Moderação - Recordes Pendentes</h2>
                
                <div v-if="loading" style="display: flex; justify-content: center; padding: 40px;">
                    <Spinner></Spinner>
                </div>

                <div v-else-if="submissions.length === 0" class="no-submissions">
                    <p>Não há recordes pendentes para analisar no momento! 🎉</p>
                </div>

                <div v-else class="submissions-grid">
                    <div v-for="sub in submissions" :key="sub.id" class="submission-card">
                        <div class="sub-header">
                            <span class="sub-level">{{ sub.level_name }}</span>
                            <span class="sub-percent">{{ sub.percent }}%</span>
                        </div>
                        <div class="sub-body">
                            <p><strong>Jogador:</strong> {{ sub.user_name }}</p>
                            <p><strong>Hz:</strong> {{ sub.hz }}Hz {{ sub.mobile ? '(Mobile)' : '(PC)' }}</p>
                            <p><strong>Vídeo:</strong> <a :href="sub.video_link" target="_blank" class="sub-link">Assistir Prova (YouTube)</a></p>
                            <p class="sub-date">Enviado em: {{ new Date(sub.created_at).toLocaleString() }}</p>
                        </div>
                        <div class="sub-actions">
                            <button class="btn-reject" @click="updateStatus(sub.id, 'rejected')">Recusar</button>
                            <button class="btn-approve" @click="updateStatus(sub.id, 'approved')">Aprovar</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        submissions: [],
        loading: true,
    }),
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
                    .order('created_at', { ascending: false });

                if (error) throw error;
                this.submissions = data || [];
            } catch (err) {
                alert('Erro ao carregar submissões: ' + err.message);
            } finally {
                this.loading = false;
            }
        },
        async updateStatus(id, newStatus) {
            try {
                const { error } = await supabase
                    .from('submissions')
                    .update({ status: newStatus })
                    .eq('id', id);

                if (error) throw error;

                // Remove da lista visual
                this.submissions = this.submissions.filter(sub => sub.id !== id);
                alert(newStatus === 'approved' ? 'Recorde aprovado com sucesso!' : 'Recorde recusado.');
            } catch (err) {
                alert('Erro ao atualizar status: ' + err.message);
            }
        }
    }
};
