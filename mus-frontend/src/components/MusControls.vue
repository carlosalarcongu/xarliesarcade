<template>
  <div style="width: 100%;">
    <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 10px; border: 1px dashed #e1b12c; margin-bottom: 15px; width: 100%;">
        <div style="display: flex; justify-content: center; gap: 10px; width: 100%;">
            <button class="kick-btn" style="flex: 1; font-size: 0.8em; margin: 0;" @click="$emit('add-player')">+ Jugador</button>
            <button class="kick-btn" style="flex: 1; font-size: 0.8em; margin: 0;" @click="$emit('add-match')">+ Partida</button>
        </div>
    </div>

    <div class="card" style="padding: 15px; margin-bottom: 15px; background: #222; border: 1px solid #444; width: 100%;">
        <div style="display: flex; gap: 10px; width: 100%; align-items: flex-end;">
            <div style="flex: 1; text-align: left;">
                <label style="color: #aaa; font-size: 0.8em;">Periodo:</label>
                <select :value="periodo" @change="$emit('update:periodo', $event.target.value)" style="width: 100%; font-size: 0.9em; margin-top: 5px; margin-bottom: 0;">
                    <option value="all">Siempre</option>
                    <option value="7days">Últimos 7 días</option>
                    <option value="30days">Últimos 30 días</option>
                    <option value="year">Este año</option>
                </select>
            </div>
            <div style="flex: 2; text-align: left;">
                <label style="color: #aaa; font-size: 0.8em;">Vista:</label>
                <select :value="vista" @change="$emit('update:vista', $event.target.value)" style="width: 100%; font-size: 0.9em; margin-top: 5px; margin-bottom: 0;">
                    <option value="ranking_pair">🏆 Ranking Parejas</option>
                    <option value="ranking_player">👤 Ranking Individual</option>
                    <option value="recent_log">📝 Historial Partidas</option>
                    <option value="examinar_persona">🔬 Examinar Persona</option>
                    <option value="examinar_pareja">🔬 Examinar Pareja</option>
                    <option value="rachas">🔥 Rachas y Curiosidades</option>
                    <option value="predictor">🔮 Predictor de Partidas</option>
                    <option v-if="esAdmin" value="administracion">⚙️ Administración</option>
                </select>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
    periodo: String,
    vista: String,
    esAdmin: Boolean
});
defineEmits(['update:periodo', 'update:vista', 'add-player', 'add-match']);
</script>