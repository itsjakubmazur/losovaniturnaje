// app.js - Hlavní inicializace a globální funkce

// Initialize app
// Změna odkazu na turnaj (#live=, #ref=, #shared=) bez nového načtení stránky – načíst znovu,
// protože režim stránky se určuje jen při startu
window.addEventListener('hashchange', () => {
    if (/^#(live|ref|shared)=/.test(window.location.hash)) window.location.reload();
});

function init() {
    // Stránka rozhodčího: #ref=<session>/<zápas>
    const refMatch = window.location.hash.match(/^#ref=([^/&]+)\/(\d+)/);
    if (refMatch) {
        Remote.initReferee(refMatch[1], parseInt(refMatch[2], 10));
        return;
    }

    State.load();
    UI.render();
    Remote.listen();

    // Update timers every second
    setInterval(() => {
        const clock = document.getElementById('tv-clock');
        if (clock) clock.textContent = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        State.current.matches.forEach((m, i) => {
            if (m.playing && m.startTime) {
                const elapsed = Utils.calculateElapsed(m.startTime);
                const timerEl = document.getElementById(`timer-${i}`);
                if (timerEl) {
                    timerEl.textContent = elapsed;
                }
                const spectatorTimerEl = document.getElementById(`spectator-timer-${i}`);
                if (spectatorTimerEl) {
                    spectatorTimerEl.textContent = elapsed;
                }
                ['court', 'sp-court'].forEach(prefix => {
                    const el = document.getElementById(`${prefix}-timer-${i}`);
                    if (el) el.textContent = elapsed;
                });
            }
        });
    }, 1000);

    // Setup keyboard shortcuts for quick score mode
    setupKeyboardShortcuts();
    setupModalDismiss();
}

// Okna: zavření klepnutím vedle a klávesou Esc
function setupModalDismiss() {
    const closeModalEl = m => {
        if (m.id && ['participant-modal', 'theme-modal', 'history-modal', 'export-modal'].includes(m.id)) m.classList.remove('show');
        else m.remove();
    };
    document.addEventListener('click', e => {
        if (e.target.classList && e.target.classList.contains('modal') && e.target.classList.contains('show')) closeModalEl(e.target);
        const menu = document.querySelector('.more-menu[open]');
        if (menu && !menu.contains(e.target)) menu.removeAttribute('open');
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const open = [...document.querySelectorAll('.modal.show')].pop();
        if (open) { closeModalEl(open); return; }
        const menu = document.querySelector('.more-menu[open]');
        if (menu) { menu.removeAttribute('open'); return; }
        if (MatchSheet.idx !== null) MatchSheet.close();
    });
}

// Keyboard shortcuts for quick scoring and general shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Global shortcuts (Ctrl+Z, Ctrl+Y)
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undoAction();
                return;
            }
            if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                e.preventDefault();
                redoAction();
                return;
            }
        }

        // Body klávesami: v otevřeném panelu zápasu, nebo v rychlém režimu u běžícího zápasu
        if (State.current.step !== 'matches') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        let playingMatchIdx = MatchSheet.idx !== null && !State.current.matches[MatchSheet.idx]?.completed ? MatchSheet.idx : -1;
        if (playingMatchIdx === -1 && State.current.quickScoreMode) playingMatchIdx = State.current.matches.findIndex(m => m.playing);
        if (playingMatchIdx === -1) return;

        const match = State.current.matches[playingMatchIdx];

        // Find current set (first incomplete set)
        const currentSetIdx = Matches.currentSetIdx(match);
        if (currentSetIdx === -1) return;

        // Don't trigger if user is typing in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (MatchSheet.idx === playingMatchIdx && ['q', 'w', 'a', 's'].includes(e.key.toLowerCase())) {
            MatchSheet.bump = `${currentSetIdx}-${'qw'.includes(e.key.toLowerCase()) ? 1 : 2}`;
        }

        switch(e.key.toLowerCase()) {
            case 'q': // Player 1 decrease
                e.preventDefault();
                quickScoreAdjust(playingMatchIdx, currentSetIdx, 1, -1);
                break;
            case 'w': // Player 1 increase
                e.preventDefault();
                quickScoreAdjust(playingMatchIdx, currentSetIdx, 1, 1);
                break;
            case 'a': // Player 2 decrease
                e.preventDefault();
                quickScoreAdjust(playingMatchIdx, currentSetIdx, 2, -1);
                break;
            case 's': // Player 2 increase
                e.preventDefault();
                quickScoreAdjust(playingMatchIdx, currentSetIdx, 2, 1);
                break;
            case 'escape': // Exit quick score mode
                e.preventDefault();
                toggleQuickScoreMode();
                break;
        }
    });
}

