<template>
  <div class="analysis">
    <div class="card card-fournier">
        <h3 v-if="tipo === 'predictor'">🔮 Oráculo de Partidas</h3>
        <h3 v-else>🔬 Examinar {{ tipo === 'examinar_persona' ? 'Persona' : 'Pareja' }}</h3>
        
        <div class="select-grid">
            <select v-model="s1">
                <option value="">-- Jugador 1 --</option>
                <option v-for="p in jugadores" :key="p" :value="p">{{p}}</option>
            </select>
            <select v-model="s2">
                <option value="">-- Jugador 2 --</option>
                <option v-for="p in jugadores" :key="p" :value="p" :disabled="p === s1">{{p}}</option>
            </select>
        </div>

        <button v-if="s1 && s2" class="main-btn-aux" @click="procesar">
            {{ tipo === 'predictor' ? 'SIMULAR' : 'GENERAR GRÁFICA' }}
        </button>

        <div class="chart-container" v-show="showChart">
            <canvas ref="canvasRef"></canvas>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps(['tipo', 'jugadores', 'partidas']);
const s1 = ref(''); const s2 = ref('');
const canvasRef = ref(null);
const showChart = ref(false);
let chartInstance = null;

const procesar = () => {
    if(props.tipo === 'predictor') {
        alert("Probabilidad de victoria: " + (Math.random() * 100).toFixed(1) + "%");
    } else {
        showChart.value = true;
        renderChart();
    }
};

const renderChart = () => {
    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvasRef.value, {
        type: 'line',
        data: {
            labels: ['P1', 'P2', 'P3', 'P4'],
            datasets: [{ label: 'Evolución %', data: [45, 52, 48, 60], borderColor: '#58c322', tension: 0.3 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};
</script>

<style scoped>
.select-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
.chart-container { height: 250px; margin-top: 20px; background: white; border-radius: 8px; padding: 10px; }
.card-fournier { border: 2px solid #1b5e20 !important; background: #fcf8ec !important; color: #111 !important; }
</style>