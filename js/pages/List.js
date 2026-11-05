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
        <main v-else class="page-list">
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
                    
                    <!-- BOTÃO DE SUBMIT RECORD -->
                    <button class="submit-btn" @click="showSubmitModal = true">Submit Record</button>

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
                    
                    <!-- CARDS DE RECORDES -->
                    <div class="records-container" v-if="level.records && level.records.length">
                        <div 
                            v-for="(record, index) in level.records" 
                            :key="index" 
                            class="record-card"
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
                        </div>
                    </div>
                    <p v-else-if="selected + 1 <= 150">No records set yet.</p>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>

            <!-- MODAL DE ENVIO -->
            <div class="modal-overlay" v-if="showSubmitModal" @click.self="showSubmitModal = false">
                <div class="modal-content">
                    <h3>Submit Record - {{ level?.name }}</h3>
                    <form @submit.prevent="submitRecord">
                        <label>Teu Nick/Nome:</label>
                        <input type="text" v-model="form.user_name" required placeholder="Ex: Mamamia898">

                        <label>Porcentagem (%):</label>
                        <input type="number" v-model="form.percent" min="1" max="100" required placeholder="100">

                        <label>Link do Vídeo (YouTube):</label>
                        <input type="url" v-model="form.video_link" required placeholder="https://youtube.com/watch?v=...">

                        <label>FPS / Refresh Rate (Hz):</label>
                        <input type="number" v-model="form.hz" required placeholder="360">

                        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                            <input type="checkbox" v-model="form.mobile"> Jogou no Mobile?
                        </label>

                        <div class="modal-actions">
                            <button type="button" class="btn-cancel" @click="showSubmitModal = false">Cancelar</button>
                            <button type="submit" class="btn-submit" :disabled="submitting">
                                {{ submitting ? 'Enviando...' : 'Enviar Record' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

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
                    <p>
                        Passar o level de forma legitima sem uso de nenhum hack como TPS bypass e Clickbot
                    </p>
                    <p>
                        O vídeo precisa ter ou o áudio original do jogo ou os cliques/toques aparecendo. Só áudio editado não conta.
                    </p>
                    <p>
                        A gravação precisa mostrar o attempt anterior e a animação completa da morte antes do completion — a não ser que a completion tenha sido de primeira tentativa.
                    </p>
                    <p>
                        A gravação também precisa mostrar o jogador encostando no endwall — se não, o completion é invalidado.
                    </p>
                    <p>
                        Não use bug routes ou secret routes (rotas que facilitariam a completion do level)
                    </p>
                    <p>
                        Não use uma versão mais facil/nerfada — só vale record no level original, sem modificação.
                    </p>
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
        showSubmitModal: false,
        submitting: false,
        form: {
            user_name: '',
            percent: 100,
            video_link: '',
            hz: 60,
            mobile: false
        }
    }),
    computed: {
        level() {
            return this.list[this.selected][0];
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
        // Hide loading spinner
        this.list = await fetchList();
        this.editors = await fetchEditors();

        // Error handling
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
        async submitRecord() {
            this.submitting = true;
            try {
                const { error } = await supabase
                    .from('submissions')
                    .insert([
                        {
                            user_name: this.form.user_name,
                            level_id: String(this.level.id),
                            level_name: this.level.name,
                            percent: Number(this.form.percent),
                            video_link: this.form.video_link,
                            hz: Number(this.form.hz),
                            mobile: this.form.mobile,
                            status: 'pending'
                        }
                    ]);

                if (error) throw error;

                alert('Record enviado com sucesso! Aguarde a avaliação dos moderadores.');
                this.showSubmitModal = false;
                this.form = { user_name: '', percent: 100, video_link: '', hz: 60, mobile: false };
            } catch (err) {
                alert('Erro ao enviar record: ' + err.message);
            } finally {
                this.submitting = false;
            }
        }
    },
};
