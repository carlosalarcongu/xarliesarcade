// public/js/app-vue.js
// Migración de la aplicación principal a Vue 3 (administración global de pantallas y estado)

if (typeof Vue === 'undefined') {
    console.error('Vue no está cargado. Asegúrate de incluir <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script> en index.html');
}

const appVueState = Vue.reactive({
    currentScreen: 'hubScreen',
    currentRoom: null,
    currentRoomId: null,
    myPlayerId: null,
    myPlayerName: null,
    isAuthenticatedUser: false,
    musWhitelist: [],
    hubRooms: [],
    authRequests: [],
    showPasswordModal: false,
    loading: false,
    error: null
});

function syncScreenVisibility(screenId) {
    const screens = [
        'hubScreen', 'loginScreen', 'feedbackScreen',
        'impostorLobby', 'impostorGame',
        'loboLobby', 'loboGame',
        'anecdotasLobby', 'anecdotasGame',
        'elmasLobby', 'elmasGame',
        'tabuLobby', 'tabuGame',
        'pinturilloImpLobby', 'pinturilloImpGame',
        'cylLobby', 'cylGame',
        'ordenLobby', 'ordenGame',
        'giveScreen', 'musScreen',
        'contextoScreen', 'consejoScreen',
        'fiestaScreen', 'statsSelectionScreen',
        'fifaScreen', 'torresLobby', 'torresGame',
        'darkstoriesScreen', 'beberScreen', 'beberStatsScreen',
        'authAdminScreen', 'torneosLobby', 'torneosViewScreen'
    ];

    screens.forEach(s => {
        const el = document.getElementById(s);
        if (!el) return;
        if (s === screenId) el.classList.remove('hidden'); else el.classList.add('hidden');
    });
}

const appVue = Vue.createApp({
    data() {
        return appVueState;
    },
    computed: {
        isHub() {
            return this.currentScreen === 'hubScreen';
        },
        isLogin() {
            return this.currentScreen === 'loginScreen';
        }
    },
    watch: {
        currentScreen(newScreen) {
            syncScreenVisibility(newScreen);
            if (!history.state || history.state.screen !== newScreen) {
                history.pushState({ screen: newScreen }, '', window.location.href);
            }
        }
    },
    methods: {
        showScreen(screenId, skipHistory = false) {
            this.currentScreen = screenId;
            if (!skipHistory && (!history.state || history.state.screen !== screenId)) {
                history.pushState({ screen: screenId }, '', window.location.href);
            }
            if (typeof app !== 'undefined' && app.currentScreenId !== screenId) {
                app.currentScreenId = screenId;
            }
        },
        selectRoom(room) {
            this.currentRoom = room;
            if (typeof app !== 'undefined' && app.selectRoom) {
                app.selectRoom(room);
            }
        },
        setPlayerName(name) {
            this.myPlayerName = name;
            if (typeof app !== 'undefined') {
                app.myPlayerName = name;
            }
        },
        setAuthFlag(flag) {
            this.isAuthenticatedUser = flag;
            if (typeof app !== 'undefined') {
                app.isAuthenticatedUser = flag;
            }
        },
        setMusWhitelist(list) {
            this.musWhitelist = list;
            if (typeof app !== 'undefined') {
                app.musWhitelist = list;
            }
        },
        setHubRooms(rooms) {
            this.hubRooms = rooms;
            if (typeof app !== 'undefined') {
                // keep existing hub room render logic as backup
            }
        },
        setAuthRequests(requests) {
            this.authRequests = requests;
            if (typeof app !== 'undefined') {
                // keep existing auth requests push
            }
        }
    },
    mounted() {
        // Rebote de state al app central
        if (typeof app !== 'undefined') {
            const oldShowScreen = app.showScreen.bind(app);
            app.showScreen = (screenId, skipHistory = false) => {
                this.showScreen(screenId, skipHistory);
                oldShowScreen(screenId, skipHistory);
            };

            const oldSelectRoom = app.selectRoom && app.selectRoom.bind(app);
            app.selectRoom = (room) => {
                this.selectRoom(room);
                if (oldSelectRoom) oldSelectRoom(room);
            };

            // Hook para whitelist</
            socket.on('updateMusWhitelist', (list) => {
                this.setMusWhitelist(list || []);
            });

            socket.on('hubRoomsUpdate', (rooms) => {
                this.setHubRooms(rooms || []);
            });

            socket.on('authRequestsList', (data) => {
                this.setAuthRequests((data && data.requests) || []);
            });

            // Iniciar en hub si no hay otro valor
            this.currentScreen = app.currentScreenId || 'hubScreen';
            syncScreenVisibility(this.currentScreen);
            this.myPlayerName = app.myPlayerName;
            this.isAuthenticatedUser = app.isAuthenticatedUser;

            window.addEventListener('popstate', (event) => {
                const target = event.state ? event.state.screen : 'hubScreen';
                this.currentScreen = target;
                syncScreenVisibility(target);
            });
        }
    }
});

appVue.mount('#app-vue-anchor');

window.appVue = appVue;
window.appVueState = appVueState;
