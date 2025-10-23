// stats.js - Výpočet statistik

const Stats = {
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
            
            const p1Name = m.player1.name || m.player1;
            const p2Name = m.player2.name || m.player2;
            
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
    }
};
