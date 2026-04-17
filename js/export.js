// export.js - Export funkcí

const Export = {
    toJSON() {
        const data = {
            tournament: State.current.tournamentName,
            date: State.current.tournamentDate,
            system: Utils.getSystemName(),
            participants: State.current.participants.length,
            courts: State.current.numCourts,
            rounds: State.current.rounds.length,
            standings: State.current.standings,
            matches: State.current.matches.map((m, i) => ({
                match: i + 1,
                round: m.round + 1,
                court: m.court,
                player1: Utils.getPlayerDisplayNamePlain(m.player1),
                player2: Utils.getPlayerDisplayNamePlain(m.player2),
                sets: m.sets,
                completed: m.completed,
                notes: State.current.notes[i] || ''
            }))
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnaj-${Date.now()}.json`;
        a.click();
        Utils.showNotification('JSON exportován');
    },

    toCSV() {
        let csv = 'Pořadí,Jméno,Zápasy,Výhry,Remízy,Prohry,Sety,Body v setech,Body\n';
        
        State.current.standings.forEach((s, i) => {
            csv += `${i + 1},${s.player},${s.played},${s.wins},${s.draws},${s.losses},${s.setsWon}:${s.setsLost},${s.pointsWon}:${s.pointsLost},${s.points}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnaj-${Date.now()}.csv`;
        a.click();
        Utils.showNotification('CSV exportován');
    },

    toPDF() {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Utils.showNotification('Nepodařilo se otevřít okno. Povolte vyskakovací okna.', 'error');
            return;
        }
        const doc = printWindow.document;
        const t = State.current;

        const disciplineLabel = { singles: 'Dvouhra', doubles: 'Čtyřhra', mixed: 'Smíšené' }[t.disciplineType] || '';
        const completedCount = t.matches.filter(m => m.completed).length;
        const totalSets = Utils.calculateTotalSets();
        const totalPoints = Utils.calculateTotalPoints();

        function esc(str) {
            return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function setScoresStr(m) {
            if (!m.sets) return '-';
            const played = m.sets.filter(s => s.score1 !== null && s.score2 !== null);
            return played.length ? played.map(s => `${s.score1}:${s.score2}`).join(', ') : '-';
        }

        function matchWinner(m) {
            if (!m.completed || !m.sets) return '';
            const p1Sets = m.sets.filter(s => s.score1 > s.score2).length;
            const p2Sets = m.sets.filter(s => s.score2 > s.score1).length;
            if (p1Sets > p2Sets) return Utils.getPlayerDisplayNamePlain(m.player1);
            if (p2Sets > p1Sets) return Utils.getPlayerDisplayNamePlain(m.player2);
            return 'Remíza';
        }

        function standingsTable(standings, title, sectionBreak) {
            if (!standings || !standings.length) return '';
            const posIcons = ['🥇', '🥈', '🥉'];
            return `
                <h2${sectionBreak ? ' class="pb"' : ''}>${esc(title)}</h2>
                <table>
                    <thead><tr><th>#</th><th>Jméno</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Sety</th><th>Body v setech</th><th>Body</th></tr></thead>
                    <tbody>
                    ${standings.map((s, i) => `
                        <tr class="${i < 3 ? 'pos-' + (i + 1) : ''}">
                            <td>${posIcons[i] || (i + 1) + '.'}</td>
                            <td>${esc(Utils.getPlayerDisplayNamePlain(s.playerRef || s.player))}</td>
                            <td>${s.played}</td>
                            <td>${s.wins}</td>
                            <td>${s.draws}</td>
                            <td>${s.losses}</td>
                            <td>${s.setsWon}:${s.setsLost}</td>
                            <td>${s.pointsWon}:${s.pointsLost}</td>
                            <td><strong>${s.points}</strong></td>
                        </tr>`).join('')}
                    </tbody>
                </table>`;
        }

        function matchesTable(matches) {
            if (!matches || !matches.length) return '';
            return `
                <table class="mt">
                    <thead><tr><th>Kurt</th><th>Hráč 1</th><th>Výsledek</th><th>Hráč 2</th></tr></thead>
                    <tbody>
                    ${matches.map(m => {
                        const p1 = Utils.getPlayerDisplayNamePlain(m.player1);
                        const p2 = Utils.getPlayerDisplayNamePlain(m.player2);
                        const winner = matchWinner(m);
                        const p1win = winner === p1;
                        const p2win = winner === p2;
                        return `<tr class="${m.completed ? '' : 'pend'}">
                            <td>${m.court || '-'}</td>
                            <td class="${p1win ? 'win' : ''}">${p1win ? '<strong>' + esc(p1) + '</strong>' : esc(p1)}</td>
                            <td class="score">${setScoresStr(m)}</td>
                            <td class="${p2win ? 'win' : ''}">${p2win ? '<strong>' + esc(p2) + '</strong>' : esc(p2)}</td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>`;
        }

        // ── Build content sections ────────────────────────────────────────

        let content = '';

        // 1. Final / overall standings
        content += standingsTable(t.standings, '📊 Konečné pořadí', false);

        // 2. Per-group standings (groups system only)
        if (t.system === 'groups' && t.groups && t.groups.length) {
            const gs = Stats.calculateGroupStandings();
            if (gs && Object.keys(gs).length) {
                let first = true;
                Object.entries(gs).forEach(([letter, standings]) => {
                    content += standingsTable(standings, `📊 Skupina ${letter}`, first);
                    first = false;
                });
            }
        }

        // 3. Playoff bracket organized by round
        if (t.playoffBracket) {
            const totalR = t.playoffBracket.totalRounds;
            const maxR = t.playoffBracket.currentRound;
            const isKO = t.playoffBracket.isKnockout;

            content += `<h2 class="pb">🏆 ${isKO ? 'Pavouk' : 'Playoff Pavouk'}</h2>`;
            for (let r = 0; r <= maxR; r++) {
                const rMatches = t.matches.filter(m =>
                    m.knockoutRound === r &&
                    (m.isPlayoff === true || isKO === true)
                );
                if (rMatches.length) {
                    content += `<h3>${esc(Playoff.getRoundName(r, totalR))}</h3>`;
                    content += matchesTable(rMatches);
                }
            }
        }

        // 4. All matches organized by rounds / groups
        content += '<h2 class="pb">🏸 Výsledky zápasů</h2>';

        if (t.system === 'groups') {
            // Group phase: by group letter, then round
            const groupLetters = [...new Set(
                t.matches.filter(m => !m.isPlayoff && m.group).map(m => m.group)
            )].sort();
            groupLetters.forEach(gl => {
                content += `<h3>Skupina ${esc(gl)}</h3>`;
                const gMatches = t.matches.filter(m => m.group === gl && !m.isPlayoff);
                const rounds = [...new Set(gMatches.map(m => m.round))].sort((a, b) => a - b);
                rounds.forEach(r => {
                    content += `<h4>Kolo ${r + 1}</h4>`;
                    content += matchesTable(gMatches.filter(m => m.round === r));
                });
            });
            // Playoff phase
            const playoffMs = t.matches.filter(m => m.isPlayoff);
            if (playoffMs.length) {
                content += '<h3>Playoff</h3>';
                const kRounds = [...new Set(playoffMs.map(m => m.knockoutRound))].sort((a, b) => a - b);
                kRounds.forEach(kr => {
                    const krMs = playoffMs.filter(m => m.knockoutRound === kr);
                    content += `<h4>${esc(krMs[0]?.roundName || 'Kolo ' + (kr + 1))}</h4>`;
                    content += matchesTable(krMs);
                });
            }
        } else if (t.system === 'knockout') {
            const kRounds = [...new Set(t.matches.map(m => m.knockoutRound))].sort((a, b) => a - b);
            const totalR = t.playoffBracket ? t.playoffBracket.totalRounds : kRounds.length;
            kRounds.forEach(kr => {
                const krMs = t.matches.filter(m => m.knockoutRound === kr);
                content += `<h3>${esc(Playoff.getRoundName(kr, totalR))}</h3>`;
                content += matchesTable(krMs);
            });
        } else {
            // Round-robin or Swiss: by round number
            const rounds = [...new Set(t.matches.map(m => m.round))].sort((a, b) => a - b);
            rounds.forEach(r => {
                content += `<h3>Kolo ${r + 1}</h3>`;
                content += matchesTable(t.matches.filter(m => m.round === r));
            });
        }

        // ── Write document ────────────────────────────────────────────────

        doc.write(`<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<title>${esc(t.tournamentName || 'Turnaj')} – Výsledky</title>
<style>
@page { margin: 2cm; size: A4; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.5; }

.hdr { text-align: center; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 3px solid #1e40af; }
.hdr h1 { color: #1e40af; font-size: 20px; margin-bottom: 4px; }
.hdr .sub { color: #64748b; font-size: 11px; }

.sum { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; }
.sb { background: #f8fafc; border: 1px solid #dbeafe; border-radius: 6px; padding: 8px; text-align: center; }
.sb .lbl { font-size: 9px; color: #64748b; margin-bottom: 2px; }
.sb .val { font-size: 14px; font-weight: 700; color: #1e40af; }

h2 { color: #1e40af; font-size: 13px; margin: 18px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #bfdbfe; }
h3 { color: #2563eb; font-size: 11px; margin: 12px 0 5px; font-weight: 700; }
h4 { color: #64748b; font-size: 10px; margin: 8px 0 3px; font-weight: 600; }

table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
th { background: #1e40af; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
tr:nth-child(even) { background: #f8fafc; }

.pos-1 td:first-child { color: #d97706; font-weight: 700; font-size: 13px; }
.pos-2 td:first-child { color: #6b7280; font-weight: 700; }
.pos-3 td:first-child { color: #92400e; font-weight: 700; }

.win { color: #047857; }
.score { font-family: monospace; font-weight: 700; text-align: center; }
.pend td { color: #9ca3af; font-style: italic; }

.mt th, .mt td { padding: 4px 7px; font-size: 10px; }

.footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9px; }

@media print {
    .pb { page-break-before: always; }
    h2, h3, h4 { page-break-after: avoid; }
    tr { page-break-inside: avoid; }
}
</style>
</head>
<body>
<div class="hdr">
    <h1>🏸 ${esc(t.tournamentName || 'Turnaj')}</h1>
    <div class="sub">${Utils.formatDate(t.tournamentDate)} &bull; ${esc(Utils.getSystemName())} &bull; ${esc(disciplineLabel)}</div>
</div>
<div class="sum">
    <div class="sb"><div class="lbl">Účastníci</div><div class="val">${t.participants.length}</div></div>
    <div class="sb"><div class="lbl">Zápasy</div><div class="val">${completedCount}/${t.matches.length}</div></div>
    <div class="sb"><div class="lbl">Kurty</div><div class="val">${t.numCourts}</div></div>
    <div class="sb"><div class="lbl">Sety</div><div class="val">${totalSets}</div></div>
    <div class="sb"><div class="lbl">Body celkem</div><div class="val">${totalPoints}</div></div>
</div>
${content}
<div class="footer">Generováno aplikací Správa turnajů &bull; ${new Date().toLocaleDateString('cs-CZ')} ${new Date().toLocaleTimeString('cs-CZ')}</div>
<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
        doc.close();

        Utils.showNotification('PDF se generuje...');
    },

    generateSocialShareText() {
        const tournament = State.current;
        const winner = tournament.standings[0];

        let text = `🏸 ${tournament.tournamentName}\n`;
        text += `📅 ${Utils.formatDate(tournament.tournamentDate)}\n\n`;
        text += `🏆 Vítěz: ${winner?.player || '-'}\n`;
        text += `👥 ${tournament.participants.length} účastníků\n`;
        text += `⚽ ${tournament.matches.length} zápasů\n\n`;

        if (tournament.standings.length >= 3) {
            text += `🥇 ${tournament.standings[0]?.player}\n`;
            text += `🥈 ${tournament.standings[1]?.player}\n`;
            text += `🥉 ${tournament.standings[2]?.player}\n`;
        }

        return text;
    },

    shareToTwitter() {
        const text = this.generateSocialShareText();
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        Utils.showNotification('Otevírám Twitter...');
    },

    shareToFacebook() {
        const text = this.generateSocialShareText();
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        Utils.showNotification('Otevírám Facebook...');
    },

    copyShareText() {
        const text = this.generateSocialShareText();
        navigator.clipboard.writeText(text).then(() => {
            Utils.showNotification('Text zkopírován do schránky!');
        }).catch(() => {
            Utils.showNotification('Chyba při kopírování', 'error');
        });
    },

    shareViaWebShare() {
        const text = this.generateSocialShareText();

        if (navigator.share) {
            navigator.share({
                title: State.current.tournamentName,
                text: text,
                url: window.location.href
            }).then(() => {
                Utils.showNotification('Turnaj sdílen!');
            }).catch((err) => {
                if (err.name !== 'AbortError') {
                    Utils.showNotification('Chyba při sdílení', 'error');
                }
            });
        } else {
            // Fallback - copy to clipboard
            this.copyShareText();
        }
    },

    menu() {
        const modal = document.getElementById('export-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📤 Export & Sdílení</h3>
                    <button class="modal-close" onclick="UI.closeModal('export-modal')">×</button>
                </div>

                <h4 style="margin-top: 20px; margin-bottom: 10px; color: var(--primary);">📊 Export dat</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn btn-danger" onclick="Export.toPDF(); UI.closeModal('export-modal')">
                        📄 Exportovat PDF
                    </button>
                    <button class="btn btn-primary" onclick="Export.toJSON(); UI.closeModal('export-modal')">
                        💾 Exportovat JSON
                    </button>
                    <button class="btn btn-secondary" onclick="Export.toCSV(); UI.closeModal('export-modal')">
                        📊 Exportovat CSV (Excel)
                    </button>
                </div>

                <h4 style="margin-top: 30px; margin-bottom: 10px; color: var(--primary);">📱 Sdílení</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${navigator.share ? `
                        <button class="btn btn-warning" onclick="Export.shareViaWebShare()">
                            📤 Sdílet
                        </button>
                    ` : ''}
                    <button class="btn btn-info" onclick="Export.shareToTwitter()">
                        🐦 Sdílet na Twitter
                    </button>
                    <button class="btn btn-info" onclick="Export.shareToFacebook()">
                        👥 Sdílet na Facebook
                    </button>
                    <button class="btn btn-outline" onclick="Export.copyShareText()">
                        📋 Zkopírovat text
                    </button>
                </div>
            </div>
        `;
        modal.classList.add('show');
    }
};
