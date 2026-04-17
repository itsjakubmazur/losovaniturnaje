// state.js - Správa stavu aplikace

const State = {
    current: {
        step: 'setup',
        tournamentName: '',
        tournamentDate: new Date().toISOString().split('T')[0],
        participants: [],
        system: 'roundrobin',
        disciplineType: 'singles', // 'singles' or 'doubles' or 'mixed'
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
        playoffType: 'cross',
        thirdPlaceMatch: false,
        history: []
    },

    editingParticipantIndex: -1,
    isShared: false, // Tournament loaded from shared URL
    readOnly: false, // Read-only mode for shared tournaments
    liveSessionId: null, // Active Firebase live session ID

    // Undo/Redo functionality
    undoStack: [],
    redoStack: [],
    maxUndoSteps: 50,

    load() {
        // Check for live Firebase session (spectator)
        const hash = window.location.hash;
        if (hash && hash.startsWith('#live=')) {
            const sessionId = hash.slice(6).split('&')[0];
            this.isShared = true;
            this.readOnly = true;

            if (db) {
                let firstLoad = true;
                db.ref(`sessions/${sessionId}`).on(
                    'value',
                    (snapshot) => {
                        const data = snapshot.val();
                        if (data) {
                            this.current = { ...this.current, ...data };
                            if (typeof UI !== 'undefined') {
                                UI.render();
                                if (firstLoad) {
                                    firstLoad = false;
                                    Utils.showNotification(`📡 Připojeno: ${this.current.tournamentName || 'Turnaj'}`);
                                }
                            }
                        }
                    },
                    (error) => {
                        console.error('Firebase read error:', error);
                        if (typeof UI !== 'undefined') {
                            Utils.showNotification(`Chyba Firebase (${error.code}) – zkontrolujte pravidla databáze`, 'error');
                        }
                    }
                );
            }

            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark-mode');
            }
            const theme = localStorage.getItem('theme');
            if (theme) {
                document.body.className = document.body.className.replace(/theme-\w+/g, '');
                document.body.classList.add(theme);
            }
            return;
        }

        // First check if there's shared tournament data in URL hash
        const sharedData = Utils.decodeTournamentFromURL();
        if (sharedData) {
            this.current = { ...this.current, ...sharedData };
            this.isShared = true;
            this.readOnly = true;

            // Show notification
            setTimeout(() => {
                Utils.showNotification(`📱 Zobrazuji sdílený turnaj: ${this.current.tournamentName}`);
            }, 500);
        } else {
            // Load from localStorage as usual
            const saved = localStorage.getItem('tournamentData');
            if (saved) {
                try {
                    this.current = { ...this.current, ...JSON.parse(saved) };
                } catch(e) {
                    console.error('Error loading data:', e);
                }
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

        // Load history (only if not shared)
        if (!this.isShared) {
            const hist = localStorage.getItem('tournamentHistory');
            if (hist) {
                this.current.history = JSON.parse(hist);
            }
        }

        // Restore live session ID for organizer
        const savedSessionId = localStorage.getItem('liveSessionId');
        if (savedSessionId) {
            this.liveSessionId = savedSessionId;
        }

        // Sync history from Firebase cloud backup
        if (db) {
            db.ref(`history/${this.getDeviceId()}`).once('value').then(snapshot => {
                const cloudHistory = snapshot.val();
                if (cloudHistory && Array.isArray(cloudHistory) && cloudHistory.length > (this.current.history || []).length) {
                    this.current.history = cloudHistory;
                    localStorage.setItem('tournamentHistory', JSON.stringify(cloudHistory));
                }
            }).catch(console.error);
        }
    },

    save(skipUndo = false) {
        // Save to undo stack before saving (unless explicitly skipped)
        if (!skipUndo && !this.readOnly) {
            this.pushToUndoStack();
        }

        localStorage.setItem('tournamentData', JSON.stringify(this.current));

        // Sync to live Firebase session
        if (this.liveSessionId && !this.readOnly && db) {
            const { history: _h, ...dataToSync } = this.current;
            db.ref(`sessions/${this.liveSessionId}`).set(dataToSync).catch(err => {
                console.error('Firebase sync failed:', err);
            });
        }
    },

    // Push current state to undo stack
    pushToUndoStack() {
        // Deep clone current state
        const snapshot = JSON.parse(JSON.stringify(this.current));

        this.undoStack.push(snapshot);

        // Limit stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }

        // Clear redo stack when new change is made
        this.redoStack = [];
    },

    // Undo last change
    undo() {
        if (this.undoStack.length === 0) {
            Utils.showNotification('Není co vrátit zpět', 'error');
            return false;
        }

        // Save current state to redo stack
        const currentSnapshot = JSON.parse(JSON.stringify(this.current));
        this.redoStack.push(currentSnapshot);

        // Restore previous state
        const previousState = this.undoStack.pop();
        this.current = previousState;

        // Save without adding to undo stack
        localStorage.setItem('tournamentData', JSON.stringify(this.current));

        Utils.showNotification('Změna vrácena zpět');
        return true;
    },

    // Redo last undone change
    redo() {
        if (this.redoStack.length === 0) {
            Utils.showNotification('Není co opakovat', 'error');
            return false;
        }

        // Save current state to undo stack
        const currentSnapshot = JSON.parse(JSON.stringify(this.current));
        this.undoStack.push(currentSnapshot);

        // Restore next state
        const nextState = this.redoStack.pop();
        this.current = nextState;

        // Save without adding to undo stack
        localStorage.setItem('tournamentData', JSON.stringify(this.current));

        Utils.showNotification('Změna opakována');
        return true;
    },

    // Clear undo/redo stacks
    clearUndoRedo() {
        this.undoStack = [];
        this.redoStack = [];
    },

    reset() {
        if (confirm('Opravdu chcete smazat všechna data turnaje?')) {
            this.current = {
                step: 'setup',
                tournamentName: '',
                tournamentDate: new Date().toISOString().split('T')[0],
                participants: [],
                system: 'roundrobin',
                disciplineType: 'singles',
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
                playoffType: 'cross',
                thirdPlaceMatch: false,
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

        if (db && !this.readOnly) {
            db.ref(`history/${this.getDeviceId()}`).set(this.current.history).catch(console.error);
        }

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

    getDeviceId() {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = Math.random().toString(36).substr(2, 16);
            localStorage.setItem('deviceId', id);
        }
        return id;
    },

    startLiveSession() {
        if (!this.liveSessionId) {
            this.liveSessionId = Math.random().toString(36).substr(2, 8);
            localStorage.setItem('liveSessionId', this.liveSessionId);
        }
        if (db) {
            const { history: _h, ...dataToSync } = this.current;
            db.ref(`sessions/${this.liveSessionId}`).set(dataToSync).catch(err => {
                console.error('Firebase write failed:', err);
                Utils.showNotification('Chyba Firebase – zkontrolujte pravidla databáze', 'error');
            });
        } else {
            Utils.showNotification('Firebase není dostupný', 'error');
        }
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}#live=${this.liveSessionId}`;
    },

    stopLiveSession() {
        if (this.liveSessionId) {
            if (db) {
                db.ref(`sessions/${this.liveSessionId}`).remove().catch(console.error);
            }
            this.liveSessionId = null;
            localStorage.removeItem('liveSessionId');
            Utils.showNotification('Živé sdílení ukončeno');
        }
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
