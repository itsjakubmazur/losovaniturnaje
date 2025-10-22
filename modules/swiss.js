// modules/swiss.js
import { saveData } from './storage.js';
import { shuffleArray, calculateStandings, renderStandingsTable, updateProgressBar } from './utils.js';

export function generateSwiss() {
    const players = window.tournamentData.participants;
    const shuffled = shuffleArray(players);
    const matches = [];
    let matchId = 1;
    
    for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
            matches.push({
                id: matchId++,
                round: 1,
                player1: shuffled[i],
                player2: shuffled[i + 1],
                score1: '',
                score2: '',
                finished: false,
                playingNow: false,
                note: ''
            });
        }
    }
    
    window.tournamentData.matches = matches;
    window.tournamentData.swissRound = 1;
    saveData();
}

export function nextSwissRound() {
    const participants = window.tournamentData.participants;
    const matches = window.tournamentData.matches;
    const currentRound = window.tournamentData.swissRound;
    const numRounds = Math.ceil(Math.log2(participants.length));
    
    if (currentRound >= numRounds) {
        alert('Všechna kola švýcarského systému jsou dokončena!');
        return;
    }
    
    // Kontrola, zda jsou všechny zápasy aktuálního kola dokončeny
    const currentRoundMatches = matches.filter(m => m.round === currentRound);
    const allFinished = currentRoundMatches.every(m => m.finished);
    
    if (!allFinished) {
        alert('Nejprve dokončete všechny zápasy aktuálního kola!');
        return;
    }
    
    // Vypočítat aktuální pořadí
    const standings = calculateStandings(participants, matches);
    
    // Párovat hráče podle pořadí
    const newMatches = [];
    let matchId = matches.length + 1;
    const paired = new Set();
    
    for (let i = 0; i < standings.length; i++) {
        if (paired.has(standings[i].id)) continue;
        
        for (let j = i + 1; j < standings.length; j++) {
            if (paired.has(standings[j].id)) continue;
            
            // Kontrola, zda spolu již nehráli
            const alreadyPlayed = matches.some(m => 
                (m.player1.id === standings[i].id && m.player2.id === standings[j].id) ||
                (m.player1.id === standings[j].id && m.player2.id === standings[i].id)
            );
            
            if (!alreadyPlayed) {
                newMatches.push({
                    id: matchId++,
                    round: currentRound + 1,
                    player1: standings[i],
                    player2: standings[j],
                    score1: '',
                    score2: '',
                    finished: false,
                    playingNow: false,
                    note: ''
                });
                paired.add(standings[i].id);
                paired.add(standings[j].id);
                break;
            }
        }
    }
    
    window.tournamentData.matches = [...matches, ...newMatches];
    window.tournamentData.swissRound = currentRound + 1;
    window.addToHistory('swiss_round', { round: currentRound + 1 });
    saveData();
}

