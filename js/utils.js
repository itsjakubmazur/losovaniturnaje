// utils.js - Pomocné funkce

const Utils = {
    // Získání iniciálů ze jména (přijímá string nebo player objekt)
    getInitials(nameOrPlayer) {
        if (!nameOrPlayer) return '?';
        const name = (typeof nameOrPlayer === 'object')
            ? (nameOrPlayer.teamName || nameOrPlayer.name || '?')
            : nameOrPlayer;
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },

    // Získání celého jména hráče/páru pro zobrazení (vrací HTML)
    getPlayerDisplayName(player) {
        if (!player) return 'TBD';
        const name = player.name || player;
        const partner = player.partner;
        const teamName = player.teamName;
        if (partner && teamName) {
            return `<span class="team-name-block"><span class="team-nickname">${teamName}</span><span class="team-players">${name} & ${partner}</span></span>`;
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
    filterParticipantsByDiscipline(allParticipants) {
        const disciplineType = State.current.disciplineType;
        // Nepřítomní (prezence) se do losu nezapočítávají
        const participants = allParticipants.filter(p => !p.absent);

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
            'groups': 'Skupiny a playoff',
            'knockout': 'Vyřazovací'
        };
        return names[system || State.current.system] || system;
    },

    // Validace setu
    validateSet(score1, score2) {
        if (score1 === null || score2 === null) return true;
        const s1 = parseInt(score1);
        const s2 = parseInt(score2);

        if (isNaN(s1) || isNaN(s2)) return false;
        if (s1 < 0 || s2 < 0) return false;
        const target = State.current.pointsPerSet;   // cílová hranice setu
        const cap = State.current.tieBreakPoints;     // strop, kde stačí rozdíl 1
        const winByTwo = State.current.winByTwo !== false;
        if (s1 > cap || s2 > cap) return false;
        const max = Math.max(s1, s2);
        const diff = Math.abs(s1 - s2);
        if (max < target) return false;                              // nikdo nedohrál
        if (max >= cap) return diff >= 1;                            // dosažen strop
        if (max === target) return winByTwo ? diff >= 2 : diff >= 1; // vyhráno na hranici
        return diff === 2;                                           // prodloužení
    },

    // Rozhodl se zápas až v prodloužení?
    // Ano, pokud vítěz posledního odehraného setu přesáhl cílovou hranici.
    // (do 10 na dva rozdílové: 10:8 = čistá výhra, 12:10 = prodloužení)
    matchWentToOvertime(match) {
        if (!State.current.overtimeScoring) return false;
        const sets = (match.sets || []).filter(s => s.score1 !== null && s.score2 !== null);
        if (sets.length === 0) return false;
        const last = sets[sets.length - 1];
        return Math.max(last.score1, last.score2) > State.current.pointsPerSet;
    },

    // Popisek jednotky skóre podle sportu
    scoreUnitLabel() {
        return State.current.sport === 'tennis' ? 'Gemy' : 'Míče';
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

    // Notifikace; volitelně s akcí, např. { label: 'Vrátit', fn: undoAction }
    showNotification(message, type = 'success', action = null) {
        document.querySelectorAll('.notification').forEach(n => n.remove());
        clearTimeout(this.toastTimer);
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'is-error' : type === 'info' ? 'info' : ''}`;
        notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
        const icon = typeof Icons !== 'undefined' ? Icons.svg(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check') : '';
        notification.innerHTML = `${icon}<span class="toast-text"></span>`;
        notification.querySelector('.toast-text').textContent = message;
        if (action) {
            const btn = document.createElement('button');
            btn.className = 'toast-action';
            btn.textContent = action.label;
            btn.onclick = () => { notification.remove(); action.fn(); };
            notification.appendChild(btn);
        }
        document.body.appendChild(notification);
        this.toastTimer = setTimeout(() => {
            notification.classList.add('is-leaving');
            setTimeout(() => notification.remove(), 250);
        }, action ? 5000 : 3000);
    },

    // České tvary: 1 hráč, 2–4 hráči, 5+ hráčů
    plural(n, one, few, many) {
        n = Math.abs(n);
        return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
    },

    formatMinutes(min) {
        const h = Math.floor(min / 60), m = Math.round(min % 60);
        if (h === 0) return `${m} min`;
        return m ? `${h} h ${m} min` : `${h} h`;
    },

    // Konfety při výhře
    throwConfetti() {
        const colors = ['#e8cf1f', '#1e5a46', '#ffffff', '#c48a5a', '#2f6fb0'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = confetti.style.height = (Math.random() * 10 + 5) + 'px';
                confetti.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 4000);
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

    generateQRCode(text, size = 200) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
    },

    // Sdílení turnaje pomocí QR kódu (statický snímek turnaje v odkazu)
    showQRCode() {
        const shareUrl = this.encodeTournamentToURL(State.current);
        if (!shareUrl) {
            this.showNotification('QR kód se nepodařilo vytvořit', 'error');
            return;
        }
        const safeUrl = shareUrl.replace(/'/g, "\\'");
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content modal-narrow">
                <div class="modal-header">
                    <h3>Sdílet turnaj</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Zavřít">${Icons.svg('x')}</button>
                </div>
                <p class="modal-lead">${State.current.tournamentName || 'Turnaj'}: snímek současného stavu. Po každé změně výsledků je potřeba nový kód, pro průběžné sdílení použijte Živé sdílení.</p>
                <div class="qr-frame"><img src="${this.generateQRCode(shareUrl, 440)}" alt="QR kód" width="220" height="220"></div>
                <div class="url-box">${shareUrl}</div>
                <div class="button-group">
                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${safeUrl}').then(() => Utils.showNotification('Odkaz zkopírován'))">${Icons.svg('copy')}Kopírovat odkaz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};
