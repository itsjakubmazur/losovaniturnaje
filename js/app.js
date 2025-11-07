// app.js - Hlavní inicializace a globální funkce

// Initialize app
function init() {
    State.load();
    UI.render();

    // Update timers every second
    setInterval(() => {
        State.current.matches.forEach((m, i) => {
            if (m.playing && m.startTime) {
                const timerEl = document.getElementById(`timer-${i}`);
                if (timerEl) {
                    timerEl.textContent = Utils.calculateElapsed(m.startTime);
                }
            }
        });
    }, 1000);

    // Setup keyboard shortcuts for quick score mode
    setupKeyboardShortcuts();
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

        // Only if quick score mode is active and on matches page
        if (!State.current.quickScoreMode || State.current.step !== 'matches') return;

        // Find currently playing match
        const playingMatchIdx = State.current.matches.findIndex(m => m.playing);
        if (playingMatchIdx === -1) return;

        const match = State.current.matches[playingMatchIdx];

        // Find current set (first incomplete set)
        const currentSetIdx = match.sets.findIndex(s => s.score1 === null || s.score2 === null);
        if (currentSetIdx === -1) return;

        // Don't trigger if user is typing in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
                <button class="modal-close" onclick="UI.closeModal('participant-modal')">×</button>
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
                <button class="btn btn-primary" onclick="saveParticipant()">💾 ${i18n.t('btn.save')}</button>
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

    const participant = {
        name: name,
        partner: document.getElementById('modal-type').value === 'double' ? document.getElementById('modal-partner').value.trim() : null,
        club: document.getElementById('modal-club').value.trim(),
        seed: parseInt(document.getElementById('modal-seed').value),
        email: document.getElementById('modal-email').value.trim(),
        phone: document.getElementById('modal-phone').value.trim()
    };

    if (State.editingParticipantIndex >= 0) {
        State.current.participants[State.editingParticipantIndex] = participant;
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
    if (confirm(`Opravdu odebrat ${State.current.participants[index].name}?`)) {
        State.current.participants.splice(index, 1);
        State.save();
        UI.render();
        Utils.showNotification('Účastník odebrán');
    }
}

function autoFillParticipants() {
    const names = ['Jan Novák', 'Petr Svoboda', 'Karel Dvořák', 'Tomáš Černý', 
                   'Martin Procházka', 'Jiří Kučera', 'Pavel Veselý', 'Lukáš Horák'];
    const clubs = ['SK Praha', 'TJ Brno', 'BC Ostrava', 'SK Plzeň'];
    
    names.forEach((name, i) => {
        State.current.participants.push({
            name: name,
            club: clubs[i % clubs.length],
            seed: Math.floor(Math.random() * 10) + 1,
            email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
            phone: `+420 ${Math.floor(Math.random() * 900000000 + 100000000)}`
        });
    });
    
    State.save();
    UI.render();
    Utils.showNotification('Demo účastníci přidáni');
}

// Draw functions
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
    const matchCard = document.getElementById(`match-${idx}`);
    if (matchCard) {
        matchCard.classList.toggle('collapsed');
    }
}

// Theme and UI functions
function openThemeMenu() {
    const modal = document.getElementById('theme-modal');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Vyberte motiv</h3>
                <button class="modal-close" onclick="UI.closeModal('theme-modal')">×</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">
                <div style="text-align:center;cursor:pointer;padding:10px;border-radius:8px;transition:all 0.3s;" onclick="UI.setTheme('theme-blue')">
                    <div style="width:100%;height:80px;border-radius:8px;margin-bottom:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);"></div>
                    <span>Modrá</span>
                </div>
                <div style="text-align:center;cursor:pointer;padding:10px;border-radius:8px;" onclick="UI.setTheme('theme-green')">
                    <div style="width:100%;height:80px;border-radius:8px;margin-bottom:10px;background:linear-gradient(135deg,#10b981,#059669);"></div>
                    <span>Zelená</span>
                </div>
                <div style="text-align:center;cursor:pointer;padding:10px;border-radius:8px;" onclick="UI.setTheme('theme-purple')">
                    <div style="width:100%;height:80px;border-radius:8px;margin-bottom:10px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);"></div>
                    <span>Fialová</span>
                </div>
                <div style="text-align:center;cursor:pointer;padding:10px;border-radius:8px;" onclick="UI.setTheme('theme-orange')">
                    <div style="width:100%;height:80px;border-radius:8px;margin-bottom:10px;background:linear-gradient(135deg,#f59e0b,#d97706);"></div>
                    <span>Oranžová</span>
                </div>
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
    Utils.showNotification('Turnaj uložen do historie');
    Utils.throwConfetti();
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
            Utils.showNotification('Finále vygenerováno! 🏆');
        } else {
            Utils.showNotification('Další fáze vygenerována');
        }
    }
}

function scrollToMatch(idx) {
    // Scroll to match detail in the list
    setTimeout(() => {
        const matchCard = document.querySelector(`[data-match="${idx}"]`);
        if (matchCard) {
            matchCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            matchCard.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            setTimeout(() => {
                matchCard.style.backgroundColor = '';
            }, 2000);
        }
    }, 100);
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
        undoBtn.style.opacity = State.undoStack.length === 0 ? '0.3' : '1';
    }

    if (redoBtn) {
        redoBtn.disabled = State.redoStack.length === 0;
        redoBtn.style.opacity = State.redoStack.length === 0 ? '0.3' : '1';
    }
}

// Match filtering
let currentMatchFilter = 'all';

function setMatchFilter(filter) {
    currentMatchFilter = filter;

    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    filterMatches();
}

function filterMatches() {
    const searchTerm = document.getElementById('match-search')?.value.toLowerCase() || '';

    document.querySelectorAll('.round-section').forEach(section => {
        const matches = section.querySelectorAll('.match-card');
        let visibleCount = 0;

        matches.forEach(card => {
            const matchIdx = parseInt(card.dataset.match);
            const match = State.current.matches[matchIdx];

            if (!match) {
                card.style.display = 'none';
                return;
            }

            const p1Name = Utils.getPlayerDisplayName(match.player1).toLowerCase();
            const p2Name = Utils.getPlayerDisplayName(match.player2).toLowerCase();

            // Check filter
            let passesFilter = true;
            if (currentMatchFilter === 'completed') {
                passesFilter = match.completed;
            } else if (currentMatchFilter === 'playing') {
                passesFilter = match.playing;
            } else if (currentMatchFilter === 'pending') {
                passesFilter = !match.completed && !match.playing;
            }

            // Check search
            const passesSearch = searchTerm === '' ||
                                p1Name.includes(searchTerm) ||
                                p2Name.includes(searchTerm);

            if (passesFilter && passesSearch) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Hide round section if no visible matches
        if (visibleCount === 0) {
            section.style.display = 'none';
        } else {
            section.style.display = '';
        }
    });
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
