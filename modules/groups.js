// modules/groups.js
import { saveData } from './storage.js';
import { shuffleArray, calculateStandings, renderStandingsTable, updateProgressBar } from './utils.js';

function generateRoundRobinForGroup(players) {
    const matches = [];
    let matchId = 1;
    
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            matches.push({
                id: matchId++,
                player1: players[i],
                player2: players[j],
                score1: '',
                score2: '',
                finished: false,
                playingNow: false,
                note: ''
            });
        }
    }
    return matches;
}

export function generateGroups(numGroups) {
    const players = window.tournamentData.participants;
    const shuffled = shuffleArray(players);
    const groups = Array.from({ length: numGroups }, () => []);
    
    shuffled.forEach((player, index) => {
        groups[index % numGroups].push(player);
    });
    
    window.tournamentData.groups = groups.map((group, index) => ({
        id: index + 1,
        name: `Skupina ${String.fromCharCode(65 + index)}`,
        players: group,
        matches: generateRoundRobinForGroup(group)
    }));
    
    saveData();
}

export function renderGroups() {
    const content = document.getElementById('matchesContent');
    const groups = window.tournamentData.groups;
    
    // Kontrola, zda jsou všechny skupiny dokončené
    const allGroupsFinished = groups.every(g => g.matches.every(m => m.finished));
    
    if (allGroupsFinished) {
        document.getElementById('playoffBtn').classList.remove('hidden');
    } else {
        document.getElementById('playoffBtn').classList.add('hidden');
    }
    
    // Aktualizovat progress bar
    updateProgressBar();
    
    content.innerHTML = groups.map(group => {
        const standings = calculateStandings(group.players, group.matches);
        
        return `
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">${group.name}</h3>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-700 mb-3">Tabulka</h4>
                    ${renderStandingsTable(standings)}
                </div>
                
                <div>
                    <h4 class="font-semibold text-gray-700 mb-3">Zápasy</h4>
                    <div class="space-y-2">
                        ${group.matches.map(match => 
                            renderMatchInputGroup(match, group.id)
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderMatchInputGroup(match, groupId) {
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
                    onchange="updateGroupMatchScore(${groupId}, ${match.id}, this.value, document.getElementById('gscore2_${groupId}_${match.id}').value)"
                    class="w-16 px-2 py-1 border-2 border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                    id="gscore1_${groupId}_${match.id}"
                    ${match.playingNow ? 'disabled' : ''}>
                <span class="font-bold">:</span>
                <input type="number" min="0" value="${match.score2}"
                    onchange="updateGroupMatchScore(${groupId}, ${match.id}, document.getElementById('gscore1_${groupId}_${match.id}').value, this.value)"
                    class="w-16 px-2 py-1 border-2 border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                    id="gscore2_${groupId}_${match.id}"
                    ${match.playingNow ? 'disabled' : ''}>
                <span class="font-medium text-gray-700 flex-1 text-right truncate">${match.player2.name}</span>
                
                ${!match.finished ? `
                    <button onclick="togglePlayingNow(${match.id}, ${groupId})" 
                        class="no-print ${match.playingNow ? 'text-orange-600 hover:text-orange-700' : 'text-gray-400 hover:text-gray-600'}" 
                        title="${match.playingNow ? 'Zrušit "Právě hraje"' : 'Označit jako probíhající'}">
                        🏸
                    </button>
                ` : ''}
                
                <button onclick="addMatchNote(${match.id}, ${groupId})" 
                    class="text-blue-600 hover:text-blue-700 no-print" title="Přidat poznámku">
                    📝
                </button>
                ${match.finished ? `
                    <button onclick="deleteGroupMatchScore(${groupId}, ${match.id})" 
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

window.updateGroupMatchScore = (groupId, matchId, score1, score2) => {
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    
    window.tournamentData.groups = window.tournamentData.groups.map(group => {
        if (group.id === groupId) {
            return {
                ...group,
                matches: group.matches.map(match => {
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
                })
            };
        }
        return group;
    });
    
    saveData();
    renderGroups();
};

window.deleteGroupMatchScore = (groupId, matchId) => {
    window.tournamentData.groups = window.tournamentData.groups.map(group => {
        if (group.id === groupId) {
            return {
                ...group,
                matches: group.matches.map(match => {
                    if (match.id === matchId) {
                        return { ...match, score1: '', score2: '', finished: false };
                    }
                    return match;
                })
            };
        }
        return group;
    });
    
    saveData();
    renderGroups();
};