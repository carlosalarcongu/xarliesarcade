# 🎮 Xarlie's Arcade

Una plataforma web multijugador de *party games* en tiempo real, diseñada para jugar con amigos en reuniones usando los teléfonos móviles como mando y pantalla privada. Desarrollado con Node.js, WebSockets (Socket.io) y SQLite.

## 🚀 Características Principales

* **Multijugador en Tiempo Real:** Sincronización instantánea de partidas, chats, votaciones y dibujos gracias a Socket.io.
* **Mobile-First:** Interfaz responsiva diseñada como una WebApp (PWA), ideal para jugar desde el móvil con modos Claro y Oscuro adaptativos ("Botones 3D").
* **Sistema de Cuentas y Roles:** Registro de usuarios con aprobación manual. Roles dinámicos (Usuarios, Administradores, Whitelists).
* **Panel de Administración Integral:** Gestión completa de usuarios, analíticas de tráfico detalladas, publicación de novedades globales y consola SQL integrada en el frontend.
* **Widget Flotante:** Un identificador persistente e inteligente que informa al jugador de su estado y sala actual en todo momento.

---

## 🎲 Juegos Incluidos

El arcade incluye una gran variedad de juegos sociales y herramientas de grupo:

1.  🕵️ **El Impostor:** Juego de deducción y palabras secretas.
2.  🐺 **El Lobo (Werewolf):** El clásico juego de roles ocultos y linchamientos.
3.  🚫 **Tabú:** Adivina la palabra sin decir las prohibidas (con base de datos SQLite propia).
4.  🎨 **El Falso Artista (Pinturillo):** Lienzo compartido sincronizado en tiempo real donde uno de los artistas no sabe qué está dibujando.
5.  📜 **Dark Stories:** Resolución de misterios macabros con sistema de progreso individual (tarjetas acertadas/aburridas).
6.  🏆 **El MÁS...:** Juego de votación social sobre los propios participantes.
7.  🔣 **Cifras y Letras:** Cálculo mental y búsqueda de palabras contrarreloj.
8.  🎌 **Orden:** Juego cooperativo de posicionamiento a ciegas.
9.  🗣️ **Anécdotas:** Escribe, lee y adivina de quién es el secreto.
10. 🦉 **Consejo de Sabios / 🍻 Beber / 🎉 Fiesta:** Herramientas de interacción para eventos y fiestas.

---

## 🐄 El Gestor de Mus (La Joya de la Corona)

Un módulo dedicado exclusivamente al seguimiento estadístico y creación de torneos del juego de cartas **Mus**.

* **Tracking Estadístico:** Historial de partidas, ELO dinámico por jugador y por parejas, top de rachas de victorias/derrotas y registro de palizas históricas.
* **Oráculo Predictor:** Algoritmo matemático que enfrenta a dos parejas basándose en su historial y rachas recientes para predecir el resultado probable de un partido.
* **Gestor de Torneos Automático:**
    * Creación de Liguillas (Round Robin) y Eliminatorias directas (Brackets).
    * Generación de cruces y avance automático tras validar resultados.
    * **Exportación a PDF:** Generación dinámica de un documento PDF (`pdfkit`) con el cuadro completo del torneo, resultados y campeón para descarga inmediata.

---

## 🛠️ Stack Tecnológico

**Frontend:**
* HTML5 / CSS3 (Variables dinámicas, Glassmorphism, CSS Grid/Flexbox).
* Vanilla JavaScript (ES6+).
* [Chart.js](https://www.chartjs.org/) (Para las gráficas de rendimiento del Mus).

**Backend:**
* [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/).
* [Socket.io](https://socket.io/) (Comunicación bidireccional y control de salas).
* [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (Base de datos SQLite rápida y síncrona).
* [PDFKit](https://pdfkit.org/) (Generación de PDFs en el servidor).

---

## ⚙️ Instalación y Uso

Si quieres desplegar tu propia instancia de Xarlie's Arcade:

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/TU-USUARIO/xarliesarcade.git](https://github.com/TU-USUARIO/xarliesarcade.git)
    cd xarliesarcade
    ```

2.  **Instala las dependencias:**
    *(Nota: `better-sqlite3` requiere herramientas de compilación de C++ en el sistema).*
    ```bash
    npm install
    ```

3.  **Inicia el servidor:**
    ```bash
    node server.js
    ```
    *(El servidor se ejecutará por defecto en el puerto `3000`. Accede a `http://localhost:3000`).*

4.  **Despliegue en Producción (Recomendado):**
    Usa [PM2](https://pm2.keymetrics.io/) para mantener el proceso activo:
    ```bash
    pm2 start server.js --name "xarliesarcade"
    ```

---

## 📂 Estructura del Proyecto

```text
xarliesarcade/
├── public/                 # Archivos estáticos (Frontend)
│   ├── css/
│   │   └── style.css       # Sistema de estilos y variables de tema
│   ├── js/
│   │   ├── main.js         # Lógica core del cliente y UI routing
│   │   ├── mus.js          # Lógica específica del Mus
│   │   └── analytics.js    # Panel de analíticas avanzado
│   ├── downloads/          # PDFs de torneos exportados
│   └── fonts/              # Tipografías para PDFKit
├── games/                  # Lógica de servidor por cada minijuego
│   ├── impostor.js
│   ├── mus.js
│   ├── tabu.js
│   └── ...
├── views/                  # Vistas EJS (Layouts HTML)
├── server.js               # Servidor principal Node/Express + Socket.io
├── arcade.db               # Base de datos SQLite
└── package.json            # Dependencias del proyecto
