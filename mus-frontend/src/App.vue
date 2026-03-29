<template>
  <div class="mus-island">
    <div class="back-nav">
        <button @click="volver" class="mus-glass-btn">⬅ Volver</button>
    </div>

    <h2 class="fournier-badge">🐄 Registro de Mus</h2>

    <MusRoomSelector v-model="sala" :salas="salas" :esAdmin="esAdmin" />

    <MusControls 
        v-model:periodo="periodo" v-model:vista="vista" 
        :esAdmin="esAdmin" @add-match="modalPartida = true" 
    />

    <MusRankingTable v-if="vista.startsWith('ranking')" :rows="ranking" :modo="vista" />
    
    <MusMatchLog v-if="vista === 'recent_log'" :matches="partidas" :currentUser="user" />

    <MusAnalysis v-if="vista.includes('examinar') || vista === 'predictor'" 
        :tipo="vista" :jugadores="jugadores" :partidas="partidas" />

    <MusAdmin v-if="vista === 'administracion'" :jugadores="jugadores" />

    <MusAddMatchModal :mostrar="modalPartida" :jugadores="jugadores" 
        @cerrar="modalPartida = false" @guardar="enviarPartida" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { calculateRanking } from './utils/musStats';
import MusRoomSelector from './components/MusRoomSelector.vue';
import MusControls from './components/MusControls.vue';
import MusRankingTable from './components/MusRankingTable.vue';
import MusMatchLog from './components/MusMatchLog.vue';
import MusAnalysis from './components/MusAnalysis.vue';
import MusAdmin from './components/MusAdmin.vue';
import MusAddMatchModal from './components/MusAddMatchModal.vue';

const sala = ref('ABSOLUTA'); const vista = ref('ranking_player'); const periodo = ref('all');
const salas = ref([]); const partidas = ref([]); const jugadores = ref([]);
const user = ref(''); const esAdmin = ref(false); const modalPartida = ref(false);

const ranking = computed(() => calculateRanking(partidas.value, vista.value));

onMounted(() => {
    window.addEventListener('iniciar-mus', e => {
        user.value = e.detail.jugador;
        esAdmin.value = ['xarlie', 'japa', 'administrador m'].includes(user.value.toLowerCase());
        window.socket.emit('mus_action', { type: 'getData' });
    });
    window.socket.on('mus_data', d => {
        salas.value = d.rooms; partidas.value = d.matches; jugadores.value = d.players;
    });
});

const volver = () => window.app.goBackToHub();
const enviarPartida = (m) => {
    window.socket.emit('mus_action', { type: 'addMatch', value: { ...m, roomId: sala.value, addedBy: user.value }});
    modalPartida.value = false;
};
</script>

<style>
.mus-island {
    font-family: 'Cinzel', serif !important;
    background: #1b4332 url('/css/image.png') repeat !important;
    background-size: 120px !important;
    min-height: 100vh; width: 100%; padding: 20px;
}
.fournier-badge {
    background: #fcf8ec; color: #b31b1b; border: 2px solid #111;
    padding: 10px 30px; border-radius: 8px; display: inline-block;
    box-shadow: 0 8px 15px rgba(0,0,0,0.4); margin: 20px auto;
}
.mus-glass-btn {
    background: rgba(255,255,255,0.1); border: 2px solid #2d6a4f;
    color: white; padding: 8px 15px; backdrop-filter: blur(5px);
}
</style>