export function renderSwiss() {
    const content = document.getElementById('matchesContent');
    const matches = window.tournamentData.matches;
    const participants = window.tournamentData.participants;
    const currentRound = window.tournamentData.swissRound;
    const numRounds = Math.ceil(Math.log2(participants.length));
    const standings = calculateStandings(participants, matches);
    
    const rounds = [...new Set(matches.map(m => m.round))].sort();
    
    // Kontrola, zda lze generovat další kolo
    const currentRoundMatches = matches.filter(m => m.round === currentRound);
    const allFinished = currentRoundMatches.every(m => m.finished);
    const canGenerateNext = allFinished && currentRound < numRounds;
    
    if (canGenerateNext) {
        document.getElementById('nextRoundBtn').classList.remove('hidden');
    } else {
        document.getElementById('nextRoundBtn').classList.add('hidden');
    }
    
    // Aktualizovat progress bar
    updateProgressBar();
    
    // Aktualizovat nadpis s informací o kole
    document.getElementById('tournamentTitle').textContent = 
        `${window.tournamentData.name} - Kolo ${currentRound}/${numRounds}`;
    
    content.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">🏆 Celkové pořadí</h3>
            ${renderStandingsTable(standings)}
        </div>
        
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">📋 Zápasy po kolech</h3>
            ${rounds.map(round => `
                <div class="mb-6">
                    <h4 class="font-bold text-gray-700 mb-3 text-lg">
                        Kolo ${round}
                        ${round === currentRound ? '<span class="text-blue-600">(aktuální)</span>' : ''}
                    </h4>
                    <div class="space-y-2">
                        ${matches.filter(m => m.round === round).map(match => 
                            renderMatchInputSwiss(match)
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderMatchInputSwiss(match) {
    let bgClass = 'bg-gray-50';
    
    if (match.playingNow) {
        bgClass = 'playing-now';
    } else if (match.finished) {
        if (match.score1 > match.score2) {
            bgClass = 'bg-green-50';
        } else if (match.score2 > match.score1) {
            bgClass = 'bg-red-50';
        } else {
            bgClass = 'bg-yellow-50';
        }
    }
    
    return `
        <div>
            <div class="flex items-center gap-2 ${bgClass} p-3 rounded-lg relative">
                ${match.playingNow ? `
                    <span class="playing-badge absolute -top-2 -left-2">
                        🏸 PRÁVĚ HRAJE
                    </span>
                ` : ''}
                <span class="font-medium text-gray-700 flex-1 truncate">${match.player1.name}</span>
                <input type="number" min="0" value="${match.score1}" 
                    onchange="updateSwissMatchScore(${match.id}, this.value, document.getElementById('sscore2_${match.id}').value)"
                    class="w-16 px-2 py-1 border-2 border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                    id="sscore1_${match.id}"
                    ${match.playingNow ? 'disabled' : ''}>
                <span class="font-bold">:</span>
                <input type="number" min="0" value="${match.score2}"
                    onchange="updateSwissMatchScore(${match.id}, document.getElementById('sscore1_${match.id}').value, this.value)"
                    class="w-16 px-2 py-1 border-2 border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                    id="sscore2_${match.id}"
                    ${match.playingNow ? 'disabled' : ''}>
                <span class="font-medium text-gray-700 flex-1 text-right truncate">${match.player2.name}</span>
                
                ${!match.finished ? `
                    <button onclick="togglePlayingNow(${match.id}, null)" 
                        class="no-print ${match.playingNow ? 'text-orange-600 hover:text-orange-700' : 'text-gray-400 hover:text-gray-600'}" 
                        title="${match.playingNow ? 'Zrušit "Právě hraje"' : 'Označit jako probíhající'}">
                        🏸
                    </button>
                ` : ''}
                
                <button onclick="addMatchNote(${match.id}, null)" 
                    class="text-blue-600 hover:text-blue-700 no-print" title="Přidat poznámku">
                    📝
                </button>
                ${match.finished ? `
                    <button onclick="deleteSwissMatchScore(${match.id})" 
                        class="text-red-600 hover:text-red-700 no-print" title="Smazat výsledek">
                        🗑️
                    </button>
                ` : ''}
            </div>
            ${match.note ? `
                <div class="text-xs text-gray-600 italic ml-4 mt-1 bg-yellow-50 p-2 rounded">
                    📝 ${match.note}
                </div>
            ` : ''}
        </div>
    `;
}

window.updateSwissMatchScore = (matchId, score1, score2) => {
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    
    window.tournamentData.matches = window.tournamentData.matches.map(match => {
        if (match.id === matchId) {
            return {
                ...match,
                score1: s1,
                score2: s2,
                finished: score1 !== '' && score2 !== '',
                playingNow: false
            };
        }
        return match;
    });
    
    saveData();
    renderSwiss();
};

window.deleteSwissMatchScore = (matchId) => {
    window.tournamentData.matches = window.tournamentData.matches.map(match => {
        if (match.id === matchId) {
            return { ...match, score1: '', score2: '', finished: false };
        }
        return match;
    });
    
    saveData();
    renderSwiss();
};