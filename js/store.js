export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    isMod: sessionStorage.getItem('is_mod') === 'true',
    profile: null,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});
