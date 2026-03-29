<template>
  <div class="mus-room-header">
    <div class="room-controls">
        <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
            <option value="ABSOLUTA">⭐ ABSOLUTA (Todas)</option>
            <option v-for="room in salas" :key="room.name" :value="room.name">
                {{ room.isTournament ? '🏆 ' : '' }}{{ room.name }}
            </option>
        </select>
        <button v-if="esAdmin" @click="$emit('crear-sala')" class="add-room-btn">+</button>
    </div>
  </div>
</template>

<script setup>
defineProps(['modelValue', 'salas', 'esAdmin']);
defineEmits(['update:modelValue', 'crear-sala']);
</script>

<style scoped>
select {
    flex: 1; font-family: 'Cinzel', serif; font-weight: bold;
    background: #ffffff !important; color: #1b4332 !important;
    border: 2px solid #1b4332; border-radius: 4px; padding: 10px;
    box-shadow: 0 4px 0 #0b2416;
}
.add-room-btn {
    background: #27ae60; color: white; padding: 10px 15px;
    border-radius: 4px; box-shadow: 0 4px 0 #1e8449; font-weight: 900;
}
</style>