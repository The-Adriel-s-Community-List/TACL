import { supabase } from "../supabase.js";
import { fetchList } from "../content.js";
import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main class="page-submit">
            <div class="submit-container">
                <h2>Enviar Recorde</h2>
                <p class="submit-subtitle">Preencha os dados abaixo para enviar o seu recorde para a lista.</p>

                <div v-if="loading" style="display: flex; justify-content: center; padding: 40px;">
                    <Spinner></Spinner>
                </div>

                <form v-else @submit.prevent="submitRecord" class="submit-form">
                    <label>Seu Nick/Nome:</label>
                    <input type="text" v-model="form.user_name" required placeholder="Ex: Mamamia898">

                    <label>Selecione o Nível:</label>
                    <select v-model="selectedLevelIndex" required>
                        <option disabled value="">Escolha um nível...</option>
                        <option v-for="([level, _], index) in list" :key="index" :value="index">
                            #{{ index + 1 }} - {{ level.name }}
                        </option>
                    </select>

                    <label>Porcentagem (%):</label>
                    <input type="number" v-model="form.percent" min="1" max="100" required placeholder="100">

                    <label>Link do Vídeo (YouTube):</label>
                    <input type="url" v-model="form.video_link" required placeholder="https://youtube.com/watch?v=...">

                    <label>FPS / Refresh Rate (Hz):</label>
                    <input type="number" v-model="form.hz" required placeholder="360">

                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
                        <input type="checkbox" v-model="form.mobile"> Jogou no Mobile?
                    </label>

                    <button type="submit" class="btn-submit-record" :disabled="submitting">
                        {{ submitting ? 'Enviando...' : 'Enviar Recorde' }}
                    </button>
                </form>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        loading: true,
        submitting: false,
        selectedLevelIndex: '',
        form: {
            user_name: '',
            percent: 100,
            video_link: '',
            hz: 60,
            mobile: false
        }
    }),
    async mounted() {
        this.list = await fetchList();
        this.loading = false;
    },
    methods: {
        async submitRecord() {
            if (this.selectedLevelIndex === '') {
                alert('Por favor, selecione um nível.');
                return;
            }

            const levelData = this.list[this.selectedLevelIndex][0];

            this.submitting = true;
            try {
                const { error } = await supabase
                    .from('submissions')
                    .insert([
                        {
                            user_name: this.form.user_name,
                            level_id: String(levelData.id),
                            level_name: levelData.name,
                            percent: Number(this.form.percent),
                            video_link: this.form.video_link,
                            hz: Number(this.form.hz),
                            mobile: this.form.mobile,
                            status: 'pending'
                        }
                    ]);

                if (error) throw error;

                alert('Recorde enviado com sucesso! Aguarde a avaliação dos moderadores.');
                // Limpar formulário
                this.form = { user_name: '', percent: 100, video_link: '', hz: 60, mobile: false };
                this.selectedLevelIndex = '';
            } catch (err) {
                alert('Erro ao enviar recorde: ' + err.message);
            } finally {
                this.submitting = false;
            }
        }
    }
};
