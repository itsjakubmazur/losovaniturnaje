// remote.js - Zápis výsledků z mobilu rozhodčího přes QR kód (bez přihlášení)
//
// Rozhodčí otevře odkaz #ref=<session>/<zápas>, vyplní sety a odešle.
// Výsledek se zapíše do sessions/<session>/submissions/<zápas>, organizátor ho
// přijme, zapíše do turnaje a uzavře zápas.

const Remote = {
    listening: null,

    refUrl(idx) {
        if (!State.liveSessionId) State.startLiveSession();
        Remote.listen();
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}#ref=${State.liveSessionId}/${idx}`;
    },

    // Organizátor: poslouchá odeslané výsledky
    listen() {
        if (!db || State.readOnly || !State.liveSessionId) return;
        if (this.listening === State.liveSessionId) return;
        if (this.listening) db.ref(`sessions/${this.listening}/submissions`).off();
        this.listening = State.liveSessionId;

        const ref = db.ref(`sessions/${State.liveSessionId}/submissions`);
        const handle = snap => {
            const sub = snap.val();
            if (sub) this.apply(Number(snap.key), sub);
            snap.ref.remove().catch(() => {});
        };
        ref.on('child_added', handle);
        ref.on('child_changed', handle);
    },

    stop() {
        if (this.listening && db) db.ref(`sessions/${this.listening}/submissions`).off();
        this.listening = null;
    },

    apply(idx, sub) {
        const match = State.current.matches[idx];
        if (!match || !Array.isArray(sub.sets)) return;

        // Ochrana proti zápisu do jiného zápasu po přegenerování
        const p1 = Utils.getPlayerDisplayNamePlain(match.player1);
        const p2 = Utils.getPlayerDisplayNamePlain(match.player2);
        if (sub.p1 !== p1 || sub.p2 !== p2) {
            Utils.showNotification(`Výsledek od rozhodčího nepasuje k zápasu ${idx + 1} – zápasy se mezitím změnily`, 'error');
            return;
        }
        if (match.completed) {
            Utils.showNotification(`Zápas ${idx + 1} už má výsledek, zápis rozhodčího přeskočen`, 'error');
            return;
        }

        match.sets = match.sets.map((s, i) => {
            const r = sub.sets[i];
            if (!r) return { score1: null, score2: null };
            const a = Number.isFinite(r.score1) ? r.score1 : null;
            const b = Number.isFinite(r.score2) ? r.score2 : null;
            return { score1: a, score2: b };
        });
        if (!match.startTime) match.startTime = new Date(sub.at || Date.now()).toISOString();
        match.playing = false;
        match.completed = true;
        match.endTime = new Date(sub.at || Date.now()).toISOString();

        State.save();
        UI.render();
        Utils.showNotification(`Kurt ${match.court}: rozhodčí zapsal ${p1} – ${p2} (${Courts.setsSummary(match)})`);
        Courts.afterFinish(match.court);
    },

    showRefereeQR(idx) {
        const match = State.current.matches[idx];
        if (!match) return;
        const url = this.refUrl(idx);
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content modal-narrow">
                <div class="modal-header">
                    <h3>Zápis výsledku rozhodčím</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Zavřít">${Icons.svg('x')}</button>
                </div>
                <p class="modal-lead">Zápas ${idx + 1}, kurt ${match.court}: <strong>${Utils.getPlayerDisplayNamePlain(match.player1)}</strong> – <strong>${Utils.getPlayerDisplayNamePlain(match.player2)}</strong></p>
                <div class="qr-frame"><img src="${Utils.generateQRCode(url, 440)}" alt="QR kód pro zápis výsledku" width="220" height="220"></div>
                <p class="modal-note">Rozhodčí naskenuje kód, zadá sety a odešle. Výsledek se tady zapíše sám a zápas se uzavře. Nepotřebuje účet ani aplikaci.</p>
                <div class="url-box">${url}</div>
                <div class="button-group">
                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${url}').then(() => Utils.showNotification('Odkaz zkopírován'))">Kopírovat odkaz</button>
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Zavřít</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    },

    // ===== Stránka rozhodčího =====

    initReferee(sessionId, idx) {
        document.body.classList.add('ref-mode');
        const content = document.getElementById('app-content');
        content.innerHTML = `<div class="ref-card"><p class="ref-muted">Načítám zápas…</p></div>`;
        if (!db) {
            content.innerHTML = `<div class="ref-card"><h2>Bez připojení</h2><p class="ref-muted">Nepodařilo se připojit k databázi. Zkontrolujte internet a obnovte stránku.</p></div>`;
            return;
        }
        db.ref(`sessions/${sessionId}`).once('value').then(snap => {
            const data = snap.val();
            const match = data && data.matches ? data.matches[idx] : null;
            if (!match) {
                content.innerHTML = `<div class="ref-card"><h2>Zápas nenalezen</h2><p class="ref-muted">Organizátor možná ukončil živé sdílení nebo přegeneroval zápasy. Požádejte ho o nový QR kód.</p></div>`;
                return;
            }
            this.refData = { sessionId, idx, match, data };
            document.title = `Zápis: zápas ${idx + 1}`;
            content.innerHTML = this.renderRefereeForm();
        }).catch(err => {
            content.innerHTML = `<div class="ref-card"><h2>Chyba načtení</h2><p class="ref-muted">${err.code || err.message}</p></div>`;
        });
    },

    renderRefereeForm() {
        const { idx, match, data } = this.refData;
        const p1 = Utils.getPlayerDisplayNamePlain(match.player1);
        const p2 = Utils.getPlayerDisplayNamePlain(match.player2);
        // Firebase prázdné sety neukládá, počet proto bereme z nastavení
        const count = Math.max((match.sets || []).length, data.bestOf || 1);
        const sets = Array.from({ length: count }, (_, i) => (match.sets || [])[i] || {});
        this.refData.count = count;
        const max = data.tieBreakPoints || 30;
        const done = match.completed;

        return `
            <div class="ref-card">
                <div class="ref-meta">${data.tournamentName || 'Turnaj'}<br>Zápas ${idx + 1}, kurt ${match.court}${match.group ? `, skupina ${match.group}` : ''}</div>
                <div class="ref-players">
                    <div class="ref-player">${p1}</div>
                    <div class="ref-player">${p2}</div>
                </div>
                ${done ? `<p class="ref-muted">Tento zápas už má zapsaný výsledek: ${Courts.setsSummary(match)}</p>` : ''}
                <form class="ref-sets" onsubmit="event.preventDefault(); Remote.submitReferee();">
                    ${sets.map((s, i) => `
                        <div class="ref-set">
                            <span class="ref-set-label">Set ${i + 1}</span>
                            <input type="number" inputmode="numeric" min="0" max="${max}" id="ref-${i}-1" value="${s.score1 ?? ''}" aria-label="Set ${i + 1}, ${p1}">
                            <span class="ref-colon">:</span>
                            <input type="number" inputmode="numeric" min="0" max="${max}" id="ref-${i}-2" value="${s.score2 ?? ''}" aria-label="Set ${i + 1}, ${p2}">
                        </div>`).join('')}
                    <button type="submit" class="btn btn-primary btn-block" id="ref-submit">Odeslat výsledek</button>
                </form>
            </div>`;
    },

    submitReferee() {
        const { sessionId, idx, match, count } = this.refData;
        const sets = Array.from({ length: count }, (_, i) => {
            const a = document.getElementById(`ref-${i}-1`).value;
            const b = document.getElementById(`ref-${i}-2`).value;
            return { score1: a === '' ? null : parseInt(a, 10), score2: b === '' ? null : parseInt(b, 10) };
        });
        const filled = sets.filter(s => s.score1 !== null && s.score2 !== null);
        if (filled.length === 0) {
            Utils.showNotification('Vyplňte skóre alespoň jednoho setu', 'error');
            return;
        }
        if (sets.some(s => (s.score1 === null) !== (s.score2 === null))) {
            Utils.showNotification('U každého setu vyplňte obě čísla', 'error');
            return;
        }
        const btn = document.getElementById('ref-submit');
        btn.disabled = true;
        btn.textContent = 'Odesílám…';

        db.ref(`sessions/${sessionId}/submissions/${idx}`).set({
            sets,
            p1: Utils.getPlayerDisplayNamePlain(match.player1),
            p2: Utils.getPlayerDisplayNamePlain(match.player2),
            at: Date.now()
        }).then(() => {
            document.getElementById('app-content').innerHTML = `
                <div class="ref-card ref-done">
                    <h2>Výsledek odeslán</h2>
                    <p class="ref-big">${filled.map(s => `<span>${s.score1}:${s.score2}</span>`).join('')}</p>
                    <p class="ref-muted">Organizátor ho uvidí v turnaji. Pokud je potřeba opravit, naskenujte kód znovu.</p>
                    <a class="btn btn-outline btn-block" href="${window.location.pathname}#live=${sessionId}">Sledovat turnaj živě</a>
                </div>`;
        }).catch(err => {
            btn.disabled = false;
            btn.textContent = 'Odeslat výsledek';
            Utils.showNotification(`Odeslání se nepovedlo (${err.code || err.message}). Zkuste to znovu.`, 'error');
        });
    }
};
