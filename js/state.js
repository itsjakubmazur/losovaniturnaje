// state.js - Správa stavu aplikace

const State = {
    current: {
        step: 'setup',
        tournamentName: '',
        tournamentDate: new Date().toISOString().split('T')[0],
        participants: [],
        system: 'roundrobin',
        numGroups: 2,
        numCourts: 1,
        matchDuration: 25,
        breakTime: 5,
        pointsForWin: 2,
        pointsForDraw: 1,
        bestOf: 3,
        pointsPerSet: 21,
        tieBreakPoints: 30,
        matches: [],
        groups: [],
        rounds: [],
        standings: [],
        notes: {},
        matchTimers: {},
        currentRound: 0,
        swissRound: 0,
        playoffBracket: null,
        history: []
    },

    editingParticipantIndex: -1,

    load() {
        const saved = localStorage.getItem('tournamentData');
        if (saved) {
            try {
                this.current = { ...this.current, ...JSON.parse(saved) };
            } catch(e) {
                console.error('Error loading data:', e);
            }
        }
        
        // Load dark mode
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
        
        // Load theme
        const theme = localStorage.getItem('theme');
        if (theme) {
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(theme);
        }

        // Load history
        const hist = localStorage.getItem('tournamentHistory');
        if (hist) {
            this.current.history = JSON.parse(hist);
        }
    },

    save() {
        localStorage.setItem('tournamentData', JSON.stringify(this.current));
    },

    reset() {
        if (confirm('Opravdu chcete smazat všechna data turnaje?')) {
            this.current = {
                step: 'setup',
                tournamentName: '',
                tournamentDate: new Date().toISOString().split('T')[0],
                participants: [],
                system: 'roundrobin',
                numGroups: 2,
                numCourts: 1,
                matchDuration: 25,
                breakTime: 5,
                pointsForWin: 2,
                pointsForDraw: 1,
                bestOf: 3,
                pointsPerSet: 21,
                tieBreakPoints: 30,
                matches: [],
                groups: [],
                rounds: [],
                standings: [],
                notes: {},
                matchTimers: {},
                currentRound: 0,
                swissRound: 0,
                playoffBracket: null,
                history: this.current.history
            };
            localStorage.removeItem('tournamentData');
            return true;
        }
        return false;
    },

    saveToHistory() {
        const tournament = {
            id: Date.now(),
            name: this.current.tournamentName,
            date: this.current.tournamentDate,
            system: this.current.system,
            participants: this.current.participants.length,
            matches: this.current.matches.length,
            winner: this.current.standings[0]?.player,
            standings: this.current.standings,
            completedAt: new Date().toISOString(),
            fullData: { ...this.current } // Store complete state
        };
        
        this.current.history.unshift(tournament);
        // Keep only last 50 tournaments
        if (this.current.history.length > 50) {
            this.current.history = this.current.history.slice(0, 50);
        }
        localStorage.setItem('tournamentHistory', JSON.stringify(this.current.history));
        
        return tournament;
    },

    loadFromHistory(id) {
        const tournament = this.current.history.find(t => t.id === id);
        if (!tournament || !tournament.fullData) {
            Utils.showNotification('Turnaj nelze načíst - chybí data', 'error');
            return;
        }

        // Restore full tournament data
        this.current = { ...this.current, ...tournament.fullData };
        this.current.step = 'results'; // Go directly to results
        this.save();

        Utils.showNotification(`Turnaj "${tournament.name}" načten`);
        return true;
    },

    // Backup - Export all data
    exportBackup() {
        const backup = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            tournamentData: this.current,
            history: this.current.history,
            darkMode: localStorage.getItem('darkMode'),
            theme: localStorage.getItem('theme'),
            language: localStorage.getItem('language')
        };

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `losovaci-web-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        Utils.showNotification('Záloha exportována');
    },

    // Backup - Import all data
    importBackup(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);

                // Validate backup
                if (!backup.version || !backup.tournamentData) {
                    Utils.showNotification('Neplatný formát zálohy', 'error');
                    return;
                }

                // Restore data
                if (backup.tournamentData) {
                    this.current = { ...this.current, ...backup.tournamentData };
                    this.save();
                }

                if (backup.history) {
                    this.current.history = backup.history;
                    localStorage.setItem('tournamentHistory', JSON.stringify(backup.history));
                }

                if (backup.darkMode) {
                    localStorage.setItem('darkMode', backup.darkMode);
                    if (backup.darkMode === 'true') {
                        document.body.classList.add('dark-mode');
                    }
                }

                if (backup.theme) {
                    localStorage.setItem('theme', backup.theme);
                    document.body.className = document.body.className.replace(/theme-\w+/g, '');
                    document.body.classList.add(backup.theme);
                }

                if (backup.language && typeof i18n !== 'undefined') {
                    i18n.setLanguage(backup.language);
                }

                UI.render();
                Utils.showNotification('Záloha úspěšně obnovena');
            } catch (err) {
                console.error('Import error:', err);
                Utils.showNotification('Chyba při načítání zálohy', 'error');
            }
        };
        reader.readAsText(file);
    },

    // Show backup menu
    showBackupMenu() {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>☁️ Záloha dat</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div style="margin: 20px 0;">
                    <p style="color: var(--text-muted); margin-bottom: 20px;">
                        Zálohujte všechna data včetně historie turnajů, nastavení a preferencí.
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <button class="btn btn-primary" onclick="State.exportBackup(); this.closest('.modal').remove()">
                            ⬇️ Exportovat zálohu
                        </button>
                        <label class="btn btn-secondary" style="text-align: center; cursor: pointer; margin: 0;">
                            ⬆️ Importovat zálohu
                            <input type="file" accept=".json"
                                   onchange="State.importBackup(this.files[0]); this.closest('.modal').remove();"
                                   style="display: none;">
                        </label>
                    </div>
                    <div style="margin-top: 20px; padding: 15px; background: var(--bg); border-radius: 8px;">
                        <strong>💡 Tip:</strong>
                        <p style="margin: 5px 0 0; font-size: 0.9em; color: var(--text-muted);">
                            Pravidelně zálohujte svá data. Zálohu můžete uložit na Google Drive, Dropbox nebo jiné cloudové úložiště.
                        </p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};
