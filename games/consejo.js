const Utils = require('./utils');

// Base de datos de preguntas
const TOPICS = {
    'DEEP': {
        label: '🍷 Filosofía de Bar',
        questions: [
            "¿Preferirías ser recordado por algo malo o olvidado por completo?",
            "¿Qué parte de tu personalidad finges?",
            "¿Cuál es tu mayor inseguridad?",
            "¿Te consideras una buena persona realmente?",
            "¿Qué cambiarías de tu infancia?",
            "¿A quién envidias en secreto?",
            "¿Qué es lo que más miedo te da perder?",
            "¿Qué verdad sobre ti casi nadie sabe?",
            "¿Crees que mereces la vida que tienes?",
            "¿Qué te hace sentir pequeño?",
            "¿Has traicionado tus propios valores alguna vez?",
            "¿Qué harías si supieras que no puedes fallar?",
            "¿Te da miedo la soledad o el silencio?",
            "¿Qué opinas que la gente piensa de ti?",
            "¿Cuál es tu mayor arrepentimiento?",
            "¿Qué harías diferente si nacieras otra vez?",
            "¿Qué te impide ser completamente feliz?",
            "¿Te quieres a ti mismo de verdad?",
            "¿Qué parte de tu pasado borrarías?",
            "¿Qué mentira te dices para dormir tranquilo?",
            "¿Qué persona te cambió para siempre?",
            "¿Qué es el éxito para ti realmente?",
            "¿Te has sentido fracasado?",
            "¿Qué sacrificio no estarías dispuesto a hacer?",
            "¿Qué secreto te pesa todavía?",
            "¿Has amado más de lo que te han amado?",
            "¿Perdonas fácilmente o acumulas rencor?",
            "¿Qué te gustaría que dijeran en tu funeral?",
            "¿Qué te hace sentir vivo?",
            "¿Te asusta el paso del tiempo?",
            "¿Cuál es tu mayor contradicción?",
            "¿Qué cambiarías de la sociedad actual?",
            "¿Qué harías si nadie pudiera juzgarte?",
            "¿Te has sentido reemplazable?",
            "¿Cuál es tu mayor miedo irracional?",
            "¿Crees en el destino?",
            "¿Te has autosaboteado?",
            "¿Qué es lo más egoísta que has hecho?",
            "¿Qué parte de ti ocultas siempre?",
            "¿Qué te gustaría confesar ahora mismo?",
            "¿Qué valoras más: lealtad o sinceridad?",
            "¿Qué relación te marcó negativamente?",
            "¿Has roto el corazón de alguien?",
            "¿Qué te hace sentir orgulloso?",
            "¿Qué hábito odias de ti?",
            "¿Te comparas constantemente?",
            "¿Qué significa libertad para ti?",
            "¿Qué cambiarías de tu personalidad?",
            "¿Te perdonas tus errores?",
            "¿Qué te gustaría entender mejor de ti?"
        ]
    },

    'DILEMA': {
        label: '⚖️ Dilemas Morales',
        questions: [
            "¿Mentir para proteger a alguien o decir la verdad y destruirlo?",
            "¿Salvar a tu mejor amigo culpable o entregar justicia?",
            "¿Ser rico pero odiado o pobre pero amado?",
            "¿Renunciar a tus sueños por tu familia?",
            "¿Vivir sin internet o sin amigos?",
            "¿Traicionar para sobrevivir?",
            "¿Borrar una mala decisión o aprender de ella?",
            "¿Ser feliz sin saberlo o infeliz sabiendo la verdad?",
            "¿Amor intenso pero corto o estable pero aburrido?",
            "¿Decir siempre lo que piensas o callar para evitar conflictos?",
            "¿Volver con tu ex sabiendo que saldrá mal?",
            "¿Elegir pasión o estabilidad?",
            "¿Ser el villano en la historia de alguien?",
            "¿Perder tu orgullo o perder a alguien?",
            "¿Vivir eternamente solo o 30 años acompañado?",
            "¿Tener razón o mantener la paz?",
            "¿Sacrificar tu felicidad por la de otro?",
            "¿Denunciar a un amigo por algo grave?",
            "¿Guardar un secreto que daña?",
            "¿Ser completamente honesto siempre?",
            "¿Aceptar dinero sucio para una buena causa?",
            "¿Salvar a un culpable o dejar morir a un inocente por error?",
            "¿Cambiar tu pasado o conocer tu futuro?",
            "¿Dejar tu país por amor?",
            "¿Abandonar un sueño imposible?",
            "¿Elegir entre tus padres?",
            "¿Salvar tu reputación o tu conciencia?",
            "¿Ser amado o respetado?",
            "¿Vivir cómodo pero mediocre o arriesgar y fallar?",
            "¿Perder el amor de tu vida o tu mejor amigo?",
            "¿Confesar algo que arruina todo?",
            "¿Ser completamente libre pero solo?",
            "¿Casarte sin amor por estabilidad?",
            "¿Traicionar por dinero?",
            "¿Aceptar un error que no cometiste?",
            "¿Perdonar una gran traición?",
            "¿Arruinar tu carrera por amor?",
            "¿Elegir entre pasión o seguridad?",
            "¿Decir una verdad que duele?",
            "¿Ser vulnerable o parecer fuerte?",
            "¿Vivir sabiendo una verdad horrible?",
            "¿Tener hijos sabiendo el mundo que viene?",
            "¿Renunciar a tu vocación?",
            "¿Aceptar un trato injusto?",
            "¿Dejar ir o insistir?",
            "¿Romper una promesa por algo mayor?",
            "¿Priorizarte o priorizar siempre a otros?",
            "¿Elegir corazón o cabeza?",
            "¿Callar una injusticia?"
        ]
    },

    'CALIENTE': {
        label: '🔥 Salseo / +18',
        questions: [
            "¿Te han pillado en una situación vergonzosa?",
            "¿Te atrae alguien aquí ahora mismo?",
            "¿Has fingido interés por alguien?",
            "¿Qué es lo más tóxico que has hecho en pareja?",
            "¿Has revisado el móvil de alguien?",
            "¿Te han roto el corazón o lo has roto tú?",
            "¿Te arrepientes de alguna relación?",
            "¿Qué es lo más impulsivo que has hecho por atracción?",
            "¿Te has enamorado de alguien prohibido?",
            "¿Qué es lo más celoso que has sido?",
            "¿Has mentido sobre tu pasado amoroso?",
            "¿Te han gustado dos personas a la vez?",
            "¿Has usado a alguien para olvidar a otra persona?",
            "¿Qué red flag ignoraste?",
            "¿Te atraen más las personalidades o el físico?",
            "¿Te han rechazado duramente?",
            "¿Has rechazado cruelmente?",
            "¿Te ha gustado la pareja de un amigo?",
            "¿Has sentido obsesión por alguien?",
            "¿Te han comparado con un ex?",
            "¿Has comparado a tu pareja con otra persona?",
            "¿Te has quedado por miedo a estar solo?",
            "¿Has tenido una relación secreta?",
            "¿Te han mentido gravemente en pareja?",
            "¿Has hecho ghosting?",
            "¿Te han hecho ghosting?",
            "¿Has vuelto por costumbre?",
            "¿Te consideras celoso?",
            "¿Te gusta provocar celos?",
            "¿Has tenido una cita que salió desastrosa?",
            "¿Te arrepientes de alguien que dejaste ir?",
            "¿Te ha gustado alguien mucho mayor?",
            "¿Mucho menor?",
            "¿Has confundido deseo con amor?",
            "¿Has tenido una fantasía con alguien inesperado?",
            "¿Te atrae más lo prohibido?",
            "¿Has jugado con los sentimientos de alguien?",
            "¿Te han utilizado?",
            "¿Has dicho “te quiero” sin sentirlo?",
            "¿Te han dicho “te quiero” sin sentirlo?",
            "¿Te enamoras rápido?",
            "¿Has sido dependiente emocionalmente?",
            "¿Te da miedo el compromiso?",
            "¿Te aburren las relaciones largas?",
            "¿Has idealizado demasiado a alguien?",
            "¿Te han idealizado a ti?",
            "¿Te atraen más las personas difíciles?"
        ]
    },
    '4AM': {
        label: '🌌 Conversaciones a las 4 A.M.',
        questions: [
            "¿Y si todo lo que recuerdas nunca ocurrió realmente?",
            "¿Somos la misma persona que éramos hace 10 años?",
            "Si el universo no tiene propósito, ¿deberíamos tenerlo nosotros?",
            "¿La conciencia es un accidente o algo inevitable?",
            "¿Y si el libre albedrío es solo una ilusión química?",
            "¿Preferirías vivir en una mentira feliz o en una verdad dolorosa?",
            "¿Qué significa realmente existir?",
            "Si pudieras observar tu vida como espectador, ¿te caerías bien?",
            "¿El amor es una construcción social o algo trascendental?",
            "¿El tiempo existe o es una forma de medir el cambio?",
            "¿Somos nuestros pensamientos o quien los observa?",
            "¿Y si la muerte es simplemente despertar en otro plano?",
            "¿Puede haber moral objetiva sin religión?",
            "¿Qué nos hace “yo” y no otra persona?",
            "¿El sufrimiento tiene algún propósito real?",
            "Si borráramos todos los recuerdos, ¿seguirías siendo tú?",
            "¿Qué pesa más: lo que hiciste o lo que no te atreviste a hacer?",
            "¿Y si estamos viviendo el recuerdo de alguien más?",
            "¿La realidad depende de quien la percibe?",
            "¿La inteligencia artificial podría llegar a tener alma?",
            "¿Qué significa realmente perdonar?",
            "¿Somos más libres de lo que creemos o menos?",
            "¿La felicidad es un estado o una decisión?",
            "¿El universo nos debe algo?",
            "¿Qué da más miedo: no significar nada o significarlo todo?",
            "¿El caos gobierna más que el orden?",
            "¿Y si el sentido de la vida es simplemente experimentarla?",
            "¿Qué nos diferencia realmente de los animales?",
            "¿Existe el bien sin el mal?",
            "¿Qué pasaría si mañana despertaras en otro cuerpo?",
            "¿La identidad es estable o cambia constantemente?",
            "¿El recuerdo es más real que el presente?",
            "¿Qué es más fuerte: la razón o la emoción?",
            "¿El destino se construye o se descubre?",
            "¿Y si el universo es consciente de sí mismo a través de nosotros?",
            "¿La soledad es ausencia de otros o desconexión interior?",
            "¿Puede alguien conocerse completamente?",
            "¿Somos protagonistas o extras en la historia del mundo?",
            "¿Qué ocurriría si todos dijéramos exactamente lo que pensamos?",
            "¿La muerte le da valor a la vida?",
            "¿Qué sería de ti sin tu historia?",
            "¿La realidad es objetiva o una interpretación colectiva?",
            "¿El miedo nos limita o nos protege?",
            "¿Es posible amar sin poseer?",
            "¿Cuánto de lo que somos es elección y cuánto circunstancia?",
            "¿La memoria crea identidad o la identidad crea memoria?",
            "¿Puede el ser humano evolucionar moralmente?",
            "¿Estamos destinados a repetir nuestros errores como especie?",
            "¿Qué es más real: lo que sentimos o lo que pensamos?",
            "¿Y si esta no es la primera vez que vivimos esta vida?"
        ]
    },
};

