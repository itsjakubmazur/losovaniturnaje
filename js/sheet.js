// sheet.js - Vysouvací panel zápasu: skóre po setech, start, uložení, poznámka, QR pro rozhodčího

const MatchSheet = {
    idx: null,
    bump: null,

    root() {
        return document.getElementById('sheet-root');
    },

    open(idx) {
        const match = State.current.matches[idx];
        if (!match) return;
        const root = this.root();
        const wasOpen = this.idx !== null;
        this.idx = idx;
        if (!wasOpen) {
            this.returnFocus = document.activeElement;
            root.innerHTML = `
                <div class="sheet-backdrop" onclick="MatchSheet.close()"></div>
                <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
                    <div class="sheet-grabber" aria-hidden="true"></div>
                    <div class="sheet-body"></div>
                </aside>`;
            root.classList.remove('closing');
            requestAnimationFrame(() => root.classList.add('open'));
            document.body.classList.add('sheet-open');
        }
        this.refresh();
        // Fokus na panel (ne do pole), aby hned fungovaly klávesy Q/W/A/S
        root.querySelector('.sheet')?.focus({ preventScroll: true });
    },

    close() {
        if (this.idx === null) return;
        const root = this.root();
        this.idx = null;
        root.classList.remove('open');
        root.classList.add('closing');
        document.body.classList.remove('sheet-open');
        setTimeout(() => {
            if (this.idx === null) { root.innerHTML = ''; root.classList.remove('closing'); }
        }, UI.reducedMotion() ? 0 : 280);
        if (this.returnFocus && document.contains(this.returnFocus)) this.returnFocus.focus({ preventScroll: true });
    },

    refresh() {
        if (this.idx === null) return;
        const match = State.current.matches[this.idx];
        if (!match || State.current.step !== 'matches') { this.close(); return; }
        const body = this.root().querySelector('.sheet-body');
        if (!body) return;
        const active = document.activeElement && document.activeElement.id;
        body.innerHTML = this.render(match);
        if (active && document.getElementById(active) && active.startsWith('sheet-')) document.getElementById(active).focus({ preventScroll: true });
        if (this.bump) {
            const el = body.querySelector(`[data-bump="${this.bump}"]`);
            if (el && !UI.reducedMotion()) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
            this.bump = null;
        }
        UI.animateCounters();
    },

    currentSet(match) {
        return Matches.currentSetIdx(match);
    },

    render(match) {
        const idx = this.idx;
        const c = State.current;
        const [w1, w2] = Matches.setsWon(match);
        const p1 = Utils.getPlayerDisplayName(match.player1);
        const p2 = Utils.getPlayerDisplayName(match.player2);
        const editable = !match.completed;
        const cur = this.currentSet(match);
        const max = c.tieBreakPoints;

        const scoreCtl = (setIdx, player, value) => `
            <div class="score-ctl">
                ${editable ? `<button class="score-btn" onclick="MatchSheet.adjust(${setIdx}, ${player}, -1)" aria-label="Ubrat bod">${Icons.svg('minus')}</button>` : ''}
                <input class="score-input" id="sheet-s${setIdx}-p${player}" data-bump="${setIdx}-${player}" type="number" inputmode="numeric"
                       min="0" max="${max}" value="${value ?? ''}" placeholder="0" ${editable ? '' : 'readonly'}
                       onchange="MatchSheet.setScore(${setIdx}, ${player}, this.value)" aria-label="Set ${setIdx + 1}, hráč ${player}">
                ${editable ? `<button class="score-btn" onclick="MatchSheet.adjust(${setIdx}, ${player}, 1)" aria-label="Přidat bod">${Icons.svg('plus')}</button>` : ''}
            </div>`;

        const setRows = match.sets.map((set, i) => {
            const filled = set.score1 !== null && set.score2 !== null;
            const decided = Matches.setDecided(set);
            const setWinner = decided ? (set.score1 > set.score2 ? 1 : 2) : 0;
            const invalid = filled && !decided && i !== cur && (set.score1 || set.score2);
            return `
                <div class="set-line ${i === cur && editable ? 'is-current' : ''} ${setWinner ? `won-${setWinner}` : ''}">
                    <span class="set-name">Set ${i + 1}</span>
                    ${scoreCtl(i, 1, set.score1)}
                    <span class="set-sep">:</span>
                    ${scoreCtl(i, 2, set.score2)}
                    <span class="set-flag">${invalid ? `<span class="set-warn" title="Neobvyklé skóre setu">${Icons.svg('alert')}</span>` : setWinner ? Icons.svg('check') : ''}</span>
                </div>`;
        }).join('');

        let actions;
        if (match.completed) {
            actions = `
                <button class="btn btn-secondary" onclick="editMatch(${idx})">${Icons.svg('edit')}Opravit výsledek</button>
                <button class="btn btn-quiet" onclick="MatchSheet.close()">Zavřít</button>`;
        } else if (match.playing) {
            actions = `
                <button class="btn btn-primary btn-lg" onclick="finishMatch(${idx})">${Icons.svg('check')}Uložit výsledek</button>
                <button class="btn btn-secondary" onclick="Remote.showRefereeQR(${idx})">${Icons.svg('qr')}QR pro rozhodčího</button>`;
        } else {
            actions = `
                <button class="btn btn-primary btn-lg" onclick="startMatch(${idx})">${Icons.svg('play')}Začít na kurtu ${match.court}</button>
                <button class="btn btn-secondary" onclick="finishMatch(${idx})" title="Výsledek bez spuštění zápasu">${Icons.svg('check')}Jen zapsat výsledek</button>
                <button class="btn btn-quiet" onclick="Remote.showRefereeQR(${idx})">${Icons.svg('qr')}QR pro rozhodčího</button>`;
        }

        return `
            <header class="sheet-head">
                <div>
                    <h2 id="sheet-title" class="sheet-title">Zápas ${idx + 1}</h2>
                    <div class="sheet-tags">
                        <span class="tag">${Icons.svg('court')}Kurt ${match.court}</span>
                        ${match.group ? `<span class="tag tag-group" style="--group:${UI.getGroupColor(match.group)}">Skupina ${match.group}</span>` : ''}
                        ${match.roundName ? `<span class="tag">${match.roundName}</span>` : ''}
                        ${match.playing ? `<span class="tag tag-live"><span class="live-dot"></span><span id="sheet-timer">${match.startTime ? Utils.calculateElapsed(match.startTime) : ''}</span></span>` : ''}
                        ${match.completed ? `<span class="tag tag-done">${Icons.svg('check')}Dohráno</span>` : ''}
                    </div>
                </div>
                <button class="icon-btn sheet-close" onclick="MatchSheet.close()" aria-label="Zavřít">${Icons.svg('x')}</button>
            </header>

            <div class="scoreboard">
                <div class="score-player ${match.completed && w1 > w2 ? 'is-winner' : ''}">
                    <span class="avatar avatar-lg">${Utils.getInitials(match.player1)}</span>
                    <span class="score-name">${p1}</span>
                </div>
                <div class="score-sets" aria-label="Sety ${w1} : ${w2}">
                    <span data-count="sheet-w1-${idx}">${w1}</span><span class="score-colon">:</span><span data-count="sheet-w2-${idx}">${w2}</span>
                </div>
                <div class="score-player ${match.completed && w2 > w1 ? 'is-winner' : ''}">
                    <span class="avatar avatar-lg">${Utils.getInitials(match.player2)}</span>
                    <span class="score-name">${p2}</span>
                </div>
            </div>

            <div class="set-lines">${setRows}</div>
            ${editable ? `<p class="kbd-hint">${Icons.svg('info')}Klávesy: Q / W ubrat a přidat hráči vlevo, A / S hráči vpravo. Esc zavře.</p>` : ''}

            <label class="sheet-notes">
                <span class="field-label">Poznámka</span>
                <textarea id="sheet-notes" placeholder="Skreč, zranění, kdo pískal…" onchange="updateNotes(${idx}, this.value)">${c.notes[idx] || ''}</textarea>
            </label>

            <footer class="sheet-actions">${actions}</footer>`;
    },

    adjust(setIdx, player, delta) {
        if (this.idx === null) return;
        this.bump = `${setIdx}-${player}`;
        quickScoreAdjust(this.idx, setIdx, player, delta);
    },

    setScore(setIdx, player, value) {
        if (this.idx === null) return;
        this.bump = `${setIdx}-${player}`;
        updateSet(this.idx, setIdx, player, value);
        UI.render();
    }
};
