import { supabase } from '../supabase.js';

export default {
    template: `
        <main class="page-mod">
            <div class="table-container" style="max-width: 900px; margin: 40px auto; padding: 20px;">
                <h1 style="font-size: 2rem; margin-bottom: 20px; font-weight: bold;">Painel de Moderação</h1>
                <p style="color: #aaa; margin-bottom: 30px;">Gerencie e remova recordes inválidos ou hackeados passando o cursor sobre eles.</p>

                <div v-if="loading" style="text-align: center; padding: 40px;">
                    <p>A carregar recordes...</p>
                </div>

                <div v-else-if="records.length === 0" style="text-align: center; padding: 40px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                    <p>Nenhum recorde encontrado.</p>
                </div>

                <div v-else style="display: flex; flex-direction: column; gap: 10px;">
                    <!-- Cada item da lista com efeito hover para mostrar a lixeira -->
                    <div 
                        v-for="record in records" 
                        :key="record.id" 
                        class="record-item"
                        style="position: relative; display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); transition: background 0.2s;"
                    >
                        <div>
                            <strong style="font-size: 1.1rem; color: #fff;">{{ record.player }}</strong> 
                            <span style="color: #ccc; margin-left: 8px;">completou</span> 
                            <span style="color: #5865F2; font-weight: bold;">{{ record.level }}</span> 
                            <span style="background: rgba(88, 101, 242, 0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; margin-left: 10px;">{{ record.percent }}%</span>
                        </div>

                        <!-- Botão da lixeira (aparece ou fica pronto no hover) -->
                        <button 
                            @click="deleteRecord(record.id)" 
                            title="Apagar recorde"
                            style="background: #ff4757; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: opacity 0.2s;"
                        >
                            🗑️ Apagar
                        </button>
                    </div>
                </div>
            </div>
        </main>
    `,
    data() {
        return {
            records: [],
            loading: true
        };
    },
    async mounted() {
        await this.fetchRecords();
    },
    methods: {
        async fetchRecords() {
            this.loading = true;
            // Altere 'records' para o nome exato da sua tabela de recordes no Supabase se for diferente
            const { data, error } = await supabase
                .from('records')
                .select('*')
                .order('id', { ascending: false });

            if (error) {
                console.error('Erro ao buscar recordes:', error.message);
            } else {
                this.records = data || [];
            }
            this.loading = false;
        },
        async deleteRecord(id) {
            if (!confirm('Tem certeza de que deseja apagar este recorde permanentemente?')) return;

            const { error } = await supabase
                .from('records')
                .delete()
                .eq('id', id);

            if (error) {
                alert('Erro ao apagar o recorde: ' + error.message);
            } else {
                // Remove da lista instantaneamente na tela sem precisar recarregar
                this.records = this.records.filter(r => r.id !== id);
            }
        }
    }
};
