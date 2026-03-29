<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="card card-mus">
        <h3 class="fournier-title-mini">Anotar Partida</h3>
        <div class="teams-grid">
            <div class="team blue">
                <h4>Pareja 1</h4>
                <select v-model="form.p1"><option v-for="p in available(form.p1)" :value="p">{{p}}</option></select>
                <select v-model="form.p2"><option v-for="p in available(form.p2)" :value="p">{{p}}</option></select>
                <div class="score-ctrl">
                    <button @click="form.s1--">-</button><span>{{ form.s1 }}</span><button @click="form.s1++">+</button>
                </div>
            </div>
            <div class="vs">VS</div>
            <div class="team red">
                <h4>Pareja 2</h4>
                <select v-model="form.p3"><option v-for="p in available(form.p3)" :value="p">{{p}}</option></select>
                <select v-model="form.p4"><option v-for="p in available(form.p4)" :value="p">{{p}}</option></select>
                <div class="score-ctrl">
                    <button @click="form.s2--">-</button><span>{{ form.s2 }}</span><button @click="form.s2++">+</button>
                </div>
            </div>
        </div>
        <div class="actions">
            <button @click="$emit('cerrar')" class="cancel">Cancelar</button>
            <button @click="enviar" class="save">Guardar</button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
const props = defineProps(['mostrar', 'jugadores']);
const emit = defineEmits(['cerrar', 'guardar']);
const form = reactive({ p1:'', p2:'', p3:'', p4:'', s1:0, s2:0 });

const available = (current) => props.jugadores.filter(p => 
    p === current || ![form.p1, form.p2, form.p3, form.p4].includes(p)
);

const enviar = () => {
    if(!form.p1 || !form.p2 || !form.p3 || !form.p4) return alert("Completa los jugadores");
    emit('guardar', {...form});
};
</script>

<style scoped>
.teams-grid { display: flex; align-items: center; gap: 10px; }
.team { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.score-ctrl { display: flex; justify-content: center; align-items: center; gap: 10px; font-size: 1.5em; }
.card-mus { background: #fcf8ec !important; border: 2px solid #111 !important; color: #111 !important; }
.fournier-title-mini { color: #b31b1b; font-family: 'Cinzel', serif; }
.actions { display: flex; gap: 10px; margin-top: 15px; }
.save { background: #e1b12c; flex: 1; }
.cancel { background: #aaa; flex: 1; }
</style>