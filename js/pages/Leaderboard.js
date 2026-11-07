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
                            <td class="cp">

    <template v-if="mode === 'creators'">
        <div class="cp-total">
            <span class="type-label-lg">{{ ientry.total }}</span>
            <img src="/assets/creator-point.png" class="cp-icon">
        </div>
    </template>

    <template v-else>
        <p class="type-label-lg">{{ localize(ientry.total) }}</p>
    </template>

</td>
                            <td class="user" :class="{ 'active': selected == i }">
                                <button @click="selected = i" style="display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 14px; background: transparent; border: none; cursor: pointer; border-radius: 0.5rem; box-sizing: border-box;">
                                    <img 
                                        v-if="ientry.avatar_url"
                                        :src="ientry.avatar_url" 
                                        style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1.5px solid #5865F2; flex-shrink: 0;"
                                        alt=""
                                    />
                                    <div style="display: flex; flex-direction: column; min-width: 0; overflow: visible;">
                                        <span class="type-label-lg" style="color: #fff; line-height: 1.3; overflow: visible; word-break: normal;">{{ ientry.display_name || ientry.user || ientry.creator }}</span>
                                        <span v-if="ientry.is_activated && ientry.display_name && ientry.user && ientry.display_name !== ientry.user" style="font-size: 0.75rem; color: #888; margin-top: 2px;">
                                            @{{ ientry.user }}
                                        </span>
                                    </div>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
               <div class="player-container">

    <!-- PLAYER LEADERBOARD -->
    <div class="player" v-if="mode === 'players'">

        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
            <img 
                v-if="entry.avatar_url"
                :src="entry.avatar_url" 
                style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #5865F2; background: #27272a; flex-shrink: 0;"
                alt=""
            />
            <div>
                <h1 style="margin: 0; font-size: 1.85rem;">#{{ selected + 1 }} {{ entry.display_name || entry.user }}</h1>
                <p v-if="entry.is_activated && entry.display_name && entry.display_name !== entry.user" style="margin: 4px 0 0 0; color: #aaa; font-size: 0.9rem;">
                    Nick original: <strong style="color: #fff;">@{{ entry.user }}</strong>
                </p>
            </div>
        </div>

        <h3>{{ entry.total }} pts</h3>
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

        <div class="creator-header" style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">

            <div style="display: flex; align-items: center; gap: 16px;">
                <img 
                    v-if="entry.avatar_url"
                    :src="entry.avatar_url" 
                    style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2.5px solid #5865F2; background: #27272a; flex-shrink: 0;"
                    alt=""
                />
                <div>
                    <h1 style="margin: 0; font-size: 1.85rem;">#{{ selected + 1 }} {{ entry.display_name || entry.creator }}</h1>
                    <p v-if="entry.is_activated && entry.display_name && entry.display_name !== entry.creator" style="margin: 4px 0 0 0; color: #aaa; font-size: 0.9rem;">
                        Nick original: <strong style="color: #fff;">@{{ entry.creator }}</strong>
                    </p>
                </div>
            </div>

            <div class="creator-cp">
                <span class="type-label-lg">
                    {{ entry.total }}
                </span>
                <img
                    class="cp-icon"
                    src="/assets/creator-point.png"
                >
            </div>

        </div>

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
