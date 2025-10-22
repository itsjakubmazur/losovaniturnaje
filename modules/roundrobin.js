// modules/roundrobin.js
import { saveData } from './storage.js';
import { calculateStandings, renderStandingsTable, renderMatchInput, updateProgressBar } from './utils.js';

export function generateRoundRobin() {
    const players = window.tournamentData.participants;
    const matches = [];
    let matchId = 1;
    
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            matches.push({
                id: matchId++,
                round: Math.ceil(matchId / Math.floor(players.length / 2)),
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
    
    window.tournamentData.matches = matches;
    saveData();
}

export function renderRoundRobin() {
    const content = document.getElementById('matchesContent');
    const matches = window.tournamentData.matches;
    const participants = window.tournamentData.participants;
    const standings = calculateStandings(participants, matches);
    
    const rounds = [...new Set(matches.map(m => m.round))].sort();
    
    // Aktualizovat progress bar
    updateProgressBar();
    
    // Zobrazit tlačítko pro úpravu kol
    const editBtn = document.getElementById('editRoundsBtn');
    if (editBtn) editBtn.classList.remove('hidden');
    
    content.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">🏆 Celková tabulka</h3>
            ${renderStandingsTable(standings)}
        </div>
        
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">📋 Zápasy po kolech</h3>
            ${rounds.map(round => `
                <div class="mb-6">
                    <h4 class="font-bold text-gray-700 mb-3 text-lg">Kolo ${round}</h4>
                    <div class="space-y-2">
                        ${matches.filter(m => m.round === round).map(match => 
                            renderMatchInput(match, updateMatchScore)
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

window.updateMatchScore = (matchId, score1, score2, groupId) => {
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    
    const oldMatch = window.tournamentData.matches.find(m => m.id === matchId);
    
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
    
    if (oldMatch) {
        window.addToHistory('score_update', {
            player1: oldMatch.player1.name,
            player2: oldMatch.player2.name,
            score: `${s1}:${s2}`
        });
    }
    
    saveData();
    renderRoundRobin();
};

window.deleteMatchScore = (matchId, groupId) => {
    const match = window.tournamentData.matches.find(m => m.id === matchId);
    
    window.tournamentData.matches = window.tournamentData.matches.map(m => {
        if (m.id === matchId) {
            return { ...m, score1: '', score2: '', finished: false };
        }
        return m;
    });
    
    if (match) {
        window.addToHistory('score_delete', {
            player1: match.player1.name,
            player2: match.player2.name
        });
    }
    
    saveData();
    renderRoundRobin();
};