// Navigation functions
function goToSetup() { State.current.step = 'setup'; UI.render(); }
function goToParticipants() { State.current.step = 'participants'; UI.render(); }
function goToDraw() {
    if (State.current.participants.length < 2) {
        Utils.showNotification('Přidejte alespoň 2 účastníky!', 'error');
        return;
    }
    State.current.step = 'draw';
    UI.render();
}
function goToMatches() { State.current.step = 'matches'; UI.render(); }
function goToResults() { State.current.step = 'results'; UI.render(); }

// Participant functions
function openParticipantModal(index = -1) {
    State.editingParticipantIndex = index;
    const modal = document.getElementById('participant-modal');
    
    const participant = index >= 0 ? State.current.participants[index] : null;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${index >= 0 ? i18n.t('participant.edit') : i18n.t('participant.add')}</h3>
                <button class="modal-close" onclick="UI.closeModal('participant-modal')" aria-label="Zavřít">${Icons.svg('x')}</button>
            </div>
            <div class="input-group">
                <label>${i18n.t('participant.name')} *</label>
                <input type="text" id="modal-name" value="${participant?.name || ''}" placeholder="${i18n.currentLang === 'cs' ? 'Celé jméno' : 'Full Name'}">
            </div>
            <div class="input-group">
                <label>${i18n.t('participant.type')}</label>
                <select id="modal-type" onchange="UI.togglePartnerField()">
                    <option value="single" ${!participant?.partner ? 'selected' : ''}>${i18n.t('participant.single')}</option>
                    <option value="double" ${participant?.partner ? 'selected' : ''}>${i18n.t('participant.double')}</option>
                </select>
            </div>
            <div class="input-group" id="partner-group" style="display:${participant?.partner ? 'block' : 'none'};">
                <label>${i18n.t('participant.partner')}</label>
                <input type="text" id="modal-partner" value="${participant?.partner || ''}" placeholder="${i18n.currentLang === 'cs' ? 'Jméno partnera' : 'Partner Name'}">
            </div>
            <div class="input-group" id="teamname-group" style="display:${participant?.partner ? 'block' : 'none'};">
                <label>${i18n.t('participant.teamname')}</label>
                <input type="text" id="modal-teamname" value="${participant?.teamName || ''}" placeholder="${i18n.currentLang === 'cs' ? 'Přezdívka (nepovinné)' : 'Nickname (optional)'}">
            </div>
            <div class="input-group">
                <label>${i18n.t('participant.club')}</label>
                <input type="text" id="modal-club" value="${participant?.club || ''}" placeholder="${i18n.currentLang === 'cs' ? 'SK Badminton Praha' : 'SK Badminton Prague'}">
            </div>
            <div class="input-group">
                <label>${i18n.t('participant.seed')}</label>
                <input type="number" id="modal-seed" min="1" max="10" value="${participant?.seed || 5}">
                <small>${i18n.currentLang === 'cs' ? '10 = nejsilnější' : '10 = strongest'}</small>
            </div>
            <div class="input-group">
                <label>${i18n.t('participant.email')}</label>
                <input type="email" id="modal-email" value="${participant?.email || ''}" placeholder="${i18n.currentLang === 'cs' ? 'hrac@example.com' : 'player@example.com'}">
            </div>
            <div class="input-group">
                <label>${i18n.t('participant.phone')}</label>
                <input type="tel" id="modal-phone" value="${participant?.phone || ''}" placeholder="+420 123 456 789">
            </div>
            <div class="button-group">
                <button class="btn btn-primary" onclick="saveParticipant()">${Icons.svg('check')}${i18n.t('btn.save')}</button>
                <button class="btn btn-outline" onclick="UI.closeModal('participant-modal')">${i18n.t('btn.cancel')}</button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function saveParticipant() {
    const name = document.getElementById('modal-name').value.trim();
    if (!name) {
        Utils.showNotification('Vyplňte jméno!', 'error');
        return;
    }

    const isDouble = document.getElementById('modal-type').value === 'double';
    const teamNameVal = isDouble ? document.getElementById('modal-teamname').value.trim() : null;
    const participant = {
        name: name,
        partner: isDouble ? document.getElementById('modal-partner').value.trim() : null,
        teamName: (isDouble && teamNameVal) ? teamNameVal : null,
        club: document.getElementById('modal-club').value.trim(),
        seed: parseInt(document.getElementById('modal-seed').value),
        email: document.getElementById('modal-email').value.trim(),
        phone: document.getElementById('modal-phone').value.trim()
    };

    if (State.editingParticipantIndex >= 0) {
        const oldParticipant = State.current.participants[State.editingParticipantIndex];
        State.current.participants[State.editingParticipantIndex] = participant;

        // Aktualizuj jméno/partnera v existujících zápasech
        State.current.matches.forEach(match => {
            if (match.player1 && match.player1.name === oldParticipant.name) {
                match.player1 = Object.assign({}, match.player1, { name: participant.name, partner: participant.partner, teamName: participant.teamName });
            }
            if (match.player2 && match.player2.name === oldParticipant.name) {
                match.player2 = Object.assign({}, match.player2, { name: participant.name, partner: participant.partner, teamName: participant.teamName });
            }
        });

        // Aktualizuj jméno v skupinách (draw)
        State.current.groups.forEach(group => {
            group.forEach((p, i) => {
                if (p && p.name === oldParticipant.name) {
                    group[i] = Object.assign({}, p, { name: participant.name, partner: participant.partner, teamName: participant.teamName });
                }
            });
        });
    } else {
        State.current.participants.push(participant);
    }

    State.save();
    UI.closeModal('participant-modal');
    UI.render();
    Utils.showNotification(State.editingParticipantIndex >= 0 ? 'Účastník upraven' : 'Účastník přidán');
}

function editParticipant(index) {
    openParticipantModal(index);
}

function removeParticipant(index) {
    const p = State.current.participants[index];
    const row = document.querySelector(`.roster-row[data-idx="${index}"]`);
    const commit = () => {
        State.current.participants.splice(index, 1);
        State.save();
        UI.render();
        Utils.showNotification(`${Utils.getPlayerDisplayNamePlain(p)} odebrán(a)`, 'success', { label: 'Vrátit', fn: undoAction });
    };
    if (row && !UI.reducedMotion()) {
        row.classList.add('is-leaving');
        setTimeout(commit, 220);
    } else {
        commit();
    }
}

// Rychlé přidání hráče z řádku nad seznamem
function quickAddParticipant() {
    const nameEl = document.getElementById('qa-name');
    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }
    const partnerEl = document.getElementById('qa-partner');
    const partner = partnerEl ? partnerEl.value.trim() : '';
    if (partnerEl && !partner) { partnerEl.focus(); Utils.showNotification('Doplňte partnera, ve čtyřhře hrají páry', 'error'); return; }
    const club = document.getElementById('qa-club').value.trim();
    State.current.participants.push({ name, partner: partner || null, teamName: null, club, seed: 5, email: '', phone: '' });
    UI.newParticipantIdx = State.current.participants.length - 1;
    UI.focusQuickAdd = true;
    State.save();
    UI.render();
    const clubEl = document.getElementById('qa-club');
    if (clubEl) clubEl.value = club; // klub často stejný pro více hráčů
}

