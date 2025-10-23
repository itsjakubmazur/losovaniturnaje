// export.js - Export funkcí

const Export = {
    toJSON() {
        const data = {
            tournament: State.current.tournamentName,
            date: State.current.tournamentDate,
            system: Utils.getSystemName(),
            participants: State.current.participants.length,
            courts: State.current.numCourts,
            rounds: State.current.rounds.length,
            standings: State.current.standings,
            matches: State.current.matches.map((m, i) => ({
                match: i + 1,
                round: m.round + 1,
                court: m.court,
                player1: m.player1.name || m.player1,
                player2: m.player2.name || m.player2,
                sets: m.sets,
                completed: m.completed,
                notes: State.current.notes[i] || ''
            }))
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnaj-${Date.now()}.json`;
        a.click();
        Utils.showNotification('JSON exportován');
    },

    toCSV() {
        let csv = 'Pořadí,Jméno,Zápasy,Výhry,Remízy,Prohry,Sety,Body v setech,Body\n';
        
        State.current.standings.forEach((s, i) => {
            csv += `${i + 1},${s.player},${s.played},${s.wins},${s.draws},${s.losses},${s.setsWon}:${s.setsLost},${s.pointsWon}:${s.pointsLost},${s.points}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnaj-${Date.now()}.csv`;
        a.click();
        Utils.showNotification('CSV exportován');
    },

    menu() {
        Utils.showNotification('Použijte tlačítka v sekci Výsledky pro export');
    }
};