const rooms = {};

function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: [], // Lista simple de nombres (strings) para la ruleta
        gameInProgress: true // Siempre true, es una herramienta
    };
    return rooms[roomId];
}

const handleSocket = (io, socket) => {
    socket.on('consejo_action', (action) => {
        const roomId = socket.data.roomId;
        const room = rooms[roomId];
        if (!room) return;

        if (action.type === 'getTopics') {
            const list = Object.keys(TOPICS).map(k => ({ id: k, label: TOPICS[k].label }));
            socket.emit('consejoTopics', list);
        }

        // Gestión de nombres
        if (action.type === 'addName') {
            const name = action.value.trim();
            if (name && !room.players.includes(name)) {
                room.players.push(name);
                io.to(socket.id).emit('consejoUpdateNames', room.players);
            }
        }

        if (action.type === 'removeName') {
            room.players = room.players.filter(n => n !== action.value);
            io.to(socket.id).emit('consejoUpdateNames', room.players);
        }

        // Acciones del juego
        if (action.type === 'spinQuestion') {
            const cat = action.category || 'DEEP';
            const db = TOPICS[cat] ? TOPICS[cat].questions : TOPICS['DEEP'].questions;
            const randomQ = db[Math.floor(Math.random() * db.length)];
            
            io.to(socket.id).emit('consejoResult', { type: 'question', value: randomQ });
        }

        if (action.type === 'spinPlayer') {
            if (room.players.length === 0) return socket.emit('errorMsg', "Añade nombres a la lista primero.");
            const randomP = room.players[Math.floor(Math.random() * room.players.length)];
            io.to(socket.id).emit('consejoResult', { type: 'player', value: randomP });
        }
    });
};

