// swiss.js - Švýcarský systém

const Swiss = {
    generateFirstRound() {
        // První kolo - párování podle nasazení
        const filteredParticipants = Utils.filterParticipantsByDiscipline(State.current.participants);

        if (filteredParticipants.length === 0) {
            Utils.showNotification('Žádní účastníci pro vybranou disciplínu! Zkontrolujte nastavení.', 'error');
            return;
        }

        const sorted = [...filteredParticipants].sort((a, b) => (b.seed || 5) - (a.seed || 5));
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

        // Pair players within same point groups with intelligent matching
        const newMatches = [];
        const paired = new Set();

        const allPlayers = State.current.standings.map(s => s.player);

        Object.keys(byPoints).sort((a, b) => b - a).forEach(points => {
            const players = byPoints[points].filter(p => !paired.has(p));

            // Try to pair players in this point group
            for (let i = 0; i < players.length; i++) {
                if (paired.has(players[i])) continue;

                const p1 = State.current.participants.find(p => p.name === players[i]);
                let p2 = null;

                // First try to find opponent in same point group who hasn't played against p1
                for (let j = i + 1; j < players.length; j++) {
                    if (paired.has(players[j])) continue;

                    const candidate = State.current.participants.find(p => p.name === players[j]);
                    if (candidate && !this.havePlayed(p1, candidate)) {
                        p2 = candidate;
                        paired.add(players[j]);
                        break;
                    }
                }

                // If no opponent found in same group, try closest point groups
                if (!p2) {
                    const currentPoints = parseInt(points);
                    const otherPlayers = allPlayers.filter(p =>
                        !paired.has(p) && p !== players[i]
                    );

                    // Sort by point difference (prefer closer ratings)
                    otherPlayers.sort((a, b) => {
                        const aStanding = State.current.standings.find(s => s.player === a);
                        const bStanding = State.current.standings.find(s => s.player === b);
                        const aDiff = Math.abs((aStanding?.points || 0) - currentPoints);
                        const bDiff = Math.abs((bStanding?.points || 0) - currentPoints);
                        return aDiff - bDiff;
                    });

                    for (const candidateName of otherPlayers) {
                        const candidate = State.current.participants.find(p => p.name === candidateName);
                        if (candidate && !this.havePlayed(p1, candidate)) {
                            p2 = candidate;
                            paired.add(candidateName);
                            break;
                        }
                    }
                }

                if (p1 && p2) {
                    newMatches.push(
                        Matches.createMatch(p1, p2, State.current.swissRound, (newMatches.length % State.current.numCourts) + 1)
                    );
                    paired.add(players[i]);
                }
            }
        });

        if (newMatches.length > 0) {
            State.current.rounds.push(State.current.swissRound);
            State.current.swissRound++;
            State.current.matches.push(...newMatches);
            State.save();
            UI.render();
            Utils.showNotification(`Kolo ${State.current.swissRound} vygenerováno - ${newMatches.length} zápasů`);
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
