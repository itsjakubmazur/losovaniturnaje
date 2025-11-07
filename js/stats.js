// stats.js - Výpočet statistik

const Stats = {
    // Calculate standings for each group separately
    calculateGroupStandings() {
        if (State.current.system !== 'groups' || !State.current.groups.length) {
            return null;
        }

        const groupStandings = {};

        // Initialize stats for each group
        State.current.groups.forEach((group, groupIndex) => {
            const groupLetter = String.fromCharCode(65 + groupIndex);
            groupStandings[groupLetter] = {};

            const filteredGroup = Utils.filterParticipantsByDiscipline(group);
            filteredGroup.forEach(p => {
                const name = p.name || p;
                groupStandings[groupLetter][name] = {
                    player: name,
                    played: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    setsWon: 0,
                    setsLost: 0,
                    pointsWon: 0,
                    pointsLost: 0,
                    points: 0
                };
            });
        });

        // Process matches for each group
        State.current.matches.forEach(m => {
            if (!m.completed || !m.sets || m.isPlayoff || !m.group) return;

            const groupLetter = m.group;
            const p1Name = Utils.getPlayerDisplayName(m.player1);
            const p2Name = Utils.getPlayerDisplayName(m.player2);

            if (!groupStandings[groupLetter][p1Name] || !groupStandings[groupLetter][p2Name]) return;

            groupStandings[groupLetter][p1Name].played++;
            groupStandings[groupLetter][p2Name].played++;

            let p1SetsWon = 0;
            let p2SetsWon = 0;

            m.sets.forEach(set => {
                if (set.score1 !== null && set.score2 !== null) {
                    groupStandings[groupLetter][p1Name].pointsWon += set.score1;
                    groupStandings[groupLetter][p1Name].pointsLost += set.score2;
                    groupStandings[groupLetter][p2Name].pointsWon += set.score2;
                    groupStandings[groupLetter][p2Name].pointsLost += set.score1;

                    if (set.score1 > set.score2) {
                        p1SetsWon++;
                        groupStandings[groupLetter][p1Name].setsWon++;
                        groupStandings[groupLetter][p2Name].setsLost++;
                    } else if (set.score2 > set.score1) {
                        p2SetsWon++;
                        groupStandings[groupLetter][p2Name].setsWon++;
                        groupStandings[groupLetter][p1Name].setsLost++;
                    }
                }
            });

            if (p1SetsWon > p2SetsWon) {
                groupStandings[groupLetter][p1Name].wins++;
                groupStandings[groupLetter][p1Name].points += State.current.pointsForWin;
                groupStandings[groupLetter][p2Name].losses++;
            } else if (p2SetsWon > p1SetsWon) {
                groupStandings[groupLetter][p2Name].wins++;
                groupStandings[groupLetter][p2Name].points += State.current.pointsForWin;
                groupStandings[groupLetter][p1Name].losses++;
            } else {
                groupStandings[groupLetter][p1Name].draws++;
                groupStandings[groupLetter][p2Name].draws++;
                groupStandings[groupLetter][p1Name].points += State.current.pointsForDraw;
                groupStandings[groupLetter][p2Name].points += State.current.pointsForDraw;
            }
        });

        // Sort each group
        Object.keys(groupStandings).forEach(groupLetter => {
            groupStandings[groupLetter] = Object.values(groupStandings[groupLetter]).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.wins !== a.wins) return b.wins - a.wins;
                const setDiffA = a.setsWon - a.setsLost;
                const setDiffB = b.setsWon - b.setsLost;
                if (setDiffB !== setDiffA) return setDiffB - setDiffA;
                const pointDiffA = a.pointsWon - a.pointsLost;
                const pointDiffB = b.pointsWon - b.pointsLost;
                return pointDiffB - pointDiffA;
            });
        });

        return groupStandings;
    },

    calculate() {
        const stats = {};

        State.current.participants.forEach(p => {
            const name = p.name || p;
            stats[name] = {
                player: name,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                setsWon: 0,
                setsLost: 0,
                pointsWon: 0,
                pointsLost: 0,
                points: 0
            };
        });
        
        State.current.matches.forEach(m => {
            if (!m.completed || !m.sets) return;

            const p1Name = Utils.getPlayerDisplayName(m.player1);
            const p2Name = Utils.getPlayerDisplayName(m.player2);
            
            stats[p1Name].played++;
            stats[p2Name].played++;
            
            let p1SetsWon = 0;
            let p2SetsWon = 0;
            
            m.sets.forEach(set => {
                if (set.score1 !== null && set.score2 !== null) {
                    stats[p1Name].pointsWon += set.score1;
                    stats[p1Name].pointsLost += set.score2;
                    stats[p2Name].pointsWon += set.score2;
                    stats[p2Name].pointsLost += set.score1;
                    
                    if (set.score1 > set.score2) {
                        p1SetsWon++;
                        stats[p1Name].setsWon++;
                        stats[p2Name].setsLost++;
                    } else if (set.score2 > set.score1) {
                        p2SetsWon++;
                        stats[p2Name].setsWon++;
                        stats[p1Name].setsLost++;
                    }
                }
            });
            
            if (p1SetsWon > p2SetsWon) {
                stats[p1Name].wins++;
                stats[p1Name].points += State.current.pointsForWin;
                stats[p2Name].losses++;
            } else if (p2SetsWon > p1SetsWon) {
                stats[p2Name].wins++;
                stats[p2Name].points += State.current.pointsForWin;
                stats[p1Name].losses++;
            } else {
                stats[p1Name].draws++;
                stats[p2Name].draws++;
                stats[p1Name].points += State.current.pointsForDraw;
                stats[p2Name].points += State.current.pointsForDraw;
            }
        });
        
        State.current.standings = Object.values(stats).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            const setDiffA = a.setsWon - a.setsLost;
            const setDiffB = b.setsWon - b.setsLost;
            if (setDiffB !== setDiffA) return setDiffB - setDiffA;
            const pointDiffA = a.pointsWon - a.pointsLost;
            const pointDiffB = b.pointsWon - b.pointsLost;
            return pointDiffB - pointDiffA;
        });
    },

    // Statistiky napříč všemi turnaji v historii
    calculateHistoricalStats() {
        const playerStats = {};

        State.current.history.forEach(tournament => {
            if (!tournament.fullData || !tournament.fullData.matches) return;

            tournament.fullData.matches.forEach(m => {
                if (!m.completed || !m.sets) return;

                const p1Name = Utils.getPlayerDisplayName(m.player1);
                const p2Name = Utils.getPlayerDisplayName(m.player2);

                // Initialize players
                if (!playerStats[p1Name]) {
                    playerStats[p1Name] = {
                        name: p1Name,
                        tournaments: 0,
                        matches: 0,
                        wins: 0,
                        losses: 0,
                        setsWon: 0,
                        setsLost: 0,
                        pointsWon: 0,
                        pointsLost: 0,
                        firstPlaces: 0,
                        secondPlaces: 0,
                        thirdPlaces: 0
                    };
                }
                if (!playerStats[p2Name]) {
                    playerStats[p2Name] = {
                        name: p2Name,
                        tournaments: 0,
                        matches: 0,
                        wins: 0,
                        losses: 0,
                        setsWon: 0,
                        setsLost: 0,
                        pointsWon: 0,
                        pointsLost: 0,
                        firstPlaces: 0,
                        secondPlaces: 0,
                        thirdPlaces: 0
                    };
                }

                playerStats[p1Name].matches++;
                playerStats[p2Name].matches++;

                let p1SetsWon = 0;
                let p2SetsWon = 0;

                m.sets.forEach(set => {
                    if (set.score1 !== null && set.score2 !== null) {
                        playerStats[p1Name].pointsWon += set.score1;
                        playerStats[p1Name].pointsLost += set.score2;
                        playerStats[p2Name].pointsWon += set.score2;
                        playerStats[p2Name].pointsLost += set.score1;

                        if (set.score1 > set.score2) {
                            p1SetsWon++;
                            playerStats[p1Name].setsWon++;
                            playerStats[p2Name].setsLost++;
                        } else if (set.score2 > set.score1) {
                            p2SetsWon++;
                            playerStats[p2Name].setsWon++;
                            playerStats[p1Name].setsLost++;
                        }
                    }
                });

                if (p1SetsWon > p2SetsWon) {
                    playerStats[p1Name].wins++;
                    playerStats[p2Name].losses++;
                } else if (p2SetsWon > p1SetsWon) {
                    playerStats[p2Name].wins++;
                    playerStats[p1Name].losses++;
                }
            });

            // Count tournament placements
            if (tournament.standings && tournament.standings.length > 0) {
                if (tournament.standings[0] && playerStats[tournament.standings[0].player]) {
                    playerStats[tournament.standings[0].player].firstPlaces++;
                }
                if (tournament.standings[1] && playerStats[tournament.standings[1].player]) {
                    playerStats[tournament.standings[1].player].secondPlaces++;
                }
                if (tournament.standings[2] && playerStats[tournament.standings[2].player]) {
                    playerStats[tournament.standings[2].player].thirdPlaces++;
                }
            }
        });

        // Count tournaments per player
        State.current.history.forEach(tournament => {
            if (!tournament.fullData || !tournament.fullData.participants) return;
            tournament.fullData.participants.forEach(p => {
                const name = p.name || p;
                if (playerStats[name]) {
                    playerStats[name].tournaments++;
                }
            });
        });

        // Calculate win rates and format data
        const statsList = Object.values(playerStats).map(p => ({
            ...p,
            winRate: p.matches > 0 ? ((p.wins / p.matches) * 100).toFixed(1) : '0.0',
            avgPointsPerSet: p.setsWon > 0 ? (p.pointsWon / p.setsWon).toFixed(1) : '0.0',
            setWinRate: (p.setsWon + p.setsLost) > 0 ? ((p.setsWon / (p.setsWon + p.setsLost)) * 100).toFixed(1) : '0.0'
        }));

        // Sort by wins
        return statsList.sort((a, b) => {
            if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.matches - a.matches;
        });
    },

    // Zobrazit historické statistiky
    showHistoricalStats() {
        const stats = this.calculateHistoricalStats();

        if (stats.length === 0) {
            Utils.showNotification('Žádná data v historii', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal show';

        let statsHTML = '<table><thead><tr><th>Jméno</th><th>Turnaje</th><th>Zápasy</th><th>V-P</th><th>% výher</th><th>Sety</th><th>🥇</th><th>🥈</th><th>🥉</th></tr></thead><tbody>';

        stats.forEach(s => {
            statsHTML += `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.tournaments}</td>
                    <td>${s.matches}</td>
                    <td>${s.wins}-${s.losses}</td>
                    <td><strong>${s.winRate}%</strong></td>
                    <td>${s.setsWon}:${s.setsLost}</td>
                    <td>${s.firstPlaces > 0 ? s.firstPlaces : '-'}</td>
                    <td>${s.secondPlaces > 0 ? s.secondPlaces : '-'}</td>
                    <td>${s.thirdPlaces > 0 ? s.thirdPlaces : '-'}</td>
                </tr>
            `;
        });

        statsHTML += '</tbody></table>';

        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>📊 Statistiky napříč turnaji</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <p style="margin-bottom: 15px; color: var(--text-muted);">
                    Agregované statistiky ze všech ${State.current.history.length} turnajů v historii
                </p>
                <div style="overflow-x: auto;">
                    ${statsHTML}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }
};
