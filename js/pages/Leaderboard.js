import {
    fetchLeaderboard,
    fetchCreatorLeaderboard,
} from '../content.js';
import { localize } from '../util.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
    leaderboard: [],
    creatorLeaderboard: [],
    mode: "players",
    loading: true,
    selected: 0,
    err: [],
    }),
    template: `
        <main v-if="loading">
    <Spinner></Spinner>
</main>

<main v-else class="leaderboard-page">

<div class="leaderboard-tabs">
    <button 
    :class="{ active: mode === 'players' }"
    @click="mode = 'players'; selected = 0">
    Players
</button>

<button 
    :class="{ active: mode === 'creators' }"
    @click="mode = 'creators'; selected = 0">
    Creators
</button>

</div>

<div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                <div class="board-container">
                    <table class="board">
                        <tr v-for="(ientry, i) in currentLeaderboard">
                            <td class="rank">
                                <p class="type-label-lg">#{{ i + 1 }}</p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': selected == i }">
                                <button @click="selected = i">
                                    <span class="type-label-lg">{{ ientry.user || ientry.creator }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
               <div class="player-container">

    <!-- PLAYER LEADERBOARD -->
    <div class="player" v-if="mode === 'players'">



        <!-- TODO O CONTEÚDO ANTIGO DE PLAYERS FICA AQUI -->

                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ entry.total }}</h3>
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                 </div>

    <!-- CREATOR LEADERBOARD -->
    <div class="player" v-else>

        <h1>
            #{{ selected + 1 }}
            {{ entry.creator }}
        </h1>

        <h3 class="type-label-lg">
            {{ entry.total }}
<img class="cp-icon" src="/assets/creator-point.png">
        </h3>

        <table class="table">

            <tr v-for="level in entry.levels">

                <td class="level">
                    <a
                        class="type-label-lg"
                        target="_blank"
                        :href="level.verification"
                    >
                        {{ level.level }}
                    </a>
                </td>

                <td>
    <span 
        class="rating type-body"
        :class="level.rating"
    >
        {{ level.rating }}
    </span>
</td>

                <td class="score creator-points type-body">
                    +{{ level.points }}
<img class="cp-icon" src="/assets/creator-point.png">
                </td>

            </tr>

        </table>

    </div>

</div>
                </div>
            </div>
        </main>

    `,
    computed: {
    currentLeaderboard() {
        return this.mode === "players"
            ? this.leaderboard
            : this.creatorLeaderboard;
    },

    entry() {
        return this.currentLeaderboard[this.selected];
    },
},
    async mounted() {
    const [leaderboard, err] = await fetchLeaderboard();

    this.leaderboard = leaderboard;
    this.err = err;

    this.creatorLeaderboard = await fetchCreatorLeaderboard();

    this.loading = false;
},
    methods: {
        localize,
    },
};
