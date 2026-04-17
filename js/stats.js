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
            const p1Key = m.player1?.name || m.player1;
            const p2Key = m.player2?.name || m.player2;

            if (!groupStandings[groupLetter][p1Key] || !groupStandings[groupLetter][p2Key]) return;

            groupStandings[groupLetter][p1Key].playerRef = m.player1;
            groupStandings[groupLetter][p2Key].playerRef = m.player2;
            groupStandings[groupLetter][p1Key].played++;
            groupStandings[groupLetter][p2Key].played++;

            let p1SetsWon = 0;
            let p2SetsWon = 0;

            m.sets.forEach(set => {
                if (set.score1 !== null && set.score2 !== null) {
                    groupStandings[groupLetter][p1Key].pointsWon += set.score1;
                    groupStandings[groupLetter][p1Key].pointsLost += set.score2;
                    groupStandings[groupLetter][p2Key].pointsWon += set.score2;
                    groupStandings[groupLetter][p2Key].pointsLost += set.score1;

                    if (set.score1 > set.score2) {
                        p1SetsWon++;
                        groupStandings[groupLetter][p1Key].setsWon++;
                        groupStandings[groupLetter][p2Key].setsLost++;
                    } else if (set.score2 > set.score1) {
                        p2SetsWon++;
                        groupStandings[groupLetter][p2Key].setsWon++;
                        groupStandings[groupLetter][p1Key].setsLost++;
                    }
                }
            });

            if (p1SetsWon > p2SetsWon) {
                groupStandings[groupLetter][p1Key].wins++;
                groupStandings[groupLetter][p1Key].points += State.current.pointsForWin;
                groupStandings[groupLetter][p2Key].losses++;
            } else if (p2SetsWon > p1SetsWon) {
                groupStandings[groupLetter][p2Key].wins++;
                groupStandings[groupLetter][p2Key].points += State.current.pointsForWin;
                groupStandings[groupLetter][p1Key].losses++;
            } else {
                groupStandings[groupLetter][p1Key].draws++;
                groupStandings[groupLetter][p2Key].draws++;
                groupStandings[groupLetter][p1Key].points += State.current.pointsForDraw;
                groupStandings[groupLetter][p2Key].points += State.current.pointsForDraw;
            }
        });

        // Sort each group with full tiebreaker chain
        Object.keys(groupStandings).forEach(groupLetter => {
            const groupMatches = State.current.matches.filter(m => m.group === groupLetter && !m.isPlayoff);
            const basic = Object.values(groupStandings[groupLetter]).sort((a, b) => b.points - a.points);
            groupStandings[groupLetter] = this.applyTiebreakers(basic, groupMatches);
        });

        return groupStandings;
    },

    calculatePositionalStandings() {
        const tiers = {};
        State.current.matches.filter(m => m.isPlayoff && m.positionTier !== undefined).forEach(m => {
            if (!tiers[m.positionTier]) tiers[m.positionTier] = { matches: [], playerMap: {} };
            tiers[m.positionTier].matches.push(m);
            tiers[m.positionTier].playerMap[m.player1?.name || m.player1] = m.player1;
            tiers[m.positionTier].playerMap[m.player2?.name || m.player2] = m.player2;
        });

        const finalStandings = [];
        Object.keys(tiers).sort((a, b) => a - b).forEach(tier => {
            const { matches, playerMap } = tiers[tier];
            const stats = {};
            Object.entries(playerMap).forEach(([key, playerObj]) => {
                stats[key] = { player: key, playerRef: playerObj, played: 0, wins: 0, draws: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0, points: 0 };
            });
            matches.filter(m => m.completed).forEach(m => {
                const p1 = m.player1?.name || m.player1;
                const p2 = m.player2?.name || m.player2;
                if (!stats[p1] || !stats[p2]) return;
                stats[p1].played++; stats[p2].played++;
                let p1s = 0, p2s = 0;
                (m.sets || []).forEach(s => {
                    if (s.score1 !== null && s.score2 !== null) {
                        stats[p1].pointsWon += s.score1; stats[p1].pointsLost += s.score2;
                        stats[p2].pointsWon += s.score2; stats[p2].pointsLost += s.score1;
                        if (s.score1 > s.score2) { p1s++; stats[p1].setsWon++; stats[p2].setsLost++; }
                        else if (s.score2 > s.score1) { p2s++; stats[p2].setsWon++; stats[p1].setsLost++; }
                    }
                });
                if (p1s > p2s) { stats[p1].wins++; stats[p1].points += State.current.pointsForWin; stats[p2].losses++; }
                else if (p2s > p1s) { stats[p2].wins++; stats[p2].points += State.current.pointsForWin; stats[p1].losses++; }
                else { stats[p1].draws++; stats[p2].draws++; stats[p1].points += State.current.pointsForDraw; stats[p2].points += State.current.pointsForDraw; }
            });
            const basic = Object.values(stats).sort((a, b) => b.points - a.points);
            const sorted = this.applyTiebreakers(basic, matches);
            sorted.forEach(p => finalStandings.push(p));
        });
        State.current.standings = finalStandings;
    },

    calculate() {
        if (State.current.playoffBracket?.type === 'positional' &&
            State.current.matches.some(m => m.positionTier !== undefined)) {
            this.calculatePositionalStandings();
            return;
        }
        const stats = {};

        State.current.participants.forEach(p => {
            const name = p.name || p;
            stats[name] = {
                player: name,
                playerRef: p,
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

            const p1Name = m.player1?.name || m.player1;
            const p2Name = m.player2?.name || m.player2;

            if (!stats[p1Name]) stats[p1Name] = { player: p1Name, playerRef: m.player1, played: 0, wins: 0, draws: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0, points: 0 };
            if (!stats[p2Name]) stats[p2Name] = { player: p2Name, playerRef: m.player2, played: 0, wins: 0, draws: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0, points: 0 };

            stats[p1Name].playerRef = stats[p1Name].playerRef || m.player1;
            stats[p2Name].playerRef = stats[p2Name].playerRef || m.player2;
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
        
        const basicSorted = Object.values(stats).sort((a, b) => b.points - a.points);
        const regularMatches = State.current.matches.filter(m => !m.isPlayoff);
        const sorted = this.applyTiebreakers(basicSorted, regularMatches);

        // For knockout brackets, reorder by playoff result (final winner = 1st, etc.)
        if (State.current.playoffBracket && State.current.playoffBracket.type !== 'positional') {
            State.current.standings = this.applyKnockoutOrder(sorted);
        } else {
            State.current.standings = sorted;
        }
    },

    // For a group of players tied on overall points: resolve via head-to-head mini-table,
    // then fall back to overall set diff and overall point diff for any remaining sub-ties.
    _resolveTiedGroup(group, matches) {
        if (group.length <= 1) return group;

        const names = new Set(group.map(s => s.player));
        const h2h = {};
        group.forEach(s => {
            h2h[s.player] = { points: 0, wins: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0 };
        });

        matches.forEach(m => {
            if (!m.completed || !m.sets) return;
            const p1 = m.player1?.name || m.player1;
            const p2 = m.player2?.name || m.player2;
            if (!names.has(p1) || !names.has(p2)) return;
            let p1s = 0, p2s = 0;
            m.sets.forEach(s => {
                if (s.score1 !== null && s.score2 !== null) {
                    h2h[p1].pointsWon += s.score1; h2h[p1].pointsLost += s.score2;
                    h2h[p2].pointsWon += s.score2; h2h[p2].pointsLost += s.score1;
                    if (s.score1 > s.score2) { p1s++; h2h[p1].setsWon++; h2h[p2].setsLost++; }
                    else if (s.score2 > s.score1) { p2s++; h2h[p2].setsWon++; h2h[p1].setsLost++; }
                }
            });
            if (p1s > p2s) { h2h[p1].wins++; h2h[p1].points += State.current.pointsForWin; }
            else if (p2s > p1s) { h2h[p2].wins++; h2h[p2].points += State.current.pointsForWin; }
            else { h2h[p1].points += State.current.pointsForDraw; h2h[p2].points += State.current.pointsForDraw; }
        });

        const sorted = [...group].sort((a, b) => {
            const ha = h2h[a.player], hb = h2h[b.player];
            if (hb.points !== ha.points) return hb.points - ha.points;
            if (hb.wins !== ha.wins) return hb.wins - ha.wins;
            const sdA = ha.setsWon - ha.setsLost, sdB = hb.setsWon - hb.setsLost;
            if (sdB !== sdA) return sdB - sdA;
            return (hb.pointsWon - hb.pointsLost) - (ha.pointsWon - ha.pointsLost);
        });

        // Find sub-groups still tied on all h2h criteria → fall back to overall stats
        const result = [];
        let i = 0;
        while (i < sorted.length) {
            let j = i + 1;
            const ha = h2h[sorted[i].player];
            while (j < sorted.length) {
                const hb = h2h[sorted[j].player];
                if (hb.points !== ha.points || hb.wins !== ha.wins ||
                    (hb.setsWon - hb.setsLost) !== (ha.setsWon - ha.setsLost) ||
                    (hb.pointsWon - hb.pointsLost) !== (ha.pointsWon - ha.pointsLost)) break;
                j++;
            }
            const sub = sorted.slice(i, j);
            if (sub.length > 1) {
                sub.sort((a, b) => {
                    const sdA = a.setsWon - a.setsLost, sdB = b.setsWon - b.setsLost;
                    if (sdB !== sdA) return sdB - sdA;
                    return (b.pointsWon - b.pointsLost) - (a.pointsWon - a.pointsLost);
                });
            }
            result.push(...sub);
            i = j;
        }
        return result;
    },

    // Apply full tiebreaker chain to a points-sorted array.
    // For each group tied on points: head-to-head → overall set diff → overall point diff.
    applyTiebreakers(sorted, matches) {
        const result = [];
        let i = 0;
        while (i < sorted.length) {
            let j = i + 1;
            while (j < sorted.length && sorted[j].points === sorted[i].points) j++;
            const group = sorted.slice(i, j);
            result.push(...(group.length > 1 ? this._resolveTiedGroup(group, matches) : group));
            i = j;
        }
        return result;
    },

    // Reorder standings so knockout bracket results determine positions 1-4
    applyKnockoutOrder(sorted) {
        const playoffMatches = State.current.matches.filter(m => m.isPlayoff || m.knockoutRound !== undefined);
        if (playoffMatches.length === 0) return sorted;

        const getMatchWinner = (m) => {
            if (!m.completed || !m.sets) return null;
            const p1s = m.sets.filter(s => s.score1 > s.score2).length;
            const p2s = m.sets.filter(s => s.score2 > s.score1).length;
            if (p1s > p2s) return m.player1?.name || m.player1;
            if (p2s > p1s) return m.player2?.name || m.player2;
            return null;
        };
        const getMatchLoser = (m) => {
            const winner = getMatchWinner(m);
            if (!winner) return null;
            const p1 = m.player1?.name || m.player1;
            return winner === p1 ? (m.player2?.name || m.player2) : p1;
        };

        // Find the final match: highest knockoutRound, not thirdPlace
        const maxRound = Math.max(...playoffMatches.filter(m => !m.isThirdPlace).map(m => m.knockoutRound ?? -1));
        const finalMatch = playoffMatches.find(m => !m.isThirdPlace && (m.knockoutRound ?? -1) === maxRound && m.completed);
        const thirdPlaceMatch = State.current.matches.find(m => m.isThirdPlace && m.completed);

        if (!finalMatch) return sorted;

        const placed = new Set();
        const result = [];

        const pushByName = (name) => {
            if (!name || placed.has(name)) return;
            const entry = sorted.find(s => s.player === name);
            if (entry) { result.push(entry); placed.add(name); }
        };

        // 1st: winner of final
        pushByName(getMatchWinner(finalMatch));
        // 2nd: loser of final
        pushByName(getMatchLoser(finalMatch));
        // 3rd: winner of 3rd place match
        if (thirdPlaceMatch) pushByName(getMatchWinner(thirdPlaceMatch));
        // 4th: loser of 3rd place match
        if (thirdPlaceMatch) pushByName(getMatchLoser(thirdPlaceMatch));

        // Rest: sorted by points (group phase performance)
        sorted.forEach(s => { if (!placed.has(s.player)) result.push(s); });

        return result;
    },

    // Statistiky napříč všemi turnaji v historii
    calculateHistoricalStats() {
        const playerStats = {};

        State.current.history.forEach(tournament => {
            if (!tournament.fullData || !tournament.fullData.matches) return;

            tournament.fullData.matches.forEach(m => {
                if (!m.completed || !m.sets) return;

                const p1Name = Utils.getPlayerDisplayNamePlain(m.player1);
                const p2Name = Utils.getPlayerDisplayNamePlain(m.player2);

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
