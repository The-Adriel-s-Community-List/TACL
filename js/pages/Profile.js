import { auth } from '../auth.js';
import { supabase } from '../supabase.js';
import { store } from '../main.js';
import { fetchLeaderboard } from '../content.js';
import { localize } from '../util.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    template: `
        <div style="min-height: 85vh; padding: 40px 20px; box-sizing: border-box; background: var(--bg, #18181b); color: #fff;">
            <div style="max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px;">
                
                <!-- CABEÇALHO DO PERFIL -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <img 
                            :src="currentAvatar" 
                            alt="Avatar" 
                            style="width: 82px; height: 82px; border-radius: 50%; object-fit: cover; border: 3px solid #5865F2; background: #27272a;"
                        />
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <h1 style="font-size: 1.85rem; font-weight: bold; margin: 0;">{{ currentDisplayName }}</h1>
                                <span v-if="store.isMod" style="background: #ff4757; color: #fff; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: bold;">
                                    MODERADOR
                                </span>
                                <span v-if="officialStats" style="background: rgba(88, 101, 242, 0.2); border: 1px solid #5865F2; color: #a5b4fc; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; font-weight: bold;">
                                    #{{ officialStats.rank }} NO RANKING ({{ localize(officialStats.total) }} pts)
                                </span>
                            </div>
                            <p style="color: #888; font-size: 0.9rem; margin-top: 4px; margin-bottom: 0;">
                                {{ userHandle }}
                                <span v-if="account?.discord_username" style="margin-left: 10px; color: #818cf8;">
                                    • Discord: @{{ account.discord_username }}
                                </span>
                            </p>
                        </div>
                    </div>

                    <button 
                        @click="handleLogout" 
                        style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #ccc; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: bold; transition: all 0.2s;"
                    >
                        Sair da Conta
                    </button>
                </div>

                <!-- ALERTA DE SENHA TEMPORÁRIA PENDENTE -->
                <div v-if="hasTempPassword" style="background: rgba(234, 179, 8, 0.15); border: 1px solid #eab308; color: #fef08a; padding: 16px 20px; border-radius: 10px; font-size: 0.95rem; line-height: 1.5;">
                    ⚠️ <strong>Você está usando a senha provisória de migração!</strong><br>
                    Por favor, altere sua senha no bloco <strong>Segurança da Conta</strong> abaixo para manter sua conta protegida.
                </div>

                <!-- ALERTA DE SUCESSO / ERRO -->
                <div v-if="feedback.text" :style="{
                    background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid ' + (feedback.type === 'success' ? '#22c55e' : '#ef4444'),
                    color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                }">
                    {{ feedback.text }}
                </div>

                <!-- CARDS DE CONFIGURAÇÃO DO PERFIL -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                    
                    <!-- 1. EDIÇÃO DE DADOS (NICK E FOTO) -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <h2 style="font-size: 1.25rem; font-weight: bold; margin: 0;">Editar Perfil</h2>
                            <p style="color: #888; font-size: 0.85rem; margin-top: 4px; margin-bottom: 0;">Altere seu nome e foto (aparecerão na Leaderboard!).</p>
                        </div>

                        <!-- PREVIEW E UPLOAD DE IMAGEM -->
                        <div style="display: flex; align-items: center; gap: 14px; padding: 12px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                            <img 
                                :src="form.avatar_url || currentAvatar" 
                                style="width: 58px; height: 58px; border-radius: 50%; object-fit: cover; border: 2px solid #5865F2; background: #27272a; flex-shrink: 0;"
                                alt="Preview"
                            />
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <label style="background: #3b82f6; color: #fff; padding: 7px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; width: fit-content;">
                                    <span>📁</span>
                                    <span>{{ uploadingAvatar ? 'Enviando...' : 'Fazer Upload de Foto' }}</span>
                                    <input 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/webp, image/gif" 
                                        @change="handleFileUpload" 
                                        :disabled="uploadingAvatar"
                                        style="display: none;" 
                                    />
                                </label>
                                <span style="font-size: 0.75rem; color: #888;">PNG, JPG, WebP ou GIF do seu dispositivo</span>
                            </div>
                        </div>

                        <form @submit.prevent="saveProfile" style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px;">Nome de Jogador na Leaderboard:</label>
                                <input 
                                    type="text" 
                                    v-model="form.display_name" 
                                    required 
                                    placeholder="Ex: Sophia ou sophiz"
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px;">Ou Link Direto da Imagem (URL):</label>
                                <input 
                                    type="url" 
                                    v-model="form.avatar_url" 
                                    placeholder="https://exemplo.com/foto.png" 
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                                />
                            </div>

                            <button 
                                type="submit" 
                                :disabled="savingProfile || uploadingAvatar" 
                                style="background: #10b981; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 4px;"
                            >
                                {{ savingProfile ? 'Salvando...' : 'Salvar Alterações do Perfil' }}
                            </button>
                        </form>
                    </div>

                    <!-- 2. CONEXÃO DISCORD -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 14px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <img src="/assets/discord.svg" style="width: 22px; height: 22px;" alt="Discord">
                                <h2 style="font-size: 1.25rem; font-weight: bold; margin: 0;">Conexão Discord</h2>
                            </div>
                            <p style="color: #888; font-size: 0.85rem; line-height: 1.4; margin-top: 4px; margin-bottom: 0;">
                                O bot avisará na sua <strong>DM do Discord</strong> quando seu recorde for aprovado ou recusado pela moderação.
                            </p>
                        </div>

                        <!-- STATUS DA CONEXÃO -->
                        <div style="padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.85rem; color: #aaa;">Status:</span>
                                <span :style="{
                                    color: isDiscordLinked ? '#22c55e' : '#f59e0b',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem'
                                }">
                                    {{ isDiscordLinked ? '● Conectado' : '○ Não conectado' }}
                                </span>
                            </div>
                            <div v-if="account?.discord_username" style="font-size: 0.85rem; color: #e2e8f0; margin-top: 6px;">
                                Tag / Usuário: <strong>{{ account.discord_username }}</strong>
                            </div>
                            <div v-if="account?.discord_id" style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                                ID Discord: {{ account.discord_id }}
                            </div>
                        </div>

                        <!-- FORMULÁRIO DE VÍNCULO MANUAL / DIRETO -->
                        <form @submit.prevent="saveDiscordManual" style="display: flex; flex-direction: column; gap: 10px;">
                            <div>
                                <label style="display: block; font-size: 0.8rem; color: #aaa; margin-bottom: 4px;">
                                    Seu Usuário no Discord:
                                </label>
                                <input 
                                    type="text" 
                                    v-model="form.discord_username" 
                                    placeholder="Ex: sophiz ou sophiz#0000" 
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 8px 10px; border-radius: 6px; font-size: 0.85rem;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.8rem; color: #aaa; margin-bottom: 4px;">
                                    ID do Discord (Snowflake):
                                </label>
                                <input 
                                    type="text" 
                                    v-model="form.discord_id" 
                                    placeholder="Ex: 849201948291049281" 
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 8px 10px; border-radius: 6px; font-size: 0.85rem;"
                                />
                                <span style="font-size: 0.72rem; color: #71717a; margin-top: 2px; display: block;">
                                    (Ative o Modo Desenvolvedor no Discord e clique com botão direito no seu perfil -> Copiar ID)
                                </span>
                            </div>

                            <button 
                                type="submit" 
                                :disabled="savingDiscord" 
                                style="background: #10b981; color: #fff; border: none; padding: 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; cursor: pointer;"
                            >
                                {{ savingDiscord ? 'Salvando...' : 'Salvar Dados do Discord' }}
                            </button>
                        </form>

                        <div style="text-align: center; font-size: 0.75rem; color: #666; margin: 2px 0;">OU</div>

                        <!-- BOTÃO OAUTH VIA POP-UP -->
                        <button 
                            @click="linkDiscordOAuth" 
                            type="button" 
                            style="background: #5865F2; color: #fff; border: none; padding: 9px 14px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;"
                        >
                            <img src="/assets/discord.svg" style="width: 16px; height: 16px;" alt="">
                            Vincular via Pop-up do Discord
                        </button>
                    </div>

                    <!-- 3. ALTERAÇÃO DE SENHA -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <h2 style="font-size: 1.25rem; font-weight: bold; margin: 0;">Segurança da Conta</h2>
                            <p style="color: #888; font-size: 0.85rem; margin-top: 4px; margin-bottom: 0;">
                                Altere sua senha para proteger seu acesso.
                            </p>
                        </div>

                        <form @submit.prevent="changePassword" style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px;">Nova Senha:</label>
                                <input 
                                    type="password" 
                                    v-model="newPassword" 
                                    required 
                                    minlength="4" 
                                    placeholder="Mínimo 4 caracteres" 
                                    style="width: 100%; box-sizing: border-box; background: #27272a; border: 1px solid #3f3f46; color: #fff; padding: 10px; border-radius: 6px;"
                                />
                            </div>

                            <button 
                                type="submit" 
                                :disabled="savingPassword" 
                                style="background: #3b82f6; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;"
                            >
                                {{ savingPassword ? 'Atualizando...' : 'Definir Nova Senha' }}
                            </button>
                        </form>
                    </div>

                </div>

                <!-- SEÇÃO CENTRAL: RECORDES E PROGRESSOS -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 26px;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
                        <div>
                            <h2 style="font-size: 1.4rem; font-weight: bold; margin: 0;">Meus Recordes & Envios</h2>
                            <p style="color: #888; font-size: 0.85rem; margin-top: 4px; margin-bottom: 0;">
                                Conquistas registradas na lista e submissões enviadas para moderação.
                            </p>
                        </div>

                        <!-- ABAS DE NAVEGAÇÃO DOS RECORDES -->
                        <div style="display: flex; gap: 8px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 8px;">
                            <button 
                                @click="activeTab = 'official'" 
                                :style="{
                                    background: activeTab === 'official' ? '#5865F2' : 'transparent',
                                    color: activeTab === 'official' ? '#fff' : '#aaa',
                                    border: 'none',
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }"
                            >
                                Recordes na Lista ({{ totalOfficialRecords }})
                            </button>
                            <button 
                                @click="activeTab = 'submissions'" 
                                :style="{
                                    background: activeTab === 'submissions' ? '#5865F2' : 'transparent',
                                    color: activeTab === 'submissions' ? '#fff' : '#aaa',
                                    border: 'none',
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }"
                            >
                                Submissões Recentes ({{ userSubmissions.length }})
                            </button>
                            <router-link to="/submit" style="background: rgba(255,255,255,0.1); color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center;">
                                + Enviar Novo
                            </router-link>
                        </div>
                    </div>

                    <!-- LOADING -->
                    <div v-if="loadingRecords" style="text-align: center; padding: 40px;">
                        <Spinner></Spinner>
                        <p style="color: #aaa; margin-top: 10px;">Carregando recordes do jogador...</p>
                    </div>

                    <!-- CONTEÚDO DA ABA 1: RECORDES OFICIAIS NA LISTA -->
                    <div v-else-if="activeTab === 'official'">
                        
                        <!-- RESUMO DE PONTUAÇÃO -->
                        <div v-if="officialStats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <div style="background: rgba(88, 101, 242, 0.1); border: 1px solid rgba(88, 101, 242, 0.3); border-radius: 10px; padding: 16px;">
                                <div style="color: #a5b4fc; font-size: 0.85rem; text-transform: uppercase; font-weight: bold;">Posição no Rank</div>
                                <div style="font-size: 1.8rem; font-weight: bold; margin-top: 4px; color: #fff;">#{{ officialStats.rank }}</div>
                            </div>
                            <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 10px; padding: 16px;">
                                <div style="color: #86efac; font-size: 0.85rem; text-transform: uppercase; font-weight: bold;">Pontos Totais</div>
                                <div style="font-size: 1.8rem; font-weight: bold; margin-top: 4px; color: #fff;">{{ localize(officialStats.total) }} pts</div>
                            </div>
                            <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 16px;">
                                <div style="color: #7dd3fc; font-size: 0.85rem; text-transform: uppercase; font-weight: bold;">Níveis Concluídos</div>
                                <div style="font-size: 1.8rem; font-weight: bold; margin-top: 4px; color: #fff;">{{ officialStats.completed?.length || 0 }}</div>
                            </div>
                        </div>

                        <!-- SE NÃO TIVER NENHUM RECORDE OFICIAL -->
                        <div v-if="totalOfficialRecords === 0" style="text-align: center; padding: 40px 20px; background: rgba(0,0,0,0.2); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.1);">
                            <p style="color: #aaa; font-size: 1rem; margin-bottom: 12px;">
                                Nenhum recorde oficial encontrado na leaderboard para o jogador <strong>{{ currentDisplayName }}</strong>.
                            </p>
                            <p style="color: #666; font-size: 0.85rem; margin-bottom: 20px;">
                                Se você completou algum nível da lista, envie seu recorde com o vídeo de comprovação!
                            </p>
                            <router-link to="/submit" style="background: #5865F2; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">
                                Submeter Meu Primeiro Recorde
                            </router-link>
                        </div>

                        <!-- LISTAGEM DOS RECORDES OFICIAIS -->
                        <div v-else style="display: flex; flex-direction: column; gap: 20px;">
                            
                            <!-- COMPLETED (100%) -->
                            <div v-if="officialStats?.completed && officialStats.completed.length > 0">
                                <h3 style="font-size: 1.15rem; font-weight: bold; color: #4ade80; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                    <span>✓</span> Níveis Concluídos ({{ officialStats.completed.length }})
                                </h3>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    <div 
                                        v-for="rec in officialStats.completed" 
                                        :key="rec.level" 
                                        style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 12px;"
                                    >
                                        <div style="display: flex; align-items: center; gap: 14px;">
                                            <span style="background: rgba(255,255,255,0.08); color: #aaa; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem;">
                                                #{{ rec.rank }}
                                            </span>
                                            <div>
                                                <a 
                                                    :href="rec.link" 
                                                    target="_blank" 
                                                    style="font-size: 1.05rem; font-weight: bold; color: #fff; text-decoration: none; transition: color 0.2s;"
                                                    onmouseover="this.style.color='#38bdf8'" 
                                                    onmouseout="this.style.color='#fff'"
                                                >
                                                    {{ rec.level }} ↗
                                                </a>
                                                <span style="color: #4ade80; font-weight: bold; margin-left: 8px; font-size: 0.9rem;">100%</span>
                                            </div>
                                        </div>

                                        <div style="display: flex; align-items: center; gap: 16px;">
                                            <span style="color: #a5b4fc; font-weight: bold; font-size: 0.95rem;">
                                                +{{ localize(rec.score) }} pts
                                            </span>
                                            <a 
                                                :href="rec.link" 
                                                target="_blank" 
                                                style="background: rgba(88, 101, 242, 0.15); color: #818cf8; text-decoration: none; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;"
                                            >
                                                Vídeo Prova
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- VERIFIED -->
                            <div v-if="officialStats?.verified && officialStats.verified.length > 0">
                                <h3 style="font-size: 1.15rem; font-weight: bold; color: #38bdf8; margin-top: 10px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                    <span>★</span> Níveis Verificados ({{ officialStats.verified.length }})
                                </h3>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    <div 
                                        v-for="rec in officialStats.verified" 
                                        :key="rec.level" 
                                        style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 12px;"
                                    >
                                        <div style="display: flex; align-items: center; gap: 14px;">
                                            <span style="background: rgba(255,255,255,0.08); color: #aaa; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem;">
                                                #{{ rec.rank }}
                                            </span>
                                            <div>
                                                <a :href="rec.link" target="_blank" style="font-size: 1.05rem; font-weight: bold; color: #fff; text-decoration: none;">
                                                    {{ rec.level }} ↗
                                                </a>
                                                <span style="color: #38bdf8; font-weight: bold; margin-left: 8px; font-size: 0.85rem;">Verificador</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 16px;">
                                            <span style="color: #a5b4fc; font-weight: bold; font-size: 0.95rem;">
                                                +{{ localize(rec.score) }} pts
                                            </span>
                                            <a :href="rec.link" target="_blank" style="background: rgba(88, 101, 242, 0.15); color: #818cf8; text-decoration: none; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">
                                                Verificação
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- PROGRESSED (<100%) -->
                            <div v-if="officialStats?.progressed && officialStats.progressed.length > 0">
                                <h3 style="font-size: 1.15rem; font-weight: bold; color: #facc15; margin-top: 10px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                    <span>▲</span> Progresso Qualificado ({{ officialStats.progressed.length }})
                                </h3>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    <div 
                                        v-for="rec in officialStats.progressed" 
                                        :key="rec.level" 
                                        style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 12px;"
                                    >
                                        <div style="display: flex; align-items: center; gap: 14px;">
                                            <span style="background: rgba(255,255,255,0.08); color: #aaa; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem;">
                                                #{{ rec.rank }}
                                            </span>
                                            <div>
                                                <a :href="rec.link" target="_blank" style="font-size: 1.05rem; font-weight: bold; color: #fff; text-decoration: none;">
                                                    {{ rec.level }} ↗
                                                </a>
                                                <span style="color: #facc15; font-weight: bold; margin-left: 8px; font-size: 0.9rem;">{{ rec.percent }}%</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 16px;">
                                            <span style="color: #a5b4fc; font-weight: bold; font-size: 0.95rem;">
                                                +{{ localize(rec.score) }} pts
                                            </span>
                                            <a :href="rec.link" target="_blank" style="background: rgba(88, 101, 242, 0.15); color: #818cf8; text-decoration: none; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">
                                                Vídeo
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- CONTEÚDO DA ABA 2: SUBMISSÕES RECENTES (MODERAÇÃO) -->
                    <div v-else-if="activeTab === 'submissions'">
                        <div v-if="userSubmissions.length === 0" style="text-align: center; padding: 40px 20px; background: rgba(0,0,0,0.2); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.1);">
                            <p style="color: #aaa; margin-bottom: 12px;">Nenhuma submissão enviada recentemente pelo formulário.</p>
                            <router-link to="/submit" style="background: #5865F2; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: bold;">
                                + Enviar Novo Recorde
                            </router-link>
                        </div>

                        <div v-else style="display: flex; flex-direction: column; gap: 10px;">
                            <div 
                                v-for="sub in userSubmissions" 
                                :key="sub.id" 
                                style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 12px;"
                            >
                                <div>
                                    <span style="font-weight: bold; font-size: 1.05rem;">{{ sub.level_name || ('Nível #' + sub.level_id) }}</span>
                                    <span style="margin-left: 10px; color: #38bdf8; font-weight: bold;">{{ sub.percent }}%</span>
                                    <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">
                                        {{ sub.hz }}Hz · {{ sub.mobile ? 'Mobile' : 'PC' }} · 
                                        <a :href="sub.video_link" target="_blank" style="color: #5865F2;">Vídeo Prova</a>
                                    </div>
                                </div>

                                <div>
                                    <span :style="{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        background: sub.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : (sub.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'),
                                        color: sub.status === 'approved' ? '#4ade80' : (sub.status === 'rejected' ? '#f87171' : '#facc15')
                                    }">
                                        {{ sub.status === 'approved' ? '✓ Aprovado' : (sub.status === 'rejected' ? '✕ Recusado' : '⏳ Em Análise') }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    `,
    data() {
        return {
            store,
            account: null,
            discordSession: null,
            form: {
                display_name: '',
                avatar_url: '',
                discord_username: '',
                discord_id: ''
            },
            newPassword: '',
            savingProfile: false,
            savingDiscord: false,
            savingPassword: false,
            uploadingAvatar: false,
            loadingRecords: true,
            officialStats: null,
            userSubmissions: [],
            activeTab: 'official',
            feedback: { text: '', type: 'success' }
        };
    },
    computed: {
        currentDisplayName() {
            return this.form.display_name ||
                   this.account?.display_name ||
                   this.account?.username ||
                   this.discordSession?.user?.user_metadata?.full_name ||
                   'Jogador';
        },
        currentAvatar() {
            return this.form.avatar_url ||
                   this.account?.avatar_url ||
                   this.discordSession?.user?.user_metadata?.avatar_url ||
                   '/assets/user-shield.svg';
        },
        userHandle() {
            if (this.account?.username) {
                return `@${this.account.username}`;
            }
            return 'Conta TACL';
        },
        hasTempPassword() {
            return Boolean(this.account?.has_temp_password);
        },
        isDiscordLinked() {
            return Boolean(
                this.account?.discord_id ||
                this.account?.discord_username ||
                this.discordSession?.user?.app_metadata?.provider === 'discord'
            );
        },
        totalOfficialRecords() {
            if (!this.officialStats) return 0;
            return (this.officialStats.completed?.length || 0) +
                   (this.officialStats.verified?.length || 0) +
                   (this.officialStats.progressed?.length || 0);
        }
    },
    async mounted() {
        // Escuta popup de autenticação Discord
        window.addEventListener('message', this.handleOAuthMessage);

        let account = await auth.getProfile();
        const { data: { session } } = await supabase.auth.getSession();
        this.discordSession = session;

        // Se o usuário está logado via Discord, sincroniza com a conta oficial do TACL
        if (session?.user?.app_metadata?.provider === 'discord') {
            const discordId = session.user.user_metadata?.sub || session.user.id;
            const discordName = session.user.user_metadata?.custom_claims?.global_name ||
                                session.user.user_metadata?.full_name ||
                                session.user.user_metadata?.name || '';
            const discordAvatar = session.user.user_metadata?.avatar_url;

            // Se não temos conta TACL local carregada OU o discord_id não coincide:
            if (!account || !account.discord_id || account.discord_id !== discordId) {
                try {
                    account = await auth.loginWithDiscordData({
                        discord_id: discordId,
                        discord_username: discordName,
                        discord_avatar: discordAvatar
                    });
                } catch (e) {
                    console.warn('Erro ao sincronizar sessão Discord com TACL:', e);
                }
            } else if (account) {
                try {
                    account = await auth.linkDiscord({
                        discord_id: discordId,
                        discord_username: discordName,
                        discord_avatar: discordAvatar
                    });
                } catch (e) {}
            }
        }

        if (!account && !session) {
            this.$router.push('/login');
            return;
        }

        this.account = account;
        store.profile = account;
        this.$root.user = account;

        this.form.display_name = this.account?.display_name || this.account?.username || session?.user?.user_metadata?.full_name || '';
        this.form.avatar_url = this.account?.avatar_url || session?.user?.user_metadata?.avatar_url || '';
        this.form.discord_username = this.account?.discord_username || session?.user?.user_metadata?.custom_claims?.global_name || '';
        this.form.discord_id = this.account?.discord_id || session?.user?.user_metadata?.sub || '';

        await this.loadAllRecords();
    },
    beforeUnmount() {
        window.removeEventListener('message', this.handleOAuthMessage);
    },
    methods: {
        localize,
        async handleOAuthMessage(event) {
            if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    this.discordSession = session;
                    const discordId = session.user.user_metadata?.sub || session.user.id;
                    const discordName = session.user.user_metadata?.custom_claims?.global_name || session.user.user_metadata?.full_name || '';
                    const discordAvatar = session.user.user_metadata?.avatar_url;
                    try {
                        const updated = await auth.linkDiscord({
                            discord_id: discordId,
                            discord_username: discordName,
                            discord_avatar: discordAvatar
                        });
                        this.account = updated;
                        store.profile = updated;
                        this.$root.user = updated;
                        this.form.discord_username = discordName;
                        this.form.discord_id = discordId;
                        this.feedback = { text: 'Discord vinculado com sucesso pelo pop-up!', type: 'success' };
                    } catch (e) {
                        console.error('Erro ao salvar vinculo do Discord:', e);
                    }
                }
            }
        },
        async loadAllRecords() {
            this.loadingRecords = true;
            try {
                // 1. Carrega recordes oficiais da leaderboard (dados estáticos /data/*.json)
                const [leaderboard] = await fetchLeaderboard();
                if (leaderboard) {
                    const primaryUser = (this.account?.username || '').toLowerCase().trim();
                    const displayName = (this.currentDisplayName || '').toLowerCase().trim();
                    const normPrimary = primaryUser.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
                    const normDisplay = displayName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

                    const found = leaderboard.find(entry => {
                        const u = entry.user.toLowerCase().trim();
                        return u === primaryUser || u === displayName || u === normPrimary || u === normDisplay;
                    });

                    if (found) {
                        const rank = leaderboard.findIndex(e => e.user.toLowerCase().trim() === found.user.toLowerCase().trim()) + 1;
                        this.officialStats = {
                            rank,
                            ...found
                        };
                    }
                }

                // 2. Carrega submissões recentes do Supabase
                const searchNicks = [
                    this.account?.username,
                    this.account?.display_name,
                    this.currentDisplayName
                ].filter(Boolean);

                const { data } = await supabase
                    .from('submissions')
                    .select('*')
                    .in('user_name', searchNicks)
                    .order('id', { ascending: false });

                this.userSubmissions = data || [];
            } catch (err) {
                console.error('Erro ao buscar dados dos recordes:', err);
            } finally {
                this.loadingRecords = false;
            }
        },
        async handleFileUpload(event) {
            const file = event.target.files?.[0];
            if (!file) return;

            if (file.size > 15 * 1024 * 1024) {
                this.feedback = { text: 'A imagem deve ter no máximo 15MB.', type: 'error' };
                return;
            }

            this.uploadingAvatar = true;
            this.feedback = { text: '', type: 'success' };

            try {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64Data = e.target.result;
                    try {
                        const uploadedUrl = await auth.uploadAvatar(base64Data);
                        this.form.avatar_url = uploadedUrl;
                        if (this.account) {
                            this.account.avatar_url = uploadedUrl;
                            store.profile = this.account;
                        }
                        this.feedback = { text: 'Foto enviada com sucesso! Clique em "Salvar Alterações" se alterou o nome.', type: 'success' };
                    } catch (err) {
                        this.feedback = { text: 'Erro ao enviar foto: ' + err.message, type: 'error' };
                    } finally {
                        this.uploadingAvatar = false;
                    }
                };
                reader.readAsDataURL(file);
            } catch (err) {
                this.feedback = { text: 'Erro ao ler arquivo: ' + err.message, type: 'error' };
                this.uploadingAvatar = false;
            }
        },
        async saveProfile() {
            this.savingProfile = true;
            this.feedback = { text: '', type: 'success' };

            try {
                if (this.account) {
                    const updated = await auth.updateProfile({
                        display_name: (this.form.display_name || '').trim(),
                        avatar_url: this.form.avatar_url ? this.form.avatar_url.trim() : this.account.avatar_url
                    });
                    this.account = updated;
                    store.profile = updated;
                }
                this.feedback = { text: 'Perfil atualizado com sucesso! Seu nome e foto já estão atualizados na Leaderboard.', type: 'success' };
                await this.loadAllRecords();
            } catch (err) {
                this.feedback = { text: 'Erro ao salvar perfil: ' + err.message, type: 'error' };
            } finally {
                this.savingProfile = false;
            }
        },
        async saveDiscordManual() {
            if (!this.form.discord_username && !this.form.discord_id) {
                this.feedback = { text: 'Preencha seu usuário ou ID do Discord para salvar.', type: 'error' };
                return;
            }

            this.savingDiscord = true;
            this.feedback = { text: '', type: 'success' };

            try {
                const updated = await auth.linkDiscord({
                    discord_username: this.form.discord_username.trim(),
                    discord_id: this.form.discord_id.trim()
                });
                this.account = updated;
                store.profile = updated;
                this.feedback = { text: 'Dados do Discord salvos com sucesso! O bot poderá notificar você na DM.', type: 'success' };
            } catch (err) {
                this.feedback = { text: 'Erro ao salvar Discord: ' + err.message, type: 'error' };
            } finally {
                this.savingDiscord = false;
            }
        },
        async linkDiscordOAuth() {
            this.feedback = { text: '', type: 'success' };
            try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: {
                        skipBrowserRedirect: true,
                        scopes: 'identify guilds guilds.members.read',
                        redirectTo: window.location.origin + '/auth/callback'
                    }
                });

                if (error) {
                    throw error;
                }

                if (data?.url) {
                    const popup = window.open(data.url, 'discord_oauth_popup', 'width=600,height=750,menubar=no,toolbar=no');
                    if (!popup) {
                        this.feedback = {
                            text: 'O pop-up foi bloqueado pelo seu navegador. Por favor, permita pop-ups ou informe seu usuário/ID do Discord no formulário ao lado.',
                            type: 'error'
                        };
                    } else {
                        this.feedback = {
                            text: 'Janela do Discord aberta! Faça login e autorize para vincular.',
                            type: 'success'
                        };
                    }
                }
            } catch (err) {
                this.feedback = {
                    text: 'Não foi possível iniciar o login automático do Discord (' + (err.message || err) + '). Você pode salvar seu Usuário e ID do Discord diretamente no formulário ao lado!',
                    type: 'error'
                };
            }
        },
        async changePassword() {
            if (!this.newPassword || this.newPassword.length < 4) {
                this.feedback = { text: 'A senha deve ter pelo menos 4 caracteres.', type: 'error' };
                return;
            }

            this.savingPassword = true;
            this.feedback = { text: '', type: 'success' };

            try {
                const updated = await auth.updateProfile({
                    new_password: this.newPassword,
                    user_id: this.account?.id,
                    username: this.account?.username
                });
                this.account = updated;
                store.profile = updated;
                this.$root.user = updated;
                this.feedback = { text: 'Senha alterada com sucesso! Senha provisória removida.', type: 'success' };
                this.newPassword = '';
            } catch (err) {
                this.feedback = { text: 'Erro ao trocar senha: ' + err.message, type: 'error' };
            } finally {
                this.savingPassword = false;
            }
        },
        async handleLogout() {
            auth.logout();
            await supabase.auth.signOut();
            store.profile = null;
            store.isMod = false;
            this.$root.user = null;
            this.$router.push('/');
        }
    }
};
