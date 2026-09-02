export default {
    props: ['author', 'creators', 'verifier'],
    template: `
        <div class="level-authors">
            <!-- CREATORS (Topo - Esquerda) -->
            <div class="author-card" v-if="creators && creators.length">
                <span class="author-role">Creators</span>
                <span class="author-name">{{ creators.join(', ') }}</span>
            </div>
            <div class="author-card" v-else-if="author">
                <span class="author-role">Creator</span>
                <span class="author-name">{{ author }}</span>
            </div>

            <!-- PUBLISHER (Topo - Direita) -->
            <div class="author-card" v-if="author && creators && creators.length">
                <span class="author-role">Publisher</span>
                <span class="author-name">{{ author }}</span>
            </div>

            <!-- VERIFIER (Embaixo - Ocupa as 2 colunas) -->
            <div class="author-card verifier-card" v-if="verifier">
                <span class="author-role">Verifier</span>
                <span class="author-name">{{ verifier }}</span>
            </div>
        </div>
    `,
};