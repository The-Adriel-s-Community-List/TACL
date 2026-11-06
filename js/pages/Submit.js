import { supabase } from "../supabase.js";
import { fetchList } from "../content.js";
import Spinner from "../components/Spinner.js";
import { store } from "../main.js";

export default {
    components: { Spinner },
    template: `
        <div style="padding: 40px; max-width: 600px; margin: 0 auto; color: #fff;">
            <h2>Enviar Recorde</h2>
            <p style="opacity: 0.7; margin-bottom: 20px;">Preencha os dados abaixo para enviar o seu recorde.</p>

            <div v-if="loading">
                <Spinner></Spinner>
            </div>

            <form v-else @submit.prevent="submitRecord" style="display: flex; flex-direction: column; gap: 12px; background: #18181b; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <label>Seu Nick/Nome:</label>
                <input type="text" v-model="form.user_name" required placeholder="Ex: Mamamia898" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;">

                <label>Selecione o Nível:</label>
                <select v-model="selectedLevelIndex" @change="onLevelChange" required style="background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;">
                    <option disabled value="">Escolha um nível...</option>
                    <option v-for="([level, _], index) in list" :key="index" :value="index">
                        #{{ index + 1 }} - {{ level.name }} (Mín: {{ level.percentToQualify }}%)
                    </option>
                </select>

                <label>Porcentagem (%): <span v-if="currentMinPercent > 0" style="font-size: 0.85rem; color: #38bdf8;">(Mínimo exigido: {{ currentMinPercent }}%)</span></label>
                <input type="number" v-model="form.percent" :min="currentMinPercent" max="100" required placeholder="100" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;">

                <label>Link do Vídeo (YouTube):</label>
                <input type="url" v-model="form.video_link" required placeholder="https://youtube.com/watch?v=..." style="background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;">

                <label>FPS / Refresh Rate (Hz):</label>
                <input type="number" v-model="form.hz" required placeholder="360" style="background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;">

                <label style="display: flex; align-items: center; gap: 8px; margin-top: 10px; cursor: pointer;">
                    <input type="checkbox" v-model="form.mobile"> Jogou no Mobile?
                </label>

                <button type="submit" :disabled="submitting" style="background: #3b82f6; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px;">
                    {{ submitting ? 'Enviando...' : 'Enviar Recorde' }}
                </button>
            </form>
        </div>
    `,
    data: () => ({
        list: [],
        loading: true,
        submitting: false,
        selectedLevelIndex: '',
        currentMinPercent: 100,
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
        if (store.profile?.display_name) {
            this.form.user_name = store.profile.display_name;
        }
        this.loading = false;
    },
    methods: {
        onLevelChange() {
            if (this.selectedLevelIndex !== '') {
                const levelData = this.list[this.selectedLevelIndex][0];
                // Pega a porcentagem mínima do nível (geralmente percentToQualify, ex: 80)
                this.currentMinPercent = levelData.percentToQualify || 100;
                // Se a porcentagem atual for menor que o mínimo, ajusta automaticamente para facilitar
                if (this.form.percent < this.currentMinPercent) {
                    this.form.percent = this.currentMinPercent;
                }
            }
        },
        async submitRecord() {
            if (this.selectedLevelIndex === '') {
                alert('Por favor, selecione um nível.');
                return;
            }

            const levelData = this.list[this.selectedLevelIndex][0];
            const minPercent = levelData.percentToQualify || 100;

            // Validação dupla por segurança (caso tentem burlar o HTML)
            if (Number(this.form.percent) < minPercent) {
                alert(`A porcentagem mínima para este nível (${levelData.name}) é de ${minPercent}%.`);
                return;
            }

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
                this.form = { user_name: '', percent: 100, video_link: '', hz: 60, mobile: false };
                this.selectedLevelIndex = '';
                this.currentMinPercent = 100;
            } catch (err) {
                alert('Erro ao enviar recorde: ' + err.message);
            } finally {
                this.submitting = false;
            }
        }
    }
};
