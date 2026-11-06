// Client Authentication Service for TACL

export const auth = {
    async register(username, password) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao registrar.');
        localStorage.setItem('tacl_token', data.token);
        return data.user;
    },

    async login(username, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao entrar.');
        localStorage.setItem('tacl_token', data.token);
        return data.user;
    },

    async getProfile() {
        const token = localStorage.getItem('tacl_token');
        if (!token) return null;
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                localStorage.removeItem('tacl_token');
                return null;
            }
            const data = await res.json();
            return data.user;
        } catch (e) {
            return null;
        }
    },

    async updateProfile(updates) {
        const token = localStorage.getItem('tacl_token');
        if (!token) throw new Error('Você precisa estar logado.');
        const res = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar perfil.');
        return data.user;
    },

    async linkDiscord(discordData) {
        const token = localStorage.getItem('tacl_token');
        if (!token) throw new Error('Você precisa estar logado.');
        const res = await fetch('/api/auth/link-discord', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(discordData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao vincular Discord.');
        return data.user;
    },

    async getMigrationAccounts() {
        try {
            const res = await fetch('/api/auth/migration-accounts');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) return data;
            }
        } catch (e) {
            console.warn('Falha na rota /api/auth/migration-accounts, tentando /data/_accounts.json:', e);
        }

        try {
            const res2 = await fetch('/data/_accounts.json');
            if (res2.ok) {
                const data2 = await res2.json();
                if (Array.isArray(data2)) {
                    return data2.map(a => ({
                        user: a.username,
                        display_name: a.display_name || a.username,
                        temp_password: a.temp_password || null,
                        has_changed_password: !a.temp_password,
                        discord_linked: Boolean(a.discord_id)
                    }));
                }
            }
        } catch (e2) {
            console.warn('Falha no fallback:', e2);
        }

        return [];
    },

    logout() {
        localStorage.removeItem('tacl_token');
    }
};