function filterRoster(term) {
    const t = term.trim().toLowerCase();
    let hits = 0;
    document.querySelectorAll('.roster-row').forEach(r => {
        const show = !t || r.dataset.search.includes(t);
        r.hidden = !show;
        if (show) hits++;
    });
    const none = document.getElementById('roster-nohit');
    if (none) none.hidden = hits > 0;
}

function togglePresence(index) {
    const p = State.current.participants[index];
    p.absent = !p.absent;
    State.save();
    UI.render();
}

function markAllPresent() {
    State.current.participants.forEach(p => { delete p.absent; });
    State.save();
    UI.render();
    Utils.showNotification('Všichni označeni jako přítomní');
}

function autoFillParticipants() {
    const singles = ['Jan Novák', 'Petr Svoboda', 'Karel Dvořák', 'Tomáš Černý',
                     'Martin Procházka', 'Jiří Kučera', 'Pavel Veselý', 'Lukáš Horák'];
    const doubles = [
        { name: 'Jan Novák', partner: 'Petr Svoboda', teamName: 'Letci' },
        { name: 'Karel Dvořák', partner: 'Tomáš Černý', teamName: 'Orel' },
        { name: 'Martin Procházka', partner: 'Jiří Kučera', teamName: 'Blesk' },
        { name: 'Pavel Veselý', partner: 'Lukáš Horák', teamName: 'Dynamit' },
        { name: 'Ondřej Málek', partner: 'Filip Kratochvíl', teamName: 'Smečkaři' },
        { name: 'Adam Blažek', partner: 'Michal Říha', teamName: 'Smash Bros' },
        { name: 'Jakub Šimák', partner: 'David Zeman', teamName: 'Performa' },
        { name: 'Vojtěch Tůma', partner: 'Radek Pokorný', teamName: 'Turbíny' },
    ];
    const clubs = ['SK Praha', 'TJ Brno', 'BC Ostrava', 'SK Plzeň'];
    const isDoubles = State.current.disciplineType === 'doubles';

    if (isDoubles) {
        doubles.forEach((pair, i) => {
            State.current.participants.push({
                name: pair.name,
                partner: pair.partner,
                teamName: pair.teamName,
                club: clubs[i % clubs.length],
                seed: Math.floor(Math.random() * 10) + 1,
            });
        });
    } else {
        singles.forEach((name, i) => {
            State.current.participants.push({
                name: name,
                club: clubs[i % clubs.length],
                seed: Math.floor(Math.random() * 10) + 1,
                email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
                phone: `+420 ${Math.floor(Math.random() * 900000000 + 100000000)}`
            });
        });
    }

    State.save();
    UI.render();
    Utils.showNotification('Demo účastníci přidáni');
}

