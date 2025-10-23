// playoff.js - Playoff pavouk

const Playoff = {
    generateBracket(participants) {
        const sorted = [...participants].sort((a, b) => (b.seed || 5) - (a.seed || 5));
        const n = Utils.getNextPowerOfTwo(sorted.length);
        
        // Add byes if needed
        while (sorted.length < n) {
            sorted.push({ name: 'BYE', isBye: true });
        }

        // Calculate number of rounds needed
        const totalRounds = Math.log2(n);
        
        State.current.rounds = [];
        State.current.matches = [];
        
        // Generate all rounds
        let currentParticipants = [...sorted];
        
        for (let round = 0; round < totalRounds; round++) {
            State.current.rounds.push(round);
            const roundMatches = [];
            
            for (let i = 0; i < currentParticipants.length; i += 2) {
                const p1 = currentParticipants[i];
                const p2 = currentParticipants[i + 1];
                
                if (!p1.isBye && !p2.isBye) {
                    const match = Matches.createMatch(p1, p2, round, (roundMatches.length % State.current.numCourts) + 1);
                    match.knockoutRound = round;
                    match.roundName = this.getRoundName(round, totalRounds);
                    roundMatches.push(match);
                    State.current.matches.push(match);
                } else if (!p1.isBye) {
                    // P1 gets bye, advances automatically
                    currentParticipants[i / 2] = p1;
                } else if (!p2.isBye) {
                    // P2 gets bye, advances automatically  
                    currentParticipants[i / 2] = p2;
                }
            }
            
            // Prepare for next round - half the participants
            currentParticipants = new Array(currentParticipants.length / 2);
        }
        
        State.current.playoffBracket = {
            totalRounds: totalRounds,
            currentRound: 0
        };
    },

    getRoundName(round, totalRounds) {
        const remaining = totalRounds - round;
        if (remaining === 1) return 'Finále';
        if (remaining === 2) return 'Semifinále';
        if (remaining === 3) return 'Čtvrtfinále';
        if (remaining === 4) return 'Osmifinále';
        return `Kolo ${round + 1}`;
    },

    generateFromGroups() {
        if (!State.current.groups || State.current.groups.length === 0) return;

        // Calculate standings for groups
        Stats.calculate();
        
        // Get top 2 from each group
        const qualifiers = [];
        State.current.groups.forEach((group, idx) => {
            const groupLetter = String.fromCharCode(65 + idx);
            
            // Filter standings for this group
            const groupPlayers = group.map(p => p.name || p);
            const groupStandings = State.current.standings.filter(s => 
                groupPlayers.includes(s.player)
            );
            
            // Take top 2
            const top2 = groupStandings.slice(0, 2);
            top2.forEach(player => {
                const participant = State.current.participants.find(p => p.name === player.player);
                if (participant) {
                    qualifiers.push({
                        ...participant,
                        groupPosition: qualifiers.filter(q => q.group === groupLetter).length + 1,
                        group: groupLetter,
                        points: player.points
                    });
                }
            });
        });

        // Sort qualifiers: 1st places first (by points), then 2nd places
        const firstPlaces = qualifiers.filter(q => q.groupPosition === 1).sort((a, b) => b.points - a.points);
        const secondPlaces = qualifiers.filter(q => q.groupPosition === 2).sort((a, b) => b.points - a.points);
        
        const sorted = [...firstPlaces, ...secondPlaces];
        
        // Pair 1st places with 2nd places: 1st A vs 2nd B, 1st B vs 2nd A, etc.
        const paired = [];
        const half = sorted.length / 2;
        for (let i = 0; i < half; i++) {
            paired.push(sorted[i]);
            paired.push(sorted[sorted.length - 1 - i]);
        }

        // Generate knockout bracket from qualified players
        const nextRound = State.current.rounds.length;
        const totalRounds = Math.log2(paired.length);
        
        State.current.playoffBracket = {
            round: 'Playoff',
            totalRounds: totalRounds,
            currentRound: 0,
            qualifiers: qualifiers
        };

        for (let i = 0; i < paired.length; i += 2) {
            const p1 = paired[i];
            const p2 = paired[i + 1];
            
            if (p1 && p2) {
                const match = Matches.createMatch(p1, p2, nextRound, ((i / 2) % State.current.numCourts) + 1);
                match.knockoutRound = 0;
                match.roundName = this.getRoundName(0, totalRounds);
                match.isPlayoff = true;
                State.current.matches.push(match);
            }
        }
        
        State.current.rounds.push(nextRound);
    },

    // Advance winners to next round after all matches in current round are done
    advanceWinners(round) {
        const roundMatches = State.current.matches.filter(m => 
            m.knockoutRound === round && m.completed
        );
        
        if (roundMatches.length === 0) return false;
        
        // Check if all matches in this round are completed
        const allCompleted = State.current.matches
            .filter(m => m.knockoutRound === round)
            .every(m => m.completed);
        
        if (!allCompleted) return false;
        
        // Get winners
        const winners = [];
        roundMatches.forEach(match => {
            const p1Sets = match.sets.filter(s => s.score1 > s.score2).length;
            const p2Sets = match.sets.filter(s => s.score2 > s.score1).length;
            
            if (p1Sets > p2Sets) {
                winners.push(match.player1);
            } else if (p2Sets > p1Sets) {
                winners.push(match.player2);
            }
        });
        
        if (winners.length < 2) return true; // Tournament finished!
        
        // Create next round matches
        const nextRound = round + 1;
        const nextRoundIndex = State.current.rounds.length;
        State.current.rounds.push(nextRoundIndex);
        
        for (let i = 0; i < winners.length; i += 2) {
            if (winners[i + 1]) {
                const match = Matches.createMatch(
                    winners[i], 
                    winners[i + 1], 
                    nextRoundIndex, 
                    ((i / 2) % State.current.numCourts) + 1
                );
                match.knockoutRound = nextRound;
                match.roundName = this.getRoundName(nextRound, State.current.playoffBracket.totalRounds);
                match.isPlayoff = true;
                State.current.matches.push(match);
            }
        }
        
        State.current.playoffBracket.currentRound = nextRound;
        return true;
    }
};
