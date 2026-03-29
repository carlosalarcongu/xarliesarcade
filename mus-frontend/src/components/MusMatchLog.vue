<template>
  <div class="mus-table-wrapper">
    <table class="mus-table">
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Resultado</th>
                <th>Autor</th>
                <th>Acción</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="m in matches" :key="m.id">
                <td style="font-size: 0.8em; color: #aaa">{{ formatDate(m.date) }}</td>
                <td v-html="formatResult(m)"></td>
                <td style="color: #e1b12c">{{ m.addedBy }}</td>
                <td>
                    <button v-if="canDelete(m)" @click="deleteMatch(m.id)" class="kick-btn2">🗑️</button>
                </td>
            </tr>
        </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
    matches: Array,
    currentUser: String,
    isAdmin: Boolean
});

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
};

const formatResult = (m) => {
    return `<span style="color:#74b9ff">${m.p1}+${m.p2}</span> (${m.s1})<br>vs<br><span style="color:#ff7675">${m.p3}+${m.p4}</span> (${m.s2})`;
};

const canDelete = (m) => {
    return props.isAdmin || (props.currentUser && props.currentUser.toLowerCase() === (m.addedBy || "").toLowerCase());
};

const deleteMatch = (id) => {
    if(confirm('¿Borrar partida?')) {
        window.socket.emit('mus_action', { type: 'deleteMatch', id, user: props.currentUser });
    }
};
</script>