// playoff.js - Playoff pavouk

const Playoff = {
    generateBracket(participants) {
        console.log('Generating knockout bracket for participants:', participants);
        
        const sorted = [...participants].sort((a, b) => (b.seed || 5) - (a.seed || 5));
        const n = Utils.getNextPowerOfTwo(sorted.length);
        
        console.log('Sorted participants:', sorted);
        console.log('Next power of 2:', n);
        
        // Add byes if needed
        while (sorted.length < n) {
            sorted.push({ name: 'BYE', isBye: true });
        }

        // Calculate number of rounds needed
        const totalRounds = Math.log2(n);
        console.log('Total rounds needed:', totalRounds);
        
        State.current.rounds = [];
        State.current.matches = [];
        
        // Generate ONLY the first round
        const firstRoundMatches = [];
        
        for (let i = 0; i < sorted.length; i += 2) {
            const p1 = sorted[i];
            const p2 = sorted[i + 1];
            
            if (!p1.isBye && !p2.isBye) {
                const match = Matches.createMatch(p1, p2, 0, (firstRoundMatches.length % State.current.numCourts) + 1);
                match.knockoutRound = 0;
                match.roundName = this.getRoundName(0, totalRounds);
                match.isPlayoff = false; // It's main knockout, not playoff after groups
                firstRoundMatches.push(match);
            }
        }
        
        console.log('First round matches:', firstRoundMatches);
        
        State.current.rounds.push(0);
        State.current.matches = firstRoundMatches;
        
        State.current.playoffBracket = {
            totalRounds: totalRounds,
            currentRound: 0,
            isKnockout: true // Flag to indicate this is main knockout tournament
        };
        
        console.log('Playoff bracket initialized:', State.current.playoffBracket);
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
        if (!State.current.groups || State.current.groups.length === 0) {
            Utils.showNotification('Nejsou vytvořeny žádné skupiny!', 'error');
            return false;
        }

        // Check if all group matches are completed
        const allGroupMatches = State.current.matches.filter(m => !m.isPlayoff);
        if (!allGroupMatches.every(m => m.completed)) {
            Utils.showNotification('Nejprve dokončete všechny zápasy ve skupinách!', 'error');
            return false;
        }

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
            
            console.log(`Skupina ${groupLetter}:`, groupStandings);
            
            // Take top 2
            const top2 = groupStandings.slice(0, 2);
            top2.forEach((player, pos) => {
                const participant = State.current.participants.find(p => p.name === player.player);
                if (participant) {
                    qualifiers.push({
                        ...participant,
                        groupPosition: pos + 1,
                        group: groupLetter,
                        points: player.points,
                        wins: player.wins
                    });
                }
            });
        });

        if (qualifiers.length < 2) {
            Utils.showNotification('Nedostatek kvalifikovaných hráčů pro playoff!', 'error');
            return false;
        }

        console.log('Qualifiers:', qualifiers);

        // Sort qualifiers: 1st places first (by points), then 2nd places
        const firstPlaces = qualifiers.filter(q => q.groupPosition === 1).sort((a, b) => b.points - a.points);
        const secondPlaces = qualifiers.filter(q => q.groupPosition === 2).sort((a, b) => b.points - a.points);
        
        // Pairing: 1st from group A vs 2nd from different group
        const paired = [];
        
        // Simple pairing: alternate first and second places
        for (let i = 0; i < firstPlaces.length; i++) {
            paired.push(firstPlaces[i]);
            if (secondPlaces[i]) {
                paired.push(secondPlaces[secondPlaces.length - 1 - i]); // Cross pairing
            }
        }

        console.log('Paired:', paired);

        if (paired.length < 2) {
            Utils.showNotification('Nedostatek hráčů pro playoff!', 'error');
            return false;
        }

        // Generate knockout bracket from qualified players
        const nextRound = State.current.rounds.length;
        const totalRounds = Math.log2(paired.length);
        
        State.current.playoffBracket = {
            round: 'Playoff',
            totalRounds: totalRounds,
            currentRound: 0,
            qualifiers: qualifiers,
            isKnockout: false // This is playoff after groups
        };

        // Generate first playoff round
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
        
        State.save();
        Utils.showNotification(`Playoff pavouk vygenerován! ${paired.length} hráčů postoupilo.`);
        
        return true;
    },

    // Advance winners to next round after all matches in current round are done
    advanceWinners(round) {
        console.log('Advancing winners from round:', round);
        
        const roundMatches = State.current.matches.filter(m => 
            m.knockoutRound === round && m.completed
        );
        
        console.log('Completed matches in this round:', roundMatches);
        
        if (roundMatches.length === 0) {
            console.log('No completed matches found');
            return false;
        }
        
        // Check if all matches in this round are completed
        const allRoundMatches = State.current.matches.filter(m => m.knockoutRound === round);
        const allCompleted = allRoundMatches.every(m => m.completed);
        
        console.log('All matches in round:', allRoundMatches);
        console.log('All completed?', allCompleted);
        
        if (!allCompleted) {
            console.log('Not all matches completed yet');
            return false;
        }
        
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
        
        console.log('Winners:', winners);
        
        if (winners.length < 2) {
            console.log('Tournament finished! Winner:', winners[0]);
            return true; // Tournament finished!
        }
        
        // Create next round matches
        const nextRound = round + 1;
        const nextRoundIndex = State.current.rounds.length;
        
        console.log('Creating next round:', nextRound, 'at index:', nextRoundIndex);
        
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
                match.isPlayoff = State.current.playoffBracket.isKnockout === false; // Keep isPlayoff flag consistent
                State.current.matches.push(match);
                console.log('Created match:', match);
            }
        }
        
        State.current.playoffBracket.currentRound = nextRound;
        console.log('Updated playoffBracket:', State.current.playoffBracket);
        
        return true;
    },

    // Render visual bracket
    renderBracket() {
        if (!State.current.playoffBracket) {
            console.log('No playoff bracket to render');
            return '';
        }
        
        const totalRounds = State.current.playoffBracket.totalRounds;
        const rounds = [];
        
        // Organize matches by knockout round
        for (let r = 0; r <= State.current.playoffBracket.currentRound; r++) {
            const roundMatches = State.current.matches.filter(m => 
                m.knockoutRound === r && 
                (m.isPlayoff === true || State.current.playoffBracket.isKnockout === true)
            );
            
            if (roundMatches.length > 0) {
                rounds.push({
                    round: r,
                    name: this.getRoundName(r, totalRounds),
                    matches: roundMatches
                });
            }
        }
        
        console.log('Rendering bracket with rounds:', rounds);
        
        if (rounds.length === 0) {
            console.log('No rounds to display');
            return '';
        }
        
        return `
            <div class="card">
                <h2>🏆 Playoff Pavouk</h2>
                <div class="bracket-container">
                    <div class="bracket">
                        ${rounds.map(round => this.renderBracketRound(round)).join('')}
                    </div>
                </div>
            </div>
        `;
    },
    
    renderBracketRound(round) {
        return `
            <div class="bracket-round">
                <div class="bracket-round-title">${round.name}</div>
                ${round.matches.map(match => this.renderBracketMatch(match)).join('')}
            </div>
        `;
    },
    
    renderBracketMatch(match) {
        const isCompleted = match.completed;
        const isPlaying = match.playing;
        
        let p1Winner = false;
        let p2Winner = false;
        let p1Score = '';
        let p2Score = '';
        
        if (isCompleted && match.sets) {
            const p1Sets = match.sets.filter(s => s.score1 > s.score2).length;
            const p2Sets = match.sets.filter(s => s.score2 > s.score1).length;
            p1Winner = p1Sets > p2Sets;
            p2Winner = p2Sets > p1Sets;
            p1Score = p1Sets;
            p2Score = p2Sets;
        }
        
        const p1Name = Utils.getPlayerDisplayName(match.player1);
        const p2Name = Utils.getPlayerDisplayName(match.player2);
        const p1Seed = match.player1?.seed || '';
        const p2Seed = match.player2?.seed || '';
        
        const isTBD = p1Name === 'TBD' || p2Name === 'TBD';
        
        return `
            <div class="bracket-match ${isCompleted ? 'completed' : ''} ${isPlaying ? 'playing' : ''}" 
                 onclick="scrollToMatch(${State.current.matches.indexOf(match)})"
                 style="cursor: pointer;">
                ${isPlaying ? '<div class="bracket-match-status">▶️ HRAJE</div>' : ''}
                
                <div class="bracket-player ${p1Winner ? 'winner' : isCompleted ? 'loser' : ''} ${isTBD ? 'bracket-tbd' : ''}">
                    <div class="bracket-player-name">
                        ${p1Seed ? `<div class="bracket-player-seed">${p1Seed}</div>` : ''}
                        <span>${p1Name}</span>
                    </div>
                    ${isCompleted ? `<div class="bracket-score">${p1Score}</div>` : ''}
                </div>
                
                <div class="bracket-player ${p2Winner ? 'winner' : isCompleted ? 'loser' : ''} ${isTBD ? 'bracket-tbd' : ''}">
                    <div class="bracket-player-name">
                        ${p2Seed ? `<div class="bracket-player-seed">${p2Seed}</div>` : ''}
                        <span>${p2Name}</span>
                    </div>
                    ${isCompleted ? `<div class="bracket-score">${p2Score}</div>` : ''}
                </div>
                
                ${match.knockoutRound < State.current.playoffBracket.totalRounds - 1 ? '<div class="bracket-connector"></div>' : ''}
            </div>
        `;
    }
};
