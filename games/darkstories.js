const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../arcade.db'));

// Inicializar la tabla general de datos de juego
db.prepare(`
    CREATE TABLE IF NOT EXISTS ds_data (
        id_juego TEXT,
        id_unitario TEXT UNIQUE,
        dificultad TEXT,
        categoria TEXT,
        enunciado TEXT,
        nombre TEXT,
        texto TEXT,
        aux1 TEXT,
        aux2 TEXT,
        aux3 TEXT,
        aux4 TEXT
    )
`).run();

console.log("Sincronizando catálogo de Dark Stories...");

// Usamos INSERT OR IGNORE para que si la historia ya existe (mismo id_unitario), no la duplique ni dé error.
// Así, en el futuro solo tienes que añadir nuevos objetos al array 'seedData' y reiniciar el servidor.
const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO ds_data 
    (id_juego, id_unitario, dificultad, categoria, enunciado, nombre, texto) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const seedData = [
    
    { id: "EAI", dif: "EASY", cat: "Lógica Directa", nom: "El Arma Invisible", 
        enu: "Un hombre yace muerto en un charco de agua y sangre en una habitación vacía.", 
        res: "El asesino utilizó un cuchillo hecho de hielo. Tras cometer el crimen, el arma se derritió, dejando solo el agua como rastro, por eso no se encontró ningún arma." },
    { id: "LCF", dif: "HARD", cat: "Lógica inDirecta", nom: "La Carta Fatal", 
        enu: "Una mujer muere justo después de abrir una carta que esperaba con ilusión.", 
        res: "La mujer era extremadamente alérgica. Dentro del sobre había una sustancia que desencadenó un shock anafiláctico mortal al entrar en contacto con ella." },
    { id: "ESS", dif: "EASY", cat: "Lógica Directa", nom: "El Salto Seguro", 
        enu: "Un hombre lanza a un niño desde un edificio hacia el suelo y sobrevive.", 
        res: "El edificio era un castillo de arena. El niño sufrió una caída de menos de un metro, por lo que la caída no fue peligrosa." },
    { id: "ESS2", dif: "MEDIUM", cat: "Lógica Directa", nom: "El Susto Salvador", 
        enu: "Un hombre entra en un bar y pide agua. El camarero le apunta con un arma. El hombre da las gracias y se va.", 
        res: "El cliente tenía hipo. El camarero, al asustarlo con el arma, le provocó un susto suficiente para curarlo, por eso le agradece y se marcha." },
    { id: "PBL", dif: "EASY", cat: "Lógica Directa", nom: "Paseo Bajo la Lluvia", 
        enu: "Un hombre se moja y muere poco después.", 
        res: "El hombre entró en contacto con un cable eléctrico suelto mientras estaba mojado. El agua facilitó la conducción de electricidad y murió electrocutado." },
    { id: "ERF", dif: "MEDIUM", cat: "Lógica Directa", nom: "El Reflejo Final", 
        enu: "Una mujer grita al verse en el espejo y muere instantes después.", 
        res: "Al mirar el espejo, vio reflejado detrás de ella a su asesino con un arma. El grito fue su reacción antes de ser atacada." },
    { id: "OM", dif: "EASY", cat: "Lógica Directa", nom: "Oscuridad Mortal", 
        enu: "Un hombre muere porque se va la luz.", 
        res: "Dependía de un respirador eléctrico para vivir. Al producirse el apagón, la máquina dejó de funcionar y falleció." },
    { id: "LCA", dif: "EASY", cat: "Lógica inDirecta", nom: "La Caída Aplaudida", 
        enu: "Un hombre se cae y todos empiezan a aplaudir.", 
        res: "Se encontraba en una obra de teatro. La caída formaba parte de la actuación, y el público reaccionó con aplausos." },
    { id: "ERM", dif: "EASY", cat: "Lógica Directa", nom: "El Regalo Mortal", 
        enu: "Un hombre muere tras recibir un regalo.", 
        res: "El paquete contenía un artefacto explosivo preparado para detonarse al abrirlo, causando su muerte." },
    { id: "LPC", dif: "EASY", cat: "Lógica Directa", nom: "La Puerta que Condenó", 
        enu: "Un hombre muere por no abrir una puerta.", 
        res: "Había un incendio al otro lado. Al no abrirla a tiempo para escapar, quedó atrapado y murió por el humo y las llamas." },
    { id: "EAT", dif: "EASY", cat: "Lógica Directa", nom: "El Asiento Trampa", 
        enu: "Un hombre muere al sentarse.", 
        res: "La silla estaba manipulada y electrificada. Al sentarse, cerró el circuito y recibió una descarga mortal." },
    
    { id: "LCE", dif: "EASY", cat: "Lógica Directa", nom: "La Cerilla Encendida", 
        enu: "Un hombre enciende una cerilla y muere inmediatamente.", 
        res: "Había una fuga de gas en la habitación. Al encender el fósforo, provocó una explosión que lo mató." },
    { id: "LCF2", dif: "EASY", cat: "Lógica Directa", nom: "La Carrera Final", 
        enu: "Un hombre corre y muere.", 
        res: "Tras realizar un gran esfuerzo físico durante una carrera, sufrió un infarto al corazón y falleció." },
    { id: "DAL", dif: "EASY", cat: "Situaciones Cotidianas", nom: "Despertar en Otro Lugar", 
        enu: "Sonia se duerme muy cansada y al despertar está en un lugar completamente distinto.", 
        res: "Sonia estaba viajando en avión. Se durmió durante el trayecto y al despertar ya habían llegado a otra ciudad." },
    { id: "LNR", dif: "EASY", cat: "Situaciones Cotidianas", nom: "La Noche de Ruido", 
        enu: "Una mujer oye explosiones y gritos fuera, luego todo queda en silencio y se va a dormir.", 
        res: "Era la celebración de Año Nuevo. Esperó a que terminaran los fuegos artificiales y el ruido para irse a dormir tranquila." },
    { id: "SSH", dif: "EASY", cat: "Situaciones Cotidianas", nom: "Salida sin Huida", 
        enu: "Un hombre pasa el día en prisión y por la noche sale sin problemas.", 
        res: "Trabajaba allí, no era un preso. Era el jardinero o personal del centro, por lo que podía entrar y salir libremente." },
    { id: "PE", dif: "MEDIUM", cat: "Relaciones Humanas", nom: "Puerta Equivocada", 
        enu: "Un hombre vuelve de viaje, toca una puerta y acusa a su esposa de traición.", 
        res: "Se equivocó de casa. La mujer que abrió la puerta era su esposa, pero estaba en casa de otro hombre." },
    { id: "EAM", dif: "MEDIUM", cat: "Lógica Directa", nom: "El Aplauso Mortal", 
        enu: "Un hombre aplaude y todos los presentes mueren.", 
        res: "No eran personas, eran mosquitos. Al aplaudir, los aplastó y los mató." },

    { id: "EBQ", dif: "HARD", cat: "Accidentes Extraños", nom: "El Buceador Quemado", 
        enu: "Cuando Pablo salió a bucear, nunca pensó que moriría calcinado.", 
        res: "Un hidroavión recogió agua de un lago sin ver al buceador. Lo succionó y lo lanzó sobre un incendio forestal, donde murió quemado." },
    { id: "LHS", dif: "MEDIUM", cat: "Encierros", nom: "La Habitación Sellada", 
        enu: "Un hombre aparece muerto en una habitación cerrada sin ventanas ni puertas abiertas.", 
        res: "Se encontraba dentro de una cámara frigorífica que se cerró automáticamente desde fuera, quedando atrapado hasta morir." },
    
    { id: "LFP", dif: "MEDIUM", cat: "Accidentes", nom: "La Foto Perfecta", 
        enu: "Un hombre muere por culpa de una foto.", 
        res: "El hombre trataba de tomar una foto al paisaje montañoso. Mientras intentaba encuadrar mejor la imagen, retrocedió demasiado sin mirar y cayó por el precipicio." },
    
        
    { id: "LCC", dif: "HARD", cat: "Supervivencia", nom: "La Cerilla Corta", 
        enu: "Un hombre desnudo fue hallado muerto al pie de una montaña, con una cerilla en la mano.", 
        res: "Formaba parte de un grupo en un globo aerostático que perdía altura. Para sobrevivir, decidieron liberar peso y se desnudaron todos. Al nver que seguían perdiendo altura decidieron\
         que alguien debía saltar, eligiéndolo mediante \"el que saque la cerilla más corta\"." },
         
    { id: "LOE", dif: "HARD", cat: "Psicológico", nom: "La Oscuridad Engaña", 
        enu: "Un hombre hace una llamada, escucha la respuesta y se suicida.", 
        res: "Creyó que había quedado ciego tras una operación, sin saber que la oscuridad era por un apagón temporal." },

    { id: "LAF", dif: "HARD", cat: "Ironía", nom: "La Apuesta Final", 
        enu: "Un hombre sonríe al ver un ataúd.", 
        res: "Había apostado millones a que viviría más que la persona fallecida" },

    { id: "TA", dif: "HARD", cat: "Supervivencia", nom: "Tesoro Abandonado", 
        enu: "Un hombre entra en casa y sale rico.", 
        res: "Había heredado la casa de su padre que era un buscador de tesoros, y dentro encontró una fortuna escondida." },

    { id: "EPM", dif: "HARD", cat: "Supervivencia", nom: "El Paquete Macabro", 
        enu: "Un hombre recibe un brazo por correo, lo examina y lo reenvía a otro hombre. Este último lo examina y después lo entierra.", 
        res: "Eran tres supervivientes de un naufragio. Acabaron en una isla desierta y para no morir de hambre decidieron cortarse los tres el brazo izquierdo.\
        Lo hicieron por turnos para no echar a perder la carne. Antes de que llegara el turno de que el tercero se cortase el brazo fueron rescatados. El último\
         hombre se corta el brazo y lo envía a sus compañeros náufragos para cumplir el pacto." },
         
    { id: "SDG", dif: "HARD", cat: "Psicológico", nom: "Sopa de Gaviota", 
        enu: "Un hombre come \"carne de gaviota\" en un viaje al extranjero, poco después se suicida.", 
        res: "El hombre había sufrido un naufragio y fue instadoa comer \"carne de gaviota\" para sobrevivir. Al proba la verdadera carne de gaviota\
        se da cuenta de que en realidad comió carne humana así que se suicida por no soportarlo." },

    { id: "EAS", dif: "MEDIUM", cat: "Accidentes", nom: "El Ascensor Silencioso", 
        enu: "Un hombre muere al subir de la planta 11º a la 12º.", 
        res: "El hombre subía en ascensor y éste falló, cayendo 11 pisos hacia abajo y matando al hombre." },

    { id: "EMDPR", dif: "EASY", cat: "Lógica inDirecta", nom: "El Misterio de la Pecera Rota", 
        enu: "Alejandro Magno y Cleopatra yacen muertos en el suelo, rodeados de cristales rotos y agua. La ventana está abierta y entra una fuerte corriente de aire.", 
        res: "Alejandro Magno y Cleopatra no son personas, sino peces dentro de una pecera. La corriente de aire provocó que la pecera cayera desde la ventana, \
        rompiéndose contra el suelo. Al quedar fuera del agua, los peces murieron." },

    { id: "LBI", dif: "EASY", cat: "Pensamiento Lateral", nom: "La Bancarrota Inesperada", 
        enu: "Un hombre aparca su coche frente a un hotel y, de repente, se da cuenta de que ha entrado en bancarrota.", 
        res: "No se trata de una situación real, sino de un juego. El hombre está jugando al Monopoly, donde su ficha es un coche. \
        Al caer en una casilla con un hotel de otro jugador, debe pagar un alquiler tan alto que pierde todo su dinero y queda en bancarrota." },

    { id: "ETP", dif: "MEDIUM", cat: "Pensamiento Lateral", nom: "El Tren Perdido", 
        enu: "Óscar está leyendo el periódico cuando escucha un fuerte golpe. Mira al frente, se lamenta por no haber cogido el tren a tiempo y, poco después, se quita la vida.", 
        res: "Óscar no hablaba de un tren real, sino de un tren de colección que tenía en funcionamiento sobre una maqueta. \
        El golpe fue el sonido del tren al caer y romperse, lo que supuso una gran pérdida económica y emocional para él. Desesperado por lo ocurrido, decide suicidarse." },

    { id: "EASC", dif: "MEDIUM", cat: "Situaciones Legales", nom: "El Accidente sin Culpa", 
        enu: "Pepe provoca un accidente de tráfico en el que muere un motorista. Cuando llega la policía, detienen a otra persona y dejan a Pepe marcharse a casa.", 
        res: "Pepe no era el responsable legal del vehículo, ya que estaba aprendiendo a conducir. Se encontraba en una \
        clase práctica de autoescuela, por lo que el profesor, que iba en el coche y tiene la responsabilidad legal, es quien resulta detenido." },

    { id: "EHC", dif: "HARD", cat: "Pensamiento Lateral", nom: "El Héroe Confundido", 
        enu: "Un hombre con pasamontañas sale corriendo de un museo con un cuadro en las manos. Un policía le da el alto, pero al no detenerse, le dispara y lo mata. Días después, el hombre es nombrado hijo predilecto del pueblo.", 
        res: "No se trataba de un robo. Durante una intensa ola de frío se produjo un incendio en el museo. El hombre \
        era el director del museo, que llevaba un pasamontañas por el frío, e intentaba salvar la obra más valiosa. \
        Era sordo y no escuchó las órdenes del policía, quien creyó que era un ladrón y disparó. Tras descubrir la verdad, \
        el policía se suicidó por la culpa, y el director fue reconocido como héroe a título póstumo." },

    { id: "EPSD", dif: "MEDIUM", cat: "Ciencia", nom: "El Punto Sin Dirección", 
        enu: "Juan sale de excursión con una brújula. Se detiene a comer y, cuando reanuda la marcha, es incapaz de encontrar el camino de vuelta.", 
        res: "Juan se encontraba en una expedición científica cerca del Polo Norte. Sin darse cuenta, \
        se detuvo exactamente sobre el polo norte magnético. En ese punto, la brújula deja de funcionar \
        correctamente, ya que todas las direcciones apuntan al sur. Al intentar orientarse, no puede determinar ninguna dirección válida y termina perdido." },

    { id: "LLM", dif: "EASY", cat: "Animales", nom: "La Luz Mortal", 
        enu: "Roberto ve una luz intensa, se queda paralizado y segundos después muere.", 
        res: "Roberto no es una persona, sino un conejo. Al escapar de su hogar y cruzar una carretera de noche, \
        queda paralizado por los faros de un coche que se aproxima. Incapaz de moverse, es atropellado por el vehículo." },

    { id: "LEP", dif: "EASY", cat: "Situaciones Legales", nom: "La Ejecución Pública", 
        enu: "Un hombre mata a su propio hermano delante de varias personas, pero nadie lo denuncia.", 
        res: "El hombre trabaja como verdugo. Su hermano había sido condenado a muerte por la justicia, \
        y la ejecución se lleva a cabo públicamente conforme a la ley, por lo que no hay delito que denunciar." },

    { id: "EVS", dif: "MEDIUM", cat: "Medicina", nom: "El Viaje Salvador", 
        enu: "Carmen nunca imaginó que tomar un avión le acabaría salvando la vida.", 
        res: "Carmen había sido operada recientemente. En el aeropuerto, al pasar por el control \
        de seguridad, los detectores de metales no dejaban de activarse. Tras una inspección más \
        exhaustiva con rayos X, descubrieron que los cirujanos habían olvidado un bisturí dentro de su cuerpo. \
        Gracias a este hallazgo, pudo ser operada de nuevo a tiempo, salvando su vida." },

    { id: "EBE", dif: "HARD", cat: "Crimen", nom: "El Baile", 
        enu: "Una pareja de bailarines muere durante una competición de baile en pleno escenario.", 
        res: "Durante una competición de tango, otra pareja rival, dispuesta a ganar a cualquier precio, envenenó \
        la rosa que los bailarines utilizaban como parte de su coreografía. El veneno se activaba con el movimiento \
        y el contacto, provocando la muerte de ambos durante la actuación. Al ser las únicas parejas participantes, los culpables ganaron la competición." },

    { id: "LCI", dif: "HARD", cat: "Pensamiento Lateral", nom: "La Cita Intermitente", 
        enu: "Un hombre acude varios días seguidos a un mecánico para preguntar cuánto tardarían en reparar su coche. \
        Las respuestas varían cada día, hasta que un día le dicen que pueden atenderle en cinco minutos. Sin embargo, el hombre decide no volver jamás.", 
        res: "El hombre no estaba interesado en reparar su coche. En realidad, mantenía una aventura con la mujer del \
        mecánico. Cada día preguntaba cuánto tiempo tardaría el mecánico en atender un vehículo para saber cuánto tiempo \
        tendría libre sin levantar sospechas. Cuando le dijeron que podían atenderle en solo cinco minutos, entendió que \
        ya no tendría margen y decidió marcharse definitivamente." },

    { id: "ERL", dif: "MEDIUM", cat: "Crimen", nom: "El Robo", 
        enu: "Cinco hombres planean cuidadosamente entrar en una casa y se llevan miles de dólares. Sin embargo, el único arrestado es el propietario de la casa.", 
        res: "Los cinco hombres no eran ladrones, sino policías que llevaban a cabo una redada autorizada. El propietario \
        era en realidad un mafioso, y el dinero fue confiscado como prueba. Tras la operación, el dueño de la casa fue \
        detenido por sus actividades ilegales." },

    { id: "DT", dif: "HARD", cat: "Tiempo Crítico", nom: "Demasiado Tarde", 
        enu: "Serena corre desesperadamente por un pasillo, pero de repente se detiene, rompe a llorar y se da la vuelta.", 
        res: "Serena es abogada y había logrado un indulto de última hora para su cliente, condenado a muerte en la silla \
        eléctrica. Mientras corría para detener la ejecución, vio cómo las luces parpadeaban, señal de que la ejecución ya \
        había tenido lugar. Comprendiendo que llegó demasiado tarde, se derrumba." },

    { id: "EMF", dif: "MEDIUM", cat: "Tecnología", nom: "El Mensaje Fatal", 
        enu: "Un hombre muere en Navidad justo después de recibir un SMS.", 
        res: "El hombre era un terrorista que estaba preparando un atentado con una bomba activada por señal telefónica. \
        Sin embargo, antes de poder utilizarla, recibió un mensaje automático de publicidad de su compañía telefónica. \
        Ese mensaje activó la bomba accidentalmente, provocando su muerte inmediata." },

    { id: "LVS", dif: "EASY", cat: "Videojuegos", nom: "La Victoria Sangrienta", 
        enu: "Manuel apuñala a una persona en el suelo y dispara a su compañero. Acto seguido, recibe una gran ovación del público.", 
        res: "No se trata de un crimen real, sino de una competición de videojuegos. Manuel estaba jugando la final de \
        un torneo de un shooter, donde eliminó a los dos últimos rivales él solo, logrando una victoria espectacular que fue celebrada por el público." },

    { id: "EUE", dif: "HARD", cat: "Pensamiento Lateral", nom: "El Último Error", 
        enu: "Una mujer se lanza por la ventana para suicidarse, pero justo después se arrepiente profundamente de su decisión.", 
        res: "La mujer creía ser la última persona viva en el mundo. Sumida en la soledad, decide acabar con su vida. \
        Sin embargo, en el momento de saltar recibe una llamada o señal que le demuestra que no está sola. Al darse \
        cuenta de su error, ya es demasiado tarde para evitar la caída." },

    { id: "LSN", dif: "HARD", cat: "Tragedia", nom: "La Sorpresa Navideña", 
        enu: "Un hombre prepara una sorpresa navideña para su familia. Días después, la familia vende la casa y se muda lejos.", 
        res: "El hombre decidió disfrazarse de Papá Noel y entrar en su casa bajando por la chimenea para sorprender a \
        su familia. Sin embargo, quedó atascado en el conducto. Al hacer frío, la familia encendió la chimenea sin \
        saberlo, provocando su muerte por asfixia o quemaduras. Tras descubrir lo ocurrido, la familia, traumatizada, decide vender la casa y marcharse." }
        
];

// Ejecutar inserción en lote (Transactions son mucho más rápidas y seguras)
const insertMany = db.transaction((items) => {
    let inserted = 0;
    for (const item of items) {
        const result = insertStmt.run('darkstories', item.id, item.dif, item.cat, item.enu, item.nom, item.res);
        if (result.changes > 0) inserted++;
    }
    if (inserted > 0) console.log(`✅ DarkStories: ${inserted} nuevas historias añadidas a la base de datos.`);
});

insertMany(seedData);

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('darkstories_requestCatalog', () => {
            // Leer todas las historias de darkstories de la BBDD y enviarlas al cliente
            const rows = db.prepare(`SELECT * FROM ds_data WHERE id_juego = 'darkstories'`).all();
            socket.emit('darkstories_catalog', rows);
        });
    },
    getRooms: () => []
};