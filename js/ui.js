// ui.js - UI rendering a interakce

const STEPS = ['setup', 'participants', 'draw', 'matches', 'results'];

const UI = {
    matchTab: 'schedule',     // Záložka v kroku Zápasy: schedule | tables | bracket
    newParticipantIdx: -1,    // Právě přidaný hráč (animace vstupu)
    counts: {},               // Poslední hodnoty počítadel (animace změn)
    celebrated: {},           // Turnaje, u kterých už proběhly konfety

    reducedMotion() {
        return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    render() {
        const prev = this.lastStep;
        const step = State.current.step;
        const stepChanged = prev !== undefined && prev !== step;
        this.lastStep = step;

        const paint = () => this.paint(stepChanged);
        if (stepChanged && document.startViewTransition && !this.reducedMotion() && !State.readOnly) {
            document.documentElement.dataset.dir = STEPS.indexOf(step) >= STEPS.indexOf(prev) ? 'forward' : 'back';
            const vt = document.startViewTransition(paint);
            vt.ready.catch(() => {});
            vt.finished.catch(() => {});
        } else {
            paint();
        }
    },

    paint(stepChanged) {
        this.updateSteps();
        this.updateTitle();

        if (!State.readOnly) State.save();

        const content = document.getElementById('app-content');
        document.body.classList.toggle('is-readonly', !!State.readOnly);

        if (State.readOnly) {
            try {
                content.innerHTML = this.renderSpectatorView();
            } catch (e) {
                console.error('Spectator render error:', e);
                content.innerHTML = `<div class="empty-state"><p><strong>Turnaj se nepodařilo zobrazit.</strong></p><p>Obnovte stránku. (${e.message})</p></div>`;
            }
        } else {
            switch (State.current.step) {
                case 'setup': content.innerHTML = this.renderSetup(); break;
                case 'participants': content.innerHTML = this.renderParticipants(); break;
                case 'draw': content.innerHTML = this.renderDraw(); break;
                case 'matches': content.innerHTML = this.renderMatches(); break;
                case 'results': content.innerHTML = this.renderResults(); break;
            }
            if (stepChanged) window.scrollTo({ top: 0 });
        }

        this.attachEventListeners();
        this.setupSwipeNavigation();
        this.animateCounters();
        this.afterPaint();
        if (typeof MatchSheet !== 'undefined') MatchSheet.refresh();
        updateUndoRedoButtons();
    },

    // Animace navázané na konkrétní obrazovku
    afterPaint() {
        // Kurt, na který právě přišel nový zápas (nebo se uvolnil), krátce zvýrazní změnu
        const tiles = document.querySelectorAll('.court-tile[data-court]');
        if (!this.courtState) this.courtState = {};
        tiles.forEach(t => {
            const key = t.dataset.court, val = t.dataset.idx;
            if (this.courtState[key] !== undefined && this.courtState[key] !== val && !this.reducedMotion()) {
                t.classList.add(val ? 'is-arriving' : 'is-freed');
            }
            this.courtState[key] = val;
        });
        if (State.current.step === 'matches' && !State.readOnly && ((typeof currentMatchFilter !== 'undefined' && currentMatchFilter !== 'all') || this.matchSearch)) {
            filterMatches();
        }
        if (this.newParticipantIdx >= 0) {
            const row = document.querySelector(`.roster-row[data-idx="${this.newParticipantIdx}"]`);
            if (row) row.classList.add('is-new');
            this.newParticipantIdx = -1;
        }
        if (State.current.step === 'results' && !State.readOnly) {
            const done = State.current.matches.length > 0 && State.current.matches.every(m => m.completed);
            const key = `${State.current.tournamentName}|${State.current.tournamentDate}|${State.current.matches.length}`;
            if (done && !this.celebrated[key]) {
                this.celebrated[key] = true;
                if (!this.reducedMotion()) setTimeout(() => Utils.throwConfetti(), 650);
            }
        }
    },

    // Čísla s data-count se při změně „dopočítají“ na novou hodnotu
    animateCounters() {
        document.querySelectorAll('[data-count]').forEach(el => {
            const key = el.dataset.count;
            const to = parseFloat(el.textContent);
            const from = this.counts[key];
            this.counts[key] = to;
            if (from === undefined || from === to || isNaN(to) || this.reducedMotion()) return;
            const start = performance.now();
            const dur = 520;
            const tick = now => {
                const t = Math.min(1, (now - start) / dur);
                const e = 1 - Math.pow(1 - t, 3);
                el.textContent = Math.round(from + (to - from) * e);
                if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        });
    },

    // ===== Navigace kroky =====

    stepInfo() {
        const c = State.current;
        const present = c.participants.filter(p => !p.absent).length;
        const total = c.matches.length;
        const done = c.matches.filter(m => m.completed).length;
        Stats.calculate();
        const winner = c.standings[0] ? Utils.getPlayerDisplayNamePlain(c.standings[0].playerRef || c.standings[0].player) : '';
        return [
            { id: 'setup', icon: 'settings', label: i18n.t('step.setup'), meta: Utils.getSystemName(), done: c.participants.length > 0, locked: false },
            { id: 'participants', icon: 'users', label: i18n.t('step.participants'), meta: c.participants.length ? `${present} ${Utils.plural(present, 'hráč', 'hráči', 'hráčů')}` : 'Zatím nikdo', done: c.rounds.length > 0 || c.groups.length > 0, locked: false },
            { id: 'draw', icon: 'shuffle', label: i18n.t('step.draw'), meta: c.groups.length ? `${c.groups.length} ${Utils.plural(c.groups.length, 'skupina', 'skupiny', 'skupin')}` : total ? 'Vylosováno' : 'Čeká na los', done: total > 0, locked: present < 2 },
            { id: 'matches', icon: 'court', label: i18n.t('step.matches'), meta: total ? `${done} z ${total}` : 'Bez zápasů', done: total > 0 && done === total, locked: total === 0, progress: total ? done / total : 0 },
            { id: 'results', icon: 'trophy', label: i18n.t('step.results'), meta: total && done === total ? winner : total ? 'Průběžně' : '—', done: false, locked: total === 0 }
        ];
    },

    updateSteps() {
        const nav = document.getElementById('steps-container');
        const bar = document.getElementById('tabbar');
        if (State.readOnly) {
            nav.innerHTML = '';
            if (bar) bar.innerHTML = '';
            return;
        }
        const steps = this.stepInfo();
        const current = State.current.step;
        const activeIdx = STEPS.indexOf(current);

        nav.style.setProperty('--active', activeIdx);
        nav.innerHTML = `
            <span class="steps-indicator" aria-hidden="true"></span>
            ${steps.map((s, i) => `
                <button class="step ${s.id === current ? 'active' : ''} ${s.done ? 'completed' : ''} ${s.locked ? 'locked' : ''}"
                        data-step="${s.id}" ${s.id === current ? 'aria-current="step"' : ''} ${s.locked ? 'aria-disabled="true"' : ''}>
                    <span class="step-circle">${s.done && s.id !== current ? Icons.svg('check') : i + 1}</span>
                    <span class="step-text">
                        <span class="step-label">${s.label}</span>
                        <span class="step-meta">${s.meta || ''}</span>
                    </span>
                    ${s.progress !== undefined && s.progress > 0 && s.progress < 1 ? `<span class="step-progress" style="--p:${s.progress}"></span>` : ''}
                </button>`).join('')}`;

        if (bar) {
            bar.style.setProperty('--active', activeIdx);
            bar.innerHTML = `
                <span class="tabbar-indicator" aria-hidden="true"></span>
                ${steps.map(s => `
                    <button class="tab-step ${s.id === current ? 'active' : ''} ${s.locked ? 'locked' : ''}" data-step="${s.id}" ${s.id === current ? 'aria-current="step"' : ''}>
                        ${Icons.svg(s.icon)}<span>${s.label}</span>
                    </button>`).join('')}`;
        }
    },

    updateTitle() {
        const c = State.current;
        document.getElementById('tournament-title').textContent = c.tournamentName || i18n.t('tournament.title');
        document.getElementById('tournament-subtitle').textContent = c.tournamentName
            ? `${Utils.formatDate(c.tournamentDate)}, ${c.numCourts} ${Utils.plural(c.numCourts, 'kurt', 'kurty', 'kurtů')}`
            : i18n.t('tournament.subtitle');
        document.title = c.tournamentName ? `${c.tournamentName} – Losovací web` : 'Losovací web';
    },

    pageHead(title, desc, actions = '') {
        return `
            <header class="page-head">
                <div class="page-head-text">
                    <h1 class="page-title">${title}</h1>
                    ${desc ? `<p class="page-desc">${desc}</p>` : ''}
                </div>
                ${actions ? `<div class="page-actions">${actions}</div>` : ''}
            </header>`;
    },

    // ===== Ovládací prvky =====

    segmented(key, options, current, type = 'num') {
        return `
            <div class="seg" role="radiogroup">
                ${options.map(([val, label]) => `
                    <button type="button" role="radio" aria-checked="${String(current) === String(val)}"
                            class="seg-btn ${String(current) === String(val) ? 'on' : ''}"
                            data-key="${key}" data-val="${val}" data-type="${type}">${label}</button>`).join('')}
            </div>`;
    },

    stepper(key, value, min, max, step = 1, suffix = '') {
        return `
            <div class="stepper" data-key="${key}" data-min="${min}" data-max="${max}" data-step="${step}">
                <button type="button" class="stepper-btn" data-delta="-1" aria-label="Méně" ${value <= min ? 'disabled' : ''}>${Icons.svg('minus')}</button>
                <span class="stepper-value"><input type="number" inputmode="numeric" value="${value}" min="${min}" max="${max}" step="${step}" aria-label="${key}">${suffix ? `<span class="stepper-suffix">${suffix}</span>` : ''}</span>
                <button type="button" class="stepper-btn" data-delta="1" aria-label="Více" ${value >= max ? 'disabled' : ''}>${Icons.svg('plus')}</button>
            </div>`;
    },

    switchRow(id, checked, title, desc) {
        return `
            <label class="switch-row" for="${id}">
                <span class="switch-text"><strong>${title}</strong>${desc ? `<span>${desc}</span>` : ''}</span>
                <input type="checkbox" id="${id}" class="switch" ${checked ? 'checked' : ''}>
            </label>`;
    },

    field(label, control, hint = '') {
        return `<div class="field"><span class="field-label">${label}</span>${control}${hint ? `<span class="field-hint">${hint}</span>` : ''}</div>`;
    },

    // ===== 1. Nastavení =====

    estimate() {
        const c = State.current;
        const n = Utils.filterParticipantsByDiscipline(c.participants).length;
        if (n < 2) return null;
        let matches = 0;
        if (c.system === 'roundrobin') matches = n * (n - 1) / 2;
        else if (c.system === 'knockout') matches = n - 1 + (c.thirdPlaceMatch ? 1 : 0);
        else if (c.system === 'swiss') matches = Math.max(3, Math.ceil(Math.log2(n)) + 1) * Math.floor(n / 2);
        else if (c.system === 'groups') {
            const g = Math.max(1, Math.min(c.numGroups, n));
            const base = Math.floor(n / g), extra = n % g;
            for (let i = 0; i < g; i++) { const s = base + (i < extra ? 1 : 0); matches += s * (s - 1) / 2; }
            matches += Math.max(0, 2 * g - 1) + (c.thirdPlaceMatch ? 1 : 0);
        }
        matches = Math.round(matches);
        const waves = Math.ceil(matches / Math.max(1, c.numCourts));
        const minutes = waves * ((c.matchDuration || 25) + (c.breakTime || 0));
        return { players: n, matches, minutes };
    },

    rulesSummary() {
        const c = State.current;
        const unit = c.sport === 'tennis' ? 'gemů' : 'bodů';
        const sets = c.bestOf === 1 ? 'Jeden set' : `Na ${Math.ceil(c.bestOf / 2)} vítězné sety`;
        return `${sets} do ${c.pointsPerSet} ${unit}${c.winByTwo !== false ? ` o dva, nejvýš ${c.tieBreakPoints}` : ''}. Výhra ${c.pointsForWin} ${Utils.plural(c.pointsForWin, 'bod', 'body', 'bodů')} do tabulky, remíza ${c.pointsForDraw}.`;
    },

    renderSetup() {
        const c = State.current;
        const est = this.estimate();
        const isCross = (c.playoffType || 'cross') === 'cross';
        const sys = (id, title, desc) => `
            <button type="button" class="choice ${c.system === id ? 'active' : ''}" data-system="${id}" aria-pressed="${c.system === id}">
                ${UI.glyph(id)}<span class="choice-title">${title}</span><span class="choice-desc">${desc}</span>
            </button>`;
        const disc = (id, title, desc) => `
            <button type="button" class="choice ${c.disciplineType === id ? 'active' : ''}" data-discipline="${id}" aria-pressed="${c.disciplineType === id}">
                ${UI.glyph(id)}<span class="choice-title">${title}</span><span class="choice-desc">${desc}</span>
            </button>`;

        let systemOptions = '';
        if (c.system === 'groups') {
            systemOptions = `
                <div class="sub-options">
                    <div class="field-row">
                        ${this.field('Počet skupin', this.stepper('numGroups', c.numGroups, 2, 8))}
                        ${this.field('Po skupinách', this.segmented('playoffType', [['cross', 'Křížový pavouk'], ['positional', 'Poziční finále']], c.playoffType || 'cross', 'str'),
                            isCross ? 'První dva ze skupin křížem do pavouka.' : 'První hrají s prvními, druzí s druhými.')}
                    </div>
                    ${isCross ? `
                        ${this.switchRow('consolation-bracket', c.consolationBracket, 'Hrát o pořadí nepostupujících', 'Kdo nepostoupí, odehraje vlastní mini-pavouk.')}
                        ${this.switchRow('third-place-match', c.thirdPlaceMatch, 'Zápas o 3. místo', 'Poražení semifinalisté hrají o bronz.')}` : ''}
                </div>`;
        } else if (c.system === 'knockout') {
            systemOptions = `<div class="sub-options">${this.switchRow('third-place-match', c.thirdPlaceMatch, 'Zápas o 3. místo', 'Poražení semifinalisté hrají o bronz.')}</div>`;
        } else if (c.system === 'swiss') {
            systemOptions = `<div class="sub-options"><p class="note">${Icons.svg('info')}Po každém kole se párují hráči s podobným počtem bodů. Obvykle se hraje 5 až 7 kol, další kolo spustíte v kroku Zápasy.</p></div>`;
        }

        return `
            ${this.pageHead('Nastavení turnaje', 'Formát, kurty a pravidla. Dokud nevygenerujete zápasy, jde všechno změnit.')}

            <div class="setup-layout">
                <div class="setup-main">
                    <section class="panel">
                        <div class="field">
                            <label class="field-label" for="tournament-name">Název turnaje</label>
                            <input type="text" id="tournament-name" class="input-xl" value="${(c.tournamentName || '').replace(/"/g, '&quot;')}" placeholder="Např. Podzimní turnaj TJ Sokol" autocomplete="off">
                        </div>
                        <div class="field-row">
                            <div class="field"><label class="field-label" for="tournament-date">Datum</label><input type="date" id="tournament-date" value="${c.tournamentDate}"></div>
                            ${this.field('Sport', this.segmented('sport', [['badminton', 'Badminton'], ['tennis', 'Tenis']], c.sport, 'str'))}
                        </div>
                    </section>

                    <section class="panel">
                        <h2 class="panel-title">Disciplína</h2>
                        <div class="choice-grid choice-grid-3">
                            ${disc('singles', 'Dvouhra', 'Jeden na jednoho')}
                            ${disc('doubles', 'Čtyřhra', 'Páry proti sobě')}
                            ${disc('mixed', 'Smíšené', 'Dvouhry i čtyřhry')}
                        </div>
                    </section>

                    <section class="panel">
                        <h2 class="panel-title">Herní systém</h2>
                        <div class="choice-grid">
                            ${sys('roundrobin', i18n.t('system.roundrobin'), 'Všichni proti všem')}
                            ${sys('groups', i18n.t('system.groups'), 'Skupiny, pak pavouk')}
                            ${sys('knockout', i18n.t('system.knockout'), 'Kdo prohraje, končí')}
                            ${sys('swiss', i18n.t('system.swiss'), 'Párování podle bodů')}
                        </div>
                        ${systemOptions}
                    </section>

                    <section class="panel">
                        <h2 class="panel-title">Kurty a čas</h2>
                        <div class="field-row field-row-3">
                            ${this.field('Kurtů', this.stepper('numCourts', c.numCourts, 1, 20), 'Kolik zápasů běží naráz')}
                            ${this.field('Délka zápasu', this.stepper('matchDuration', c.matchDuration, 10, 120, 5, 'min'), 'Pro odhad času')}
                            ${this.field('Pauza mezi zápasy', this.stepper('breakTime', c.breakTime, 0, 30, 1, 'min'), 'Odpočinek hráčů')}
                        </div>
                    </section>

                    <section class="panel">
                        <details class="rules" ${this.rulesOpen ? 'open' : ''} ontoggle="UI.rulesOpen = this.open">
                            <summary>
                                <span><span class="panel-title">Pravidla a bodování</span><span class="rules-summary">${this.rulesSummary()}</span></span>
                                <span class="rules-chevron">${Icons.svg('chevronDown')}</span>
                            </summary>
                            <div class="rules-body">
                                <div class="field-row">
                                    ${this.field('Počet setů', this.segmented('bestOf', [[1, '1 set'], [3, 'Na 2 vítězné'], [5, 'Na 3 vítězné']], c.bestOf))}
                                    ${this.field(`${Utils.scoreUnitLabel()} na set`, this.stepper('pointsPerSet', c.pointsPerSet, 1, 30), c.sport === 'tennis' ? 'Obvykle 10 (tie-break sada)' : 'Obvykle 21')}
                                </div>
                                <div class="field-row">
                                    ${this.field('Vyhrát o dva', this.segmented('winByTwo', [[1, 'Ano'], [0, 'Ne']], c.winByTwo !== false ? 1 : 0, 'bool'))}
                                    ${this.field('Strop setu', this.stepper('tieBreakPoints', c.tieBreakPoints, 1, 50), `Nejvýš ${Utils.scoreUnitLabel().toLowerCase()} v setu`)}
                                </div>
                                <div class="field-row">
                                    ${this.field('Body za výhru', this.segmented('pointsForWin', [[2, '2 body'], [3, '3 body']], c.pointsForWin))}
                                    ${this.field('Body za remízu', this.segmented('pointsForDraw', [[0, '0'], [1, '1 bod']], c.pointsForDraw))}
                                </div>
                                ${this.switchRow('overtime-scoring', c.overtimeScoring, 'Bodovat prodloužení zvlášť', 'Vítěz v prodloužení dostane jiný počet bodů.')}
                                ${c.overtimeScoring ? `
                                <div class="field-row">
                                    ${this.field('Výhra v prodloužení', this.stepper('pointsForOvertimeWin', c.pointsForOvertimeWin, 0, 10))}
                                    ${this.field('Prohra v prodloužení', this.stepper('pointsForOvertimeLoss', c.pointsForOvertimeLoss, 0, 10))}
                                </div>` : ''}
                            </div>
                        </details>
                    </section>

                    <div class="danger-row">
                        <button class="btn btn-ghost-danger" onclick="if(State.reset()) UI.render()">${Icons.svg('trash')}Smazat a začít nový turnaj</button>
                        <button class="btn btn-primary setup-bottom-cta" onclick="goToParticipants()">Pokračovat k hráčům ${Icons.svg('arrowRight')}</button>
                    </div>
                </div>

                <aside class="setup-summary" aria-label="Plán turnaje">
                    <h2 class="panel-title">Plán turnaje</h2>
                    ${est ? `
                        <dl class="plan">
                            <div><dt>Hráčů</dt><dd data-count="plan-players">${est.players}</dd></div>
                            <div><dt>Zápasů</dt><dd><span data-count="plan-matches">${est.matches}</span></dd></div>
                            <div class="plan-wide"><dt>Odhad délky</dt><dd>${Utils.formatMinutes(est.minutes)}</dd></div>
                        </dl>
                        <p class="plan-note">Při ${c.numCourts} ${Utils.plural(c.numCourts, 'kurtu', 'kurtech', 'kurtech')} a zápasech po ${c.matchDuration} min. U systému ${Utils.getSystemName().toLowerCase()} jde o přibližný odhad.</p>
                    ` : `
                        <p class="plan-empty">Až přidáte hráče, uvidíte tady počet zápasů a jak dlouho turnaj potrvá.</p>
                    `}
                    <div class="plan-facts">
                        <span>${Icons.svg('court')}${c.numCourts} ${Utils.plural(c.numCourts, 'kurt', 'kurty', 'kurtů')}</span>
                        <span>${Icons.svg('clock')}${c.matchDuration} + ${c.breakTime} min</span>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="goToParticipants()">Pokračovat k hráčům ${Icons.svg('arrowRight')}</button>
                </aside>
            </div>
        `;
    },

    // ===== 2. Hráči =====

    renderParticipants() {
        const c = State.current;
        const list = c.participants;
        const present = list.filter(p => !p.absent).length;
        const doubles = c.disciplineType === 'doubles';

        const desc = list.length
            ? `Přítomno <strong data-count="present">${present}</strong> z ${list.length}. Kdo nepřišel, toho přepněte a do losu se nezapočítá.`
            : 'Napište jméno a stiskněte Enter. Hráče můžete také vložit celým seznamem.';

        return `
            ${this.pageHead('Hráči', desc,
                `<button class="btn btn-primary" onclick="goToDraw()" ${present < 2 ? 'disabled' : ''}>Pokračovat k losu ${Icons.svg('arrowRight')}</button>`)}

            <form class="quick-add" onsubmit="event.preventDefault(); quickAddParticipant();" autocomplete="off">
                <span class="quick-add-icon">${Icons.svg('plus')}</span>
                <input id="qa-name" class="qa-input" placeholder="${doubles ? 'Hráč' : 'Jméno a příjmení'}" aria-label="Jméno hráče">
                ${doubles ? `<input id="qa-partner" class="qa-input" placeholder="Partner" aria-label="Partner">` : ''}
                <input id="qa-club" class="qa-input qa-club" placeholder="Klub (nepovinné)" aria-label="Klub">
                <button type="submit" class="btn btn-primary">Přidat</button>
            </form>

            <div class="list-tools">
                ${list.length > 6 ? `<label class="search">${Icons.svg('search')}<input type="search" id="roster-search" placeholder="Hledat hráče" oninput="filterRoster(this.value)"></label>` : '<span></span>'}
                <div class="list-tools-actions">
                    ${list.length > 0 && present < list.length ? `<button class="btn btn-quiet" onclick="markAllPresent()">${Icons.svg('userCheck')}Všichni přítomni</button>` : ''}
                    <button class="btn btn-quiet" onclick="showCSVImportModal()">${Icons.svg('upload')}Vložit seznam</button>
                    <button class="btn btn-quiet" onclick="openParticipantModal()">${Icons.svg('edit')}S podrobnostmi</button>
                    ${list.length === 0 ? `<button class="btn btn-quiet" onclick="autoFillParticipants()">${Icons.svg('sparkle')}Ukázkoví hráči</button>` : ''}
                </div>
            </div>

            ${list.length > 0 ? `
                <ul class="roster" id="roster">
                    ${list.map((p, i) => `
                        <li class="roster-row ${p.absent ? 'is-absent' : ''}" data-idx="${i}" data-search="${Utils.getPlayerDisplayNamePlain(p).toLowerCase()} ${(p.partner || '').toLowerCase()} ${(p.club || '').toLowerCase()}">
                            <span class="avatar">${Utils.getInitials(p)}</span>
                            <span class="roster-name">
                                <span class="roster-primary">${p.partner ? `${p.name} <span class="amp">&amp;</span> ${p.partner}` : p.name}</span>
                                <span class="roster-secondary">${[p.teamName, p.club || 'Bez klubu'].filter(Boolean).join(', ')}</span>
                            </span>
                            ${p.seed ? `<span class="seed" title="Nasazení (10 = nejsilnější)">${p.seed}</span>` : '<span></span>'}
                            <button class="presence ${p.absent ? 'off' : 'on'}" onclick="togglePresence(${i})" role="switch" aria-checked="${!p.absent}">
                                <span class="presence-dot"></span>${p.absent ? 'Chybí' : 'Přítomen'}
                            </button>
                            <span class="row-actions">
                                <button class="icon-btn icon-btn-sm" onclick="editParticipant(${i})" title="Upravit" aria-label="Upravit ${Utils.getPlayerDisplayNamePlain(p)}">${Icons.svg('edit')}</button>
                                <button class="icon-btn icon-btn-sm" onclick="removeParticipant(${i})" title="Odebrat" aria-label="Odebrat ${Utils.getPlayerDisplayNamePlain(p)}">${Icons.svg('trash')}</button>
                            </span>
                        </li>`).join('')}
                </ul>
                <p class="roster-empty-search" id="roster-nohit" hidden>Nikdo takový v seznamu není.</p>
            ` : `
                <div class="empty-state">
                    ${UI.glyph('doubles')}
                    <p><strong>Seznam je zatím prázdný.</strong></p>
                    <p>Přidejte hráče nahoře, vložte celý seznam (třeba z přihlášek), nebo si turnaj vyzkoušejte s ukázkovými hráči.</p>
                    <div class="button-group">
                        <button class="btn btn-secondary" onclick="showCSVImportModal()">${Icons.svg('upload')}Vložit seznam</button>
                        <button class="btn btn-secondary" onclick="autoFillParticipants()">${Icons.svg('sparkle')}Ukázkoví hráči</button>
                    </div>
                </div>
            `}
        `;
    },

    // ===== 3. Los =====

    renderDraw() {
        const c = State.current;
        const pool = Utils.filterParticipantsByDiscipline(c.participants);
        const isGroups = c.system === 'groups';
        const hasGroups = c.groups.length > 0;
        const hasMatches = c.matches.length > 0;
        const drawn = isGroups ? hasGroups : c.drawDone;

        const desc = isGroups
            ? `${pool.length} ${Utils.plural(pool.length, 'hráč se rozlosuje', 'hráči se rozlosují', 'hráčů se rozlosuje')} do ${c.numGroups} ${Utils.plural(c.numGroups, 'skupiny', 'skupin', 'skupin')}. Pak vygenerujete zápasy.`
            : `Los určí pořadí hráčů a tím i rozpis zápasů. ${Utils.getSystemName()}, ${pool.length} ${Utils.plural(pool.length, 'hráč', 'hráči', 'hráčů')}.`;

        const actions = hasMatches
            ? `<button class="btn btn-primary" onclick="goToMatches()">Na zápasy ${Icons.svg('arrowRight')}</button>`
            : drawn
                ? `<button class="btn btn-secondary" onclick="UI.animatedDraw()">${Icons.svg('shuffle')}Losovat znovu</button>
                   <button class="btn btn-primary" onclick="Matches.generate()">Vygenerovat zápasy ${Icons.svg('arrowRight')}</button>`
                : `<button class="btn btn-primary btn-lg" onclick="UI.animatedDraw()">${Icons.svg('shuffle')}Losovat</button>`;

        let body = '';
        if (isGroups && hasGroups) {
            const canMove = !hasMatches;
            body = `
                ${canMove ? `<p class="hint">${Icons.svg('move')}Hráče můžete přetáhnout do jiné skupiny, dokud nevygenerujete zápasy.</p>` : ''}
                <div class="groups-grid">
                    ${c.groups.map((group, gi) => {
                        const letter = String.fromCharCode(65 + gi);
                        return `
                        <section class="group-box" style="--group:${this.getGroupColor(letter)}" data-group="${gi}">
                            <header class="group-box-head"><span class="group-letter">${letter}</span>Skupina ${letter}<span class="group-count">${group.length}</span></header>
                            <ol class="group-list">
                                ${group.map((p, pi) => `
                                    <li class="group-player" data-flip="${Utils.getPlayerDisplayNamePlain(p)}" data-deal="${pi * c.groups.length + gi}"
                                        ${canMove ? `draggable="true" data-from="${gi}" data-pi="${pi}"` : ''}>
                                        ${canMove ? `<span class="grip">${Icons.svg('grip')}</span>` : ''}
                                        <span class="gp-name">${Utils.getPlayerDisplayName(p)}</span>
                                        ${p.seed ? `<span class="seed">${p.seed}</span>` : ''}
                                        ${canMove ? `<button class="icon-btn icon-btn-sm gp-move" onclick="openMovePlayerModal(${gi}, ${pi})" title="Přesunout do jiné skupiny" aria-label="Přesunout">${Icons.svg('move')}</button>` : ''}
                                    </li>`).join('')}
                            </ol>
                        </section>`;
                    }).join('')}
                </div>`;
        } else {
            const order = isGroups ? pool : c.participants.filter(p => pool.includes(p));
            body = `
                <div class="draw-pool ${drawn && !isGroups ? 'is-ordered' : ''}">
                    ${order.map((p, i) => `
                        <span class="pool-chip" data-flip="${Utils.getPlayerDisplayNamePlain(p)}" data-deal="${i}">
                            ${drawn && !isGroups ? `<span class="pool-no">${i + 1}</span>` : ''}${Utils.getPlayerDisplayNamePlain(p)}
                        </span>`).join('')}
                </div>
                ${!drawn ? `<p class="hint center">Klikněte na Losovat. Jména se zamíchají a ${isGroups ? 'rozdělí do skupin' : 'seřadí do nasazovacího pořadí'}.</p>` : ''}`;
        }

        return `
            ${this.pageHead(i18n.t('step.draw'), desc, actions)}
            ${hasMatches ? `
                <div class="banner">
                    ${Icons.svg('info')}
                    <span>Zápasy jsou vygenerované. Nový los nebo přegenerování smaže všechna zadaná skóre.</span>
                    <span class="banner-actions">
                        <button class="btn btn-quiet" onclick="if(confirm('Nový los smaže zápasy i výsledky. Pokračovat?')) { State.current.matches = []; State.current.rounds = []; State.current.playoffBracket = null; UI.animatedDraw(); }">${Icons.svg('shuffle')}Losovat znovu</button>
                        <button class="btn btn-quiet" onclick="if(confirm('Přegenerování smaže všechna zadaná skóre. Opravdu pokračovat?')) Matches.generate()">${Icons.svg('refresh')}Přegenerovat zápasy</button>
                    </span>
                </div>` : ''}
            <div class="draw-stage">${body}</div>
        `;
    },

    // Los s animací: jména se zatřesou, pak „odletí“ na nová místa (FLIP)
    async animatedDraw() {
        const reduce = this.reducedMotion();
        const els = [...document.querySelectorAll('[data-flip]')];
        const before = new Map(els.map(el => [el.dataset.flip, el.getBoundingClientRect()]));

        if (!reduce && els.length) {
            document.querySelector('.draw-stage')?.classList.add('is-shuffling');
            await Promise.all(els.map((el, i) => {
                const dx = (Math.random() - 0.5) * 40, dy = (Math.random() - 0.5) * 26, r = (Math.random() - 0.5) * 16;
                return el.animate([
                    { transform: 'none' },
                    { transform: `translate(${dx}px, ${dy}px) rotate(${r}deg)` },
                    { transform: `translate(${-dx * 0.6}px, ${-dy * 0.6}px) rotate(${-r * 0.5}deg)` },
                    { transform: 'none' }
                ], { duration: 560, delay: (i % 6) * 18, easing: 'ease-in-out' }).finished;
            }));
        }

        performDraw();
        if (State.current.system !== 'groups') State.current.drawDone = true;
        State.save();
        this.render();
        if (reduce) return;

        const after = [...document.querySelectorAll('[data-flip]')];
        after.forEach(el => {
            const b = before.get(el.dataset.flip);
            const a = el.getBoundingClientRect();
            const dx = b ? b.left - a.left : 0;
            const dy = b ? b.top - a.top : -24;
            const order = parseInt(el.dataset.deal || '0', 10);
            el.animate([
                { transform: `translate(${dx}px, ${dy}px) scale(0.92)`, opacity: b ? 1 : 0 },
                { transform: 'none', opacity: 1 }
            ], { duration: 640, delay: 60 + order * 42, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        });
        document.querySelectorAll('.group-box').forEach((g, i) => {
            g.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
                { duration: 380, delay: i * 70, easing: 'ease-out', fill: 'backwards' });
        });
    },

    // ===== 4. Zápasy =====

    renderMatches() {
        const c = State.current;
        if (!c.rounds || c.rounds.length === 0 || c.matches.length === 0) {
            return `
                ${this.pageHead(i18n.t('step.matches'), '')}
                <div class="empty-state">
                    ${UI.glyph('knockout')}
                    <p><strong>Zápasy ještě nejsou vygenerované.</strong></p>
                    <p>Nejdřív proveďte los a vygenerujte zápasy.</p>
                    <div class="button-group"><button class="btn btn-primary" onclick="goToDraw()">Přejít k losu</button></div>
                </div>`;
        }

        const total = c.matches.length;
        const completed = c.matches.filter(m => m.completed).length;
        const playing = c.matches.filter(m => m.playing).length;
        const progress = total ? completed / total : 0;

        const remaining = total - completed;
        const minutesLeft = Math.ceil(remaining / Math.max(1, c.numCourts)) * ((c.matchDuration || 25) + (c.breakTime || 0));
        const endAt = new Date(Date.now() + minutesLeft * 60000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

        // Akce další fáze turnaje
        const phase = [];
        if (c.system === 'swiss') {
            const ready = c.matches.filter(m => m.round === c.swissRound - 1).every(m => m.completed);
            phase.push(`<button class="btn ${ready ? 'btn-primary' : 'btn-secondary'}" onclick="Swiss.generateNextRound()" ${ready ? '' : 'disabled'}>${Icons.svg('shuffle')}Vylosovat ${c.swissRound + 1}. kolo</button>`);
        }
        if (c.playoffBracket && c.playoffBracket.type !== 'positional' && c.playoffBracket.currentRound < c.playoffBracket.totalRounds - 1) {
            const ready = c.matches.filter(m => m.knockoutRound === c.playoffBracket.currentRound).every(m => m.completed);
            phase.push(`<button class="btn ${ready ? 'btn-primary' : 'btn-secondary'}" onclick="advancePlayoffRound()" id="advance-playoff-btn" ${ready ? '' : 'disabled'}>${Icons.svg('bracket')}Další fáze pavouka</button>`);
        }
        const groupsDone = c.system === 'groups' && !c.playoffBracket && c.matches.filter(m => !m.isPlayoff).length > 0 && c.matches.filter(m => !m.isPlayoff).every(m => m.completed);
        if (groupsDone) {
            phase.push(`<button class="btn btn-primary" onclick="if(Playoff.generateFromGroups()) { UI.matchTab = 'bracket'; UI.render(); }">${Icons.svg('bracket')}${c.playoffType === 'positional' ? 'Vygenerovat poziční finále' : 'Vygenerovat playoff'}</button>`);
        }

        const conflicts = detectCourtConflicts();
        const hasBracket = !!c.playoffBracket || (c.consolationBrackets || []).length > 0 || (c.knockoutLosersBrackets || []).length > 0;
        const tabs = [
            ['schedule', 'Rozpis', 'list', total],
            ['tables', c.system === 'groups' ? 'Tabulky skupin' : 'Pořadí', 'table'],
            ...(hasBracket || c.system === 'knockout' ? [['bracket', 'Pavouk', 'bracket']] : [])
        ];
        if (!tabs.some(t => t[0] === this.matchTab)) this.matchTab = 'schedule';

        let panel = '';
        if (this.matchTab === 'schedule') panel = this.renderSchedule();
        else if (this.matchTab === 'tables') panel = c.system === 'groups' ? this.renderGroupStandings() : this.renderStandingsTable();
        else panel = this.renderBracketTab();

        return `
            ${this.pageHead(i18n.t('step.matches'),
                `<span class="kpi"><strong data-count="m-done">${completed}</strong> z ${total} dohráno</span>
                 <span class="kpi"><span class="live-dot ${playing ? '' : 'is-idle'}"></span><strong data-count="m-playing">${playing}</strong> se hraje</span>
                 ${remaining ? `<span class="kpi">${Icons.svg('clock')}konec kolem <strong>${endAt}</strong></span>` : `<span class="kpi">${Icons.svg('check')}všechno dohráno</span>`}`,
                `${phase.join('')}<button class="btn ${groupsDone || phase.length ? 'btn-secondary' : 'btn-primary'}" onclick="goToResults()">${Icons.svg('trophy')}Výsledky</button>`)}

            <div class="progress-track" role="progressbar" aria-valuenow="${Math.round(progress * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="--p:${progress}"></span></div>

            ${conflicts.length ? `
                <div class="banner banner-danger" role="alert">
                    ${Icons.svg('alert')}
                    <span>${conflicts.map(cf => `<strong>${cf.players.join(', ')}</strong> hraje zároveň v zápasech ${cf.match1 + 1} a ${cf.match2 + 1}.`).join(' ')}</span>
                </div>` : ''}

            ${Courts.renderBoard()}

            <div class="tabs" role="tablist">
                ${tabs.map(([id, label, icon, count]) => `
                    <button role="tab" class="tab ${this.matchTab === id ? 'active' : ''}" aria-selected="${this.matchTab === id}" onclick="UI.matchTab='${id}'; UI.render();">
                        ${Icons.svg(icon)}${label}${count !== undefined ? `<span class="tab-count">${count}</span>` : ''}
                    </button>`).join('')}
            </div>
            <div class="tab-panel" role="tabpanel">${panel}</div>
        `;
    },

    renderSchedule() {
        const c = State.current;
        const counts = {
            all: c.matches.length,
            pending: c.matches.filter(m => !m.completed && !m.playing).length,
            playing: c.matches.filter(m => m.playing).length,
            completed: c.matches.filter(m => m.completed).length
        };
        const f = typeof currentMatchFilter !== 'undefined' ? currentMatchFilter : 'all';
        return `
            <div class="schedule-tools">
                <div class="seg seg-filter" role="radiogroup" aria-label="Filtr zápasů">
                    ${[['all', 'Vše'], ['pending', 'Čeká'], ['playing', 'Hraje se'], ['completed', 'Dohráno']].map(([id, label]) => `
                        <button class="seg-btn filter-btn ${f === id ? 'on active' : ''}" data-filter="${id}" onclick="setMatchFilter('${id}')">${label}<span class="seg-count">${counts[id]}</span></button>`).join('')}
                </div>
                <label class="search">${Icons.svg('search')}<input type="search" id="match-search" placeholder="Hledat hráče" value="${(this.matchSearch || '').replace(/"/g, '&quot;')}" oninput="filterMatches()"></label>
            </div>
            <div id="matches-content">
                ${c.rounds.map((_, roundIndex) => {
                    const roundMatches = c.matches.filter(m => m.round === roundIndex);
                    if (roundMatches.length === 0) return '';
                    const doneCount = roundMatches.filter(m => m.completed).length;
                    const roundName = roundMatches[0]?.roundName || `${roundIndex + 1}. kolo`;
                    return `
                        <section class="round-section">
                            <header class="round-header">
                                <h3>${roundName}</h3>
                                <span class="round-count ${doneCount === roundMatches.length ? 'is-done' : ''}">${doneCount === roundMatches.length ? `${Icons.svg('check')}Dohráno` : `${doneCount} z ${roundMatches.length}`}</span>
                            </header>
                            <div class="match-list">${roundMatches.map(m => Matches.renderRow(m)).join('')}</div>
                        </section>`;
                }).join('')}
            </div>
            <p class="kbd-hint">${Icons.svg('info')}Klepněte na zápas a zadejte skóre. V okně zápasu fungují klávesy Q/W a A/S pro body hráčů.</p>
        `;
    },

    renderStandingsTable() {
        Stats.calculate();
        const s = State.current.standings;
        if (!s || s.length === 0) return '<div class="empty-state"><p>Pořadí se objeví po prvním dohraném zápase.</p></div>';
        return `
            <div class="table-wrap">
                <table class="standings">
                    <thead><tr>
                        <th>#</th><th class="name-cell">Hráč</th><th title="Zápasy">Z</th><th title="Výhry">V</th><th title="Remízy">R</th><th title="Prohry">P</th>
                        <th>Sety</th><th>${Utils.scoreUnitLabel()}</th><th>Body</th>
                    </tr></thead>
                    <tbody>
                        ${s.map((r, i) => `
                            <tr>
                                <td><span class="position-badge ${i < 3 ? `position-${i + 1}` : ''}">${i + 1}</span></td>
                                <td class="name-cell">${Utils.getPlayerDisplayName(r.playerRef || r.player)}</td>
                                <td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td>
                                <td>${r.setsWon}:${r.setsLost}</td><td class="muted-cell">${r.pointsWon}:${r.pointsLost}</td>
                                <td class="pts-cell">${r.points}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    renderBracketTab() {
        const c = State.current;
        let html = '';
        if (c.playoffBracket) {
            html += c.playoffBracket.type === 'positional' ? Playoff.renderPositionalPlayoff() : Playoff.renderBracket();
        }
        if ((c.consolationBrackets || []).length) html += Playoff.renderConsolationBrackets();
        if ((c.knockoutLosersBrackets || []).length) html += Playoff.renderLosersBrackets();

        if (c.playoffBracket && c.knockoutLosers) {
            const generated = (c.knockoutLosersBrackets || []).map(b => b.fromRound);
            const pending = Object.keys(c.knockoutLosers).map(Number).filter(r => !generated.includes(r));
            if (pending.length) {
                html += `
                    <section class="panel">
                        <h2 class="panel-title">Zápasy o pořadí poražených</h2>
                        <p class="hint">Poražení z jednotlivých kol mohou hrát o další umístění. Rozhodnout se můžete kdykoliv během turnaje.</p>
                        <div class="button-group">
                            ${pending.sort((a, b) => a - b).map(r => {
                                const tr = c.playoffBracket.totalRounds;
                                const posEnd = Math.pow(2, tr - r);
                                const posStart = Math.pow(2, tr - r - 1) + 1;
                                const lbl = posStart === posEnd ? `o ${posStart}. místo` : `o ${posStart}.–${posEnd}. místo`;
                                return `<button class="btn btn-secondary" onclick="generateLosersBracketRound(${r})">${Icons.svg('bracket')}Vygenerovat zápasy ${lbl}</button>`;
                            }).join('')}
                        </div>
                    </section>`;
            }
        }
        return html || '<div class="empty-state"><p>Pavouk se objeví, až skončí skupinová fáze.</p></div>';
    },

    // ===== 5. Výsledky =====

    renderPodium() {
        const standings = State.current.standings;
        const podiumOrder = [1, 0, 2];
        const labels = ['1. místo', '2. místo', '3. místo'];
        const items = podiumOrder.filter(i => standings[i]).map(i => ({
            name: Utils.getPlayerDisplayName(standings[i].playerRef || standings[i].player),
            label: labels[i], pos: i
        }));
        if (items.length === 0) return '';
        return `
            <div class="sp-podium-wrap">
                <div class="sp-podium">
                    ${items.map(p => `
                        <div class="sp-podium-card sp-podium-pos-${p.pos}" style="--order:${p.pos === 0 ? 2 : p.pos === 1 ? 1 : 0}">
                            <div class="sp-podium-name">${p.name}</div>
                            <div class="sp-podium-label">${p.label}</div>
                            <div class="sp-podium-bar sp-podium-bar-${p.pos}"><span class="sp-podium-medal-icon">${p.pos + 1}</span></div>
                        </div>`).join('')}
                </div>
            </div>`;
    },

    renderResults() {
        Stats.calculate();
        const c = State.current;
        const total = c.matches.length;
        const completed = c.matches.filter(m => m.completed).length;
        const allCompleted = total > 0 && completed === total;
        const isGroups = c.system === 'groups';

        const actions = `
            ${allCompleted ? `<button class="btn btn-primary" onclick="saveToHistory()">${Icons.svg('save')}Uložit do historie</button>` : ''}
            <button class="btn btn-secondary" onclick="Export.toCSV()">${Icons.svg('download')}CSV pro Excel</button>
            <button class="btn btn-secondary" onclick="Export.toPDF()">${Icons.svg('file')}PDF</button>
            <button class="icon-btn" onclick="openExportMenu()" title="Další možnosti exportu a sdílení" aria-label="Další možnosti exportu">${Icons.svg('more')}</button>`;

        const stats = `
            <dl class="stat-strip">
                <div><dt>Hráčů</dt><dd data-count="r-players">${c.participants.filter(p => !p.absent).length}</dd></div>
                <div><dt>Zápasů</dt><dd data-count="r-matches">${completed}</dd></div>
                <div><dt>Setů</dt><dd data-count="r-sets">${Utils.calculateTotalSets()}</dd></div>
                <div><dt>${Utils.scoreUnitLabel()}</dt><dd data-count="r-points">${Utils.calculateTotalPoints()}</dd></div>
            </dl>`;

        let tables = '';
        if (isGroups) {
            tables = this.renderGroupStandings();
            if (c.playoffBracket) tables += c.playoffBracket.type === 'positional' ? Playoff.renderPositionalPlayoff() : Playoff.renderBracket();
            if ((c.consolationBrackets || []).length) tables += Playoff.renderConsolationBrackets();
        } else {
            tables = `<section class="panel"><h2 class="panel-title">${allCompleted ? 'Konečné pořadí' : 'Průběžné pořadí'}</h2>${this.renderStandingsTable()}</section>`;
            if (c.playoffBracket) tables += Playoff.renderBracket();
        }

        return `
            ${this.pageHead(i18n.t('step.results'),
                allCompleted ? 'Turnaj je dohraný. Gratulujeme vítězům.' : `Zbývá dohrát ${total - completed} z ${total} zápasů, pořadí je zatím průběžné.`,
                actions)}
            ${allCompleted ? this.renderPodium() : ''}
            ${stats}
            ${tables}
            <div class="danger-row">
                <button class="btn btn-quiet" onclick="goToMatches()">${Icons.svg('chevronLeft')}Zpět na zápasy</button>
                ${allCompleted ? `<button class="btn btn-ghost-danger" onclick="if(State.reset()) UI.render()">${Icons.svg('trash')}Začít nový turnaj</button>` : ''}
            </div>
        `;
    },

    // ===== SPECTATOR VIEW =====

    renderSpectatorView() {
        if (!State.current.tournamentName && !State.current.matches.length) {
            return `
                <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                    <div style="font-size:1.1em;font-weight:600;margin-bottom:8px;">Připojuji se k turnaji…</div>
                    <div style="font-size:0.875em;">Pokud se nic nenačte, organizátor možná sdílení ukončil.</div>
                </div>
            `;
        }
        Stats.calculate();

        const numCourts = State.current.numCourts || 1;
        const allMatches = State.current.matches;
        const playingMatches = allMatches.filter(m => m.playing);
        const pendingMatches = allMatches.filter(m => !m.completed && !m.playing);
        const upcomingMatches = Courts.queue(Math.max(numCourts * 2, 4)).map(q => q.m);
        const completed = allMatches.filter(m => m.completed).length;
        const total = allMatches.length;
        const progress = total > 0 ? Math.round(completed / total * 100) : 0;
        const isComplete = completed === total && total > 0;

        const hasPlayoff = !!State.current.playoffBracket;
        const hasGroups = State.current.system === 'groups';

        const tournamentDate = State.current.tournamentDate
            ? new Date(State.current.tournamentDate + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

        const header = `
            <div class="spectator-header-bar">
                <div class="spectator-header-left">
                    <div class="spectator-tournament-name">${State.current.tournamentName || 'Turnaj'}</div>
                    <div class="spectator-header-meta">
                        ${tournamentDate ? `${tournamentDate}, ` : ''}${numCourts} ${numCourts === 1 ? 'kurt' : numCourts < 5 ? 'kurty' : 'kurtů'}
                    </div>
                </div>
                <div class="spectator-header-right">
                    ${isComplete ? '<span class="spectator-complete-badge">Turnaj dohrán</span>' : '<span class="spectator-live-badge"><span class="live-dot"></span>Živě</span>'}
                    <div class="spectator-progress-wrap" title="${completed} z ${total} zápasů">
                        <div class="spectator-progress-bar-wrap">
                            <div class="spectator-progress-fill" style="width:${progress}%"></div>
                        </div>
                        <span class="spectator-progress-pct">${completed}/${total}</span>
                    </div>
                    ${State.tvMode ? `<span class="tv-clock" id="tv-clock">${new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>` : `
                    <button class="btn btn-outline spectator-save-btn"
                        onclick="if(confirm('Uložit tento turnaj k sobě a upravovat ho?')){State.isShared=false;State.readOnly=false;State.save();window.history.replaceState(null,'',window.location.pathname);Utils.showNotification('Turnaj uložen');UI.render();}">
                        Uložit k sobě
                    </button>`}
                </div>
            </div>`;

        // ── COMPLETED VIEW ────────────────────────────────────────────────
        if (isComplete) {
            return `<div class="spectator-view">${header}${this.renderSpectatorCompleted(hasPlayoff, hasGroups)}</div>`;
        }

        // ── LIVE VIEW ─────────────────────────────────────────────────────
        let standingsContent = '';
        if (hasPlayoff) {
            standingsContent += State.current.playoffBracket.type === 'positional'
                ? this.renderSpectatorPositionalPlayoff()
                : this.renderSpectatorBracket();
        }
        if (hasGroups) {
            standingsContent += `
                <div style="margin-top:${hasPlayoff ? '16px' : '0'};">
                    ${hasPlayoff ? '<h4 class="spectator-subtitle">Skupinová fáze</h4>' : ''}
                    ${this.renderSpectatorGroupStandings()}
                </div>`;
        }
        if (!hasPlayoff && !hasGroups) {
            standingsContent = this.renderSpectatorStandings();
        }

        return `
            <div class="spectator-view">
                ${header}
                <section class="spectator-courts" aria-label="Kurty">
                    <h3 class="spectator-col-title">Na kurtech <span class="spectator-badge">${playingMatches.length}</span></h3>
                    ${Courts.renderSpectatorBoard()}
                </section>
                <div class="spectator-dashboard">
                    <div class="spectator-col">
                        <h3 class="spectator-col-title spectator-col-next">
                            Na řadě
                            <span class="spectator-badge">${upcomingMatches.length}</span>
                        </h3>
                        ${upcomingMatches.length > 0
                            ? upcomingMatches.map((m, i) => this.renderSpectatorMatchCard(m, 'next', i + 1)).join('')
                            : '<div class="spectator-empty">Žádné další zápasy</div>'
                        }
                    </div>
                    <div class="spectator-col spectator-col-wide">
                        <h3 class="spectator-col-title spectator-col-standings">
                            ${hasPlayoff
                                ? (hasGroups ? 'Playoff a skupiny' : 'Playoff')
                                : hasGroups ? 'Tabulky skupin' : 'Průběžné pořadí'}
                        </h3>
                        ${standingsContent}
                    </div>
                </div>
            </div>
        `;
    },

    renderSpectatorCompleted(hasPlayoff, hasGroups) {
        // Build content panels
        const bracketPanel = hasPlayoff ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">
                    ${State.current.playoffBracket.type === 'positional' ? 'Finálové umístění' : 'Playoff pavouk'}
                </div>
                ${State.current.playoffBracket.type === 'positional'
                    ? this.renderSpectatorPositionalPlayoff()
                    : this.renderSpectatorBracket()}
            </div>` : '';

        const groupsPanel = hasGroups ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">Skupinová fáze</div>
                ${this.renderSpectatorGroupStandings()}
            </div>` : '';

        const standingsPanel = !hasPlayoff && !hasGroups ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">Konečné pořadí</div>
                ${this.renderSpectatorStandings()}
            </div>` : '';

        const mainStandingsPanel = (hasPlayoff || hasGroups) ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">Konečné pořadí</div>
                ${this.renderSpectatorStandings()}
            </div>` : '';

        const contentCols = [bracketPanel, groupsPanel, standingsPanel, mainStandingsPanel]
            .filter(Boolean).join('');

        return `
            ${this.renderPodium()}
            <div class="sp-result-grid">${contentCols}</div>
        `;
    },

    renderSpectatorMatchCard(match, type, position) {
        const idx = State.current.matches.indexOf(match);
        const p1Name = Utils.getPlayerDisplayName(match.player1);
        const p2Name = Utils.getPlayerDisplayName(match.player2);

        let scoreDisplay = '';
        if (type === 'live') {
            const scores = (match.sets || [])
                .filter(s => s && s.score1 !== null && s.score2 !== null)
                .map(s => `<span class="sp-set-score">${s.score1}:${s.score2}</span>`);
            scoreDisplay = scores.length > 0
                ? `<div class="sp-scores">${scores.join('')}</div>`
                : '<div class="sp-scores"><span class="sp-set-score">—</span></div>';
        }

        return `
            <div class="sp-match-card sp-match-${type}">
                <div class="sp-match-meta">
                    ${type === 'next' ? `<span class="sp-next-pos">${position}.</span>` : ''}
                    ${type === 'live' ? `<span class="sp-court-badge">Kurt ${match.court}</span>` : ''}
                    ${match.group ? `<span class="sp-group-badge" style="color:${UI.getGroupColor(match.group)};border-color:${UI.getGroupColor(match.group)}20;">Sk. ${match.group}</span>` : ''}
                    ${match.roundName ? `<span class="sp-round-label">${match.roundName}</span>` : ''}
                    ${type === 'live' && match.startTime
                        ? `<span class="sp-timer" id="spectator-timer-${idx}">${Utils.calculateElapsed(match.startTime)}</span>`
                        : ''}
                </div>
                <div class="sp-match-body">
                    <div class="sp-player">${p1Name}</div>
                    ${type === 'live' ? scoreDisplay : '<div class="sp-vs">vs</div>'}
                    <div class="sp-player">${p2Name}</div>
                </div>
            </div>
        `;
    },

    renderSpectatorStandings() {
        const standings = State.current.standings;
        if (!standings || standings.length === 0) {
            return '<div class="spectator-empty">Tabulka zatím není k dispozici</div>';
        }
        return `
            <table class="sp-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th class="sp-col-name">Hráč</th>
                        <th title="Zápasy">Z</th>
                        <th title="Výhry">V</th>
                        <th title="Sety">Sety</th>
                        <th title="${Utils.scoreUnitLabel()}">${Utils.scoreUnitLabel()}</th>
                        <th title="Body">B</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((s, i) => `
                        <tr class="${i === 0 ? 'sp-gold' : i === 1 ? 'sp-silver' : i === 2 ? 'sp-bronze' : ''}">
                            <td class="sp-pos"><span class="position-badge ${i < 3 ? `position-${i + 1}` : ''}">${i + 1}</span></td>
                            <td class="sp-name">${Utils.getPlayerDisplayName(s.playerRef || s.player)}</td>
                            <td>${s.played}</td>
                            <td class="sp-wins">${s.wins}</td>
                            <td class="sp-sets">${s.setsWon}:${s.setsLost}</td>
                            <td class="sp-balls">${s.pointsWon}:${s.pointsLost}</td>
                            <td class="sp-pts">${s.points}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderSpectatorGroupStandings() {
        const groupStandings = Stats.calculateGroupStandings();
        if (!groupStandings || Object.keys(groupStandings).length === 0) {
            return '<div class="spectator-empty">Skupinové tabulky nejsou k dispozici</div>';
        }
        return Object.entries(groupStandings).map(([letter, standings]) => {
            const color = UI.getGroupColor(letter);
            return `
                <div class="sp-group-block">
                    <div class="sp-group-header" style="--group:${color};"><span class="group-letter">${letter}</span>Skupina ${letter}</div>
                    <table class="sp-table">
                        <thead><tr><th>#</th><th class="sp-col-name">Hráč</th><th>Z</th><th>V</th><th>Sety</th><th>${Utils.scoreUnitLabel()}</th><th>B</th></tr></thead>
                        <tbody>
                            ${standings.map((s, i) => `
                                <tr class="${i < 2 ? 'sp-qualify' : ''}">
                                    <td class="sp-pos">${i + 1}</td>
                                    <td class="sp-name">${Utils.getPlayerDisplayName(s.playerRef || s.player)}</td>
                                    <td>${s.played}</td>
                                    <td class="sp-wins">${s.wins}</td>
                                    <td class="sp-sets">${s.setsWon}:${s.setsLost}</td>
                                    <td class="sp-balls">${s.pointsWon}:${s.pointsLost}</td>
                                    <td class="sp-pts">${s.points}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');
    },

    renderSpectatorBracket() {
        if (!State.current.playoffBracket) {
            return '<div class="spectator-empty">Playoff pavouk není k dispozici</div>';
        }
        const totalRounds = State.current.playoffBracket.totalRounds;
        const rounds = [];
        for (let r = 0; r <= State.current.playoffBracket.currentRound; r++) {
            const roundMatches = State.current.matches.filter(m =>
                m.knockoutRound === r &&
                !m.isThirdPlace &&
                (m.isPlayoff === true || State.current.playoffBracket.isKnockout === true)
            );
            if (roundMatches.length > 0) {
                rounds.push({ round: r, name: Playoff.getRoundName(r, totalRounds), matches: roundMatches });
            }
        }
        const thirdPlaceMatch = State.current.matches.find(m => m.isThirdPlace);
        if (rounds.length === 0 && !thirdPlaceMatch) {
            return '<div class="spectator-empty">Playoff ještě nezačal</div>';
        }

        const renderSpBracketMatch = (m) => {
            const p1 = Utils.getPlayerDisplayName(m.player1);
            const p2 = Utils.getPlayerDisplayName(m.player2);
            const p1w = m.sets ? m.sets.filter(s => s.score1 !== null && s.score1 > s.score2).length : 0;
            const p2w = m.sets ? m.sets.filter(s => s.score2 !== null && s.score2 > s.score1).length : 0;
            const winner = m.completed ? (p1w > p2w ? p1 : p2) : null;
            return `
                <div class="sp-bracket-match ${m.playing ? 'sp-bm-live' : ''} ${m.completed ? 'sp-bm-done' : ''}">
                    <div class="sp-bm-player ${winner === p1 ? 'sp-bm-winner' : ''}">${p1}</div>
                    <div class="sp-bm-player ${winner === p2 ? 'sp-bm-winner' : ''}">${p2}</div>
                </div>
            `;
        };

        return `
            <div class="sp-bracket">
                ${rounds.map(round => `
                    <div class="sp-bracket-round">
                        <div class="sp-bracket-round-name">${round.name}</div>
                        ${round.matches.map(renderSpBracketMatch).join('')}
                    </div>
                `).join('')}
                ${thirdPlaceMatch ? `
                    <div class="sp-bracket-round">
                        <div class="sp-bracket-round-name">O 3. místo</div>
                        ${renderSpBracketMatch(thirdPlaceMatch)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderSpectatorPositionalPlayoff() {
        const tiers = {};
        State.current.matches.filter(m => m.isPlayoff && m.positionTier !== undefined).forEach(m => {
            if (!tiers[m.positionTier]) tiers[m.positionTier] = { name: m.roundName, matches: [] };
            if (!tiers[m.positionTier].matches.includes(m)) tiers[m.positionTier].matches.push(m);
        });
        if (Object.keys(tiers).length === 0) return '<div class="spectator-empty">Poziční finále ještě nezačalo</div>';

        return `<div class="sp-bracket">
            ${Object.keys(tiers).sort((a, b) => a - b).map(tier => {
                const { name, matches } = tiers[tier];
                return `
                    <div class="sp-bracket-round">
                        <div class="sp-bracket-round-name">${name}</div>
                        ${matches.map(m => {
                            const p1 = Utils.getPlayerDisplayName(m.player1);
                            const p2 = Utils.getPlayerDisplayName(m.player2);
                            const p1w = m.sets ? m.sets.filter(s => s.score1 !== null && s.score1 > s.score2).length : 0;
                            const p2w = m.sets ? m.sets.filter(s => s.score2 !== null && s.score2 > s.score1).length : 0;
                            const winner = m.completed ? (p1w > p2w ? p1 : p2) : null;
                            return `<div class="sp-bracket-match ${m.playing ? 'sp-bm-live' : ''} ${m.completed ? 'sp-bm-done' : ''}">
                                <div class="sp-bm-player ${winner === p1 ? 'sp-bm-winner' : ''}">${p1}</div>
                                <div class="sp-bm-player ${winner === p2 ? 'sp-bm-winner' : ''}">${p2}</div>
                            </div>`;
                        }).join('')}
                    </div>
                `;
            }).join('')}
        </div>`;
    },

    renderGroupStandings() {
        const groupStandings = Stats.calculateGroupStandings();
        if (!groupStandings) return '';
        return `
            <div class="groups-grid groups-grid-wide">
                ${Object.keys(groupStandings).map(letter => {
                    const standings = groupStandings[letter];
                    return `
                        <section class="group-box" style="--group:${UI.getGroupColor(letter)};">
                            <header class="group-box-head"><span class="group-letter">${letter}</span>Skupina ${letter}</header>
                            <div class="table-wrap">
                                <table class="standings standings-compact">
                                    <thead><tr>
                                        <th>#</th><th class="name-cell">Hráč</th><th title="Zápasy">Z</th><th title="Výhry">V</th><th title="Prohry">P</th><th title="Sety">Sety</th><th title="Body">B</th>
                                    </tr></thead>
                                    <tbody>
                                        ${standings.map((s, i) => `
                                            <tr class="${i < 2 ? 'is-qualified' : ''}">
                                                <td><span class="position-badge">${i + 1}</span></td>
                                                <td class="name-cell">${Utils.getPlayerDisplayName(s.playerRef || s.player)}</td>
                                                <td>${s.played}</td><td>${s.wins}</td><td>${s.losses}</td>
                                                <td>${s.setsWon}:${s.setsLost}</td>
                                                <td class="pts-cell">${s.points}</td>
                                            </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${standings.length > 0 && standings[0].played > 0 ? `<footer class="group-box-foot"><span class="q-dot"></span>První dva postupují do playoff</footer>` : ''}
                        </section>`;
                }).join('')}
            </div>`;
    },

    attachEventListeners() {
        const content = document.getElementById('app-content');

        const nameInput = document.getElementById('tournament-name');
        if (nameInput) {
            nameInput.addEventListener('input', e => {
                State.current.tournamentName = e.target.value;
                this.updateTitle();
                State.save();
            });
        }

        const dateInput = document.getElementById('tournament-date');
        if (dateInput) {
            dateInput.addEventListener('change', e => {
                State.current.tournamentDate = e.target.value;
                State.save();
                this.updateTitle();
            });
        }

        content.querySelectorAll('.choice[data-system]').forEach(opt => {
            opt.addEventListener('click', () => { State.current.system = opt.dataset.system; this.render(); });
        });
        content.querySelectorAll('.choice[data-discipline]').forEach(opt => {
            opt.addEventListener('click', () => { State.current.disciplineType = opt.dataset.discipline; this.render(); });
        });

        // Přepínače (segmented): data-key, data-val, data-type
        content.querySelectorAll('.seg-btn[data-key]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                const raw = btn.dataset.val;
                const val = btn.dataset.type === 'bool' ? raw === '1' : btn.dataset.type === 'num' ? Number(raw) : raw;
                if (key === 'sport') {
                    this.applySportPreset(val);
                } else {
                    State.current[key] = val;
                }
                this.render();
            });
        });

        // Krokovače −/+
        content.querySelectorAll('.stepper').forEach(st => {
            const key = st.dataset.key;
            const min = Number(st.dataset.min), max = Number(st.dataset.max), step = Number(st.dataset.step) || 1;
            const set = v => {
                const n = Math.max(min, Math.min(max, Math.round(v / step) * step));
                if (State.current[key] === n) return;
                State.current[key] = n;
                this.render();
            };
            st.querySelectorAll('.stepper-btn').forEach(b => b.addEventListener('click', () => set((Number(State.current[key]) || 0) + Number(b.dataset.delta) * step)));
            const input = st.querySelector('input');
            input.addEventListener('change', () => set(Number(input.value)));
            input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        });

        [['third-place-match', 'thirdPlaceMatch'], ['consolation-bracket', 'consolationBracket'], ['overtime-scoring', 'overtimeScoring']].forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', e => {
                State.current[key] = e.target.checked;
                if (key === 'overtimeScoring') this.render(); else State.save();
            });
        });

        // Kroky v bočním panelu i ve spodní liště
        document.querySelectorAll('[data-step]').forEach(stepEl => {
            stepEl.onclick = () => {
                const step = stepEl.dataset.step;
                if (step === State.current.step) return;
                switch (step) {
                    case 'setup': goToSetup(); break;
                    case 'participants': goToParticipants(); break;
                    case 'draw': goToDraw(); break;
                    case 'matches':
                    case 'results':
                        if (State.current.matches.length > 0) step === 'matches' ? goToMatches() : goToResults();
                        else Utils.showNotification('Nejdřív proveďte los a vygenerujte zápasy', 'error');
                        break;
                }
            };
        });

        // Přetahování hráčů mezi skupinami
        let drag = null;
        content.querySelectorAll('.group-player[draggable="true"]').forEach(el => {
            el.addEventListener('dragstart', e => {
                drag = { from: Number(el.dataset.from), pi: Number(el.dataset.pi) };
                el.classList.add('is-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', el.dataset.flip);
            });
            el.addEventListener('dragend', () => {
                el.classList.remove('is-dragging');
                content.querySelectorAll('.group-box.is-drop').forEach(g => g.classList.remove('is-drop'));
            });
        });
        content.querySelectorAll('.group-box[data-group]').forEach(box => {
            box.addEventListener('dragover', e => { if (drag) { e.preventDefault(); box.classList.add('is-drop'); } });
            box.addEventListener('dragleave', e => { if (!box.contains(e.relatedTarget)) box.classList.remove('is-drop'); });
            box.addEventListener('drop', e => {
                e.preventDefault();
                box.classList.remove('is-drop');
                const to = Number(box.dataset.group);
                if (drag && drag.from !== to) movePlayerToGroup(drag.from, drag.pi, to);
                drag = null;
            });
        });

        if (State.current.step === 'participants' && !State.readOnly) {
            const qa = document.getElementById('qa-name');
            if (qa && this.focusQuickAdd) { qa.focus(); this.focusQuickAdd = false; }
        }
    },

    applySportPreset(sport) {
        const presets = {
            badminton: { bestOf: 3, pointsPerSet: 21, tieBreakPoints: 30, winByTwo: true, pointsForWin: 2, overtimeScoring: false },
            tennis: { bestOf: 1, pointsPerSet: 10, tieBreakPoints: 20, winByTwo: true, pointsForWin: 3, overtimeScoring: true, pointsForOvertimeWin: 2, pointsForOvertimeLoss: 1, matchDuration: 25 }
        };
        State.current.sport = sport;
        if (presets[sport]) Object.assign(State.current, presets[sport]);
    },

    togglePartnerField() {
        const type = document.getElementById('modal-type').value;
        const show = type === 'double' ? 'block' : 'none';
        document.getElementById('partner-group').style.display = show;
        document.getElementById('teamname-group').style.display = show;
    },

    closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
    },

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    },

    setTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(theme);
        localStorage.setItem('theme', theme);
        this.closeModal('theme-modal');
        Utils.showNotification('Barva kurtu změněna');
    },

    openHistory() {
        const modal = document.getElementById('history-modal');
        const items = State.current.history;
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Historie turnajů</h3>
                    <button class="modal-close" onclick="UI.closeModal('history-modal')" aria-label="Zavřít">${Icons.svg('x')}</button>
                </div>
                ${items.length === 0 ? `
                    <div class="empty-state"><p><strong>Zatím žádný uložený turnaj.</strong></p><p>Dohraný turnaj uložíte tlačítkem Uložit do historie ve Výsledcích.</p></div>
                ` : `
                <div class="history-grid">
                    ${items.map(t => `
                        <button class="history-card" onclick="loadTournamentFromHistory(${t.id})" aria-label="Načíst turnaj ${t.name}">
                            <span class="history-card-title">${t.name}</span>
                            <span class="history-card-meta">${Utils.formatDate(t.date)}, ${Utils.getSystemName(t.system)}</span>
                            <span class="history-card-meta">${t.participants} ${Utils.plural(t.participants, 'hráč', 'hráči', 'hráčů')}, ${t.matches} ${Utils.plural(t.matches, 'zápas', 'zápasy', 'zápasů')}</span>
                            <span class="history-card-winner">${Icons.svg('trophy')}${t.winner}</span>
                        </button>`).join('')}
                </div>`}
            </div>`;
        modal.classList.add('show');
    },

    getGroupColor(letter) {
        const colors = { A: '#2f6fb0', B: '#2e8a5f', C: '#7a55b5', D: '#c27a12', E: '#c2412d', F: '#1b8a95', G: '#b8467c', H: '#6b8a1f' };
        return colors[letter] || '#2f6fb0';
    },

    // Piktogramy: nákresy kurtu a herních systémů, ikony akcí
    glyph(name) {
        const court = '<rect x="2" y="5" width="44" height="22" rx="1.5"/><path d="M24 5v22" class="g-net"/>';
        const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.4" class="g-fill"/>`;
        const paths = {
            singles: court + dot(13, 16) + dot(35, 16),
            doubles: court + dot(13, 11) + dot(13, 21) + dot(35, 11) + dot(35, 21),
            mixed: court + dot(13, 16) + dot(35, 11) + dot(35, 21),
            roundrobin: (() => {
                const pts = [0, 1, 2, 3, 4].map(i => {
                    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
                    return [24 + 12 * Math.cos(a), 16 + 12 * Math.sin(a)].map(v => v.toFixed(1));
                });
                let d = '';
                for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) d += `M${pts[i][0]} ${pts[i][1]}L${pts[j][0]} ${pts[j][1]}`;
                return `<path d="${d}"/>` + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.2" class="g-fill"/>`).join('');
            })(),
            swiss: '<path d="M10 7h10M28 7h10M14 16h10M32 16h4M10 25h4M22 25h16" />' + [[10, 7], [20, 7], [28, 7], [38, 7], [14, 16], [24, 16], [32, 16], [36, 16], [10, 25], [14, 25], [22, 25], [38, 25]].map(([x, y]) => dot(x, y)).join(''),
            groups: '<rect x="3" y="4" width="15" height="11" rx="2"/><rect x="3" y="18" width="15" height="11" rx="2"/><path d="M18 9.5h7v7h6M18 23.5h7v-7"/><path d="M31 16.5h6v-6h8M37 16.5v6h8"/>',
            knockout: '<path d="M4 6h10v8H4M14 10h10M4 20h10v8H4M14 24h10M24 10v14M24 17h12"/>' + '<circle cx="40" cy="17" r="3" class="g-fill"/>',
            cross: '<path d="M4 7h10l6 9-6 9H4M44 7H34l-6 9 6 9h10"/><path d="M20 16h8"/>',
            positional: '<path d="M6 25h10V13H6zM19 25h10V6H19zM32 25h10V17H32z"/>',
            edit: '<path d="M17 6.5 21.5 11 11 21.5H6.5V17z"/>',
            trash: '<path d="M7 9h14M11 9V6.5h6V9M9 9l1 13h8l1-13"/>'
        };
        const small = name === 'edit' || name === 'trash';
        return `<svg class="${small ? 'g-icon' : 'glyph'}" viewBox="${small ? '0 0 28 28' : '0 0 48 32'}" aria-hidden="true">${paths[name] || ''}</svg>`;
    },

    // Přejetí prstem mezi kroky (jen jednou navázané, mimo vodorovně posuvné prvky)
    setupSwipeNavigation() {
        const content = document.getElementById('app-content');
        if (!content || this.swipeBound) return;
        this.swipeBound = true;
        let sx = 0, sy = 0, ignore = false;
        content.addEventListener('touchstart', e => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
            ignore = !!e.target.closest('input, textarea, select, .bracket-container, .table-wrap, .tabs, .seg, .court-grid, .stepper, .group-list, .quick-add');
        }, { passive: true });
        content.addEventListener('touchend', e => {
            if (ignore || State.readOnly || MatchSheet.idx !== null) return;
            const dx = e.changedTouches[0].clientX - sx;
            const dy = e.changedTouches[0].clientY - sy;
            if (Math.abs(dx) < 70 || Math.abs(dy) > 40) return;
            const i = STEPS.indexOf(State.current.step);
            const next = STEPS[dx < 0 ? i + 1 : i - 1];
            if (!next) return;
            const info = this.stepInfo().find(s => s.id === next);
            if (info && info.locked) return;
            State.current.step = next;
            this.render();
        }, { passive: true });
    }
};
