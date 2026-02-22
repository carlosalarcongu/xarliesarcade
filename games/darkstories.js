// games/darkstories.js

const storiesCatalog = {
    facil: [
        { id: "f1", enunciado: "Un hombre yace muerto en un charco de agua y sangre en una habitación vacía.", respuesta: "Fue apuñalado con un carámbano de hielo que luego se derritió." },
        { id: "f2", enunciado: "Una mujer muere al abrir la carta que esperaba con ilusión.", respuesta: "Era alérgica al polvo y la carta contenía una sustancia que le provocó un shock." },
        { id: "f3", enunciado: "Un hombre salta desde un edificio sin miedo y sobrevive.", respuesta: "Era el primer piso." },
        { id: "f4", enunciado: "Un hombre entra en un bar y pide agua. El camarero saca un arma. El hombre agradece y se va.", respuesta: "Tenía hipo y el susto lo curó." },
        { id: "f5", enunciado: "Un hombre se moja y muere poco después.", respuesta: "Se electrocutó al estar en contacto con un cable suelto." },
        { id: "f6", enunciado: "Una mujer grita antes de morir al ver su reflejo.", respuesta: "Detrás de ella había alguien con un arma." },
        { id: "f7", enunciado: "Un hombre se muere porque se fue la luz.", respuesta: "Dependía de un respirador eléctrico." },
        { id: "f8", enunciado: "Un hombre se cae y todos aplauden.", respuesta: "Era un actor haciendo una escena en una obra de teatro." },
        { id: "f9", enunciado: "Un hombre muere tras recibir un regalo.", respuesta: "Era una bomba camuflada." },
        { id: "f10", enunciado: "Un hombre muere por no abrir una puerta.", respuesta: "Había un incendio y quedó atrapado." },
        { id: "f11", enunciado: "Un hombre muere al sentarse.", respuesta: "La silla estaba electrificada." },
        { id: "f12", enunciado: "Un hombre cae del cielo sin que nadie lo empuje.", respuesta: "Saltó de un avión y no tenía paracaídas." },
        { id: "f13", enunciado: "Un hombre enciende un fósforo y muere.", respuesta: "Había una fuga de gas." },
        { id: "f14", enunciado: "Un hombre corre y muere.", respuesta: "Ganó una carrera pero sufrió un infarto." },
        { id: "f15", enunciado: "Sonia estaba muy cansada y se durmió. Cuando se despertó estaba en un lugar completamente diferente. ¿Qué pasó?", respuesta: "Sonia estaba volando en un avión. Cuando se despertó, el avión ya había aterrizado en otra ciudad." },
        { id: "f16", enunciado: "Una mujer está viendo una película. De repente oye muchas explosiones y la gente gritando afuera. Luego se hizo el silencio. La mujer apagó el televisor y se fue a dormir.", respuesta: "Era la noche de Año Nuevo. La mujer esperaba hasta que todos terminaron de celebrar y luego se fue a la cama." },
        { id: "f17", enunciado: "Michael está en la prisión. Una vez almorzó, visitó el patio de la prisión por un rato y luego fue a la biblioteca. A boca de noche, fuera del alcance de las cámaras de seguridad, se cambió de ropa. Luego salió de la cárcel sin problemas. ¿Cómo lo hizo?", respuesta: "Michael trabajaba como jardinero en la prisión." },
        { id: "f18", enunciado: "Un hombre regresa de un viaje de negocios, toca una puerta, su esposa la abre. Inmediatamente la acusó de traición.", respuesta: "De camino a casa, este hombre decidió visitar a su amigo. Su propia esposa medio desvestida abre la puerta." },
        { id: "f19", enunciado: "Nicolas aplaudió y todos que estaban en la habitación murieron. ¿Qué pasó?", respuesta: "Nicolas exterminó a los mosquitos." }
    ],

    medio: [
        { id: "m1", enunciado: "Cuando Pablo salió a bucear, nunca pensó que moriría calcinado.", respuesta: "Un hidroavión recogió agua del lago con Pablo dentro y lo lanzó sobre un incendio forestal." },
        { id: "m2", enunciado: "Un hombre muere en una habitación cerrada sin ventanas ni puertas abiertas.", respuesta: "Estaba dentro de una cámara frigorífica que se cerró por fuera." },
        { id: "m3", enunciado: "Una mujer escucha pasos cada noche hasta que deja de escucharlos.", respuesta: "El acosador fue arrestado." },
        { id: "m4", enunciado: "Un hombre cae por un barranco por culpa de una fotografía.", respuesta: "Retrocedió para encuadrar mejor y perdió el equilibrio." },
        { id: "m5", enunciado: "Un sacerdote está haciendo su discurso de despedida. Hacia el final del discurso, el alcalde aparece para dar unas palabras de agradecimiento, pero muere de un disparo antes de que acabe de hablar.", respuesta: "En su discurso, el sacerdote recuerda un peculiar asesinato que ocurrió en su primer día en la parroquia, y dijo que la primera confesión que oyó ese día fue del asesino. El alcalde se había perdido el principio del discurso, y dijo que él fue el primero en confesarse con el nuevo cura. El alcalde, habiéndose así traicionado, fue disparado por un pariente de la víctima asesinada." },
        { id: "m6", enunciado: "Un hombre desnudo fue hallado muerto al pie de una montaña, con una cerilla en la mano.", respuesta: "Un globo aerostático con cuatro pasajeros se había desviado de su curso y amenazaba con estrellarse contra una montaña. Para ganar altura, los pasajeros arrojaron todo el lastre, incluidas sus ropas, por la borda. No era suficiente: uno de ellos tendría que saltar. Lo echaron a suertes, y el muerto sacó la cerilla más corta." },
        { id: "m7", enunciado: "Oscar está sentado leyendo el periódico cuando, de repente, escucha un ruido. Mira hacia delante y se lamenta por no haber cogido el tren a tiempo. Poco después se suicida.", respuesta: "Oscar, que estaba arruinado, era un coleccionista de trenes y para solucionar sus problemas económicos iba a vender su maqueta de tren más valiosa. La había estado limpiando en la mesa para venderla, pero no la colocó bien. Cuando se sentó a descansar y empezó a leer el periódico oyó cómo se deslizaba por la mesa. No le dio tiempo a atraparla antes de que se hiciera pedazos contra el suelo." },
        { id: "m8", enunciado: "Un hombre entra en una farmacia y sale corriendo con el dinero de la caja registradora. La farmacéutica llama a la comisaría y, minutos después, un agente de policía recupera el dinero y se lleva al hombre. Esa misma tarde los tres van a la comisaría a poner una denuncia por robo.", respuesta: "El hombre era el hijo de la farmacéutica. Le habían robado el coche y tenía un examen muy importante. Había ido a pedirle dinero a su madre para el taxi. La madre avisó a su marido, que era agente de policía, para que llevase a su hijo al examen. Como el hijo ya no necesitaba el dinero del taxi, se lo devolvió a su padre. Finalmente fueron juntos a poner la denuncia por el robo del coche." }
    ],

    dificil: [
        { id: "d1", enunciado: "Un hombre hace una llamada, escucha la respuesta, cuelga y se suicida.", respuesta: "Pensó que su operación para recuperar la vista había fracasado al escuchar al médico en la oscuridad durante un apagón." },
        { id: "d2", enunciado: "Un hombre sonríe al ver un ataúd y horas después muere.", respuesta: "Había apostado que sobreviviría más que la persona enterrada." },
        { id: "d3", enunciado: "Un hombre entra en una casa abandonada y sale rico.", respuesta: "Era un buscador de tesoros y encontró una fortuna escondida." },
        { id: "d4", enunciado: "Una mujer vive décadas encerrada sin saberlo.", respuesta: "Fue manipulada psicológicamente haciéndole creer que afuera había un desastre." },
        { id: "d5", enunciado: "Un hombre agradece antes de morir de hambre.", respuesta: "Estaba en una secta que glorificaba el sacrificio." },
        { id: "d6", enunciado: "Un hombre recibe un paquete por correo. Lo abre cuidadosamente y encuentra el brazo de un hombre dentro. Lo examina, lo envuelve nuevamente y lo manda a otro hombre. Este segundo hombre también examina el brazo que contenía el paquete y luego, lo lleva hasta un bosque en donde lo entierra.", respuesta: "Tres hombres naufragaron en una isla desierta. Sin nada que comer, acordaron amputarse cada uno el brazo izquierdo para comérselo. Los tres juraron que se cortarían el brazo izquierdo. Uno de los tres era médico y cortó el brazo a sus dos compañeros antes de ser rescatados. Tal como había jurado, el médico se amputó después su brazo y se lo envió a uno de sus compañeros, que al verlo se lo reenvió al tercero, quien lo enterró." },
        { id: "d7", enunciado: "La policía alemana estaba totalmente confundida. Durante 15 años, la misma persona había estado robando, matando y secuestrando. En 2008, habían gastado 14 mil horas de trabajo y más de 15 millones euros para encontrar al criminal, pero fracasaron. ¿Qué hubo?", respuesta: "Es una historia real. El sospechoso principal era una mujer cuyo ADN encontraban en cada escena de crímen. Pero no pudieron encontrarla. La policía pensó que llevaba una vida nómada, porque cometió crímenes en toda Alemania y a veces en el extranjero – en Francia y Austria. Finalmente en 2009 la policía descubrió que era una mujer polaca de 71 años que trabajaba durante muchos años como empacadora de cotonitos en una fábrica bávara. Usaron estos cotonitos para las pruebas de ADN. El caso entró a la historia como El Fantasma de Heilbronn." },
        { id: "d8", enunciado: "Un hombre entra en un restaurante en el puerto. Pide una sopa de gaviota. Cuando la prueba se va corriendo al baño y se suicida. ¿Por qué?", respuesta: "El hombre era ciego. Hace un tiempo sufrió un accidente de barco y naufragó junto a otras personas a una isla desierta. Allí los supervivientes, para sobrevivir, le dieron sopa de gaviota para comer. Cuando prueba la del restaurante y nota una diferencia abismal en el sabor con la sopa de gaviota que le dieron en el naufragio, comprende que la sopa de la isla no era de gaviota, si no de los que no sobrevivieron." },
        { id: "d9", enunciado: "Un hombre se despertó, encendió un fósforo y vio algo de que murió de miedo. ¿Qué pasó?", respuesta: "El hombre fue condenado a una sentencia muy larga y era un prisionero. Pagó a un hombre que estaba a cargo de los funerales de los muertos en la cárcel para que lo ayudara a escapar. Planeaba que cuando alguien muriera en la cárcel, el prisionero se escondería en un ataúd junto con el cadáver. Cuando el ataúd sea enterrado fuera de la prisión, el funerario lo cavará y liberará al hombre. Al enterarse de que alguien había muerto en la cárcel, el prisionero puso su plan en acción. Por la noche, se coló en el ataúd y se acostó junto con el cadáver. Allí se durmió. Se despertó cuando el ataúd estaba enterrado. Encendió un fósforo y vio la cara del cadáver – era el mismo hombre que tenía que desenterrar el ataúd." }
    ]
};

module.exports = {
    init: (io) => {},
    handleSocket: (io, socket) => {
        socket.on('darkstories_requestCatalog', () => {
            socket.emit('darkstories_catalog', storiesCatalog);
        });
    },
    getRooms: () => []
};