const handleJoin = (socket, name, targetRoomId) => {
    // En este modo, cada usuario tiene su propia "sala" privada prácticamente,
    // o pueden compartirla si usan el mismo ID, pero no hay lobby.
    
    // Si no hay ID, generamos uno aleatorio o usamos el nombre del usuario como ID base
    const roomId = targetRoomId === 'NEW' ? `CONSEJO-${Math.floor(Math.random()*1000)}` : targetRoomId;
    
    let room = rooms[roomId];
    if (!room) room = createRoom(roomId);

    socket.join(roomId); // Aunque no usemos broadcast, mantenemos estructura
    socket.data.roomId = roomId;

    // Emitir éxito directo sin pasar por lobby
    socket.emit('joinedSuccess', { 
        playerId: socket.id, 
        name: name, 
        room: 'consejo', 
        roomId: roomId 
    });

    // Enviar estado inicial
    socket.emit('consejoUpdateNames', room.players);
    const list = Object.keys(TOPICS).map(k => ({ id: k, label: TOPICS[k].label }));
    socket.emit('consejoTopics', list);
};

// Rejoin y Leave genéricos
const handleRejoin = (socket, savedId, savedRoomId) => {
    handleJoin(socket, "Sabio", savedRoomId); // Simplificado: reconexión directa
};

const handleLeave = (playerId, roomId, io) => {
    // No hace falta lógica compleja aquí para este modo
};

module.exports = {
    init: (io) => {},
    handleSocket,
    handleJoin,
    handleRejoin,
    handleLeave
};