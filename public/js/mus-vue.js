// public/js/mus-vue.js
// Migración inicial de Mus a Vue 3 (lógica-isla)

if (typeof Vue === 'undefined') {
    console.error('Vue no está cargado. Asegúrate de incluir <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script> en index.html');
}

const musVueApp = Vue.createApp({
    data() {
        return {
            // Estado global de app
            currentScreen: 'hubScreen',
            rooms: [],
            players: [],
            matches: [],
            currentRoom: '',
            tournamentState: {},
            viewMode: 'ranking_pair',
            period: 'all',
            activeTab: 'tournament',
            isAdmin: false,
            loading: true,
            error: null,
            nameInput: '',
            selectedGroup: '',
            groupAssignments: {},
            bracketEdits: {},
            resultEdits: {}
        };
    },
    computed: {
        roomOptions() {
            return this.rooms.filter(r => r.isTournament).map(r => r.name);
        },
        currentRoomData() {
            return this.rooms.find(r => r.name === this.currentRoom) || null;
        },
        isTournament() {
            return this.currentRoomData && this.currentRoomData.isTournament;
        },
        localState() {
            if (!this.currentRoomData || !this.currentRoomData.tournamentState) return {};
            try { return JSON.parse(this.currentRoomData.tournamentState); } catch(e){ return {}; }
        },
        computedMatches() {
            if (!this.tournamentState) return [];
            if (this.tournamentState.phase === 'GROUPS') {
                return Object.values(this.tournamentState.groups || {}).flatMap(g => g.matches || []);
            }
            if (this.tournamentState.phase === 'BRACKET') {
                return (this.tournamentState.bracket?.rounds || []).flatMap(r => r.matches || []);
            }
            return [];
        }
    },
    watch: {
        currentRoom() {
            this.syncFromGlobal();
        },
    },
    methods: {
        syncFromGlobal() {
            if (this.currentRoomData && this.currentRoomData.tournamentState) {
                try {
                    this.tournamentState = JSON.parse(this.currentRoomData.tournamentState);
                } catch { this.tournamentState = {} }
            } else {
                this.tournamentState = {};
            }
        },
        showScreen(screen) {
            this.currentScreen = screen;
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen(screen, true);
            }
        },
        setData(data) {
            this.rooms = data.rooms;
            this.players = data.players;
            this.matches = data.matches;

            if (!this.currentRoom) {
                const first = this.roomOptions[0] || 'ABSOLUTA';
                this.currentRoom = first;
            }
            this.syncFromGlobal();
            this.loading = false;
        },
        applyAction(type, payload) {
            app.mus.tourneyAction(type, payload);
        },
        addPlayer() {
            const name = this.nameInput.trim();
            if (!name) return alert('Escribe un nombre válido.');
            this.applyAction('addPlayer', name);
            this.nameInput = '';
        },
        startTournament() {
            if (!confirm('Cerrar inscripciones e iniciar el torneo?')) return;
            this.applyAction('start', null);
        },
        advanceToBracket() {
            if (!confirm('Finalizar fase de grupos y crear eliminatorias?')) return;
            this.applyAction('advanceToBracket', null);
        },
        updateMatchResult(matchId, s1, s2) {
            this.applyAction('updateMatchResult', { matchId, s1, s2 });
        },
        updateGroupAssignments() {
            this.applyAction('updateGroupAssignments', { assignments: this.groupAssignments });
        },
        updateBracketMatchup(matchId, p1, p2) {
            this.applyAction('updateBracketMatchup', { matchId, p1, p2 });
        },
        renderGroupTable() {
            return this.tournamentState?.groups || {};
        },
        renderBracket() {
            return this.tournamentState?.bracket?.rounds || [];
        },
        getRoomMatches() {
            if (this.currentRoom === 'ABSOLUTA') return this.matches;
            return this.matches.filter(m => m.roomId === this.currentRoom);
        },
        getFilteredMatches() {
            const now = new Date();
            const allMatches = this.getRoomMatches();
            if (this.period === 'all') return allMatches;
            let limitDate = new Date(now);
            if (this.period === '7days') limitDate.setDate(limitDate.getDate() - 7);
            if (this.period === '30days') limitDate.setDate(limitDate.getDate() - 30);
            if (this.period === 'year') limitDate.setFullYear(limitDate.getFullYear() - 1);
            return allMatches.filter(m => new Date(m.date) >= limitDate);
        }
    },
    mounted() {
        socket.on('mus_data', (data) => {
            this.setData(data);
        });
        socket.on('mus_msg', (msg) => alert(msg));
        socket.emit('mus_action', { type: 'getData' });

        // Reescribir showScreen para que el estado Vue sea reactivo
        if (typeof app !== 'undefined') {
            const oldShowScreen = app.showScreen && app.showScreen.bind(app);
            app.showScreen = (screenName, skipHistory) => {
                this.currentScreen = screenName;
                if (oldShowScreen) oldShowScreen(screenName, skipHistory);
            };
        }
    }
});

musVueApp.mount('#mus-vue-app');

window.musVueApp = musVueApp;
