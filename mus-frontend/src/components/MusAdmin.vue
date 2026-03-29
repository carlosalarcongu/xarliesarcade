<template>
  <div class="admin-panel-vue">
    <h3>⚙️ Panel de Administración</h3>
    <div class="card">
        <h4>👤 Jugadores</h4>
        <div class="scroll-list">
            <div v-for="p in jugadores" :key="p" class="admin-row">
                <span>{{ p }}</span>
                <div class="btn-group">
                    <button @click="rename(p)" class="blue-btn">✏️</button>
                    <button @click="remove(p)" class="red-btn">🗑️</button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ jugadores: Array });
const rename = (name) => {
    const nuevo = prompt("Nuevo nombre:", name);
    if(nuevo) window.socket.emit('mus_action', { type: 'adminEditPlayer', value: { oldName: name, newName: nuevo } });
};
const remove = (name) => {
    if(confirm(`¿Borrar a ${name}?`)) window.socket.emit('mus_action', { type: 'adminDeletePlayer', value: name });
};
</script>

<style scoped>
.admin-row { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #444; }
.scroll-list { max-height: 300px; overflow-y: auto; text-align: left; }
.btn-group button { padding: 5px 10px; margin-left: 5px; }
.blue-btn { background: #3498db; }
.red-btn { background: #e74c3c; }
</style>