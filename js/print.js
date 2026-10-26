// print.js - Tiskoviny: zápasové lístky s QR, čísla kurtů, rozpis zápasů

const Print = {
    menu() {
        const hasMatches = State.current.matches.length > 0;
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content modal-narrow">
                <div class="modal-header">
                    <h3>Tisk</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Zavřít">×</button>
                </div>
                <div class="menu-list">
                    <button class="menu-item" ${hasMatches ? '' : 'disabled'} onclick="Print.scoreSheets(); this.closest('.modal').remove();">
                        <strong>Zápasové lístky</strong>
                        <span>Lístek na každý nedohraný zápas: hráči, kolonky na sety a QR kód, přes který rozhodčí zapíše výsledek z mobilu. Zapne živé sdílení turnaje.</span>
                    </button>
                    <button class="menu-item" ${hasMatches ? '' : 'disabled'} onclick="Print.schedule(); this.closest('.modal').remove();">
                        <strong>Rozpis zápasů</strong>
                        <span>Všechny zápasy po kolech s kurtem a výsledkem, na nástěnku.</span>
                    </button>
                    <button class="menu-item" onclick="Print.courtSigns(); this.closest('.modal').remove();">
                        <strong>Čísla kurtů</strong>
                        <span>Velké číslo kurtu na A4, jedna stránka na kurt.</span>
                    </button>
                    <button class="menu-item" onclick="window.print(); this.closest('.modal').remove();">
                        <strong>Aktuální stránka</strong>
                        <span>Vytiskne obrazovku tak, jak ji vidíte.</span>
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    },

    open(title, body, extraCss = '') {
        const w = window.open('', '_blank');
        if (!w) {
            Utils.showNotification('Prohlížeč zablokoval nové okno. Povolte vyskakovací okna pro tento web.', 'error');
            return;
        }
        w.document.write(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Archivo', system-ui, sans-serif; color: #16211c; font-variant-numeric: tabular-nums; }
                h1 { font-stretch: 118%; font-weight: 800; letter-spacing: -0.01em; }
                .muted { color: #5c6b64; }
                @page { margin: 12mm; }
                ${extraCss}
            </style></head><body>${body}
            <script>
                const imgs = [...document.images];
                Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })))
                    .then(() => document.fonts.ready).then(() => setTimeout(() => window.print(), 200));
            <\/script></body></html>`);
        w.document.close();
    },

    matchLabel(m) {
        if (m.group) return `Skupina ${m.group}`;
        if (m.roundName) return m.roundName;
        return `Kolo ${(m.round || 0) + 1}`;
    },

    scoreSheets() {
        const pending = State.current.matches
            .map((m, idx) => ({ m, idx }))
            .filter(({ m }) => !m.completed);
        if (pending.length === 0) {
            Utils.showNotification('Všechny zápasy jsou dohrané, není co tisknout', 'error');
            return;
        }
        const withQR = !!db;
        const name = State.current.tournamentName || 'Turnaj';
        const unit = Utils.scoreUnitLabel().toLowerCase();
        const bestOf = State.current.bestOf || 3;

        const sheets = pending.map(({ m, idx }) => {
            const url = withQR ? Remote.refUrl(idx) : '';
            return `
                <article class="sheet">
                    <header>
                        <div>
                            <div class="t">${name}</div>
                            <div class="muted">${this.matchLabel(m)}</div>
                        </div>
                        <div class="no">Zápas ${idx + 1}</div>
                    </header>
                    <table>
                        <thead><tr><th class="p">Hráč</th>${Array.from({ length: bestOf }, (_, i) => `<th>Set ${i + 1}</th>`).join('')}</tr></thead>
                        <tbody>
                            <tr><td class="p">${Utils.getPlayerDisplayNamePlain(m.player1)}</td>${'<td></td>'.repeat(bestOf)}</tr>
                            <tr><td class="p">${Utils.getPlayerDisplayNamePlain(m.player2)}</td>${'<td></td>'.repeat(bestOf)}</tr>
                        </tbody>
                    </table>
                    <footer>
                        <div class="sign">
                            <div>Kurt: ________</div>
                            <div>Podpis vítěze: ____________________</div>
                            <div class="muted small">Do kolonek pište ${unit} v setu.</div>
                        </div>
                        ${withQR ? `<div class="qr"><img src="${Utils.generateQRCode(url, 300)}" alt=""><span>Zapsat výsledek z mobilu</span></div>` : ''}
                    </footer>
                </article>`;
        }).join('');

        this.open(`Zápasové lístky – ${name}`, sheets, `
            body { display: grid; grid-template-columns: 1fr; gap: 6mm; }
            .sheet { border: 1.5px solid #16211c; border-radius: 3mm; padding: 5mm 6mm; break-inside: avoid; height: 88mm; display: flex; flex-direction: column; gap: 3mm; }
            header { display: flex; justify-content: space-between; align-items: flex-start; }
            .t { font-weight: 700; font-size: 11pt; }
            .no { font-stretch: 120%; font-weight: 800; font-size: 18pt; }
            table { width: 100%; border-collapse: collapse; }
            th { font-size: 8.5pt; font-weight: 600; text-align: center; padding: 1mm; color: #5c6b64; }
            th.p, td.p { text-align: left; }
            td { border: 1px solid #16211c; height: 11mm; width: 18mm; }
            td.p { width: auto; padding: 0 3mm; font-weight: 700; font-size: 12pt; }
            footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; font-size: 9.5pt; }
            .sign { display: grid; gap: 2.5mm; }
            .small { font-size: 8pt; }
            .qr { display: flex; flex-direction: column; align-items: center; gap: 1mm; font-size: 7.5pt; color: #5c6b64; }
            .qr img { width: 24mm; height: 24mm; }
        `);
    },

    schedule() {
        const name = State.current.tournamentName || 'Turnaj';
        const rounds = {};
        State.current.matches.forEach((m, idx) => {
            const key = m.roundName || `Kolo ${(m.round || 0) + 1}`;
            (rounds[key] = rounds[key] || []).push({ m, idx });
        });
        const body = `
            <h1>${name}</h1>
            <p class="muted sub">${Utils.formatDate(State.current.tournamentDate)}, ${Utils.getSystemName()}</p>
            ${Object.entries(rounds).map(([r, list]) => `
                <section>
                    <h2>${r}</h2>
                    <table>
                        ${list.map(({ m, idx }) => `
                            <tr>
                                <td class="n">${idx + 1}</td>
                                <td class="c">${m.group ? `Sk. ${m.group}` : ''}</td>
                                <td class="c">K${m.court}</td>
                                <td>${Utils.getPlayerDisplayNamePlain(m.player1)}</td>
                                <td>${Utils.getPlayerDisplayNamePlain(m.player2)}</td>
                                <td class="r">${m.completed ? Courts.setsSummary(m) : ''}</td>
                            </tr>`).join('')}
                    </table>
                </section>`).join('')}`;
        this.open(`Rozpis – ${name}`, body, `
            h1 { font-size: 20pt; }
            .sub { margin: 1mm 0 6mm; }
            h2 { font-size: 11pt; font-stretch: 112%; margin: 5mm 0 1.5mm; }
            section { break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; font-size: 10pt; }
            td { padding: 1.6mm 2mm; border-bottom: 0.5pt solid #c9d1cb; }
            td.n { width: 9mm; color: #5c6b64; }
            td.c { width: 14mm; color: #5c6b64; }
            td.r { text-align: right; font-weight: 700; white-space: nowrap; }
        `);
    },

    courtSigns() {
        const n = State.current.numCourts || 1;
        const name = State.current.tournamentName || '';
        const body = Array.from({ length: n }, (_, i) => `
            <section class="sign"><div class="lbl">Kurt</div><div class="num">${i + 1}</div><div class="muted">${name}</div></section>`).join('');
        this.open('Čísla kurtů', body, `
            @page { size: A4 landscape; margin: 0; }
            .sign { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; break-after: page; }
            .lbl { font-size: 48pt; font-stretch: 125%; font-weight: 700; }
            .num { font-size: 340pt; line-height: 0.85; font-weight: 800; font-stretch: 125%; color: #1e5a46; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `);
    }
};
