import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// CORS & Preflight handling
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Prevent stale caching of scripts, data, and API responses
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.endsWith('.js') || req.path.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
});

// Path to accounts and sessions file
const ACCOUNTS_FILE = path.join(__dirname, 'data', '_accounts.json');
const SESSIONS_FILE = path.join(__dirname, 'data', '_sessions.json');

function loadSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
            return new Map(Object.entries(data));
        }
    } catch (e) {
        console.error('Error reading sessions file:', e);
    }
    return new Map();
}

function saveSessions(sessionsMap) {
    try {
        const obj = Object.fromEntries(sessionsMap.entries());
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error saving sessions file:', e);
    }
}

// Persistent sessions map: token -> userId
const sessions = loadSessions();

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

function loadAccounts() {
    try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
            return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Error reading accounts file:', e);
    }
    return [];
}

function saveAccounts(accounts) {
    try {
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error saving accounts file:', e);
    }
}

// Pre-seed migration accounts from leaderboard if they don't already exist
function initMigrationAccounts() {
    let accounts = loadAccounts();
    const existingUsernames = new Set(accounts.map(a => a.username.toLowerCase()));

    const dataDir = path.join(__dirname, 'data');
    const listFile = path.join(dataDir, '_list.json');

    if (fs.existsSync(listFile)) {
        try {
            const list = JSON.parse(fs.readFileSync(listFile, 'utf-8'));
            const players = new Set();

            for (const levelName of list) {
                const lvlFile = path.join(dataDir, `${levelName}.json`);
                if (fs.existsSync(lvlFile)) {
                    try {
                        const lvl = JSON.parse(fs.readFileSync(lvlFile, 'utf-8'));
                        if (lvl.verifier) players.add(lvl.verifier.trim());
                        if (lvl.records) {
                            for (const r of lvl.records) {
                                if (r.user) players.add(r.user.trim());
                            }
                        }
                    } catch (err) {}
                }
            }

            let added = false;
            for (const player of players) {
                if (!player) continue;
                if (!existingUsernames.has(player.toLowerCase())) {
                    const salt = crypto.randomBytes(16).toString('hex');
                    const tempPassword = `TACL#${player.replace(/\s+/g, '')}2026`;
                    const passwordHash = hashPassword(tempPassword, salt);

                    accounts.push({
                        id: crypto.randomUUID(),
                        username: player,
                        display_name: player,
                        avatar_url: null,
                        salt,
                        password_hash: passwordHash,
                        temp_password: tempPassword,
                        discord_id: null,
                        discord_username: null,
                        created_at: new Date().toISOString()
                    });
                    existingUsernames.add(player.toLowerCase());
                    added = true;
                }
            }

            if (added) {
                saveAccounts(accounts);
                console.log(`[AUTH] Migration accounts initialized (${accounts.length} total users).`);
            }
        } catch (e) {
            console.error('Error in initMigrationAccounts:', e);
        }
    }
}

initMigrationAccounts();

function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// Middleware to authenticate Bearer token or identification parameters
function authMiddleware(req, res, next) {
    const accounts = loadAccounts();
    const header = req.headers.authorization;
    const xUserId = req.headers['x-user-id'] || req.body?.user_id;
    const bodyUsername = req.body?.username || req.headers['x-username'];
    const bodyDiscordId = req.body?.discord_id || req.headers['x-discord-id'];
    let userId = null;

    if (header && header.startsWith('Bearer ')) {
        const token = header.slice(7).trim();
        userId = sessions.get(token);
        if (!userId && token.startsWith('local_')) {
            userId = token.replace('local_', '');
        }
        if (!userId) {
            // Check if token matches an account ID or username directly
            const found = accounts.find(a => a.id === token || normalizeName(a.username) === normalizeName(token));
            if (found) userId = found.id;
        }
    }

    if (!userId && xUserId) {
        const found = accounts.find(a => a.id === xUserId || normalizeName(a.username) === normalizeName(String(xUserId)));
        if (found) userId = found.id;
    }

    if (!userId && bodyUsername) {
        const found = accounts.find(a => normalizeName(a.username) === normalizeName(String(bodyUsername)));
        if (found) userId = found.id;
    }

    if (!userId && bodyDiscordId) {
        const found = accounts.find(a => a.discord_id && String(a.discord_id) === String(bodyDiscordId));
        if (found) userId = found.id;
    }

    if (!userId) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
    const user = accounts.find(a => a.id === userId);
    if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    req.user = user;
    next();
}

function sanitizeUser(u) {
    return {
        id: u.id,
        username: u.username,
        display_name: u.display_name || u.username,
        avatar_url: u.avatar_url || (!u.temp_password ? '/assets/user-shield.svg' : null),
        discord_id: u.discord_id || null,
        discord_username: u.discord_username || null,
        has_temp_password: Boolean(u.temp_password)
    };
}

// ----------------- AUTH API ROUTES ----------------- //

