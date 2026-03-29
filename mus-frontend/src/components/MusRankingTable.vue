<template>
  <div class="mus-table-wrapper">
    <table class="mus-table">
        <thead>
            <tr>
                <th>{{ modo === 'ranking_pair' ? 'Pareja' : 'Jugador' }}</th>
                <th>% WR</th>
                <th>DGP</th>
                <th>R.G.</th>
                <th>R.P.</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="r in rows" :key="r.name">
                <td class="sticky-col">
                    <span v-if="modo === 'ranking_player'">
                        <span class="avatar">{{ getAvatar(r.name) }}</span> {{ r.name }}
                    </span>
                    <span v-else>
                        {{ formatPairName(r.name) }}
                    </span>
                </td>
                <td :style="{ color: getWinRateColor(r.pct), fontWeight: 900 }">
                    {{ r.pct.toFixed(1) }}%
                </td>
                <td :style="{ color: r.dgp > 0 ? '#2ed573' : '#ff4757' }">
                    {{ r.dgp > 0 ? '+' : '' }}{{ r.dgp }}
                </td>
                <td style="color: #2ed573">{{ r.rWon }}</td>
                <td style="color: #ff4757">{{ r.rLost }}</td>
            </tr>
        </tbody>
    </table>
  </div>
</template>

<script setup>
import { getAvatar } from '../utils/musLogic';

const props = defineProps({
    rows: Array,
    modo: String
});

const formatPairName = (name) => {
    const [n1, n2] = name.split(' y ');
    return `${getAvatar(n1)}${n1} & ${getAvatar(n2)}${n2}`;
};

const getWinRateColor = (pct) => {
    const hue = 120 + ((pct / 100) * 120 - 60); // Degradado de rojo a verde
    return `hsl(${hue}, 85%, 60%)`;
};
</script>

<style scoped>
.sticky-col { font-weight: bold; }
.avatar { margin-right: 5px; }
</style>