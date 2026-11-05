export default {
    template: `
        <main class="page-mod">
            <div class="board-container" style="max-width: 800px; margin: 40px auto; padding: 20px;">
                <h1 class="type-title-lg" style="font-size: 2.5rem; margin-bottom: 20px;">Painel de Moderação</h1>
                <p class="type-label-md" style="color: var(--color-subtext, #aaa); margin-bottom: 20px;">
                    Painel exclusivo para moderadores verificados via Discord.
                </p>
                <div class="board" style="padding: 20px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <p>Você pode gerenciar e apagar os recordes diretamente ao passar o mouse por cima deles na página principal da <strong>List</strong>.</p>
                </div>
            </div>
        </main>
    `,
    data() {
        return {};
    }
};
