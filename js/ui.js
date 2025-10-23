// ui.js - UI rendering a interakce

const UI = {
    render() {
        this.updateSteps();
        this.updateTitle();
        State.save();
        
        const content = document.getElementById('app-content');
        switch(State.current.step) {
            case 'setup': content.innerHTML = this.renderSetup(); break;
            case 'participants': content.innerHTML = this.renderParticipants(); break;
            case 'draw': content.innerHTML = this.renderDraw(); break;
            case 'matches': content.innerHTML = this.renderMatches(); break;
            case 'results': content.innerHTML = this.renderResults(); break;
        }
        
        this.attachEventListeners();
    },

    updateSteps() {
        const stepsHTML = `
            <div class="step ${State.current.step === 'setup' ? 'active' : State.current.participants.length > 0 ? 'completed' : ''}" data-step="setup">
                <div class="step-circle">1</div>
                <div>Nastavení</div>
            </div>
            <div class="step ${State.current.step === 'participants' ? 'active' : State.current.rounds.length > 0 ? 'completed' : ''}" data-step="participants">
                <div class="step-circle">2</div>
                <div>Účastníci</div>
            </div>
            <div class="step ${State.current.step === 'draw' ? 'active' : State.current.matches.length > 0 ? 'completed' : ''}" data-step="draw">
                <div class="step-circle">3</div>
                <div>Losování</div>
            </div>
            <div class="step ${State.current.step === 'matches' ? 'active' : Utils.allMatchesCompleted() ? 'completed' : ''}" data-step="matches">
                <div class="step-circle">4</div>
                <div>Zápasy</div>
            </div>
            <div class="step ${State.current.step === 'results' ? 'active' : ''}" data-step="results">
                <div class="step-circle">5</div>
                <div>Výsledky</div>
            </div>
        `;
        document.getElementById('steps-container').innerHTML = stepsHTML;
    },

    updateTitle() {
        document.getElementById('tournament-title').textContent = 
            State.current.tournamentName || 'Tournament Manager PRO';
        document.getElementById('tournament-subtitle').textContent = 
            State.current.tournamentName ? 
                `${State.current.participants.length} účastníků • ${State.current.numCourts} ${State.current.numCourts === 1 ? 'kurt' : 'kurty'} • ${Utils.formatDate(State.current.tournamentDate)}` : 
                'Profesionální správa turnajů';
    },

    renderSetup() {
        return `
            <div class="card">
                <h2>⚙️ Základní nastavení</h2>
                
                <div class="input-row">
                    <div class="input-group">
                        <label>Název turnaje *</label>
                        <input type="text" id="tournament-name" value="${State.current.tournamentName}" 
                               placeholder="Městský badmintonový turnaj 2025">
                    </div>
                    <div class="input-group">
                        <label>Datum konání</label>
                        <input type="date" id="tournament-date" value="${State.current.tournamentDate}">
                    </div>
                </div>

                <div class="input-group">
                    <label>Herní systém</label>
                    <div class="system-options">
                        <div class="system-option ${State.current.system === 'roundrobin' ? 'active' : ''}" data-system="roundrobin">
                            <div style="font-size:2.5em;">🔄</div>
                            <h3>Každý s každým</h3>
                            <p>Round-robin - všichni hrají proti všem</p>
                        </div>
                        <div class="system-option ${State.current.system === 'swiss' ? 'active' : ''}" data-system="swiss">
                            <div style="font-size:2.5em;">🇨🇭</div>
                            <h3>Švýcarský systém</h3>
                            <p>Postupné párování podle výsledků</p>
                        </div>
                        <div class="system-option ${State.current.system === 'groups' ? 'active' : ''}" data-system="groups">
                            <div style="font-size:2.5em;">👥</div>
                            <h3>Skupiny + Playoff</h3>
                            <p>Skupinová fáze, pak vyřazovací pavouk</p>
                        </div>
                        <div class="system-option ${State.current.system === 'knockout' ? 'active' : ''}" data-system="knockout">
                            <div style="font-size:2.5em;">🏆</div>
                            <h3>Vyřazovací</h3>
                            <p>Přímý pavouk od začátku</p>
                        </div>
                    </div>
                </div>

                ${State.current.system === 'groups' ? `
                    <div class="input-group">
                        <label>Počet skupin</label>
                        <input type="number" id="num-groups" min="2" max="8" value="${State.current.numGroups}">
                    </div>
                ` : ''}

                ${State.current.system === 'swiss' ? `
                    <div class="alert alert-info">
                        ℹ️ Ve švýcarském systému se po každém kole párují hráči s podobným počtem bodů. Obvykle se hraje 5-7 kol.
                    </div>
                ` : ''}

                <h3 style="margin-top: 30px; margin-bottom: 15px; color: var(--primary);">⚙️ Herní pravidla</h3>

                <div class="input-row">
                    <div class="input-group">
                        <label>Body za výhru</label>
                        <select id="points-win">
                            <option value="2" ${State.current.pointsForWin === 2 ? 'selected' : ''}>2 body</option>
                            <option value="3" ${State.current.pointsForWin === 3 ? 'selected' : ''}>3 body</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Body za remízu</label>
                        <select id="points-draw">
                            <option value="0" ${State.current.pointsForDraw === 0 ? 'selected' : ''}>0 bodů</option>
                            <option value="1" ${State.current.pointsForDraw === 1 ? 'selected' : ''}>1 bod</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Best of</label>
                        <select id="best-of">
                            <option value="1" ${State.current.bestOf === 1 ? 'selected' : ''}>1 set</option>
                            <option value="3" ${State.current.bestOf === 3 ? 'selected' : ''}>3 sety</option>
                            <option value="5" ${State.current.bestOf === 5 ? 'selected' : ''}>5 setů</option>
                        </select>
                    </div>
                </div>

                <div class="input-row">
                    <div class="input-group">
                        <label>Bodů na set</label>
                        <input type="number" id="points-per-set" min="11" max="30" value="${State.current.pointsPerSet}">
                        <small>Obvykle 21 bodů</small>
                    </div>
                    <div class="input-group">
                        <label>Tie-break limit</label>
                        <input type="number" id="tiebreak-points" min="21" max="50" value="${State.current.tieBreakPoints}">
                        <small>Maximum bodů v setu (obvykle 30)</small>
                    </div>
                </div>

                <h3 style="margin-top: 30px; margin-bottom: 15px; color: var(--primary);">⏱️ Časování</h3>

                <div class="input-row">
                    <div class="input-group">
                        <label>Počet kurtů</label>
                        <input type="number" id="num-courts" min="1" max="20" value="${State.current.numCourts}">
                        <small>Kolik zápasů může běžet současně</small>
                    </div>
                    <div class="input-group">
                        <label>Průměrná délka zápasu (min)</label>
                        <input type="number" id="match-duration" min="10" max="120" value="${State.current.matchDuration}">
                        <small>Pro odhad času turnaje</small>
                    </div>
                    <div class="input-group">
                        <label>Pauza mezi zápasy (min)</label>
                        <input type="number" id="break-time" min="0" max="30" value="${State.current.breakTime}">
                        <small>Čas na přípravu hráčů</small>
                    </div>
                </div>

                <div class="button-group">
                    <button class="btn btn-primary" onclick="goToParticipants()">
                        Pokračovat k účastníkům →
                    </button>
                    <button class="btn btn-danger" onclick="if(State.reset()) UI.render()">
                        🗑️ Nový turnaj
                    </button>
                </div>
            </div>
        `;
    },

    renderParticipants() {
        return `
            <div class="card">
                <h2>👥 Účastníci turnaje</h2>
                
                <div class="button-group">
                    <button class="btn btn-primary" onclick="openParticipantModal()">
                        ➕ Přidat účastníka
                    </button>
                    <button class="btn btn-outline" onclick="autoFillParticipants()">
                        🎲 Demo účastníci
                    </button>
                </div>

                ${State.current.participants.length > 0 ? `
                    <div class="participants-grid" style="margin-top: 20px;">
                        ${State.current.participants.map((p, i) => `
                            <div class="participant-card">
                                <div class="participant-avatar">${Utils.getInitials(p.name)}</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">${p.name}${p.partner ? ` & ${p.partner}` : ''}</div>
                                    <div style="font-size: 0.875em; color: var(--text-muted);">
                                        ${p.club || 'Bez klubu'} ${p.seed ? `• Nasazení: ${p.seed}` : ''}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 5px;">
                                    <button onclick="editParticipant(${i})" style="background:none;border:none;cursor:pointer;padding:5px;" title="Upravit">✏️</button>
                                    <button onclick="removeParticipant(${i})" style="background:none;border:none;cursor:pointer;padding:5px;" title="Odebrat">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 20px; padding: 15px; background: var(--bg); border-radius: 8px;">
                        <strong>Celkem: ${State.current.participants.length} účastníků</strong>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                        <div style="font-size: 4em; margin-bottom: 20px;">👥</div>
                        <p>Zatím nebyli přidáni žádní účastníci</p>
                    </div>
                `}

                <div class="button-group">
                    <button class="btn btn-primary" onclick="goToDraw()" ${State.current.participants.length < 2 ? 'disabled' : ''}>
                        Pokračovat na losování →
                    </button>
                    <button class="btn btn-outline" onclick="goToSetup()">
                        ← Zpět
                    </button>
                </div>
            </div>
        `;
    },

    renderDraw() {
        return `
            <div class="card">
                <h2>🎲 Losování</h2>
                
                <div class="alert alert-info">
                    <strong>Systém:</strong> ${Utils.getSystemName()} • 
                    <strong>Účastníků:</strong> ${State.current.participants.length} • 
                    <strong>Kurtů:</strong> ${State.current.numCourts}
                </div>

                ${State.current.groups.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0;">
                        ${State.current.groups.map((group, i) => `
                            <div style="background: var(--bg); padding: 20px; border-radius: 12px; border-top: 4px solid var(--primary);">
                                <h3 style="color: var(--primary); margin-bottom: 15px;">Skupina ${String.fromCharCode(65 + i)}</h3>
                                ${group.map(p => `
                                    <div style="padding: 8px; margin: 5px 0; background: var(--card); border-radius: 6px;">
                                        ${p.name || p}
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="button-group">
                    <button class="btn btn-secondary" onclick="performDraw()">
                        🎲 ${State.current.rounds.length > 0 ? 'Přelosovat' : 'Losovat'}
                    </button>
                    <button class="btn btn-primary" onclick="Matches.generate()">
                        ⚽ Vygenerovat zápasy →
                    </button>
                    <button class="btn btn-outline" onclick="goToParticipants()">
                        ← Zpět
                    </button>
                </div>
            </div>
        `;
    },

    renderMatches() {
        if (!State.current.rounds || State.current.rounds.length === 0) {
            return `
                <div class="card">
                    <div style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 4em; margin-bottom: 20px;">⚽</div>
                        <p style="color: var(--text-muted);">Nejprve vygenerujte zápasy</p>
                        <button class="btn btn-primary" onclick="goToDraw()" style="margin-top: 20px;">← Zpět</button>
                    </div>
                </div>
            `;
        }

        const total = State.current.matches.length;
        const completed = State.current.matches.filter(m => m.completed).length;
        const playing = State.current.matches.filter(m => m.playing).length;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        const queue = Utils.calculateQueue();
        const estimatedEnd = Utils.calculateEstimatedTime();

        return `
            <div class="card">
                <h2>⚽ Zápasy</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${completed}/${total}</div>
                        <div class="stat-label">Dokončeno</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${playing}</div>
                        <div class="stat-label">Právě hraje</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${State.current.rounds.length}</div>
                        <div class="stat-label">Kol</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(progress)}%</div>
                        <div class="stat-label">Postup</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${estimatedEnd}</div>
                        <div class="stat-label">Odhad konce</div>
                    </div>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>

                ${State.current.playoffBracket ? Playoff.renderBracket() : ''}

                ${queue.length > 0 ? `
                    <div class="queue-section">
                        <div style="font-weight: 600; margin-bottom: 15px; color: var(--primary);">📋 Fronta čekajících (${queue.length})</div>
                        <div class="queue-list">
                            ${queue.slice(0, 5).map((item, i) => `
                                <div class="queue-item">
                                    <div class="queue-position">${i + 1}</div>
                                    <div style="flex: 1;">
                                        <strong>${item.player1.name || item.player1}</strong> vs <strong>${item.player2.name || item.player2}</strong>
                                    </div>
                                    <div style="color: var(--text-muted); font-size: 0.875em;">${item.eta}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div id="matches-content">
                    ${State.current.rounds.map((_, roundIndex) => {
                        const roundMatches = State.current.matches.filter(m => m.round === roundIndex);
                        const roundCompleted = roundMatches.every(m => m.completed);
                        const roundPlaying = roundMatches.filter(m => m.playing).length;
                        
                        // Get round name for playoff
                        const roundName = roundMatches[0]?.roundName || `Kolo ${roundIndex + 1}`;
                        
                        return `
                            <div class="round-section">
                                <div class="round-header">
                                    <h3>${roundName}</h3>
                                    <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 0.875em;">
                                        ${roundCompleted ? '✅ Dokončeno' : `${roundMatches.filter(m => m.completed).length}/${roundMatches.length}`}
                                    </span>
                                </div>
                                <div class="matches-grid">
                                    ${roundMatches.map(match => Matches.renderCard(match)).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="button-group">
                ${State.current.system === 'swiss' ? `
                    <button class="btn btn-secondary" onclick="Swiss.generateNextRound()" 
                            ${State.current.matches.filter(m => m.round === State.current.swissRound - 1).every(m => m.completed) ? '' : 'disabled'}>
                        🇨🇭 Generovat další kolo ${State.current.swissRound + 1}
                    </button>
                ` : ''}
                ${(State.current.system === 'groups' || State.current.system === 'knockout') && State.current.playoffBracket ? `
                    <button class="btn btn-secondary" onclick="advancePlayoffRound()" id="advance-playoff-btn">
                        🏆 Generovat další fázi playoff
                    </button>
                ` : ''}
                ${State.current.system === 'groups' && !State.current.playoffBracket && Utils.allMatchesCompleted() ? `
                    <button class="btn btn-warning" onclick="Playoff.generateFromGroups(); UI.render();">
                        🏆 Vygenerovat playoff pavouk
                    </button>
                ` : ''}
                    <button class="btn btn-primary" onclick="goToResults()">
                        Zobrazit výsledky →
                    </button>
                    <button class="btn btn-outline" onclick="goToDraw()">← Zpět</button>
                </div>
            </div>
        `;
    },

    renderResults() {
        Stats.calculate();

        const completed = State.current.matches.filter(m => m.completed).length;
        const total = State.current.matches.length;
        const allCompleted = completed === total;

        return `
            <div class="card">
                <h2>🏆 Výsledky</h2>
                
                ${allCompleted ? `
                    <div class="alert alert-success">
                        🎉 Turnaj dokončen! Vítěz: <strong>${State.current.standings[0]?.player || '-'}</strong>
                    </div>
                ` : `
                    <div class="alert alert-warning">
                        ⚠️ Turnaj není dokončen (${completed}/${total} zápasů)
                    </div>
                `}

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${State.current.participants.length}</div>
                        <div class="stat-label">Účastníků</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${total}</div>
                        <div class="stat-label">Zápasů</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${State.current.rounds.length}</div>
                        <div class="stat-label">Kol</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Utils.calculateTotalSets()}</div>
                        <div class="stat-label">Setů</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Utils.calculateTotalPoints()}</div>
                        <div class="stat-label">Bodů</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Pořadí</th><th>Jméno</th><th>Z</th><th>V</th><th>R</th><th>P</th>
                            <th>Sety</th><th>Body v setech</th><th>Body</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${State.current.standings.map((s, i) => `
                            <tr>
                                <td>${i < 3 ? `<span class="position-badge position-${i + 1}">${i + 1}</span>` : i + 1}</td>
                                <td><strong>${s.player}</strong></td>
                                <td>${s.played}</td>
                                <td>${s.wins}</td>
                                <td>${s.draws}</td>
                                <td>${s.losses}</td>
                                <td>${s.setsWon}:${s.setsLost}</td>
                                <td>${s.pointsWon}:${s.pointsLost}</td>
                                <td><strong>${s.points}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="button-group">
                    <button class="btn btn-secondary" onclick="Export.toJSON()">📥 JSON</button>
                    <button class="btn btn-secondary" onclick="Export.toCSV()">📊 CSV</button>
                    <button class="btn btn-outline" onclick="goToMatches()">← Zpět</button>
                    ${allCompleted ? `
                        <button class="btn btn-primary" onclick="saveToHistory()">💾 Uložit do historie</button>
                        <button class="btn btn-danger" onclick="if(State.reset()) UI.render()">🆕 Nový turnaj</button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    attachEventListeners() {
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
            });
        }

        document.querySelectorAll('.system-option').forEach(opt => {
            opt.addEventListener('click', () => {
                State.current.system = opt.dataset.system;
                this.render();
            });
        });

        ['num-courts', 'match-duration', 'break-time', 'num-groups', 'points-win', 'points-draw', 
         'best-of', 'points-per-set', 'tiebreak-points'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', e => {
                    const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    State.current[key] = parseInt(e.target.value) || e.target.value;
                    State.save();
                });
            }
        });
    },

    togglePartnerField() {
        const type = document.getElementById('modal-type').value;
        document.getElementById('partner-group').style.display = type === 'double' ? 'block' : 'none';
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('show');
    },

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        Utils.showNotification('Režim změněn');
    },

    setTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(theme);
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.add('dark-mode');
        }
        localStorage.setItem('theme', theme);
        this.closeModal('theme-modal');
        Utils.showNotification('Motiv změněn');
    },

    openHistory() {
        const modal = document.getElementById('history-modal');
        const content = document.getElementById('history-content') || modal;
        
        if (State.current.history.length === 0) {
            content.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);">Žádná historie turnajů</p>';
        } else {
            content.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:15px;">
                    ${State.current.history.map(t => `
                        <div style="background:var(--bg);padding:20px;border-radius:12px;border:2px solid var(--border);cursor:pointer;transition:all 0.3s;" 
                             onclick="loadTournamentFromHistory(${t.id})"
                             onmouseover="this.style.borderColor='var(--primary)'"
                             onmouseout="this.style.borderColor='var(--border)'">
                            <div style="font-weight:600;margin-bottom:10px;color:var(--primary);">${t.name}</div>
                            <div style="font-size:0.875em;color:var(--text-muted);">
                                ${Utils.formatDate(t.date)}<br>
                                ${Utils.getSystemName(t.system)}<br>
                                ${t.participants} účastníků • ${t.matches} zápasů<br>
                                🏆 Vítěz: <strong>${t.winner}</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        modal.classList.add('show');
    }
};
