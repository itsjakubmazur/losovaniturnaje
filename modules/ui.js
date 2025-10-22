// modules/ui.js - Vykreslování celého UI

export function renderUI() {
    const app = document.getElementById('app');
    const step = window.tournamentData.step;
    
    if (step === 'setup') {
        app.innerHTML = renderSetup();
    } else if (step === 'matches') {
        app.innerHTML = renderMatches();
    } else if (step === 'playoff') {
        app.innerHTML = renderPlayoffSection();
    }
    
    // Vykreslit modaly
    renderModals();
}

function renderSetup() {
    const { participants, system } = window.tournamentData;
    
    return `
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-6 text-white">
            <div class="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 class="text-3xl font-bold">🏸 Rozlosování turnaje</h1>
                    <p class="text-blue-100 mt-2">Profesionální správa badmintonových turnajů</p>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <button id="darkModeBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold no-print">🌙</button>
                    <button id="historyBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold no-print">📜</button>
                    <button id="statsBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold no-print">📊</button>
                    <button id="exportBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold no-print">📥</button>
                    <label class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold cursor-pointer no-print">
                        📤
                        <input type="file" id="importFile" accept=".json" class="hidden">
                    </label>
                </div>
            </div>
        </div>

        <div class="space-y-6">
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">⚙️ Nastavení turnaje</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Název turnaje</label>
                        <input type="text" id="tournamentName" value="${window.tournamentData.name}" 
                            class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                            placeholder="Např. Vánoční turnaj 2025">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Herní systém</label>
                        <select id="systemSelect" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
                            <option value="roundrobin" ${system === 'roundrobin' ? 'selected' : ''}>Každý s každým</option>
                            <option value="groups" ${system === 'groups' ? 'selected' : ''}>Skupiny + Play-off</option>
                            <option value="swiss" ${system === 'swiss' ? 'selected' : ''}>Švýcarský systém</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Bodový systém</label>
                        <select id="pointSystem" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                            <option value="2">2 body za výhru</option>
                            <option value="3">3 body za výhru</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tie-break pravidla</label>
                        <select id="tieBreakRules" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                            <option value="wins-sets-direct">Výhry → Sety → Vzájemný</option>
                            <option value="wins-direct-sets">Výhry → Vzájemný → Sety</option>
                            <option value="sets-wins-direct">Sety → Výhry → Vzájemný</option>
                            <option value="direct-wins-sets">Vzájemný → Výhry → Sety</option>
                        </select>
                    </div>
                    
                    <div id="groupSettings" class="${system === 'groups' ? '' : 'hidden'} space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Počet skupin</label>
                            <input type="number" id="numGroups" value="2" min="2" max="4" 
                                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Typ play-off</label>
                            <select id="playoffType" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                                <option value="winners">Vítězové skupin</option>
                                <option value="half">Horní půlka</option>
                                <option value="full">Celkový pavouk</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="swissInfo" class="${system === 'swiss' ? '' : 'hidden'} bg-blue-50 p-4 rounded-lg">
                        <p class="text-sm text-blue-800">
                            <strong>Švýcarský systém:</strong> Automatické párování podle pořadí
                        </p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    👥 Účastníci (<span id="participantCount">${participants.length}</span>)
                </h2>
                
                <div class="flex gap-2 mb-4">
                    <input type="text" id="newParticipant" 
                        class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Jméno účastníka">
                    <button id="addParticipantBtn" 
                        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg">
                        Přidat
                    </button>
                </div>
                
                <div id="participantsList" class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    ${renderParticipantsList()}
                </div>
                
                <button id="startTournamentBtn" 
                    class="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg ${participants.length < 2 ? 'hidden' : ''}">
                    ▶️ Spustit turnaj
                </button>
            </div>
        </div>
    `;
}

