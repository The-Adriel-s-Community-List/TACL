// Client Authentication Service for TACL

export const auth = {
    async register(username, password) {
        const trimmed = (username || '').trim();
        const pass = (password || '').trim();

        if (!trimmed) throw new Error('Informe o nome de usuário.');
        if (!pass || pass.length < 4) throw new Error('A senha deve ter pelo menos 4 caracteres.');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmed, password: pass })
            });

            const text = await res.text();
            let data = {};
            if (text) {
                try { data = JSON.parse(text); } catch(e) {}
            }

            if (!res.ok) {
                throw new Error(data.error || `Erro ao registrar (${res.status}).`);
            }

            localStorage.setItem('tacl_token', data.token);
            localStorage.setItem('tacl_user', JSON.stringify(data.user));
            return data.user;
        } catch (err) {
            throw err;
        }
    },

    async login(username, password) {
        const trimmed = (username || '').trim();
        const pass = (password || '').trim();

        if (!trimmed) throw new Error('Informe o nome de usuário.');
        if (!pass) throw new Error('Informe a senha.');

        // 1. Tenta autenticar pelo endpoint /api/auth/login
        let apiError = null;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmed, password: pass })
            });

            const text = await res.text();
            let data = {};
            if (text) {
                try { data = JSON.parse(text); } catch(e) {}
            }

            if (res.ok && data.user && data.token) {
                localStorage.setItem('tacl_token', data.token);
                localStorage.setItem('tacl_user', JSON.stringify(data.user));
                return data.user;
            } else if (res.status === 401) {
                throw new Error(data.error || 'Usuário ou senha incorretos.');
            } else if (data.error) {
                throw new Error(data.error);
            }
        } catch (e) {
            // Se for erro explícito de credenciais incorretas, repassa
            if (e.message.includes('Senha incorreta') || e.message.includes('Usuário não encontrado') || e.message.includes('Usuário ou senha')) {
                throw e;
            }
            apiError = e;
            console.warn('API /api/auth/login indisponível ou resposta vazia, tentando fallback estático:', e);
        }

        // 2. Fallback direto nos dados do arquivo estático (/data/_accounts.json)
        try {
            const res2 = await fetch('/data/_accounts.json');
            if (res2.ok) {
                const accounts = await res2.json();
                const user = accounts.find(a => a.username.toLowerCase() === trimmed.toLowerCase());
                if (!user) {
                    throw new Error('Usuário não encontrado.');
                }
                if (user.temp_password && user.temp_password === pass) {
                    const fallbackUser = {
                        id: user.id,
                        username: user.username,
                        display_name: user.display_name || user.username,
                        avatar_url: user.avatar_url,
                        discord_id: user.discord_id,
                        discord_username: user.discord_username,
                        has_temp_password: true
                    };
                    localStorage.setItem('tacl_token', 'local_' + user.id);
                    localStorage.setItem('tacl_user', JSON.stringify(fallbackUser));
                    return fallbackUser;
                } else {
                    throw new Error('Senha incorreta.');
                }
            }
        } catch (fbErr) {
            if (fbErr.message.includes('Usuário não encontrado') || fbErr.message.includes('Senha incorreta')) {
                throw fbErr;
            }
        }

        if (apiError) throw apiError;
        throw new Error('Erro ao conectar com o serviço de autenticação.');
    },

    async getProfile() {
        const token = localStorage.getItem('tacl_token');
        if (!token) return null;

        if (token.startsWith('local_')) {
            try { return JSON.parse(localStorage.getItem('tacl_user')); } catch (e) { return null; }
        }

        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const text = await res.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.user) {
                        localStorage.setItem('tacl_user', JSON.stringify(data.user));
                        return data.user;
                    }
                }
            }
        } catch (e) {
            console.warn('Erro ao verificar sessão com API, usando perfil salvo:', e);
        }

        try { return JSON.parse(localStorage.getItem('tacl_user')); } catch (e) { return null; }
    },

    async updateProfile(updates) {
        const token = localStorage.getItem('tacl_token') || 'local_session';
        const currentUser = JSON.parse(localStorage.getItem('tacl_user') || '{}');
        const updatedUser = {
            ...currentUser,
            display_name: updates.display_name || currentUser.display_name,
            avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : currentUser.avatar_url,
            has_temp_password: updates.new_password ? false : currentUser.has_temp_password
        };

        const res = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-user-id': currentUser.id || ''
            },
            body: JSON.stringify({
                ...updates,
                user_id: currentUser.id
            })
        });

        const text = await res.text();
        let data = {};
        if (text) {
            try { data = JSON.parse(text); } catch (e) {}
        }

        if (!res.ok) {
            throw new Error(data.error || `Erro ao atualizar perfil (${res.status}).`);
        }

        const savedUser = data.user || updatedUser;
        localStorage.setItem('tacl_user', JSON.stringify(savedUser));
        return savedUser;
    },

    async linkDiscord(discordData) {
        const token = localStorage.getItem('tacl_token') || 'local_session';
        const currentUser = JSON.parse(localStorage.getItem('tacl_user') || '{}');
        const updatedUser = {
            ...currentUser,
            discord_id: discordData.discord_id,
            discord_username: discordData.discord_username,
            avatar_url: discordData.discord_avatar || currentUser.avatar_url
        };

        const res = await fetch('/api/auth/link-discord', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-user-id': currentUser.id || ''
            },
            body: JSON.stringify({
                ...discordData,
                user_id: currentUser.id
            })
        });

        const text = await res.text();
        let data = {};
        if (text) {
            try { data = JSON.parse(text); } catch (e) {}
        }

        if (!res.ok) {
            throw new Error(data.error || `Erro ao vincular Discord (${res.status}).`);
        }

        const savedUser = data.user || updatedUser;
        localStorage.setItem('tacl_user', JSON.stringify(savedUser));
        return savedUser;
    },

    async getMigrationAccounts() {
        const cacheBuster = '?t=' + Date.now();
        try {
            const res = await fetch('/api/auth/migration-accounts' + cacheBuster);
            if (res.ok) {
                const text = await res.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (Array.isArray(data) && data.length > 0) return data;
                }
            }
        } catch (e) {
            console.warn('Falha na rota /api/auth/migration-accounts, tentando /data/_accounts.json:', e);
        }

        try {
            const res2 = await fetch('/data/_accounts.json' + cacheBuster);
            if (res2.ok) {
                const text2 = await res2.text();
                if (text2) {
                    const data2 = JSON.parse(text2);
                    if (Array.isArray(data2)) {
                        return data2.map(a => ({
                            user: a.username,
                            display_name: a.display_name || a.username,
                            temp_password: a.temp_password || null,
                            has_changed_password: !a.temp_password,
                            discord_linked: Boolean(a.discord_id || a.discord_username),
                            discord_username: a.discord_username || null,
                            discord_id: a.discord_id || null
                        }));
                    }
                }
            }
        } catch (e2) {
            console.warn('Falha no fallback de contas:', e2);
        }

        return [];
    },

    logout() {
        localStorage.removeItem('tacl_token');
        localStorage.removeItem('tacl_user');
    }
};
