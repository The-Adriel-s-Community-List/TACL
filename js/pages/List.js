import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";
import { supabase } from "../supabase.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list custom-layout" :class="{ 'hide-left': leftCollapsed, 'hide-right': rightCollapsed }">
            
            <!-- BOTÃO FLUTUANTE ESQUERDO -->
            <button @click="leftCollapsed = !leftCollapsed" class="floating-toggle left-btn" :title="leftCollapsed ? 'Expandir Lista' : 'Minimizar Lista'">
                ☰
            </button>

            <!-- COLUNA ESQUERDA: LISTA DE NÍVEIS -->
            <div class="sidebar-wrapper left-sidebar">
                <div class="list-container">
                    <table class="list" v-if="list">
                        <tr v-for="([level, err], i) in list" :key="i">
                            <td class="rank">
                                <p v-if="i + 1 <= 75" class="type-label-lg">#{{ i + 1 }}</p>
                                <p v-else class="type-label-lg">Legacy</p>
                            </td>
                            <td class="level" :class="[{ 'active': selected == i, 'error': !level }, level?.rating ? \`rating-\${level.rating.toLowerCase()}\` : '']">
                                <button @click="selected = i">
                                    <span class="type-label-lg level-name-text">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                                    <span v-if="level?.rating" :class="['rating-badge', \`badge-\${level.rating.toLowerCase()}\`]">
                                        {{ level.rating }}
                                    </span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- COLUNA CENTRAL: DETALHES DO NÍVEL E VÍDEO -->
            <div class="level-container">
                <div class="level" v-if="level">
                    <div class="level-header">
                        <div class="title-rating-wrapper">
                            <h1 :class="level.rating ? \`title-\${level.rating.toLowerCase()}\` : ''">{{ level.name }}</h1>
                            <span v-if="level.rating" :class="['main-rating-tag', \`tag-rating-\${level.rating.toLowerCase()}\`]">
                                {{ level.rating }}
                            </span>
                        </div>
                        <div class="level-tags" v-if="level.tags && level.tags.length">
                            <span 
                                v-for="(tag, index) in level.tags" 
                                :key="index" 
                                :class="['level-tag', \`tag-\${tag.toLowerCase().replace(/\\s+/g, '-')}\`]"
                            >
                                {{ tag }}
                            </span>
                        </div>
                    </div>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                    <h2>Records</h2>
                    <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected + 1 <= 150"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    
                    <!-- CARDS DE RECORDES COM LIXEIRA PARA MODS -->
                    <div class="records-container" v-if="level.records && level.records.length">
                        <div 
                            v-for="(record, index) in level.records" 
                            :key="record.id || index" 
                            class="record-card"
                            @mouseenter="hoveredIndex = index"
                            @mouseleave="hoveredIndex = null"
                            style="position: relative;"
                        >
                            <div class="record-left">
                                <span class="record-percent">{{ record.percent }}%</span>
                                <a :href="record.link" target="_blank" class="record-user">{{ record.user }}</a>
                                <span v-if="index === 0" class="first-victor-tag">FIRST VICTOR</span>
                            </div>
                            <div class="record-right">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile" class="record-mobile">
                                <span class="record-hz">{{ record.hz }}Hz</span>
                            </div>

                            <button 
                                v-if="store.isMod && hoveredIndex === index" 
                                @click.stop="deleteRecord(record)"
                                title="Apagar Recorde"
                                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: #ff4757; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold; z-index: 10;"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                    <p v-else-if="selected + 1 <= 150">No records set yet.</p>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>

            <!-- BOTÃO FLUTUANTE DIREITO -->
            <button @click="rightCollapsed = !rightCollapsed" class="floating-toggle right-btn" :title="rightCollapsed ? 'Expandir Painel' : 'Minimizar Painel'">
                ☰
            </button>

            <!-- COLUNA DIREITA: EDITORES E INSTRUÇÕES -->
            <div class="sidebar-wrapper right-sidebar">
                <div class="meta-container">
                    <div class="meta">
                        <div class="errors" v-show="errors.length > 0">
                            <p class="error" v-for="error of errors">{{ error }}</p>
                        </div>
                        <div class="og">
                            <p class="type-label-md">Website layout made by <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a></p>
                        </div>
                        <template v-if="editors">
                            <h3>List Editors</h3>
                            <ol class="editors">
                                <li v-for="editor in editors">
                                    <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                    <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                    <p v-else>{{ editor.name }}</p>
                                </li>
                            </ol>
                        </template>
                        <h3>Instruções de envio</h3>
                        <p>Passar o level de forma legitima sem uso de nenhum hack como TPS bypass e Clickbot</p>
                        <p>O vídeo precisa ter ou o áudio original do jogo ou os cliques/toques aparecendo. Só áudio editado não conta.</p>
                        <p>A gravação precisa mostrar o attempt anterior e a animação completa da morte antes do completion — a não ser que a completion tenha sido de primeira tentativa.</p>
                        <p>A gravação também precisa mostrar o jogador encostando no endwall — se não, o completion é invalidado.</p>
                        <p>Não use bug routes ou secret routes (rotas que facilitariam a completion do level)</p>
                        <p>Não use uma versão mais facil/nerfada — só vale record no level original, sem modificação.</p>
                    </div>
                </div>
            </div>

        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        roleIconMap,
        store,
        hoveredIndex: null,
        approvedSubmissions: {},
        leftCollapsed: false,
        rightCollapsed: true // Já inicia minimizado
    }),
    computed: {
        level() {
            const currentLevel = this.list[this.selected]?.[0];
            if (!currentLevel) return null;

            let mergedLevel = { ...currentLevel };
            const approvedFromDb = this.approvedSubmissions[String(mergedLevel.id)] || [];
            
            mergedLevel.records = [
                ...(mergedLevel.records || []),
                ...approvedFromDb
            ];

            return mergedLevel;
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();
        
        await this.fetchApprovedSubmissions();

        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        score,
        async fetchApprovedSubmissions() {
            try {
                const { data, error } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('status', 'approved');

                if (error) throw error;

                let map = {};
                if (data) {
                    data.forEach(sub => {
                        if (!map[sub.level_id]) {
                            map[sub.level_id] = [];
                        }
                        map[sub.level_id].push({
                            id: sub.id,
                            user: sub.user_name,
                            percent: sub.percent,
                            link: sub.video_link,
                            hz: sub.hz,
                            mobile: sub.mobile
                        });
                    });
                }
                this.approvedSubmissions = map;
            } catch (err) {
                console.error('Erro ao buscar recordes aprovados:', err.message);
            }
        },
        async deleteRecord(record) {
            if (!record.id) {
                alert('Este recorde faz parte do arquivo estático e não pode ser apagado por aqui.');
                return;
            }

            if (!confirm(`Tem certeza de que deseja apagar o recorde de ${record.user} (${record.percent}%)?`)) return;

            try {
                const { error } = await supabase
                    .from('submissions')
                    .delete()
                    .eq('id', record.id);

                if (error) throw error;

                const levelIdStr = String(this.level.id);
                if (this.approvedSubmissions[levelIdStr]) {
                    this.approvedSubmissions[levelIdStr] = this.approvedSubmissions[levelIdStr].filter(r => r.id !== record.id);
                }

                alert('Recorde apagado com sucesso!');
            } catch (err) {
                alert('Erro ao apagar recorde: ' + err.message);
            }
        }
    },
};
