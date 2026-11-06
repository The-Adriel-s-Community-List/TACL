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
        const res = await fetch('/api/auth/migration-accounts');
        return await res.json();
    },

    logout() {
        localStorage.removeItem('tacl_token');
    }
};
