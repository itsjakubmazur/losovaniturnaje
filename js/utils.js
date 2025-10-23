// utils.js - Pomocné funkce

const Utils = {
    // Získání iniciálů ze jména
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },

    // Kontrola zda je číslo mocnina 2
    isPowerOfTwo(n) {
        return n > 0 && (n & (n - 1)) === 0;
    },

    // Další mocnina 2
    getNextPowerOfTwo(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    },

    // Název herního systému
    getSystemName(system) {
        const names = {
            'roundrobin': 'Každý s každým',
            'swiss': 'Švýcarský systém',
            'groups': 'Skupiny + Playoff',
            'knockout': 'Vyřazovací'
        };
        return names[system || State.current.system] || system;
    },

    // Validace setu
    validateSet(score1, score2) {
        if (score1 === null || score2 === null) return true;
        const s1 = parseInt(score1);
        const s2 = parseInt(score2);
        
        if (s1 < 0 || s2 < 0) return false;
        if (s1 > State.current.tieBreakPoints || s2 > State.current.tieBreakPoints) return false;
        
        // At least one player must reach pointsPerSet
        if (s1 < State.current.pointsPerSet && s2 < State.current.pointsPerSet) return false;
        
        // If under tie-break, require 2 point difference
        const maxScore = Math.max(s1, s2);
        if (maxScore < State.current.tieBreakPoints) {
            if (Math.abs(s1 - s2) < 2) return false;
        } else {
            // At tie-break point, only 1 point difference needed
            if (maxScore === State.current.tieBreakPoints) {
                if (Math.abs(s1 - s2) !== 1) return false;
            }
        }
        
        return true;
    },

    // Výpočet uplynulého času
    calculateElapsed(startTime) {
        const start = new Date(startTime);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    // Výpočet fronty
    calculateQueue() {
        const waiting = State.current.matches.filter(m => !m.completed && !m.playing);
        return waiting.map((m, i) => ({
            ...m,
            eta: `~${Math.ceil((i * State.current.matchDuration) / State.current.numCourts)} min`
        }));
    },

    // Odhad času konce
    calculateEstimatedTime() {
        const remaining = State.current.matches.filter(m => !m.completed).length;
        const minutes = Math.ceil((remaining * State.current.matchDuration) / State.current.numCourts);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    },

    // Celkem setů
    calculateTotalSets() {
        return State.current.matches.reduce((sum, m) => {
            if (!m.sets) return sum;
            return sum + m.sets.filter(s => s.score1 !== null && s.score2 !== null).length;
        }, 0);
    },

    // Celkem bodů
    calculateTotalPoints() {
        return State.current.matches.reduce((sum, m) => {
            if (!m.sets) return sum;
            return sum + m.sets.reduce((setSum, s) => setSum + (s.score1 || 0) + (s.score2 || 0), 0);
        }, 0);
    },

    // Jsou všechny zápasy dokončeny?
    allMatchesCompleted() {
        return State.current.matches.every(m => m.completed);
    },

    // Notifikace
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        if (type === 'error') {
            notification.style.borderLeftColor = 'var(--danger)';
        }
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    // Konfety při výhře
    throwConfetti() {
        const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = confetti.style.height = (Math.random() * 10 + 5) + 'px';
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 3000);
            }, i * 30);
        }
    },

    // Promíchání pole
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // Formátování data
    formatDate(date) {
        return new Date(date).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
};
