// modules/utils.js
import { saveData } from './storage.js';

export function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function calculateStandings(players, matches) {
    const pointSystem = window.tournamentData.pointSystem || 2;
    const tieBreakRules = window.tournamentData.tieBreakRules || 'wins-sets-direct';
    const winPoints = parseInt(pointSystem);
    const drawPoints = 1;
    
    const standings = players.map(p => ({
        ...p,
        wins: 0,
        losses: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        points: 0
    }));

    matches.forEach(match => {
        if (match.finished) {
            const p1 = standings.find(p => p.id === match.player1.id);
            const p2 = standings.find(p => p.id === match.player2.id);

            if (p1 && p2) {
                p1.setsWon += match.score1;
                p1.setsLost += match.score2;
                p2.setsWon += match.score2;
                p2.setsLost += match.score1;

                if (match.score1 > match.score2) {
                    p1.wins++;
                    p2.losses++;
                    p1.points += winPoints;
                } else if (match.score2 > match.score1) {
                    p2.wins++;
                    p1.losses++;
                    p2.points += winPoints;
                } else {
                    p1.draws++;
                    p2.draws++;
                    p1.points += drawPoints;
                    p2.points += drawPoints;
                }
            }
        }
    });

    // Přidat vzájemné zápasy pro tie-break
    standings.forEach(p => {
        p.directMatches = {};
        standings.forEach(opp => {
            if (p.id !== opp.id) {
                p.directMatches[opp.id] = { wins: 0, sets: 0 };
            }
        });
    });

    matches.forEach(match => {
        if (match.finished) {
            const p1 = standings.find(p => p.id === match.player1.id);
            const p2 = standings.find(p => p.id === match.player2.id);

            if (p1 && p2) {
                if (match.score1 > match.score2) {
                    p1.directMatches[p2.id].wins++;
                    p1.directMatches[p2.id].sets += (match.score1 - match.score2);
                } else if (match.score2 > match.score1) {
                    p2.directMatches[p1.id].wins++;
                    p2.directMatches[p1.id].sets += (match.score2 - match.score1);
                }
            }
        }
    });

    // Řazení podle tie-break pravidel
    return standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        
        const rules = tieBreakRules.split('-');
        
        for (const rule of rules) {
            if (rule === 'wins') {
                if (b.wins !== a.wins) return b.wins - a.wins;
            } else if (rule === 'sets') {
                const aDiff = a.setsWon - a.setsLost;
                const bDiff = b.setsWon - b.setsLost;
                if (bDiff !== aDiff) return bDiff - aDiff;
            } else if (rule === 'direct') {
                if (a.directMatches[b.id]) {
                    const aWins = a.directMatches[b.id].wins;
                    const bWins = b.directMatches[a.id].wins;
                    if (aWins !== bWins) return bWins - aWins;
                    
                    const aSets = a.directMatches[b.id].sets;
                    const bSets = b.directMatches[a.id].sets;
                    if (aSets !== bSets) return bSets - aSets;
                }
            }
        }
        
        return 0;
    });
}

