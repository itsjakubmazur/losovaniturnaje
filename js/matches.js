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

        // Pre-compute rounds for every group without final round/court assignments
        const groupRounds = [];
        State.current.groups.forEach((group, groupIndex) => {
            const filteredGroup = Utils.filterParticipantsByDiscipline(group);
            if (filteredGroup.length === 0) { groupRounds.push([]); return; }

            const groupLetter = String.fromCharCode(65 + groupIndex);
            const players = [...filteredGroup];
            if (players.length % 2 === 1) players.push({ name: 'BYE', isBye: true });

            const n = players.length;
            const rounds = [];
            for (let round = 0; round < n - 1; round++) {
                const roundMatches = [];
                for (let match = 0; match < n / 2; match++) {
                    const home = (round + match) % (n - 1);
                    const away = (n - 1 - match + round) % (n - 1);
                    const p1 = match === 0 ? players[n - 1] : players[home];
                    const p2 = match === 0 ? players[away] : players[away];
                    if (!p1.isBye && !p2.isBye) {
                        const m = this.createMatch(p1, p2, 0, 1); // placeholder, set below
                        m.group = groupLetter;
                        roundMatches.push(m);
                    }
                }
                if (roundMatches.length > 0) rounds.push(roundMatches);
            }
            groupRounds.push(rounds);
        });

        // Interleave: for each round index r take matches from all groups,
        // then assign final round number and courts sequentially.
        const maxRounds = Math.max(0, ...groupRounds.map(g => g.length));
        let roundCounter = 0;
        for (let r = 0; r < maxRounds; r++) {
            const combined = [];
            groupRounds.forEach(groupR => { if (r < groupR.length) combined.push(...groupR[r]); });
            if (combined.length > 0) {
                combined.forEach((m, i) => {
                    m.round = roundCounter;
                    m.court = (i % State.current.numCourts) + 1;
                });
                State.current.rounds.push(roundCounter);
                State.current.matches.push(...combined);
                roundCounter++;
            }
        }
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

    // Set je rozhodnutý, když jsou obě čísla a skóre odpovídá pravidlům (hranice, rozdíl, strop)
    setDecided(set) {
        return !!set && set.score1 !== null && set.score2 !== null && set.score1 !== undefined && set.score2 !== undefined
            && set.score1 !== set.score2 && Utils.validateSet(set.score1, set.score2);
    },

    // Rozehraný set: první nerozhodnutý; -1, když už má někdo potřebný počet setů
    currentSetIdx(match) {
        const need = Math.ceil((match.sets || []).length / 2);
        let w1 = 0, w2 = 0;
        for (let i = 0; i < match.sets.length; i++) {
            const s = match.sets[i];
            if (!this.setDecided(s)) return (w1 >= need || w2 >= need) ? -1 : i;
            if (s.score1 > s.score2) w1++; else w2++;
            if (w1 >= need || w2 >= need) return -1;
        }
        return -1;
    },

    setsWon(match) {
        const sets = (match.sets || []).filter(s => s && s.score1 !== null && s.score2 !== null && s.score1 !== undefined);
        return [sets.filter(s => s.score1 > s.score2).length, sets.filter(s => s.score2 > s.score1).length];
    },

    // Kompaktní řádek zápasu v rozpisu; klepnutím se otevře panel se skóre
    renderRow(match) {
        const idx = State.current.matches.indexOf(match);
        const [w1, w2] = this.setsWon(match);
        const winner = match.completed ? (w1 > w2 ? 1 : w2 > w1 ? 2 : 0) : 0;
        const state = match.completed ? 'is-done' : match.playing ? 'is-live' : 'is-pending';
        const color = match.group ? UI.getGroupColor(match.group) : 'var(--rule-strong)';
        const sets = Courts.setsSummary(match);

        let center;
        if (match.completed) {
            center = `<span class="mr-result">${w1}:${w2}</span><span class="mr-sets">${sets}</span>`;
        } else if (match.playing) {
            center = `<span class="mr-live"><span class="live-dot"></span>${sets || 'hraje se'}</span>`;
        } else {
            center = `<span class="mr-vs">vs</span>`;
        }

        let action;
        if (match.completed) {
            action = `<span class="mr-chev">${Icons.svg('chevronRight')}</span>`;
        } else if (match.playing) {
            action = `<span class="mr-timer" id="timer-${idx}">${match.startTime ? Utils.calculateElapsed(match.startTime) : ''}</span>`;
        } else {
            action = `<button class="btn btn-sm btn-secondary mr-start" onclick="event.stopPropagation(); startMatch(${idx})" title="Začít na kurtu ${match.court}">${Icons.svg('play')}<span>Kurt ${match.court}</span></button>`;
        }

        return `
            <div class="match-row ${state}" data-match="${idx}" style="--group:${color}" role="button" tabindex="0"
                 onclick="MatchSheet.open(${idx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();MatchSheet.open(${idx});}"
                 aria-label="Zápas ${idx + 1}: ${Utils.getPlayerDisplayNamePlain(match.player1)} proti ${Utils.getPlayerDisplayNamePlain(match.player2)}">
                <span class="mr-no">${idx + 1}</span>
                <span class="mr-tags">
                    ${match.playing || match.completed ? `<span class="tag">K${match.court}</span>` : ''}
                    ${match.group ? `<span class="tag tag-group">${match.group}</span>` : ''}
                    ${State.current.notes[idx] ? `<span class="tag" title="Má poznámku">${Icons.svg('note')}</span>` : ''}
                </span>
                <span class="mr-p mr-p1 ${winner === 1 ? 'is-winner' : ''} ${winner === 2 ? 'is-loser' : ''}">${Utils.getPlayerDisplayName(match.player1)}</span>
                <span class="mr-center">${center}</span>
                <span class="mr-p mr-p2 ${winner === 2 ? 'is-winner' : ''} ${winner === 1 ? 'is-loser' : ''}">${Utils.getPlayerDisplayName(match.player2)}</span>
                <span class="mr-action">${action}</span>
            </div>`;
    },

    start(idx) {
        const match = State.current.matches[idx];
        // Je-li „jeho“ kurt obsazený, vezme první volný
        const busy = Courts.onCourt(match.court);
        let clash = false;
        if (busy && busy !== match) {
            const free = Courts.freeCourts()[0];
            if (free) match.court = free;
            else clash = true;
        }
        match.playing = true;
        match.startTime = new Date().toISOString();
        State.save();
        UI.render();
        if (clash) Utils.showNotification(`Všechny kurty jsou obsazené, zápas ${idx + 1} běží souběžně na kurtu ${match.court}`, 'error');
        else Utils.showNotification(`Zápas ${idx + 1} běží na kurtu ${match.court}`);
        
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
            Utils.showNotification('Neobvyklé skóre setu. Zkontrolujte, jestli je zadané správně.', 'error');
        }

        // Pro Best of 3/5 - varování pokud není rozhodnuto (ale povolit remízy a zápasy na čas)
        if (State.current.bestOf > 1) {
            const requiredSets = Math.ceil(State.current.bestOf / 2);
            if (p1SetsWon < requiredSets && p2SetsWon < requiredSets && filledSets > 0) {
                Utils.showNotification('Zápas nemá vítěze na sety (remíza nebo hra na čas). Uloženo i tak.', 'error');
            }
        }

        match.playing = false;
        match.completed = true;
        match.endTime = new Date().toISOString();
        State.save();
        if (MatchSheet.idx === idx) MatchSheet.close();
        UI.render();
        const [w1, w2] = this.setsWon(match);
        const winnerName = w1 > w2 ? Utils.getPlayerDisplayNamePlain(match.player1) : w2 > w1 ? Utils.getPlayerDisplayNamePlain(match.player2) : null;
        Utils.showNotification(winnerName ? `Zápas ${idx + 1} uložen, vyhrál(a) ${winnerName} ${Math.max(w1, w2)}:${Math.min(w1, w2)}` : `Zápas ${idx + 1} uložen`);
        Courts.afterFinish(match.court);
        const row = document.querySelector(`.match-row[data-match="${idx}"]`);
        if (row && !UI.reducedMotion()) row.classList.add('just-done');
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