function renderParticipantsList() {
    const participants = window.tournamentData.participants;
    
    if (participants.length === 0) {
        return '<p class="text-gray-500 col-span-2 text-center py-4">Zatím žádní účastníci</p>';
    }
    
    return participants.map((p, index) => `
        <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span class="font-medium text-gray-700">${index + 1}. ${p.name}</span>
            <button class="remove-participant text-red-600 hover:text-red-700 font-semibold" data-id="${p.id}">
                🗑️ Odstranit
            </button>
        </div>
    `).join('');
}

function renderMatches() {
    const { name } = window.tournamentData;
    
    return `
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-6 text-white">
            <div class="flex justify-between items-center flex-wrap gap-4">
                <h1 class="text-2xl font-bold">${name}</h1>
                <div class="flex gap-2 flex-wrap">
                    <button id="searchBtn" class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">🔍</button>
                    <button id="editRoundsBtn" class="hidden bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">✏️</button>
                    <button id="nextRoundBtn" class="hidden bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">Další kolo</button>
                    <button id="playoffBtn" class="hidden bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">Play-off</button>
                    <button id="duplicateBtn" class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">📋</button>
                    <button id="printBtn" class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">🖨️</button>
                    <button id="qrBtn" class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">📱</button>
                    <button id="resetBtn" class="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg no-print">Reset</button>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
                <span>Průběh turnaje</span>
                <span id="progressText">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
            </div>
        </div>

        <div id="matchesContent">
            <!-- Obsah se vykreslí podle systému -->
        </div>
    `;
}

function renderPlayoffSection() {
    return `
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-6 text-white">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold">🏆 Play-off</h1>
                <div class="flex gap-2">
                    <button id="backToGroupsBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg no-print">← Zpět</button>
                    <button id="resetBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg no-print">Reset</button>
                </div>
            </div>
        </div>

        <div id="playoffContent">
            <!-- Obsah play-off -->
        </div>
    `;
}

function renderModals() {
    const modals = document.getElementById('modals');
    
    modals.innerHTML = `
        <!-- Vyhledávání -->
        <div id="searchModal" class="modal hidden">
            <div class="modal-content">
                <h3 class="text-xl font-bold mb-4">🔍 Vyhledat hráče</h3>
                <input type="text" id="searchInput" class="w-full px-4 py-2 border-2 rounded-lg mb-4" placeholder="Jméno hráče">
                <div id="searchResults" class="max-h-96 overflow-y-auto"></div>
                <button id="closeSearchBtn" class="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg w-full">Zavřít</button>
            </div>
        </div>

        <!-- Statistiky -->
        <div id="statsModal" class="modal hidden">
            <div class="modal-content">
                <h3 class="text-xl font-bold mb-4">📊 Statistiky</h3>
                <div id="statsContent"></div>
                <button id="closeStatsBtn" class="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg w-full">Zavřít</button>
            </div>
        </div>

        <!-- Historie -->
        <div id="historyModal" class="modal hidden">
            <div class="modal-content">
                <h3 class="text-xl font-bold mb-4">📜 Historie změn</h3>
                <div id="historyContent" class="max-h-96 overflow-y-auto"></div>
                <button id="closeHistoryBtn" class="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg w-full">Zavřít</button>
            </div>
        </div>

        <!-- QR kód -->
        <div id="qrModal" class="modal hidden">
            <div class="modal-content">
                <h3 class="text-xl font-bold mb-4">📱 Sdílení</h3>
                <div id="qrContent"></div>
                <button id="closeQRBtn" class="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg w-full">Zavřít</button>
            </div>
        </div>
    `;
}

export function showNotification(message, type = 'success') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export function updateParticipantsList() {
    const list = document.getElementById('participantsList');
    const count = document.getElementById('participantCount');
    const btn = document.getElementById('startTournamentBtn');
    
    if (list) list.innerHTML = renderParticipantsList();
    if (count) count.textContent = window.tournamentData.participants.length;
    if (btn) {
        if (window.tournamentData.participants.length >= 2) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
}