// Register
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || typeof username !== 'string' || !username.trim()) {
            return res.status(400).json({ error: 'Nome de usuário inválido.' });
        }
        if (!password || typeof password !== 'string' || password.length < 4) {
            return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
        }

        const trimmedUsername = username.trim();
        const accounts = loadAccounts();

        if (accounts.some(a => a.username.toLowerCase() === trimmedUsername.toLowerCase())) {
            return res.status(400).json({ error: 'Este nome de usuário já está registrado. Escolha outro ou faça login.' });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(password, salt);

        const newUser = {
            id: crypto.randomUUID(),
            username: trimmedUsername,
            display_name: trimmedUsername,
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
            salt,
            password_hash: passwordHash,
            temp_password: null,
            discord_id: null,
            discord_username: null,
            created_at: new Date().toISOString()
        };

        accounts.push(newUser);
        saveAccounts(accounts);

        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, newUser.id);
        saveSessions(sessions);

        return res.json({
            token,
            user: sanitizeUser(newUser)
        });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao criar conta.' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ error: 'Informe usuário e senha.' });
        }

        const trimmedUsername = String(username).trim();
        const trimmedPassword = String(password).trim();
        const accounts = loadAccounts();
        const user = accounts.find(a => a.username.toLowerCase() === trimmedUsername.toLowerCase());

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado. Verifique se digitou corretamente.' });
        }

        // Direct temp_password check OR hash check
        const isMatch = (user.temp_password && user.temp_password === trimmedPassword) ||
                        (hashPassword(trimmedPassword, user.salt) === user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, user.id);
        saveSessions(sessions);

        return res.json({
            token,
            user: sanitizeUser(user)
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao autenticar.' });
    }
});

// Discord Login / Auto-Sync Endpoint
app.post(['/api/auth/discord-login', '/api/auth/discord-login/'], (req, res) => {
    try {
        const { discord_id, discord_username, discord_avatar } = req.body || {};
        if (!discord_id && !discord_username) {
            return res.status(400).json({ error: 'Dados do Discord insuficientes.' });
        }

        const accounts = loadAccounts();
        const strDiscordId = discord_id ? String(discord_id).trim() : null;
        const normDiscordUsername = normalizeName(discord_username);

        // 1. Match by Discord Snowflake ID
        let matchedAccount = null;
        if (strDiscordId) {
            matchedAccount = accounts.find(a => a.discord_id && String(a.discord_id) === strDiscordId);
        }

        // 2. Match by normalized Discord username
        if (!matchedAccount && normDiscordUsername) {
            matchedAccount = accounts.find(a => a.discord_username && normalizeName(a.discord_username) === normDiscordUsername);
        }

        // 3. Match by normalized TACL username (e.g. sophiz matches sophiz)
        if (!matchedAccount && normDiscordUsername) {
            matchedAccount = accounts.find(a => normalizeName(a.username) === normDiscordUsername);
        }

        // 4. Match by normalized display_name
        if (!matchedAccount && normDiscordUsername) {
            matchedAccount = accounts.find(a => a.display_name && normalizeName(a.display_name) === normDiscordUsername);
        }

        if (matchedAccount) {
            // Update discord metadata if missing or changed
            if (strDiscordId && (!matchedAccount.discord_id || matchedAccount.discord_id !== strDiscordId)) {
                matchedAccount.discord_id = strDiscordId;
            }
            if (discord_username && (!matchedAccount.discord_username || matchedAccount.discord_username !== discord_username)) {
                matchedAccount.discord_username = discord_username;
            }
            if (discord_avatar && typeof discord_avatar === 'string' && (!matchedAccount.avatar_url || !matchedAccount.avatar_url.startsWith('/uploads/'))) {
                matchedAccount.avatar_url = discord_avatar;
            }

            saveAccounts(accounts);

            const token = crypto.randomBytes(32).toString('hex');
            sessions.set(token, matchedAccount.id);
            saveSessions(sessions);

            console.log(`[AUTH] Login com Discord vinculado para o jogador: ${matchedAccount.username} (${matchedAccount.id})`);
            return res.json({
                token,
                user: sanitizeUser(matchedAccount)
            });
        }

        // If not found in existing accounts, register new account automatically
        const cleanUsername = normDiscordUsername || `user_${strDiscordId ? strDiscordId.slice(-4) : Date.now().toString().slice(-4)}`;
        const salt = crypto.randomBytes(16).toString('hex');
        const newAccount = {
            id: crypto.randomUUID(),
            username: cleanUsername,
            display_name: discord_username || cleanUsername,
            avatar_url: discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
            salt,
            password_hash: '',
            temp_password: null,
            discord_id: strDiscordId,
            discord_username: discord_username || null,
            created_at: new Date().toISOString()
        };

        accounts.push(newAccount);
        saveAccounts(accounts);

        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, newAccount.id);
        saveSessions(sessions);

        console.log(`[AUTH] Nova conta criada via Discord: ${newAccount.username}`);
        return res.json({
            token,
            user: sanitizeUser(newAccount)
        });
    } catch (err) {
        console.error('Discord login error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao autenticar com Discord.' });
    }
});

