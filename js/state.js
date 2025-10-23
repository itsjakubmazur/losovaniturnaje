// state.js - Správa stavu aplikace

const State = {
    current: {
        step: 'setup',
        tournamentName: '',
        tournamentDate: new Date().toISOString().split('T')[0],
        participants: [],
        system: 'roundrobin',
        numGroups: 2,
        numCourts: 1,
        matchDuration: 25,
        breakTime: 5,
        pointsForWin: 2,
        pointsForDraw: 1,
        bestOf: 3,
        pointsPerSet: 21,
        tieBreakPoints: 30,
        matches: [],
        groups: [],
        rounds: [],
        standings: [],
        notes: {},
        matchTimers: {},
        currentRound: 0,
        swissRound: 0,
        playoffBracket: null,
        history: []
    },

    editingParticipantIndex: -1,

    load() {
        const saved = localStorage.getItem('tournamentData');
        if (saved) {
            try {
                this.current = { ...this.current, ...JSON.parse(saved) };
            } catch(e) {
                console.error('Error loading data:', e);
            }
        }
        
        // Load dark mode
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
        
        // Load theme
        const theme = localStorage.getItem('theme');
        if (theme) {
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(theme);
        }

        // Load history
        const hist = localStorage.getItem('tournamentHistory');
        if (hist) {
            this.current.history = JSON.parse(hist);
        }
    },

    save() {
        localStorage.setItem('tournamentData', JSON.stringify(this.current));
    },

    reset() {
        if (confirm('Opravdu chcete smazat všechna data turnaje?')) {
            this.current = {
                step: 'setup',
                tournamentName: '',
                tournamentDate: new Date().toISOString().split('T')[0],
                participants: [],
                system: 'roundrobin',
                numGroups: 2,
                numCourts: 1,
                matchDuration: 25,
                breakTime: 5,
                pointsForWin: 2,
                pointsForDraw: 1,
                bestOf: 3,
                pointsPerSet: 21,
                tieBreakPoints: 30,
                matches: [],
                groups: [],
                rounds: [],
                standings: [],
                notes: {},
                matchTimers: {},
                currentRound: 0,
                swissRound: 0,
                playoffBracket: null,
                history: this.current.history
            };
            localStorage.removeItem('tournamentData');
            return true;
        }
        return false;
    },

    saveToHistory() {
        const tournament = {
            id: Date.now(),
            name: this.current.tournamentName,
            date: this.current.tournamentDate,
            system: this.current.system,
            participants: this.current.participants.length,
            matches: this.current.matches.length,
            winner: this.current.standings[0]?.player,
            standings: this.current.standings,
            completedAt: new Date().toISOString()
        };
        
        this.current.history.unshift(tournament);
        localStorage.setItem('tournamentHistory', JSON.stringify(this.current.history));
        
        return tournament;
    },

    loadFromHistory(id) {
        // V budoucí verzi - načtení celého turnaje z historie
        console.log('Loading tournament:', id);
    }
};