export function renderStandingsTable(standings) {
    const pointSystem = window.tournamentData.pointSystem || 2;
    const tieBreakRules = window.tournamentData.tieBreakRules || 'wins-sets-direct';
    const hasDraws = standings.some(p => p.draws > 0);
    
    const tieBreakLabels = {
        'wins-sets-direct': 'Výhry → Sety → Vzájemný zápas',
        'wins-direct-sets': 'Výhry → Vzájemný zápas → Sety',
        'sets-wins-direct': 'Sety → Výhry → Vzájemný zápas',
        'direct-wins-sets': 'Vzájemný zápas → Výhry → Sety'
    };
    
    return `
        <div class="overflow-x-auto">
            <div class="text-xs text-gray-600 mb-2 space-y-1">
                <div>📊 Bodový systém: ${pointSystem} body za výhru, 1 bod za remízu</div>
                <div>🔀 Tie-break: ${tieBreakLabels[tieBreakRules]}</div>
            </div>
            <table class="w-full">
                <thead class="bg-blue-600 text-white">
                    <tr>
                        <th class="px-4 py-2 text-left">#</th>
                        <th class="px-4 py-2 text-left">Jméno</th>
                        <th class="px-4 py-2 text-center">Z</th>
                        <th class="px-4 py-2 text-center">V</th>
                        ${hasDraws ? '<th class="px-4 py-2 text-center">R</th>' : ''}
                        <th class="px-4 py-2 text-center">P</th>
                        <th class="px-4 py-2 text-center">Sety</th>
                        <th class="px-4 py-2 text-center">Skóre</th>
                        <th class="px-4 py-2 text-center">Body</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((p, index) => {
                        let rowClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
                        
                        if (index === 0) rowClass = 'position-gold';
                        else if (index === 1) rowClass = 'position-silver';
                        else if (index === 2) rowClass = 'position-bronze';
                        
                        const totalGames = p.wins + p.losses + (p.draws || 0);
                        
                        return `
                        <tr class="${rowClass}">
                            <td class="px-4 py-2 font-bold">${index + 1}${index < 3 ? ' 🏆' : ''}</td>
                            <td class="px-4 py-2 font-medium">${p.name}</td>
                            <td class="px-4 py-2 text-center">${totalGames}</td>
                            <td class="px-4 py-2 text-center text-green-600 font-semibold">${p.wins}</td>
                            ${hasDraws ? `<td class="px-4 py-2 text-center text-yellow-600">${p.draws || 0}</td>` : ''}
                            <td class="px-4 py-2 text-center text-red-600 font-semibold">${p.losses}</td>
                            <td class="px-4 py-2 text-center">${p.setsWon}:${p.setsLost}</td>
                            <td class="px-4 py-2 text-center text-gray-600">
                                ${p.setsWon - p.setsLost > 0 ? '+' : ''}${p.setsWon - p.setsLost}
                            </td>
                            <td class="px-4 py-2 text-center font-bold text-blue-600">${p.points}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function renderMatchInput(match, onUpdate, groupId = null) {
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
                    onchange="updateMatchScore(${match.id}, this.value, document.getElementById('score2_${match.id}').value, ${groupId})"
                    class="w-16 px-2 py-1 border-2 border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                    id="score1_${match.id}"
                    ${match.playingNow ? 'disabled' : ''}>
                <span class="font-bold">:</span>
                <input type="number" min="0" value="${match.score2}"
                    onchange="updateMatchScore(${match.id}, document.getElementById('score1_${match.id}').value, this.value, ${groupId})"
                    class="w-16 px-2 py-1 border-2 border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                    id="score2_${match.id}"
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
                    <button onclick="deleteMatchScore(${match.id}, ${groupId})" 
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

export function updateProgressBar() {
    const system = window.tournamentData.system;
    let allMatches = [];
    
    if (system === 'groups') {
        window.tournamentData.groups.forEach(g => {
            allMatches = allMatches.concat(g.matches);
        });
    } else {
        allMatches = window.tournamentData.matches;
    }
    
    const finished = allMatches.filter(m => m.finished).length;
    const total = allMatches.length;
    const percent = total > 0 ? Math.round((finished / total) * 100) : 0;
    
    const fillElement = document.getElementById('progressFill');
    const textElement = document.getElementById('progressText');
    
    if (fillElement && textElement) {
        fillElement.style.width = percent + '%';
        textElement.textContent = `${finished}/${total} (${percent}%)`;
        
        // Notifikace při milnících
        const lastPercent = parseInt(localStorage.getItem('lastProgressPercent') || '0');
        
        if (percent === 100 && lastPercent < 100) {
            window.showNotification('🎉 Všechny zápasy dokončeny!', 'success');
        } else if (percent >= 75 && lastPercent < 75) {
            window.showNotification('🔥 75% zápasů hotovo!', 'success');
        } else if (percent >= 50 && lastPercent < 50) {
            window.showNotification('⚡ Polovina cesty za námi!', 'success');
        } else if (percent >= 25 && lastPercent < 25) {
            window.showNotification('✨ 25% zápasů dokončeno!', 'success');
        }
        
        localStorage.setItem('lastProgressPercent', percent);
    }
}