// swiss.js - Švýcarský systém

const Swiss = {
    generateFirstRound() {
        // První kolo - párování podle nasazení
        const sorted = [...State.current.participants].sort((a, b) => (b.seed || 5) - (a.seed || 5));
        const half = Math.floor(sorted.length / 2);
        
        const topHalf = sorted.slice(0, half);
        const bottomHalf = sorted.slice(half);
        
        State.current.rounds = [0];
        State.current.swissRound = 1;
        
        topHalf.forEach((p1, i) => {
            const p2 = bottomHalf[i] || bottomHalf[bottomHalf.length - 1];
            if (p2) {
                State.current.matches.push(
                    Matches.createMatch(p1, p2, 0, (i % State.current.numCourts) + 1)
                );
            }
        });
    },

    generateNextRound() {
        // Calculate current standings
        Stats.calculate();
        
        // Group players by points
        const byPoints = {};
        State.current.standings.forEach(s => {
            if (!byPoints[s.points]) byPoints[s.points] = [];
            byPoints[s.points].push(s.player);
        });

        // Pair players within same point groups
        const newMatches = [];
        const paired = new Set();
        
        Object.keys(byPoints).sort((a, b) => b - a).forEach(points => {
            const players = byPoints[points].filter(p => !paired.has(p));
            
            for (let i = 0; i < players.length - 1; i += 2) {
                const p1 = State.current.participants.find(p => p.name === players[i]);
                const p2 = State.current.participants.find(p => p.name === players[i + 1]);
                
                if (p1 && p2 && !this.havePlayed(p1, p2)) {
                    newMatches.push(
                        Matches.createMatch(p1, p2, State.current.swissRound, (newMatches.length % State.current.numCourts) + 1)
                    );
                    paired.add(players[i]);
                    paired.add(players[i + 1]);
                }
            }
        });

        if (newMatches.length > 0) {
            State.current.rounds.push(State.current.swissRound);
            State.current.swissRound++;
            State.current.matches.push(...newMatches);
            State.save();
            UI.render();
            Utils.showNotification(`Kolo ${State.current.swissRound} vygenerováno`);
        } else {
            Utils.showNotification('Nelze vygenerovat další kolo', 'error');
        }
    },

    havePlayed(p1, p2) {
        const p1Name = Utils.getPlayerDisplayName(p1);
        const p2Name = Utils.getPlayerDisplayName(p2);
        return State.current.matches.some(m => {
            const m1Name = Utils.getPlayerDisplayName(m.player1);
            const m2Name = Utils.getPlayerDisplayName(m.player2);
            return (m1Name === p1Name && m2Name === p2Name) ||
                   (m1Name === p2Name && m2Name === p1Name);
        });
    }
};
