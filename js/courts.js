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
        } else if (State.current.voiceCalls) {
            // Ozve se hned po kliknutí – na iPhonu to zároveň odemkne zvuk pro další hlášení
            this.speak(['Hlášení zapnuto.']);
        }
    },

    // ===== Hlášení hlasem =====

    // „Kurt jedna“, ne „kurt první“ – číslo napsané jako číslovka čte syntéza správně
    courtWord(n) {
        const words = ['nula', 'jedna', 'dva', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět', 'deset',
            'jedenáct', 'dvanáct', 'třináct', 'čtrnáct', 'patnáct', 'šestnáct', 'sedmnáct', 'osmnáct', 'devatenáct', 'dvacet'];
        return words[n] || String(n);
    },

    czechVoices() {
        if (!('speechSynthesis' in window)) return [];
        return speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('cs'));
    },

    // Kvalita podle názvu: neuronové hlasy Edge („Natural“) > prémiové > vylepšené > ostatní
    voiceScore(voice) {
        const n = voice.name.toLowerCase();
        if (n.includes('natural') || n.includes('neural')) return 5;
        if (n.includes('premium') || n.includes('prémiov')) return 4;
        if (n.includes('enhanced') || n.includes('vylepšen')) return 3;
        if (n.includes('google')) return 2;
        return 1;
    },

    voiceLabel(voice) {
        // Prémiové a vylepšené hlasy to mají v názvu, dopisujeme jen u ostatních
        const q = { 5: 'nejpřirozenější', 2: 'online', 1: 'základní' }[this.voiceScore(voice)];
        return q ? `${voice.name} (${q})` : voice.name;
    },

    pickVoice() {
        const voices = this.czechVoices();
        let saved = null;
        try { saved = localStorage.getItem('voiceName'); } catch (e) {}
        return voices.find(v => v.name === saved) ||
            [...voices].sort((a, b) => this.voiceScore(b) - this.voiceScore(a))[0] || null;
    },

    setVoice(name) {
        try { localStorage.setItem('voiceName', name); } catch (e) {}
        this.testVoice();
    },

    testVoice() {
        this.speak([`Kurt ${this.courtWord(1)}.`, 'Jan Novák', 'proti', 'Petr Svoboda.']);
    },

    announce(match) {
        if (!State.current.voiceCalls) return;
        const name = p => Utils.getPlayerDisplayNamePlain(p).replace(/\s*&\s*/g, ' a ');
        this.speak([`Kurt ${this.courtWord(match.court)}.`, name(match.player1), 'proti', `${name(match.player2)}.`]);
    },

    // Každá část hlášení je samostatná promluva s pauzou mezi nimi; hlášení se řadí za sebe
    speechQueue: [],
    speaking: false,

    speak(phrases) {
        if (!('speechSynthesis' in window)) return;
        phrases.forEach((text, i) => this.speechQueue.push({ text, pause: i === phrases.length - 1 ? 1200 : 450 }));
        if (!this.speaking) this.speakNext();
    },

    speakNext() {
        const item = this.speechQueue.shift();
        if (!item) { this.speaking = false; return; }
        this.speaking = true;
        const u = new SpeechSynthesisUtterance(item.text);
        u.lang = 'cs-CZ';
        u.rate = 0.88;
        const voice = this.pickVoice();
        if (voice) u.voice = voice;
        let done = false;
        const next = () => {
            if (done) return;
            done = true;
            setTimeout(() => this.speakNext(), item.pause);
        };
        u.onend = next;
        u.onerror = next;
        this.currentUtterance = u; // Chrome jinak promluvu uklidí dřív, než dohraje, a onend nepřijde
        speechSynthesis.speak(u);
    },

    renderVoiceSettings() {
        if (!State.current.voiceCalls || !('speechSynthesis' in window)) return '';
        const voices = this.czechVoices();
        if (voices.length === 0) {
            return `<p class="voice-settings voice-hint">Tento prohlížeč nemá český hlas. Zkuste Microsoft Edge nebo Safari, případně si český hlas doinstalujte v systému.</p>`;
        }
        const current = this.pickVoice();
        const best = Math.max(...voices.map(v => this.voiceScore(v)));
        return `
            <div class="voice-settings">
                <label for="voice-select">Hlas</label>
                <select id="voice-select" onchange="Courts.setVoice(this.value)">
                    ${[...voices].sort((a, b) => this.voiceScore(b) - this.voiceScore(a)).map(v =>
                        `<option value="${v.name}" ${current && v.name === current.name ? 'selected' : ''}>${this.voiceLabel(v)}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-outline" onclick="Courts.testVoice()">Vyzkoušet</button>
                ${best < 4 ? `<p class="voice-hint">Přirozenější hlas: v prohlížeči Microsoft Edge jsou zdarma neuronové hlasy Vlasta a Antonín. Na Macu a iPhonu si stáhněte prémiovou Zuzanu (Zpřístupnění → Mluvený obsah → Hlasy → Čeština) a obnovte stránku.</p>` : ''}
            </div>`;
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
                ${this.renderVoiceSettings()}
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

// Seznam hlasů se v prohlížečích načítá se zpožděním – po načtení překreslit volbu hlasu
if ('speechSynthesis' in window) {
    speechSynthesis.addEventListener('voiceschanged', () => {
        if (typeof UI !== 'undefined' && State.current.voiceCalls && State.current.step === 'matches' && !State.readOnly
            && !document.activeElement?.closest('input, textarea, select')) {
            UI.render();
        }
    });
}
