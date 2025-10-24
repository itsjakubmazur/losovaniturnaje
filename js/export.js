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
                player1: Utils.getPlayerDisplayName(m.player1),
                player2: Utils.getPlayerDisplayName(m.player2),
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
        // Create a print-friendly view
        const printWindow = window.open('', '_blank');
        const doc = printWindow.document;

        const styles = `
            <style>
                @page { margin: 2cm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
                .header h1 { color: #3b82f6; font-size: 2em; margin-bottom: 10px; }
                .info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
                .info-label { font-size: 0.875em; color: #64748b; }
                .info-value { font-size: 1.3em; font-weight: bold; color: #3b82f6; }
                h2 { color: #3b82f6; margin: 30px 0 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background: #3b82f6; color: white; padding: 12px; text-align: left; font-weight: 600; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
                tr:nth-child(even) { background: #f8fafc; }
                .position-1 { color: #f59e0b; font-weight: bold; font-size: 1.2em; }
                .position-2 { color: #64748b; font-weight: bold; }
                .position-3 { color: #cd7f32; font-weight: bold; }
                .match-result { display: flex; justify-content: space-between; padding: 10px; border-left: 4px solid #10b981; background: #f0fdf4; margin-bottom: 8px; border-radius: 4px; }
                .match-result.pending { border-left-color: #f59e0b; background: #fffbeb; }
                .winner { font-weight: bold; color: #10b981; }
                .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 0.9em; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            </style>
        `;

        const tournament = State.current;
        const info = `
            <div class="header">
                <h1>🏸 ${tournament.tournamentName || 'Turnaj'}</h1>
                <p>${Utils.formatDate(tournament.tournamentDate)}</p>
            </div>

            <div class="info">
                <div class="info-box">
                    <div class="info-label">Systém</div>
                    <div class="info-value">${Utils.getSystemName()}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Účastníci</div>
                    <div class="info-value">${tournament.participants.length}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Zápasy</div>
                    <div class="info-value">${tournament.matches.length}</div>
                </div>
            </div>
        `;

        // Standings table
        let standingsHTML = '<h2>📊 Konečné pořadí</h2><table><thead><tr><th>#</th><th>Jméno</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Sety</th><th>Body v setech</th><th>Body</th></tr></thead><tbody>';
        tournament.standings.forEach((s, i) => {
            const posClass = i === 0 ? 'position-1' : i === 1 ? 'position-2' : i === 2 ? 'position-3' : '';
            standingsHTML += `
                <tr>
                    <td class="${posClass}">${i + 1}</td>
                    <td>${s.player}</td>
                    <td>${s.played}</td>
                    <td>${s.wins}</td>
                    <td>${s.draws}</td>
                    <td>${s.losses}</td>
                    <td>${s.setsWon}:${s.setsLost}</td>
                    <td>${s.pointsWon}:${s.pointsLost}</td>
                    <td><strong>${s.points}</strong></td>
                </tr>
            `;
        });
        standingsHTML += '</tbody></table>';

        // Matches
        let matchesHTML = '<h2>🏸 Všechny zápasy</h2>';
        tournament.matches.forEach((m, i) => {
            const winner = m.winner;
            const p1Class = winner === 1 ? 'winner' : '';
            const p2Class = winner === 2 ? 'winner' : '';
            const status = m.completed ? '' : ' pending';

            matchesHTML += `
                <div class="match-result${status}">
                    <span class="${p1Class}">${Utils.getPlayerDisplayName(m.player1)}</span>
                    <strong>${m.sets ? m.sets.map(s => `${s.score1 || 0}:${s.score2 || 0}`).join(' ') : '-'}</strong>
                    <span class="${p2Class}">${Utils.getPlayerDisplayName(m.player2)}</span>
                </div>
            `;
        });

        const footer = `
            <div class="footer">
                <p>Generováno aplikací Losovací web • ${new Date().toLocaleDateString('cs-CZ')} ${new Date().toLocaleTimeString('cs-CZ')}</p>
            </div>
        `;

        doc.write(`
            <!DOCTYPE html>
            <html lang="cs">
            <head>
                <meta charset="UTF-8">
                <title>${tournament.tournamentName} - Export PDF</title>
                ${styles}
            </head>
            <body>
                ${info}
                ${standingsHTML}
                ${matchesHTML}
                ${footer}
                <script>
                    window.onload = function() {
                        window.print();
                        // Close after printing (optional)
                        setTimeout(() => window.close(), 100);
                    };
                </script>
            </body>
            </html>
        `);
        doc.close();

        Utils.showNotification('PDF se generuje...');
    },

    menu() {
        const modal = document.getElementById('export-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📤 Export dat</h3>
                    <button class="modal-close" onclick="UI.closeModal('export-modal')">×</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px;">
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
            </div>
        `;
        modal.classList.add('show');
    }
};