// Draw functions – move player between groups
function openMovePlayerModal(fromGroupIdx, playerIdx) {
    const groups = State.current.groups;
    const player = groups[fromGroupIdx][playerIdx];
    const playerName = Utils.getPlayerDisplayName(player);

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'move-player-modal';

    const otherGroups = groups.map((g, i) => ({ i, letter: String.fromCharCode(65 + i) }))
        .filter(g => g.i !== fromGroupIdx);

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Přesunout hráče</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Zavřít">${Icons.svg('x')}</button>
            </div>
            <p class="modal-lead"><strong>${playerName}</strong> je ve skupině ${String.fromCharCode(65 + fromGroupIdx)}. Kam ho přesunout?</p>
            <div class="menu-list">
                ${otherGroups.map(g => `
                    <button class="menu-item menu-item-row" onclick="movePlayerToGroup(${fromGroupIdx}, ${playerIdx}, ${g.i}); document.getElementById('move-player-modal').remove();">
                        <span class="group-letter" style="--group:${UI.getGroupColor(g.letter)}">${g.letter}</span>
                        <strong>Skupina ${g.letter}</strong><span>${groups[g.i].length} ${Utils.plural(groups[g.i].length, 'hráč', 'hráči', 'hráčů')}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function movePlayerToGroup(fromGroupIdx, playerIdx, toGroupIdx) {
    const groups = State.current.groups;
    const player = groups[fromGroupIdx].splice(playerIdx, 1)[0];
    groups[toGroupIdx].push(player);
    State.save();
    UI.render();
    const fromLetter = String.fromCharCode(65 + fromGroupIdx);
    const toLetter = String.fromCharCode(65 + toGroupIdx);
    Utils.showNotification(`${Utils.getPlayerDisplayNamePlain(player)} přesunut(a) ze skupiny ${fromLetter} do ${toLetter}`);
}

function performDraw() {
    if (State.current.system === 'groups') {
        const filteredParticipants = Utils.filterParticipantsByDiscipline(State.current.participants);

        if (filteredParticipants.length === 0) {
            Utils.showNotification('Žádní účastníci pro vybranou disciplínu! Zkontrolujte nastavení.', 'error');
            return;
        }

        const shuffled = Utils.shuffle(filteredParticipants);
        const perGroup = Math.ceil(shuffled.length / State.current.numGroups);
        
        State.current.groups = [];
        for (let i = 0; i < State.current.numGroups; i++) {
            State.current.groups.push(shuffled.slice(i * perGroup, (i + 1) * perGroup));
        }
    } else {
        State.current.participants = Utils.shuffle(State.current.participants);
    }
    
    State.save();
    UI.render();
    Utils.showNotification('Losování provedeno');
}

// Match functions
function updateSet(matchIdx, setIdx, player, value) {
    const score = value === '' ? null : parseInt(value);
    const match = State.current.matches[matchIdx];

    if (player === 1) {
        match.sets[setIdx].score1 = score;
    } else {
        match.sets[setIdx].score2 = score;
    }

    State.save();
}

// Quick score mode toggle
function toggleQuickScoreMode(matchIdx) {
    State.current.quickScoreMode = !State.current.quickScoreMode;
    State.save();
    UI.render();

    // Show keyboard shortcut hints
    if (State.current.quickScoreMode) {
        Utils.showNotification('Rychlý režim aktivován! Klávesy: Q/W = hráč 1, A/S = hráč 2');
    } else {
        Utils.showNotification('Normální režim aktivován');
    }
}

// Quick score adjust - increment or decrement score
function quickScoreAdjust(matchIdx, setIdx, player, delta) {
    const match = State.current.matches[matchIdx];
    const set = match.sets[setIdx];

    if (player === 1) {
        const current = set.score1 !== null ? set.score1 : 0;
        const newScore = Math.max(0, Math.min(State.current.tieBreakPoints, current + delta));
        set.score1 = newScore;
    } else {
        const current = set.score2 !== null ? set.score2 : 0;
        const newScore = Math.max(0, Math.min(State.current.tieBreakPoints, current + delta));
        set.score2 = newScore;
    }
    // Počítání po bodech: druhá strana začíná na nule, aby šel set rozhodnout
    if (set.score1 === null) set.score1 = 0;
    if (set.score2 === null) set.score2 = 0;

    State.save();
    UI.render();
}

// Quick score presets - common scores
function quickScorePreset(matchIdx, setIdx, score1, score2) {
    const match = State.current.matches[matchIdx];
    match.sets[setIdx].score1 = score1;
    match.sets[setIdx].score2 = score2;
    State.save();
    UI.render();
    Utils.showNotification(`Nastaveno ${score1}:${score2}`);
}

function updateNotes(matchIdx, notes) {
    State.current.notes[matchIdx] = notes;
    State.save();
}

function startMatch(idx) {
    Matches.start(idx);
}

function finishMatch(idx) {
    Matches.finish(idx);
}

function editMatch(idx) {
    Matches.edit(idx);
}

// Toggle match detail
function toggleMatchDetail(idx) {
    MatchSheet.open(idx);
}

// Theme and UI functions
function openThemeMenu() {
    const modal = document.getElementById('theme-modal');
    const current = (document.body.className.match(/theme-\w+/) || ['theme-green'])[0];
    const themes = [
        { id: 'theme-green', name: 'Zelený kurt', note: 'Klasický povrch hal', color: '#1e5a46' },
        { id: 'theme-blue', name: 'Modrý kurt', note: 'Jako na velkých turnajích', color: '#1f4f8f' },
        { id: 'theme-purple', name: 'Fialový kurt', note: 'Výrazný, pro akce', color: '#4a3b8f' },
        { id: 'theme-orange', name: 'Antuka', note: 'Pro tenisové turnaje', color: '#a84e2a' }
    ];
    modal.innerHTML = `
        <div class="modal-content modal-narrow">
            <div class="modal-header">
                <h3>Barva kurtu</h3>
                <button class="modal-close" onclick="UI.closeModal('theme-modal')" aria-label="Zavřít">${Icons.svg('x')}</button>
            </div>
            <div class="theme-grid">
                ${themes.map(t => `
                    <button class="theme-option ${t.id === current ? 'active' : ''}" onclick="UI.setTheme('${t.id}')">
                        <span class="theme-swatch" style="--swatch:${t.color}"></span>
                        <strong>${t.name}</strong>
                        <span>${t.note}</span>
                    </button>`).join('')}
            </div>
        </div>
    `;
    modal.classList.add('show');
}

function toggleDarkMode() {
    UI.toggleDarkMode();
}

function openHistory() {
    UI.openHistory();
}

function openExportMenu() {
    Export.menu();
}

function saveToHistory() {
    const tournament = State.saveToHistory();
    if (tournament) {
        Utils.showNotification('Turnaj uložen do historie');
        Utils.throwConfetti();
        UI.render();
    }
}

function loadTournamentFromHistory(id) {
    if (State.loadFromHistory(id)) {
        UI.closeModal('history-modal');
        UI.render();
    }
}

function advancePlayoffRound() {
    if (!State.current.playoffBracket) {
        Utils.showNotification('Playoff není aktivní', 'error');
        return;
    }
    
    const currentRound = State.current.playoffBracket.currentRound;
    
    // Check if current round is completed
    const currentRoundMatches = State.current.matches.filter(m => 
        m.knockoutRound === currentRound
    );
    
    if (!currentRoundMatches.every(m => m.completed)) {
        Utils.showNotification('Dokončete všechny zápasy aktuální fáze!', 'error');
        return;
    }
    
    const success = Playoff.advanceWinners(currentRound);
    if (success) {
        State.save();
        UI.render();
        
        if (State.current.playoffBracket.currentRound === State.current.playoffBracket.totalRounds - 1) {
            Utils.showNotification('Finále je nachystané');
        } else {
            Utils.showNotification('Další fáze vygenerována');
        }
    }
}

function generateLosersBracketRound(fromRound) {
    const success = Playoff.generateLosersBracketRound(fromRound);
    if (success) {
        State.save();
        UI.render();
        Utils.showNotification('Pavouk poražených vygenerován!');
    } else {
        Utils.showNotification('Nelze vygenerovat pavouk poražených', 'error');
    }
}

function advanceLosersBracketRound(fromRound) {
    const bracketInfo = State.current.knockoutLosersBrackets.find(b => b.fromRound === fromRound);
    if (!bracketInfo) { Utils.showNotification('Pavouk neexistuje', 'error'); return; }

    const currentMatches = State.current.matches.filter(m =>
        m.isLosersBracket && m.losersBracketFromRound === fromRound && m.losersBracketRound === bracketInfo.currentRound
    );
    if (!currentMatches.every(m => m.completed)) {
        Utils.showNotification('Dokončete všechny zápasy aktuálního kola!', 'error');
        return;
    }

    const success = Playoff.advanceLosersBracketRound(fromRound);
    if (success) {
        State.save();
        UI.render();
        Utils.showNotification(`Další kolo (${bracketInfo.label}) vygenerováno`);
    }
}

function advanceConsolationRound(tier) {
    const tierInfo = State.current.consolationBrackets.find(b => b.tier === tier);
    if (!tierInfo) {
        Utils.showNotification('Tato skupina neexistuje', 'error');
        return;
    }

    const currentMatches = State.current.matches.filter(m =>
        m.isConsolation && m.consolationTier === tier && m.consolationRound === tierInfo.currentRound
    );

    if (!currentMatches.every(m => m.completed)) {
        Utils.showNotification('Dokončete všechny zápasy tohoto kola!', 'error');
        return;
    }

    const success = Playoff.advanceConsolationRound(tier);
    if (success) {
        State.save();
        UI.render();
        Utils.showNotification(`Další kolo skupiny ${tierInfo.label} vygenerováno`);
    }
}

function scrollToMatch(idx) {
    // Z kurtu, pavouka i fronty otevře panel zápasu
    if (State.current.step !== 'matches') goToMatches();
    MatchSheet.open(idx);
}

// Undo/Redo functions
function undoAction() {
    if (State.undo()) {
        UI.render();
        updateUndoRedoButtons();
    }
}

function redoAction() {
    if (State.redo()) {
        UI.render();
        updateUndoRedoButtons();
    }
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
        undoBtn.disabled = State.undoStack.length === 0;

    }

    if (redoBtn) {
        redoBtn.disabled = State.redoStack.length === 0;

    }
}

// Match filtering
let currentMatchFilter = 'all';

function setMatchFilter(filter) {
    currentMatchFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const on = btn.dataset.filter === filter;
        btn.classList.toggle('active', on);
        btn.classList.toggle('on', on);
    });
    filterMatches();
}

function filterMatches() {
    const input = document.getElementById('match-search');
    if (input) UI.matchSearch = input.value;
    const searchTerm = (UI.matchSearch || '').toLowerCase().trim();
    document.querySelectorAll('.round-section').forEach(section => {
        let visible = 0;
        section.querySelectorAll('.match-row').forEach(row => {
            const match = State.current.matches[parseInt(row.dataset.match, 10)];
            if (!match) { row.hidden = true; return; }
            const names = `${Utils.getPlayerDisplayNamePlain(match.player1)} ${match.player1?.partner || ''} ${Utils.getPlayerDisplayNamePlain(match.player2)} ${match.player2?.partner || ''}`.toLowerCase();
            const passesFilter = currentMatchFilter === 'completed' ? match.completed
                : currentMatchFilter === 'playing' ? match.playing
                : currentMatchFilter === 'pending' ? !match.completed && !match.playing
                : true;
            const show = passesFilter && (!searchTerm || names.includes(searchTerm));
            row.hidden = !show;
            if (show) visible++;
        });
        section.hidden = visible === 0;
    });
}

// ===== CSV IMPORT =====

function showCSVImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'csv-import-modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Vložit seznam hráčů</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Zavřít">${Icons.svg('x')}</button>
            </div>
            <p class="modal-lead">Každý hráč na nový řádek. Stačí jen jméno, další údaje oddělte čárkou v tomto pořadí:</p>
            <div class="csv-format-example">Jméno,Partner,Klub,Nasazení,E-mail,Telefon
Jan Novák,,SK Praha,8
Petr Svoboda
Alena Malá,Karel Malý,BC Ostrava,5</div>
            <p class="field-hint">Partnera vyplňte jen u čtyřhry. Nasazení 1–10, nepovinné.</p>
            <div class="field">
                <label class="field-label" for="csv-text-input">Seznam</label>
                <textarea id="csv-text-input" class="mono" placeholder="Jan Novák,,SK Praha,8&#10;Petr Svoboda" oninput="previewCSV(true)"></textarea>
            </div>
            <label class="file-drop">
                ${Icons.svg('upload')}<span><strong>Nebo nahrajte soubor CSV</strong><span>Například export přihlášek z tabulky</span></span>
                <input type="file" accept=".csv,.txt" onchange="importCSVFile(this.files[0])">
            </label>
            <div id="csv-preview" hidden></div>
            <div class="button-group">
                <button class="btn btn-primary" onclick="importCSVText()">${Icons.svg('check')}Přidat hráče</button>
                <button class="btn btn-quiet" onclick="this.closest('.modal').remove()">Zrušit</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('textarea').focus();
}

function parseCSVLine(line) {
    // Handle quoted fields with commas inside
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const participants = [];
    const errors = [];

    lines.forEach((line, idx) => {
        if (!line || line.startsWith('#')) return; // skip comments
        const parts = parseCSVLine(line);
        const name = parts[0];
        if (!name) {
            errors.push(`Řádek ${idx + 1}: chybí jméno`);
            return;
        }
        participants.push({
            name: name,
            partner: parts[1] || null,
            club: parts[2] || '',
            seed: parts[3] ? Math.min(10, Math.max(1, parseInt(parts[3]) || 5)) : 5,
            email: parts[4] || '',
            phone: parts[5] || ''
        });
    });

    return { participants, errors };
}

function previewCSV(silent) {
    const text = document.getElementById('csv-text-input').value;
    const preview = document.getElementById('csv-preview');
    if (!text.trim()) {
        preview.hidden = true;
        if (!silent) Utils.showNotification('Vložte seznam hráčů', 'error');
        return;
    }
    const { participants, errors } = parseCSV(text);
    preview.hidden = false;
    preview.innerHTML = `
        <div class="csv-preview">
            <strong>Přidá se ${participants.length} ${Utils.plural(participants.length, 'hráč', 'hráči', 'hráčů')}</strong>
            ${errors.length ? `<div class="csv-errors">${errors.map(e => `<span>${Icons.svg('alert')}${e}</span>`).join('')}</div>` : ''}
            <ul class="csv-list">
                ${participants.map(p => `
                    <li><span class="avatar">${Utils.getInitials(p.name)}</span>
                        <span><strong>${p.name}${p.partner ? ` &amp; ${p.partner}` : ''}</strong><span>${p.club || 'Bez klubu'}, nasazení ${p.seed}</span></span></li>`).join('')}
            </ul>
        </div>`;
}

function importCSVText() {
    const text = document.getElementById('csv-text-input').value;
    if (!text.trim()) { Utils.showNotification('Vložte CSV text', 'error'); return; }
    const { participants, errors } = parseCSV(text);
    if (participants.length === 0) { Utils.showNotification('Nenalezeni žádní platní účastníci', 'error'); return; }

    State.current.participants.push(...participants);
    State.save();
    document.getElementById('csv-import-modal').remove();
    UI.render();
    Utils.showNotification(`Importováno ${participants.length} účastníků${errors.length ? ` (${errors.length} chyb)` : ''}`);
}

function importCSVFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const textarea = document.getElementById('csv-text-input');
        if (textarea) textarea.value = e.target.result;
        previewCSV();
    };
    reader.readAsText(file);
}

// ===== TOURNAMENT TEMPLATES =====

function showTemplatesModal() {
    const templates = JSON.parse(localStorage.getItem('tournamentTemplates') || '[]');
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'templates-modal';
    const disc = t => t.disciplineType === 'singles' ? 'Dvouhra' : t.disciplineType === 'doubles' ? 'Čtyřhra' : 'Smíšené';

    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Šablony turnajů</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Zavřít">${Icons.svg('x')}</button>
            </div>
            <p class="modal-lead">Šablona si pamatuje formát, kurty a pravidla. Příští ročník pak nastavíte jedním klepnutím.</p>
            <div class="button-group button-group-top">
                <button class="btn btn-primary" onclick="saveCurrentAsTemplate()">${Icons.svg('save')}Uložit současné nastavení</button>
            </div>
            ${templates.length ? `
                <div class="template-grid">
                    ${templates.map(t => `
                        <div class="template-card" role="button" tabindex="0" onclick="loadTemplate(${t.id})" onkeydown="if(event.key==='Enter') loadTemplate(${t.id})">
                            <button class="icon-btn icon-btn-sm template-delete" onclick="event.stopPropagation();deleteTemplate(${t.id})" title="Smazat šablonu" aria-label="Smazat šablonu ${t.name}">${Icons.svg('trash')}</button>
                            <div class="template-card-title">${t.name}</div>
                            <div class="template-card-meta">${Utils.getSystemName(t.system)}, ${disc(t).toLowerCase()}</div>
                            <div class="template-card-meta">${t.numCourts} ${Utils.plural(t.numCourts, 'kurt', 'kurty', 'kurtů')}, ${t.bestOf === 1 ? '1 set' : `na ${Math.ceil(t.bestOf / 2)} vítězné sety`} do ${t.pointsPerSet}</div>
                        </div>`).join('')}
                </div>` : `
                <div class="empty-state"><p><strong>Zatím žádná šablona.</strong></p><p>Nastavte turnaj a uložte ho jako šablonu.</p></div>`}
        </div>
    `;
    document.body.appendChild(modal);
}

function saveCurrentAsTemplate() {
    const name = prompt('Název šablony:', State.current.tournamentName || 'Moje šablona');
    if (!name) return;

    const template = {
        id: Date.now(),
        name: name,
        system: State.current.system,
        disciplineType: State.current.disciplineType,
        numGroups: State.current.numGroups,
        numCourts: State.current.numCourts,
        matchDuration: State.current.matchDuration,
        breakTime: State.current.breakTime,
        pointsForWin: State.current.pointsForWin,
        pointsForDraw: State.current.pointsForDraw,
        bestOf: State.current.bestOf,
        pointsPerSet: State.current.pointsPerSet,
        tieBreakPoints: State.current.tieBreakPoints
    };

    const templates = JSON.parse(localStorage.getItem('tournamentTemplates') || '[]');
    templates.unshift(template);
    if (templates.length > 20) templates.pop();
    localStorage.setItem('tournamentTemplates', JSON.stringify(templates));

    const modal = document.getElementById('templates-modal');
    if (modal) modal.remove();
    Utils.showNotification(`Šablona "${name}" uložena`);
}

function loadTemplate(id) {
    const templates = JSON.parse(localStorage.getItem('tournamentTemplates') || '[]');
    const template = templates.find(t => t.id === id);
    if (!template) return;

    // Apply template settings to current state
    Object.assign(State.current, {
        system: template.system,
        disciplineType: template.disciplineType,
        numGroups: template.numGroups,
        numCourts: template.numCourts,
        matchDuration: template.matchDuration,
        breakTime: template.breakTime,
        pointsForWin: template.pointsForWin,
        pointsForDraw: template.pointsForDraw,
        bestOf: template.bestOf,
        pointsPerSet: template.pointsPerSet,
        tieBreakPoints: template.tieBreakPoints
    });

    State.save();
    document.getElementById('templates-modal').remove();
    UI.render();
    Utils.showNotification(`Šablona "${template.name}" načtena`);
}

function deleteTemplate(id) {
    const templates = JSON.parse(localStorage.getItem('tournamentTemplates') || '[]');
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1) return;
    const name = templates[idx].name;
    templates.splice(idx, 1);
    localStorage.setItem('tournamentTemplates', JSON.stringify(templates));
    const modal = document.getElementById('templates-modal');
    if (modal) modal.remove();
    showTemplatesModal();
    Utils.showNotification(`Šablona "${name}" smazána`);
}

// ===== COURT CONFLICT DETECTION =====

function detectCourtConflicts() {
    const playing = State.current.matches.filter(m => m.playing);
    const conflicts = [];

    for (let i = 0; i < playing.length; i++) {
        for (let j = i + 1; j < playing.length; j++) {
            const m1 = playing[i];
            const m2 = playing[j];

            const playerKey = p => p?.name || p;
            const players1 = [playerKey(m1.player1), playerKey(m1.player2)];
            const players2 = [playerKey(m2.player1), playerKey(m2.player2)];

            const overlapKeys = players1.filter(p => players2.includes(p));
            if (overlapKeys.length > 0) {
                conflicts.push({
                    match1: State.current.matches.indexOf(m1),
                    match2: State.current.matches.indexOf(m2),
                    players: overlapKeys.map(k => Utils.getPlayerDisplayNamePlain(
                        State.current.participants.find(p => p.name === k) || k
                    ))
                });
            }
        }
    }

    return conflicts;
}

// ===== SPECTATOR MODE =====

function openSpectatorMode() {
    const liveUrl = State.startLiveSession();
    if (!liveUrl) {
        Utils.showNotification('Živé sdílení se nepodařilo spustit', 'error');
        return;
    }
    Remote.listen();

    const tvUrl = `${liveUrl}&tv=1`;
    const qrUrl = Utils.generateQRCode(liveUrl, 440);
    const tournamentName = (State.current.tournamentName || 'Turnaj').replace(/'/g, "\\'");
    const safe = u => u.replace(/'/g, "\\'");

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content modal-narrow">
            <div class="modal-header">
                <h3><span class="live-dot" aria-hidden="true"></span> Živé sdílení</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Zavřít">${Icons.svg('x')}</button>
            </div>
            <p class="modal-lead">Diváci a hráči uvidí kurty, pořadí zápasů a tabulky v reálném čase. Odkaz platí po celý turnaj.</p>
            <div class="qr-frame"><img src="${qrUrl}" alt="QR kód živého sdílení" width="220" height="220"></div>
            <div class="url-box">${liveUrl}</div>
            <div class="button-group">
                <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${safe(liveUrl)}').then(() => Utils.showNotification('Odkaz zkopírován'))">Kopírovat odkaz</button>
                ${navigator.share ? `<button class="btn btn-secondary" onclick="navigator.share({title:'${tournamentName}',url:'${safe(liveUrl)}'})">Sdílet</button>` : ''}
                <a class="btn btn-secondary" href="${tvUrl}" target="_blank" rel="noopener">Otevřít na monitor</a>
            </div>
            <p class="modal-note">Monitor v hale: otevřete odkaz „na monitor“ na počítači připojeném k televizi a zapněte celou obrazovku (F11).</p>
            <div class="button-group">
                <button class="btn btn-ghost-danger" onclick="State.stopLiveSession();this.closest('.modal').remove();">Ukončit sdílení</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