// Uploads directory for custom avatars
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(path.join(UPLOADS_DIR, 'avatars'))) {
    fs.mkdirSync(path.join(UPLOADS_DIR, 'avatars'), { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Current User Profile
app.get(['/api/auth/me', '/api/auth/me/'], authMiddleware, (req, res) => {
    return res.json({ user: sanitizeUser(req.user) });
});

// Upload custom avatar image
app.all(['/api/upload-avatar', '/api/upload-avatar/'], authMiddleware, (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }
    try {
        const { image } = req.body || {};
        if (!image || typeof image !== 'string') {
            return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
        }

        const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ error: 'Formato de imagem inválido. Envie PNG, JPG ou WebP.' });
        }

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `avatar-${req.user.username.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}.${ext}`;
        const avatarsDir = path.join(UPLOADS_DIR, 'avatars');
        if (!fs.existsSync(avatarsDir)) {
            fs.mkdirSync(avatarsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(avatarsDir, filename), buffer);

        const avatarUrl = `/uploads/avatars/${filename}`;

        const accounts = loadAccounts();
        const index = accounts.findIndex(a => a.id === req.user.id);
        if (index !== -1) {
            accounts[index].avatar_url = avatarUrl;
            saveAccounts(accounts);
        }

        return res.json({ ok: true, url: avatarUrl, user: sanitizeUser(accounts[index] || req.user) });
    } catch (err) {
        console.error('Upload avatar error:', err);
        return res.status(500).json({ error: 'Erro ao salvar foto de perfil.' });
    }
});

// Handler for Update Profile & Password
const handleUpdateProfile = (req, res) => {
    try {
        const { display_name, avatar_url, new_password } = req.body || {};
        const accounts = loadAccounts();
        const index = accounts.findIndex(a => a.id === req.user.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (display_name && typeof display_name === 'string' && display_name.trim()) {
            accounts[index].display_name = display_name.trim();
        }

        if (avatar_url !== undefined && avatar_url !== null) {
            accounts[index].avatar_url = String(avatar_url).trim();
        }

        if (new_password && typeof new_password === 'string' && new_password.trim().length >= 4) {
            const cleanPassword = new_password.trim();
            const salt = crypto.randomBytes(16).toString('hex');
            accounts[index].salt = salt;
            accounts[index].password_hash = hashPassword(cleanPassword, salt);
            accounts[index].temp_password = null; // Clear temporary password flag!
            console.log(`[AUTH] Nova senha definida para o usuário: ${accounts[index].username}`);
        }

        saveAccounts(accounts);
        return res.json({ ok: true, user: sanitizeUser(accounts[index]) });
    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao atualizar perfil.' });
    }
};

app.all([
    '/api/auth/update-profile',
    '/api/auth/update-profile/',
    '/api/auth/change-password',
    '/api/auth/change-password/'
], authMiddleware, handleUpdateProfile);

// Handler for Link Discord
const handleLinkDiscord = (req, res) => {
    try {
        const { discord_id, discord_username, discord_avatar } = req.body || {};
        const accounts = loadAccounts();
        const index = accounts.findIndex(a => a.id === req.user.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (discord_id !== undefined) {
            accounts[index].discord_id = discord_id ? String(discord_id).trim() : null;
        }
        if (discord_username !== undefined) {
            accounts[index].discord_username = discord_username ? String(discord_username).trim() : null;
        }
        if (discord_avatar && typeof discord_avatar === 'string' && !accounts[index].avatar_url?.startsWith('/uploads/')) {
            accounts[index].avatar_url = discord_avatar;
        }

        saveAccounts(accounts);
        console.log(`[AUTH] Discord vinculado para ${accounts[index].username}: ${accounts[index].discord_username} (${accounts[index].discord_id})`);
        return res.json({ ok: true, user: sanitizeUser(accounts[index]) });
    } catch (err) {
        console.error('Link discord error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao vincular Discord.' });
    }
};

app.all(['/api/auth/link-discord', '/api/auth/link-discord/'], authMiddleware, handleLinkDiscord);

// List Migration Accounts for Mod Panel
app.get(['/api/auth/migration-accounts', '/api/auth/migration-accounts/'], (req, res) => {
    const accounts = loadAccounts();
    const list = accounts.map(a => ({
        user: a.username,
        display_name: a.display_name,
        temp_password: a.temp_password || null,
        has_changed_password: !a.temp_password,
        discord_linked: Boolean(a.discord_id || a.discord_username),
        discord_username: a.discord_username || null,
        discord_id: a.discord_id || null
    }));
    return res.json(list);
});

// ----------------- STATIC FILES & SPA FALLBACK ----------------- //

// Serve static files from root directory
app.use(express.static(__dirname, {
    extensions: ['html', 'htm']
}));

// OAuth Popup Callback Route
app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Autenticação Discord</title>
      </head>
      <body style="background:#18181b;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;padding:20px;">
          <h2 style="color:#5865F2;">Conectando ao Discord...</h2>
          <p>Autenticação recebida! Esta janela fechará automaticamente.</p>
        </div>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                hash: window.location.hash,
                search: window.location.search
              }, '*');
              setTimeout(() => window.close(), 800);
            } else {
              window.location.href = '/#/perfil';
            }
          } catch(e) {
            window.location.href = '/#/perfil';
          }
        </script>
      </body>
    </html>
    `);
});

// Fallback to index.html for client-side routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});
