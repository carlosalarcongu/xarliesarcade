app.trivial = {
    state: null,
    isAdmin: false,
    canFlip: false, // Flag local de seguridad

    init: () => {
        app.showScreen('trivialScreen');
        socket.emit('joinRoom', { name: app.myPlayerName, room: 'trivial' });
        app.trivial.renderBoard();
    },

    send: (type, payload) => socket.emit('trivial_action', { type, ...payload }),

    // Wrappers
    joinTeam: (teamId) => app.trivial.send('joinTeam', { teamId }),
    addTeam: () => app.trivial.send('addTeam'),
    startGame: () => app.trivial.send('startGame'),
    rollDice: () => app.trivial.send('rollDice'),
    moveToken: (nodeId) => app.trivial.send('moveToken', { nodeId }),
    validate: (correct) => app.trivial.send('validateAnswer', { correct }),
    forceNext: () => app.trivial.send('admin_nextTurn'),
    endGame: () => app.trivial.send('admin_endGame'),
    backToLobby: () => app.trivial.send('admin_backToLobby'),

    // --- RENDERIZADO VISUAL ---
    renderBoard: () => {
        const board = document.getElementById('trivialBoardNodes');
        board.innerHTML = '';
        const totalNodes = 42;
        const radius = 150; // Radio del círculo
        const center = 180; // Centro del div (360/2)

        // Colores en orden
        const colors = ['#0984e3', '#e84393', '#f1c40f', '#a0522d', '#00b894', '#e67e22'];

        for(let i=0; i<totalNodes; i++) {
            const node = document.createElement('div');
            node.className = 'triv-node';
            node.dataset.id = i;
            
            // Ángulo para distribuirlos en círculo
            const angle = (i / totalNodes) * 2 * Math.PI - (Math.PI/2);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;

            if (i % 7 === 0) {
                node.classList.add('hub'); // Es quesito
                node.style.background = 'white';
            } else {
                // Color calculado por posición
                node.style.background = colors[(i % 6)];
            }

            node.onclick = () => app.trivial.moveToken(i);
            board.appendChild(node);
        }
    },

    updateUI: (data) => {
        app.trivial.state = data;
        const me = data.players.find(p => p.socketId === socket.id);
        app.trivial.isAdmin = (data.players[0]?.socketId === socket.id) || (me?.isAdmin);
        const myTeam = data.teams.find(t => t.members.some(m => m.id === app.myPlayerId));
        const isActiveTeam = myTeam?.id === data.activeTeamId;

        // Fases
        document.getElementById('trivialLobby').classList.toggle('hidden', data.phase !== 'LOBBY');
        document.getElementById('trivialGame').classList.toggle('hidden', data.phase !== 'GAME');
        document.getElementById('trivialPodium').classList.toggle('hidden', data.phase !== 'PODIUM');

        // Admin Visibility
        document.querySelectorAll('.triv-admin-only').forEach(el => 
            el.classList.toggle('hidden', !app.trivial.isAdmin));

        // --- LOBBY ---
        if (data.phase === 'LOBBY') {
            const list = document.getElementById('trivTeamList');
            list.innerHTML = '';
            
            // Espectadores
            const spectators = data.players.filter(p => !data.teams.some(t => t.members.some(m => m.id === p.id)));
            if(spectators.length > 0) {
                list.innerHTML += `
                <div class="team-card" style="border-top:4px solid #aaa">
                    <h4>👁️ Espectadores (${spectators.length})</h4>
                    <button onclick="app.trivial.joinTeam('SPECTATOR')">Salir</button>
                </div>`;
            }

            data.teams.forEach(t => {
                list.innerHTML += `
                <div class="team-card" style="border-top:4px solid ${t.color}">
                    <h4 style="color:${t.color}">${t.name}</h4>
                    <ul style="font-size:0.8em; padding-left:15px;">${t.members.map(m => `<li>${m.name}</li>`).join('')}</ul>
                    <button onclick="app.trivial.joinTeam('${t.id}')">Unirse</button>
                </div>`;
            });
        }

        // --- GAME ---
        if (data.phase === 'GAME') {
            // HUD
            const hud = document.getElementById('trivHUD');
            hud.innerHTML = data.teams.map(t => {
                // Generar cuñas (wedges) conseguidas
                let wedgesHtml = '';
                t.cheeses.forEach((catId, idx) => {
                    const color = data.categories[catId].color;
                    wedgesHtml += `<div class="triv-wedge wedge-${idx}" style="background:${color}"></div>`;
                });

                return `
                <div class="triv-team-badge ${t.id === data.activeTeamId ? 'active' : ''}">
                    <div class="triv-team-name" style="color:${t.color}">${t.name}</div>
                    <div class="triv-cheese-holder">${wedgesHtml}</div>
                    <div class="triv-team-members">${t.members.map(m => m.name).join(', ')}</div>
                </div>`;
            }).join('');

            // TABLERO (Fichas)
            document.querySelectorAll('.triv-pawn').forEach(e => e.remove());
            document.querySelectorAll('.triv-node').forEach(e => e.classList.remove('highlight'));

            // Iluminar movimientos
            data.board.possibleMoves.forEach(nodeId => {
                const node = document.querySelector(`.triv-node[data-id="${nodeId}"]`);
                if(node) node.classList.add('highlight');
            });

            // Dibujar Fichas
            data.teams.forEach(t => {
                const node = document.querySelector(`.triv-node[data-id="${t.pos}"]`);
                if(node) {
                    const pawn = document.createElement('div');
                    pawn.className = 'triv-pawn';
                    pawn.style.background = t.color;
                    // Mostrar inicial del equipo
                    pawn.innerText = t.name.charAt(0);
                    node.appendChild(pawn);
                }
            });

            // DADO
            const trigger = document.getElementById('diceTrigger');
            // Solo si no hay dado tirado Y (es mi turno O soy admin)
            if (data.board.dice === null && (isActiveTeam || app.trivial.isAdmin)) {
                trigger.classList.remove('hidden');
            } else {
                trigger.classList.add('hidden');
            }
            
            // Renderizar cara del dado si ya salió
            if (data.board.dice !== null) {
                app.trivial.animateDiceTo(data.board.dice);
            } else {
                // Reset visual
                document.getElementById('diceCube').className = 'dice-cube'; 
            }

            // LOG
            const logContainer = document.getElementById('trivLog');
            logContainer.innerHTML = data.gameLog.map(l => 
                `<div class="log-entry"><span class="log-time">[${l.time}]</span> <span class="log-${l.type}">${l.text}</span></div>`
            ).join('');

            // TARJETA
            const overlay = document.getElementById('trivCardOverlay');
            if (data.board.currentCard) {
                overlay.classList.remove('hidden');
                const c = data.board.currentCard;
                const catData = data.categories[c.cat];

                // Estilos tarjeta
                document.getElementById('trivFrontStyle').style.borderColor = catData.color;
                document.getElementById('qIcon').innerText = catData.icon;
                document.getElementById('qCat').innerText = catData.name;
                document.getElementById('qCat').style.color = catData.color;
                document.getElementById('qText').innerText = c.q;
                document.getElementById('qAns').innerText = c.a;

                // LOGICA DE SEGURIDAD (ANTI SPOILER)
                // Si soy del equipo activo Y NO soy admin -> No puedo ver respuesta
                const lockMsg = document.getElementById('trivActiveLockMsg');
                const flipBtn = document.getElementById('btnFlipTriv');
                const adminCtrls = document.getElementById('trivAdminCtrls');
                
                app.trivial.canFlip = (!isActiveTeam || app.trivial.isAdmin);

                if (!app.trivial.canFlip) {
                    lockMsg.classList.remove('hidden');
                    flipBtn.classList.add('hidden');
                } else {
                    lockMsg.classList.add('hidden');
                    flipBtn.classList.remove('hidden');
                }

                // Controles de Admin (Validar)
                if (app.trivial.isAdmin) adminCtrls.classList.remove('hidden');
                else adminCtrls.classList.add('hidden');

                // Resetear giro al abrir nueva
                document.getElementById('trivCardInner').classList.remove('flipped');

            } else {
                overlay.classList.add('hidden');
            }
        }
    },

    // --- UTILS ---
    animateDiceTo: (value) => {
        const cube = document.getElementById('diceCube');
        // Quitar animación shake si la hubiera
        cube.parentElement.classList.remove('shake-3d');
        
        // Mapeo de rotaciones para mostrar la cara correcta al frente
        const rotations = {
            1: 'rotateY(0deg)',
            2: 'rotateY(-90deg)',
            3: 'rotateY(-180deg)',
            4: 'rotateY(90deg)',
            5: 'rotateX(-90deg)',
            6: 'rotateX(90deg)'
        };
        cube.style.transform = rotations[value];
    },

    flipCard: () => {
        if (!app.trivial.canFlip) return alert("¡No puedes voltear tu propia pregunta!");
        document.getElementById('trivCardInner').classList.toggle('flipped');
    }
};

// --- LISTENERS ---
socket.on('trivialUpdate', app.trivial.updateUI);
socket.on('trivialAnim', (anim) => {
    if (anim.type === 'dice') {
        const stage = document.querySelector('.dice-stage');
        stage.classList.add('shake-3d');
        // La animación dura 1.5s en servidor, aquí la quitamos visualmente al recibir el update final
        setTimeout(() => stage.classList.remove('shake-3d'), 1500);
    }
});