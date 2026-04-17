// utils.js - Pomocné funkce

const Utils = {
    // Získání iniciálů ze jména
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },

    // Získání celého jména hráče/páru pro zobrazení
    getPlayerDisplayName(player) {
        if (!player) return 'TBD';
        const name = player.name || player;
        const partner = player.partner;
        const teamName = player.teamName;
        if (partner && teamName) {
            return `<span class="team-nickname">${teamName}</span><span class="team-players">${name} & ${partner}</span>`;
        }
        return partner ? `${name} & ${partner}` : name;
    },

    // Prostý text bez HTML (pro confirm dialogy apod.)
    getPlayerDisplayNamePlain(player) {
        if (!player) return 'TBD';
        const name = player.name || player;
        const partner = player.partner;
        const teamName = player.teamName;
        if (partner && teamName) return teamName;
        return partner ? `${name} & ${partner}` : name;
    },

    // Filtrování účastníků podle typu disciplíny
    filterParticipantsByDiscipline(participants) {
        const disciplineType = State.current.disciplineType;

        if (disciplineType === 'singles') {
            // Pouze jednotlivci (bez partnera)
            return participants.filter(p => !p.partner);
        } else if (disciplineType === 'doubles') {
            // Pouze páry (s partnerem)
            return participants.filter(p => p.partner);
        } else {
            // Mixed - všichni
            return participants;
        }
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
    },

    // Enkódování dat turnaje do URL hash
    encodeTournamentToURL(tournamentData) {
        try {
            const json = JSON.stringify(tournamentData);
            const compressed = LZString.compressToEncodedURIComponent(json);
            const baseUrl = window.location.origin + window.location.pathname;
            return `${baseUrl}#shared=${compressed}`;
        } catch (e) {
            console.error('Error encoding tournament:', e);
            return null;
        }
    },

    // Dekódování dat turnaje z URL hash
    decodeTournamentFromURL() {
        try {
            const hash = window.location.hash;
            if (!hash || !hash.includes('shared=')) {
                return null;
            }
            const compressed = hash.split('shared=')[1];
            const json = LZString.decompressFromEncodedURIComponent(compressed);
            if (!json) {
                return null;
            }
            return JSON.parse(json);
        } catch (e) {
            console.error('Error decoding tournament:', e);
            return null;
        }
    },

    // Generování QR kódu (pomocí Google Charts API)
    generateQRCode(text, size = 200) {
        return `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(text)}&chs=${size}x${size}`;
    },

    // Sdílení turnaje pomocí QR kódu
    showQRCode() {
        const shareUrl = this.encodeTournamentToURL(State.current);

        if (!shareUrl) {
            this.showNotification('Chyba při generování QR kódu', 'error');
            return;
        }

        const tournamentInfo = `${State.current.tournamentName} - ${State.current.tournamentDate}`;

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📱 Sdílet turnaj</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div style="text-align: center; padding: 20px;">
                    <p style="margin-bottom: 20px; color: var(--text-muted);">
                        Naskenujte QR kód pro zobrazení turnaje
                    </p>
                    <img src="${this.generateQRCode(shareUrl, 256)}"
                         alt="QR kód"
                         style="max-width: 100%; border: 2px solid var(--border); border-radius: 12px; padding: 10px; background: white;">
                    <div style="margin-top: 20px; padding: 15px; background: var(--bg); border-radius: 8px;">
                        <strong>${tournamentInfo}</strong><br>
                        <small style="color: var(--text-muted); word-break: break-all;">${shareUrl}</small>
                    </div>
                    <button class="btn btn-primary" style="margin-top: 15px;" onclick="navigator.clipboard.writeText('${shareUrl}').then(() => Utils.showNotification('Odkaz zkopírován'))">
                        📋 Kopírovat odkaz
                    </button>
                    <div style="margin-top: 15px; padding: 10px; background: var(--warning-bg, #fff3cd); border-radius: 8px; font-size: 0.9em;">
                        <strong>⚠️ Upozornění:</strong> Každá změna výsledků vyžaduje nový QR kód
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};
