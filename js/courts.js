// courts.js - Tabule kurtů, vyvolávání zápasů na volné kurty a hlasové hlášení

const Courts = {
    // Klíče hráčů v zápase (u čtyřhry oba partneři)
    playerKeys(match) {
        const keys = [];
        [match.player1, match.player2].forEach(p => {
            if (!p) return;
            if (p.name) keys.push(p.name);
            if (p.partner) keys.push(p.partner);
        });
        return keys;
    },

    busyKeys() {
        const busy = new Set();
        State.current.matches.filter(m => m.playing).forEach(m => {
            this.playerKeys(m).forEach(k => busy.add(k));
        });
        return busy;
    },

    // Kdy hráč naposledy dohrál (ms), 0 = ještě nehrál
    lastFinished(key) {
        let last = 0;
        State.current.matches.forEach(m => {
            if (m.completed && m.endTime && this.playerKeys(m).includes(key)) {
                last = Math.max(last, new Date(m.endTime).getTime());
            }
        });
        return last;
    },

    isReady(match) {
        return !match.completed && !match.playing &&
            match.player1 && match.player2 &&
            !match.player1.isBye && !match.player2.isBye;
    },

    // Seřazená fronta: zápasy bez kolize hráčů, přednost mají odpočatí hráči
    upcoming(limit = Infinity) {
        const taken = this.busyKeys();
        const restMs = (State.current.breakTime || 0) * 60000;
        const now = Date.now();
        const candidates = State.current.matches.filter(m => this.isReady(m));

        const rested = m => this.playerKeys(m).every(k => now - this.lastFinished(k) >= restMs);
        const ordered = [...candidates.filter(rested), ...candidates.filter(m => !rested(m))];

        const result = [];
        for (const m of ordered) {
            if (result.length >= limit) break;
            const keys = this.playerKeys(m);
            if (keys.some(k => taken.has(k))) continue;
            keys.forEach(k => taken.add(k));
            result.push(m);
        }
        return result;
    },

    // Pro zobrazení fronty: nejdřív zápasy, které mohou začít hned, pak ty, kde hráči ještě hrají
    queue(limit) {
        const ready = this.upcoming();
        const rest = State.current.matches.filter(m => this.isReady(m) && !ready.includes(m));
        return [...ready.map(m => ({ m, waiting: false })), ...rest.map(m => ({ m, waiting: true }))].slice(0, limit);
    },

    onCourt(court) {
        return State.current.matches.find(m => m.playing && m.court === court) || null;
    },

    freeCourts() {
        const free = [];
        for (let c = 1; c <= (State.current.numCourts || 1); c++) {
            if (!this.onCourt(c)) free.push(c);
        }
        return free;
    },

    callNext(court) {
        const next = this.upcoming(1)[0];
        if (!next) {
            Utils.showNotification('Žádný zápas teď nemůže začít – všichni hráči dalších zápasů právě hrají', 'error');
            return false;
        }
        next.court = court;
        this.announce(next);
        Matches.start(State.current.matches.indexOf(next));
        return true;
    },

    // Obsadí všechny volné kurty
    fillAll() {
        let called = 0;
        this.freeCourts().forEach(c => {
            const next = this.upcoming(1)[0];
            if (!next) return;
            next.court = c;
            next.playing = true;
            next.startTime = new Date().toISOString();
            this.announce(next);
            called++;
        });
        if (called === 0) {
            Utils.showNotification('Není co vyvolat', 'error');
            return;
        }
        State.save();
        UI.render();
        Utils.showNotification(called === 1 ? 'Vyvolán 1 zápas' : `Vyvoláno ${called} zápasů`);
    },

    // Volá se po dohrání zápasu – při zapnutém automatu pošle na kurt další zápas
    afterFinish(court) {
        if (!State.current.autoCall || State.readOnly) return;
        setTimeout(() => {
            if (!this.onCourt(court) && this.upcoming(1).length > 0) this.callNext(court);
        }, 400);
    },

    toggleAutoCall() {
        State.current.autoCall = !State.current.autoCall;
        State.save();
        UI.render();
        if (State.current.autoCall) {
            Utils.showNotification('Automat zapnut: po dohrání půjde na kurt další zápas');
            if (this.freeCourts().length > 0 && this.upcoming(1).length > 0) this.fillAll();
        } else {
            Utils.showNotification('Automat vypnut');
        }
    },

    toggleVoice() {
        State.current.voiceCalls = !State.current.voiceCalls;
        State.save();
        UI.render();
        if (State.current.voiceCalls && !('speechSynthesis' in window)) {
            Utils.showNotification('Tento prohlížeč neumí hlasové hlášení', 'error');
        }
    },

    announce(match) {
        if (!State.current.voiceCalls || !('speechSynthesis' in window)) return;
        const text = `Kurt ${match.court}. ${Utils.getPlayerDisplayNamePlain(match.player1)} proti ${Utils.getPlayerDisplayNamePlain(match.player2)}.`
            .replace(/&/g, 'a');
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'cs-CZ';
        u.rate = 0.95;
        const voice = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('cs'));
        if (voice) u.voice = voice;
        speechSynthesis.speak(u);
    },

    setsSummary(match) {
        return (match.sets || [])
            .filter(s => s && s.score1 !== null && s.score2 !== null)
            .map(s => `${s.score1}:${s.score2}`)
            .join('  ');
    },

    // Jeden kurt jako zmenšené hřiště: hráči na polovinách, síť uprostřed
    renderCourt(court, interactive) {
        const m = this.onCourt(court);
        if (!m) {
            return `
                <div class="court-tile is-free">
                    <div class="court-tile-head"><span class="court-no">Kurt ${court}</span><span class="court-state">volný</span></div>
                    <div class="court-surface">
                        ${interactive ? `<button class="btn btn-court" onclick="Courts.callNext(${court})">Vyvolat další zápas</button>` : '<span class="court-wait">Čeká na další zápas</span>'}
                    </div>
                </div>`;
        }
        const idx = State.current.matches.indexOf(m);
        const score = this.setsSummary(m);
        return `
            <div class="court-tile is-live">
                <div class="court-tile-head">
                    <span class="court-no">Kurt ${court}</span>
                    ${m.group ? `<span class="court-tag">Sk. ${m.group}</span>` : m.roundName ? `<span class="court-tag">${m.roundName}</span>` : ''}
                    <span class="court-timer" id="${interactive ? 'court' : 'sp-court'}-timer-${idx}">${m.startTime ? Utils.calculateElapsed(m.startTime) : ''}</span>
                </div>
                <div class="court-surface">
                    <div class="court-half"><span class="court-player">${Utils.getPlayerDisplayName(m.player1)}</span></div>
                    <div class="court-net"><span class="court-shuttle" aria-hidden="true"></span>${score ? `<span class="court-score">${score}</span>` : ''}</div>
                    <div class="court-half"><span class="court-player">${Utils.getPlayerDisplayName(m.player2)}</span></div>
                </div>
                ${interactive ? `
                <div class="court-actions">
                    <button class="btn btn-sm btn-outline" onclick="scrollToMatch(${idx})">Zadat skóre</button>
                    <button class="btn btn-sm btn-outline" onclick="Remote.showRefereeQR(${idx})">QR pro rozhodčího</button>
                </div>` : ''}
            </div>`;
    },

    renderBoard() {
        const n = State.current.numCourts || 1;
        const queue = this.queue(Math.max(n + 2, 5));
        const readyCount = queue.filter(q => !q.waiting).length;
        const free = this.freeCourts().length;
        const auto = !!State.current.autoCall;
        const voice = !!State.current.voiceCalls;

        let tiles = '';
        for (let c = 1; c <= n; c++) tiles += this.renderCourt(c, true);

        return `
            <section class="court-board" aria-label="Kurty">
                <div class="court-board-head">
                    <h3>Kurty</h3>
                    <div class="court-board-tools">
                        <button class="toggle ${auto ? 'on' : ''}" onclick="Courts.toggleAutoCall()" aria-pressed="${auto}" title="Po dohrání zápasu automaticky pošle na kurt další připravený zápas">
                            <span class="toggle-knob"></span>Automaticky vyvolávat
                        </button>
                        <button class="toggle ${voice ? 'on' : ''}" onclick="Courts.toggleVoice()" aria-pressed="${voice}" title="Při vyvolání zápasu přečte kurt a hráče nahlas">
                            <span class="toggle-knob"></span>Hlásit hlasem
                        </button>
                        ${free > 0 && readyCount > 0 ? `<button class="btn btn-sm btn-primary" onclick="Courts.fillAll()">Obsadit volné kurty (${Math.min(free, readyCount)})</button>` : ''}
                    </div>
                </div>
                <div class="court-grid">${tiles}</div>
                ${queue.length > 0 ? `
                    <div class="court-queue">
                        <span class="court-queue-label">Na řadě</span>
                        <ol>
                            ${queue.map(({ m, waiting }) => `<li class="${waiting ? 'is-waiting' : ''}"><button class="link-btn" onclick="scrollToMatch(${State.current.matches.indexOf(m)})">${Utils.getPlayerDisplayNamePlain(m.player1)} – ${Utils.getPlayerDisplayNamePlain(m.player2)}</button>${waiting ? ' <span class="queue-note">(hráč ještě hraje)</span>' : ''}</li>`).join('')}
                        </ol>
                    </div>` : ''}
            </section>`;
    },

    // Diváci / monitor: stejné kurty bez ovládání
    renderSpectatorBoard() {
        const n = State.current.numCourts || 1;
        let tiles = '';
        for (let c = 1; c <= n; c++) tiles += this.renderCourt(c, false);
        return `<div class="court-grid">${tiles}</div>`;
    }
};
