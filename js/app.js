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
                <h3>${index >= 0 ? 'Upravit účastníka' : 'Přidat účastníka'}</h3>
                <button class="modal-close" onclick="UI.closeModal('participant-modal')">×</button>
            </div>
            <div class="input-group">
                <label>Jméno *</label>
                <input type="text" id="modal-name" value="${participant?.name || ''}" placeholder="Celé jméno">
            </div>
            <div class="input-group">
                <label>Typ</label>
                <select id="modal-type" onchange="UI.togglePartnerField()">
                    <option value="single" ${!participant?.partner ? 'selected' : ''}>Jednotlivec</option>
                    <option value="double" ${participant?.partner ? 'selected' : ''}>Debl (dvojice)</option>
                </select>
            </div>
            <div class="input-group" id="partner-group" style="display:${participant?.partner ? 'block' : 'none'};">
                <label>Partner</label>
                <input type="text" id="modal-partner" value="${participant?.partner || ''}" placeholder="Jméno partnera">
            </div>
            <div class="input-group">
                <label>Klub/Město</label>
                <input type="text" id="modal-club" value="${participant?.club || ''}" placeholder="SK Badminton Praha">
            </div>
            <div class="input-group">
                <label>Nasazení (1-10)</label>
                <input type="number" id="modal-seed" min="1" max="10" value="${participant?.seed || 5}">
                <small>10 = nejsilnější</small>
            </div>
            <div class="input-group">
                <label>E-mail</label>
                <input type="email" id="modal-email" value="${participant?.email || ''}" placeholder="hrac@example.com">
            </div>
            <div class="input-group">
                <label>Telefon</label>
                <input type="tel" id="modal-phone" value="${participant?.phone || ''}" placeholder="+420 123 456 789">
            </div>
            <div class="button-group">
                <button class="btn btn-primary" onclick="saveParticipant()">💾 Uložit</button>
                <button class="btn btn-outline" onclick="UI.closeModal('participant-modal')">Zrušit</button>
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
        const shuffled = Utils.shuffle(State.current.participants);
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

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
