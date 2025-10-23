// playoff.js - Playoff pavouk

const Playoff = {
    generateBracket(participants) {
        const sorted = [...participants].sort((a, b) => (b.seed || 5) - (a.seed || 5));
        const n = Utils.getNextPowerOfTwo(sorted.length);
        
        // Add byes if needed
        while (sorted.length < n) {
            sorted.push({ name: 'BYE', isBye: true });
        }

        State.current.rounds = [0];
        const roundMatches = [];
        
        for (let i = 0; i < sorted.length; i += 2) {
            if (!sorted[i].isBye && !sorted[i + 1].isBye) {
                roundMatches.push(
                    Matches.createMatch(sorted[i], sorted[i + 1], 0, (roundMatches.length % State.current.numCourts) + 1)
                );
            }
        }
        
        State.current.matches = roundMatches;
    },

    generateFromGroups() {
        // Po skupinové fázi vygenerovat playoff
        if (!State.current.groups || State.current.groups.length === 0) return;

        Stats.calculate();
        
        // Get top 2 from each group
        const qualifiers = [];
        State.current.groups.forEach((group, idx) => {
            const groupLetter = String.fromCharCode(65 + idx);
            const groupStandings = State.current.standings.filter(s => 
                group.some(p => (p.name || p) === s.player)
            );
            qualifiers.push(...groupStandings.slice(0, 2));
        });

        // Sort by overall performance
        qualifiers.sort((a, b) => b.points - a.points);
        
        // Generate knockout bracket
        State.current.playoffBracket = {
            round: 'Playoff',
            matches: []
        };

        const nextRound = State.current.rounds.length;
        for (let i = 0; i < qualifiers.length; i += 2) {
            if (qualifiers[i + 1]) {
                const p1 = State.current.participants.find(p => p.name === qualifiers[i].player);
                const p2 = State.current.participants.find(p => p.name === qualifiers[i + 1].player);
                
                if (p1 && p2) {
                    State.current.matches.push(
                        Matches.createMatch(p1, p2, nextRound, (State.current.playoffBracket.matches.length % State.current.numCourts) + 1)
                    );
                    State.current.playoffBracket.matches.push(State.current.matches[State.current.matches.length - 1]);
                }
            }
        }

        State.current.rounds.push(nextRound);
    }
};
