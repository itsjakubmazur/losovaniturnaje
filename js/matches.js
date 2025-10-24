// matches.js - Logika zápasů

const Matches = {
    generate() {
        State.current.matches = [];
        State.current.rounds = [];
        
        if (State.current.system === 'roundrobin') {
            this.generateRoundRobin();
        } else if (State.current.system === 'swiss') {
            Swiss.generateFirstRound();
        } else if (State.current.system === 'groups') {
            this.generateGroups();
        } else if (State.current.system === 'knockout') {
            const filteredParticipants = Utils.filterParticipantsByDiscipline(State.current.participants);

            if (filteredParticipants.length === 0) {
                Utils.showNotification('Žádní účastníci pro vybranou disciplínu! Zkontrolujte nastavení.', 'error');
                return;
            }

            Playoff.generateBracket(filteredParticipants);
        }
        
        goToMatches();
        Utils.showNotification(`Vygenerováno ${State.current.matches.length} zápasů`);
    },

    generateRoundRobin() {
        const filteredParticipants = Utils.filterParticipantsByDiscipline(State.current.participants);

        if (filteredParticipants.length === 0) {
            Utils.showNotification('Žádní účastníci pro vybranou disciplínu! Zkontrolujte nastavení.', 'error');
            return;
        }

        const players = [...filteredParticipants];
        if (players.length % 2 === 1) players.push({ name: 'BYE', isBye: true });
        
        const n = players.length;
        const numRounds = n - 1;
        const matchesPerRound = n / 2;
        
        for (let round = 0; round < numRounds; round++) {
            const roundMatches = [];
            
            for (let match = 0; match < matchesPerRound; match++) {
                const home = (round + match) % (n - 1);
                const away = (n - 1 - match + round) % (n - 1);
                
                const p1 = match === 0 ? players[n - 1] : players[home];
                const p2 = match === 0 ? players[away] : players[away];
                
                if (!p1.isBye && !p2.isBye) {
                    roundMatches.push(this.createMatch(p1, p2, round, (roundMatches.length % State.current.numCourts) + 1));
                }
            }
            
            if (roundMatches.length > 0) {
                State.current.rounds.push(round);
                State.current.matches.push(...roundMatches);
            }
        }
    },

    generateGroups() {
        if (State.current.groups.length === 0) {
            Utils.showNotification('Nejprve proveďte losování skupin', 'error');
            return;
        }

        let roundCounter = 0;
        State.current.groups.forEach((group, groupIndex) => {
            // Filter group members by discipline
            const filteredGroup = Utils.filterParticipantsByDiscipline(group);

            if (filteredGroup.length === 0) return; // Skip empty groups

            const groupLetter = String.fromCharCode(65 + groupIndex);
            const players = [...filteredGroup];
            
            if (players.length % 2 === 1) players.push({ name: 'BYE', isBye: true });
            
            const n = players.length;
            const numRounds = n - 1;
            const matchesPerRound = n / 2;
            
            for (let round = 0; round < numRounds; round++) {
                const roundMatches = [];
                
                for (let match = 0; match < matchesPerRound; match++) {
                    const home = (round + match) % (n - 1);
                    const away = (n - 1 - match + round) % (n - 1);
                    
                    const p1 = match === 0 ? players[n - 1] : players[home];
                    const p2 = match === 0 ? players[away] : players[away];
                    
                    if (!p1.isBye && !p2.isBye) {
                        const m = this.createMatch(p1, p2, roundCounter, (roundMatches.length % State.current.numCourts) + 1);
                        m.group = groupLetter;
                        roundMatches.push(m);
                    }
                }
                
                if (roundMatches.length > 0) {
                    if (!State.current.rounds.includes(roundCounter)) {
                        State.current.rounds.push(roundCounter);
                    }
                    State.current.matches.push(...roundMatches);
                    roundCounter++;
                }
            }
        });
    },

    createMatch(p1, p2, round, court) {
        const sets = [];
        for (let i = 0; i < State.current.bestOf; i++) {
            sets.push({ score1: null, score2: null });
        }
        
        return {
            player1: p1,
            player2: p2,
            sets: sets,
            round: round,
            court: court,
            completed: false,
            playing: false,
            startTime: null,
            endTime: null
        };
    },

    renderCard(match) {
        const idx = State.current.matches.indexOf(match);
        const isCompleted = match.completed;
        const isPlaying = match.playing;
        
        let winner = null;
        let scoreDisplay = '';
        
        if (isCompleted && match.sets) {
            const p1Sets = match.sets.filter(s => s.score1 > s.score2).length;
            const p2Sets = match.sets.filter(s => s.score2 > s.score1).length;
            winner = p1Sets > p2Sets ? 1 : p2Sets > p1Sets ? 2 : 0;
            scoreDisplay = `${p1Sets}:${p2Sets}`;
        }

        const p1Name = Utils.getPlayerDisplayName(match.player1);
        const p2Name = Utils.getPlayerDisplayName(match.player2);

        // Kompaktní verze pro dokončené zápasy
        if (isCompleted) {
            return `
                <div class="match-card completed collapsed" id="match-${idx}" data-match="${idx}">
                    <div class="match-summary" onclick="toggleMatchDetail(${idx})">
                        <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                            <span style="font-weight:bold;color:var(--text-muted);min-width:70px;">Zápas ${idx + 1}</span>
                            <div class="match-result" style="flex: 1;">
                                <span ${winner === 1 ? 'style="color:var(--secondary);"' : ''}>${p1Name}</span>
                                <span class="match-score">${scoreDisplay}</span>
                                <span ${winner === 2 ? 'style="color:var(--secondary);"' : ''}>${p2Name}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size:0.875em;color:var(--text-muted);">
                                ${match.sets.map(s => `${s.score1}:${s.score2}`).filter(s => !s.includes('null')).join(', ')}
                            </span>
                            <span class="expand-icon">▼</span>
                        </div>
                    </div>
                    
                    <div class="match-details" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
                        <div class="match-header">
                            <span class="court-badge">Kurt ${match.court}</span>
                            ${match.startTime ? `<span style="color:var(--text-muted);font-size:0.875em;">⏰ ${new Date(match.startTime).toLocaleTimeString('cs-CZ', {hour:'2-digit',minute:'2-digit'})} - ${new Date(match.endTime).toLocaleTimeString('cs-CZ', {hour:'2-digit',minute:'2-digit'})}</span>` : ''}
                        </div>
                        
                        <div class="match-players" style="margin-top: 15px;">
                            <div class="player-side ${winner === 1 ? 'winner' : ''}">
                                <div style="width:35px;height:35px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.875em;font-weight:bold;">
                                    ${Utils.getInitials(p1Name)}
                                </div>
                                <span>${p1Name}</span>
                            </div>
                            <div style="color:var(--text-muted);font-weight:bold;font-size:1.2em;">VS</div>
                            <div class="player-side ${winner === 2 ? 'winner' : ''}">
                                <div style="width:35px;height:35px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.875em;font-weight:bold;">
                                    ${Utils.getInitials(p2Name)}
                                </div>
                                <span>${p2Name}</span>
                            </div>
                        </div>

                        <div class="sets-container">
                            ${match.sets.map((set, setIdx) => {
                                if (set.score1 === null && set.score2 === null) return '';
                                return `
                                    <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg);border-radius:6px;margin:5px 0;">
                                        <span style="color:var(--text-muted);font-weight:500;">Set ${setIdx + 1}:</span>
                                        <span style="font-weight:bold;">${set.score1} : ${set.score2}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        ${State.current.notes[idx] ? `
                            <div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:6px;">
                                <strong style="font-size:0.875em;color:var(--text-muted);">Poznámky:</strong>
                                <p style="margin-top:5px;">${State.current.notes[idx]}</p>
                            </div>
                        ` : ''}

                        <div class="button-group" style="margin-top: 15px;">
                            <button class="btn btn-outline" onclick="editMatch(${idx})">✏️ Upravit</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Plná verze pro probíhající/nedokončené zápasy
        return `
            <div class="match-card ${isPlaying ? 'playing' : ''}" data-match="${idx}">
                ${isPlaying ? '<div class="match-badge">▶️ HRAJE SE</div>' : ''}
                
                <div class="match-header">
                    <span style="font-weight:bold;color:var(--primary);">Zápas ${idx + 1}</span>
                    <span class="court-badge">Kurt ${match.court}</span>
                    ${match.startTime ? `<span style="color:var(--text-muted);font-size:0.875em;">⏰ ${new Date(match.startTime).toLocaleTimeString('cs-CZ', {hour:'2-digit',minute:'2-digit'})}</span>` : ''}
                </div>
                
                <div class="match-players">
                    <div class="player-side">
                        <div style="width:35px;height:35px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.875em;font-weight:bold;">
                            ${Utils.getInitials(p1Name)}
                        </div>
                        <span>${p1Name}</span>
                    </div>
                    <div style="color:var(--text-muted);font-weight:bold;font-size:1.2em;">VS</div>
                    <div class="player-side">
                        <div style="width:35px;height:35px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.875em;font-weight:bold;">
                            ${Utils.getInitials(p2Name)}
                        </div>
                        <span>${p2Name}</span>
                    </div>
                </div>

                <div class="sets-container">
                    ${match.sets.map((set, setIdx) => `
                        <div class="set-row">
                            <span style="color:var(--text-muted);font-size:0.875em;font-weight:500;">Set ${setIdx + 1}:</span>
                            <input type="number" class="set-input" min="0" max="${State.current.tieBreakPoints}"
                                   value="${set.score1 !== null ? set.score1 : ''}"
                                   placeholder="0"
                                   onchange="updateSet(${idx}, ${setIdx}, 1, this.value)">
                            <span style="text-align:center;">:</span>
                            <input type="number" class="set-input" min="0" max="${State.current.tieBreakPoints}"
                                   value="${set.score2 !== null ? set.score2 : ''}"
                                   placeholder="0"
                                   onchange="updateSet(${idx}, ${setIdx}, 2, this.value)">
                            ${Utils.validateSet(set.score1, set.score2) ? '' : '<span style="color:var(--danger);font-size:0.875em;">⚠️</span>'}
                        </div>
                    `).join('')}
                </div>

                ${isPlaying && match.startTime ? `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg);border-radius:8px;margin-top:10px;">
                        ⏱️ <span id="timer-${idx}" style="font-family:monospace;font-size:1.2em;font-weight:bold;color:var(--primary);">${Utils.calculateElapsed(match.startTime)}</span>
                    </div>
                ` : ''}

                <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
                    <textarea placeholder="Poznámky..." 
                              onchange="updateNotes(${idx}, this.value)"
                              style="min-height:60px;">${State.current.notes[idx] || ''}</textarea>
                </div>

                <div class="button-group">
                    ${!isPlaying ? `
                        <button class="btn btn-warning" onclick="startMatch(${idx})">▶️ Začít zápas</button>
                    ` : ''}
                    ${isPlaying ? `
                        <button class="btn btn-secondary" onclick="finishMatch(${idx})">✅ Ukončit</button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    start(idx) {
        const match = State.current.matches[idx];
        match.playing = true;
        match.startTime = new Date().toISOString();
        State.save();
        UI.render();
        Utils.showNotification(`Zápas ${idx + 1} započat`);
        
        // Start timer update
        this.startTimer(idx);
    },

    finish(idx) {
        const match = State.current.matches[idx];
        
        // Validate sets
        let p1SetsWon = 0;
        let p2SetsWon = 0;
        let allSetsValid = true;
        let filledSets = 0;
        
        match.sets.forEach(set => {
            if (set.score1 !== null && set.score2 !== null) {
                filledSets++;
                if (!Utils.validateSet(set.score1, set.score2)) {
                    allSetsValid = false;
                }
                if (set.score1 > set.score2) p1SetsWon++;
                else if (set.score2 > set.score1) p2SetsWon++;
            }
        });

        // Pro Best of 1 stačí jeden vyplněný set
        if (State.current.bestOf === 1) {
            if (filledSets < 1) {
                Utils.showNotification('Vyplňte skóre setu!', 'error');
                return;
            }
        }

        // Varování pro nestandardní skóre (ale povolit uložení)
        if (!allSetsValid) {
            Utils.showNotification('⚠️ Varování: Nestandardní skóre! Zkontrolujte, zda je zadáno správně.', 'error');
        }

        // Pro Best of 3/5 - varování pokud není rozhodnuto (ale povolit remízy a zápasy na čas)
        if (State.current.bestOf > 1) {
            const requiredSets = Math.ceil(State.current.bestOf / 2);
            if (p1SetsWon < requiredSets && p2SetsWon < requiredSets && filledSets > 0) {
                Utils.showNotification('⚠️ Varování: Zápas není rozhodnut standardním způsobem (možná remíza nebo zápas na čas).', 'error');
            }
        }

        match.playing = false;
        match.completed = true;
        match.endTime = new Date().toISOString();
        State.save();
        UI.render();
        Utils.showNotification(`Zápas ${idx + 1} ukončen`);
    },

    edit(idx) {
        const match = State.current.matches[idx];
        match.completed = false;
        State.save();
        UI.render();
    },

    startTimer(idx) {
        const timer = setInterval(() => {
            const timerEl = document.getElementById(`timer-${idx}`);
            const match = State.current.matches[idx];
            
            if (!match.playing || !timerEl) {
                clearInterval(timer);
                return;
            }
            
            timerEl.textContent = Utils.calculateElapsed(match.startTime);
        }, 1000);
    }
};
