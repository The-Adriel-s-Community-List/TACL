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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

// Prevent stale caching of scripts, data, and API responses
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.endsWith('.js') || req.path.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
});

// Path to accounts file
const ACCOUNTS_FILE = path.join(__dirname, 'data', '_accounts.json');

// Memory sessions map: token -> userId
const sessions = new Map();

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
                        avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
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

// Middleware to authenticate Bearer token
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado. Faça login primeiro.' });
    }
    const token = header.slice(7).trim();
    const userId = sessions.get(token);
    if (!userId) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
    const accounts = loadAccounts();
    const user = accounts.find(a => a.id === userId);
    if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    req.user = user;
    req.token = token;
    next();
}

function sanitizeUser(u) {
    return {
        id: u.id,
        username: u.username,
        display_name: u.display_name || u.username,
        avatar_url: u.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png',
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

        return res.json({
            token,
            user: sanitizeUser(user)
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao autenticar.' });
    }
});

// Current User Profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
    return res.json({ user: sanitizeUser(req.user) });
});

// Update Profile
app.post('/api/auth/update-profile', authMiddleware, (req, res) => {
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

        if (avatar_url !== undefined) {
            accounts[index].avatar_url = avatar_url;
        }

        if (new_password && typeof new_password === 'string' && new_password.length >= 4) {
            const salt = crypto.randomBytes(16).toString('hex');
            accounts[index].salt = salt;
            accounts[index].password_hash = hashPassword(new_password, salt);
            accounts[index].temp_password = null; // Clear temporary password flag
        }

        saveAccounts(accounts);
        return res.json({ user: sanitizeUser(accounts[index]) });
    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao atualizar perfil.' });
    }
});

// Link Discord
app.post('/api/auth/link-discord', authMiddleware, (req, res) => {
    try {
        const { discord_id, discord_username, discord_avatar } = req.body || {};
        const accounts = loadAccounts();
        const index = accounts.findIndex(a => a.id === req.user.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (discord_id) accounts[index].discord_id = discord_id;
        if (discord_username) accounts[index].discord_username = discord_username;
        if (discord_avatar && !accounts[index].avatar_url.includes('http')) {
            accounts[index].avatar_url = discord_avatar;
        }

        saveAccounts(accounts);
        return res.json({ user: sanitizeUser(accounts[index]) });
    } catch (err) {
        console.error('Link discord error:', err);
        return res.status(500).json({ error: 'Erro no servidor ao vincular Discord.' });
    }
});

// List Migration Accounts for Mod Panel
app.get('/api/auth/migration-accounts', (req, res) => {
    const accounts = loadAccounts();
    const list = accounts.map(a => ({
        user: a.username,
        display_name: a.display_name,
        temp_password: a.temp_password || null,
        has_changed_password: !a.temp_password,
        discord_linked: Boolean(a.discord_id)
    }));
    return res.json(list);
});

// ----------------- STATIC FILES & SPA FALLBACK ----------------- //

// Serve static files from root directory
app.use(express.static(__dirname, {
    extensions: ['html', 'htm']
}));

// Fallback to index.html for client-side routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});
