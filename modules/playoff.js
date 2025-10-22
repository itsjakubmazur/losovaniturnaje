// modules/playoff.js
import { saveData } from './storage.js';
import { calculateStandings } from './utils.js';

export function generatePlayoffMatches() {
    const groups = window.tournamentData.groups;
    const playoffType = window.tournamentData.playoffType;
    
    const allStandings = groups.map(g => calculateStandings(g.players, g.matches));
    let playoffPlayers = [];
    
    if (playoffType === 'winners') {
        // Pouze vítězové skupin a případně druzí
        allStandings.forEach(standings => {
            playoffPlayers.push(standings[0]); // 1. místo
            if (standings.length >= 2) playoffPlayers.push(standings[1]); // 2. místo
        });
    } else if (playoffType === 'half') {
        // Horní půlka každé skupiny
        allStandings.forEach(standings => {
            const half = Math.ceil(standings.length / 2);
            playoffPlayers.push(...standings.slice(0, half));
        });
    } else if (playoffType === 'full') {
        // Všichni účastníci
        allStandings.forEach(standings => {
            playoffPlayers.push(...standings);
        });
    }
    
    // Seřadit podle výsledků
    playoffPlayers.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
    });
    
    const playoff = [];
    const numPlayers = playoffPlayers.length;
    
    if (playoffType === 'winners' && numPlayers <= 4) {
        // Speciální případ - zápasy o umístění
        if (numPlayers >= 2) {
            playoff.push({
                id: 1,
                round: 'Finále',
                player1: playoffPlayers[0],
                player2: playoffPlayers[1],
                score1: '',
                score2: '',
                finished: false,
                playingNow: false,
                note: '',
                placement: '1. místo'
            });
        }
        if (numPlayers >= 4) {
            playoff.push({
                id: 2,
                round: 'O 3. místo',
                player1: playoffPlayers[2],
                player2: playoffPlayers[3],
                score1: '',
                score2: '',
                finished: false,
                playingNow: false,
                note: '',
                placement: '3. místo'
            });
        }
    } else {
        // Klasický pavouk
        let matchId = 1;
        const roundName = numPlayers <= 4 ? 'Semifinále' : numPlayers <= 8 ? 'Čtvrtfinále' : 'Kolo 1';
        
        for (let i = 0; i < numPlayers; i += 2) {
            if (i + 1 < numPlayers) {
                playoff.push({
                    id: matchId++,
                    round: roundName,
                    player1: playoffPlayers[i],
                    player2: playoffPlayers[i + 1],
                    score1: '',
                    score2: '',
                    finished: false,
                    playingNow: false,
                    note: ''
                });
            }
        }
    }
    
    window.tournamentData.playoffMatches = playoff;
    window.tournamentData.step = 'playoff';
    saveData();
}

export function renderPlayoff() {
    const content = document.getElementById('playoffContent');
    const matches = window.tournamentData.playoffMatches;
    
    // Seskupit zápasy podle kol
    const matchesByRound = {};
    matches.forEach(match => {
        if (!matchesByRound[match.round]) {
            matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
    });
    
    content.innerHTML = Object.keys(matchesByRound).map(round => `
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">
                ${round}
                ${matchesByRound[round][0].placement ? ` - ${matchesByRound[round][0].placement}` : ''}
            </h3>
            <div class="space-y-2">
                ${matchesByRound[round].map(match => 
                    renderPlayoffMatch(match)
                ).join('')}
            </div>
        </div>
    `).join('');
}

function renderPlayoffMatch(match) {
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
            <div class="flex items-center gap-2 ${bgClass} p-4 rounded-lg relative">
                ${match.playingNow ? `
                    <span class="playing-badge absolute -top-2 -left-2">
                        🏸 PRÁVĚ HRAJE
                    </span>
                ` : ''}
                <span class="font-medium text-gray-700 flex-1 truncate text-lg">${match.player1.name}</span>
                <input type="number" min="0" value="${match.score1}" 
                    onchange="updatePlayoffMatchScore(${match.id}, this.value, document.getElementById('pscore2_${match.id}').value)"
                    class="w-20 px-2 py-2 border-2 border-gray-300 rounded text-center text-lg focus:border-blue-500 focus:outline-none"
                    id="pscore1_${match.id}"
                    ${match.playingNow ? 'disabled' : ''}>
                <span class="font-bold text-xl">:</span>
                <input type="number" min="0" value="${match.score2}"
                    onchange="updatePlayoffMatchScore(${match.id}, document.getElementById('pscore1_${match.id}').value, this.value)"
                    class="w-20 px-2 py-2 border-2 border-gray-300 rounded text-center text-lg focus:border-blue-500 focus:outline-none"
                    id="pscore2_${match.id}"
                    ${match.playingNow ? 'disabled' : ''}>
                <span class="font-medium text-gray-700 flex-1 text-right truncate text-lg">${match.player2.name}</span>
                
                ${!match.finished ? `
                    <button onclick="togglePlayoffPlayingNow(${match.id})" 
                        class="no-print ${match.playingNow ? 'text-orange-600 hover:text-orange-700' : 'text-gray-400 hover:text-gray-600'}" 
                        title="${match.playingNow ? 'Zrušit "Právě hraje"' : 'Označit jako probíhající'}">
                        🏸
                    </button>
                ` : ''}
                
                <button onclick="addPlayoffMatchNote(${match.id})" 
                    class="text-blue-600 hover:text-blue-700 no-print" title="Přidat poznámku">
                    📝
                </button>
                ${match.finished ? `
                    <button onclick="deletePlayoffMatchScore(${match.id})" 
                        class="text-red-600 hover:text-red-700 ml-2 no-print" title="Smazat výsledek">
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

window.updatePlayoffMatchScore = (matchId, score1, score2) => {
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    
    window.tournamentData.playoffMatches = window.tournamentData.playoffMatches.map(match => {
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
    renderPlayoff();
};

window.deletePlayoffMatchScore = (matchId) => {
    window.tournamentData.playoffMatches = window.tournamentData.playoffMatches.map(match => {
        if (match.id === matchId) {
            return { ...match, score1: '', score2: '', finished: false };
        }
        return match;
    });
    
    saveData();
    renderPlayoff();
};

window.togglePlayoffPlayingNow = (matchId) => {
    window.tournamentData.playoffMatches = window.tournamentData.playoffMatches.map(match => {
        if (match.id === matchId) {
            return { ...match, playingNow: !match.playingNow };
        }
        return match;
    });
    
    saveData();
    renderPlayoff();
};

window.addPlayoffMatchNote = (matchId) => {
    const match = window.tournamentData.playoffMatches.find(m => m.id === matchId);
    const currentNote = match?.note || '';
    const note = prompt('Zadejte poznámku k zápasu:', currentNote);
    
    if (note === null) return;
    
    window.tournamentData.playoffMatches = window.tournamentData.playoffMatches.map(m => {
        if (m.id === matchId) {
            return { ...m, note: note.trim() };
        }
        return m;
    });
    
    saveData();
    renderPlayoff();
};