// ui.js - UI rendering a interakce

const UI = {
    render() {
        this.updateSteps();
        this.updateTitle();

        // Only save if not in read-only mode
        if (!State.readOnly) {
            State.save();
        }

        const content = document.getElementById('app-content');

        // Add read-only banner if in shared mode
        let banner = '';
        if (State.readOnly) {
            banner = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 15px 20px;
                            border-radius: 12px;
                            margin-bottom: 20px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div>
                        <strong>👁️ Režim zobrazení</strong>
                        <p style="margin: 5px 0 0; opacity: 0.9; font-size: 0.9em;">
                            Prohlížíte sdílený turnaj. Změny nebudou uloženy.
                        </p>
                    </div>
                    <button class="btn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white;"
                            onclick="if(confirm('Uložit tento turnaj lokálně?')) { State.isShared = false; State.readOnly = false; State.save(); window.history.replaceState(null, '', window.location.pathname); Utils.showNotification('Turnaj uložen'); UI.render(); }">
                        💾 Uložit lokálně
                    </button>
                </div>
            `;
        }

        switch(State.current.step) {
            case 'setup': content.innerHTML = banner + this.renderSetup(); break;
            case 'participants': content.innerHTML = banner + this.renderParticipants(); break;
            case 'draw': content.innerHTML = banner + this.renderDraw(); break;
            case 'matches': content.innerHTML = banner + this.renderMatches(); break;
            case 'results': content.innerHTML = banner + this.renderResults(); break;
        }

        this.attachEventListeners();
    },

    updateSteps() {
        const stepsHTML = `
            <div class="step ${State.current.step === 'setup' ? 'active' : State.current.participants.length > 0 ? 'completed' : ''}" data-step="setup">
                <div class="step-circle">1</div>
                <div>${i18n.t('step.setup')}</div>
            </div>
            <div class="step ${State.current.step === 'participants' ? 'active' : State.current.rounds.length > 0 ? 'completed' : ''}" data-step="participants">
                <div class="step-circle">2</div>
                <div>${i18n.t('step.participants')}</div>
            </div>
            <div class="step ${State.current.step === 'draw' ? 'active' : State.current.matches.length > 0 ? 'completed' : ''}" data-step="draw">
                <div class="step-circle">3</div>
                <div>${i18n.t('step.draw')}</div>
            </div>
            <div class="step ${State.current.step === 'matches' ? 'active' : Utils.allMatchesCompleted() ? 'completed' : ''}" data-step="matches">
                <div class="step-circle">4</div>
                <div>${i18n.t('step.matches')}</div>
            </div>
            <div class="step ${State.current.step === 'results' ? 'active' : ''}" data-step="results">
                <div class="step-circle">5</div>
                <div>${i18n.t('step.results')}</div>
            </div>
        `;
        document.getElementById('steps-container').innerHTML = stepsHTML;
    },

    updateTitle() {
        document.getElementById('tournament-title').textContent =
            State.current.tournamentName || i18n.t('tournament.title');
        document.getElementById('tournament-subtitle').textContent =
            State.current.tournamentName ?
                `${State.current.participants.length} ${i18n.currentLang === 'cs' ? 'účastníků' : 'participants'} • ${State.current.numCourts} ${State.current.numCourts === 1 ? 'kurt' : (i18n.currentLang === 'cs' ? 'kurty' : 'courts')} • ${Utils.formatDate(State.current.tournamentDate)}` :
                i18n.t('tournament.subtitle');
    },

    renderSetup() {
        return `
            <div class="card">
                <h2>⚙️ ${i18n.t('setup.title')}</h2>

                <div class="input-row">
                    <div class="input-group">
                        <label>${i18n.t('setup.name')} *</label>
                        <input type="text" id="tournament-name" value="${State.current.tournamentName}"
                               placeholder="${i18n.currentLang === 'cs' ? 'Městský badmintonový turnaj 2025' : 'City Badminton Tournament 2025'}">
                    </div>
                    <div class="input-group">
                        <label>${i18n.t('setup.date')}</label>
                        <input type="date" id="tournament-date" value="${State.current.tournamentDate}">
                    </div>
                </div>

                <div class="input-group">
                    <label>${i18n.t('setup.system')}</label>
                    <div class="system-options">
                        <div class="system-option ${State.current.system === 'roundrobin' ? 'active' : ''}" data-system="roundrobin">
                            <div style="font-size:2.5em;">🔄</div>
                            <h3>${i18n.t('system.roundrobin')}</h3>
                            <p>${i18n.currentLang === 'cs' ? 'Round-robin - všichni hrají proti všem' : 'Everyone plays against everyone'}</p>
                        </div>
                        <div class="system-option ${State.current.system === 'swiss' ? 'active' : ''}" data-system="swiss">
                            <div style="font-size:2.5em;">🇨🇭</div>
                            <h3>${i18n.t('system.swiss')}</h3>
                            <p>${i18n.currentLang === 'cs' ? 'Postupné párování podle výsledků' : 'Progressive pairing by results'}</p>
                        </div>
                        <div class="system-option ${State.current.system === 'groups' ? 'active' : ''}" data-system="groups">
                            <div style="font-size:2.5em;">👥</div>
                            <h3>${i18n.t('system.groups')}</h3>
                            <p>${i18n.currentLang === 'cs' ? 'Skupinová fáze, pak vyřazovací pavouk' : 'Group stage, then knockout bracket'}</p>
                        </div>
                        <div class="system-option ${State.current.system === 'knockout' ? 'active' : ''}" data-system="knockout">
                            <div style="font-size:2.5em;">🏆</div>
                            <h3>${i18n.t('system.knockout')}</h3>
                            <p>${i18n.currentLang === 'cs' ? 'Přímý pavouk od začátku' : 'Direct bracket from start'}</p>
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
                        ${i18n.currentLang === 'cs' ? 'Pokračovat k účastníkům →' : 'Continue to Participants →'}
                    </button>
                    <button class="btn btn-danger" onclick="if(State.reset()) UI.render()">
                        🗑️ ${i18n.currentLang === 'cs' ? 'Nový turnaj' : 'New Tournament'}
                    </button>
                </div>
            </div>
        `;
    },

    renderParticipants() {
        return `
            <div class="card">
                <h2>👥 ${i18n.t('step.participants')} ${i18n.currentLang === 'cs' ? 'turnaje' : ''}</h2>

                <div class="button-group">
                    <button class="btn btn-primary" onclick="openParticipantModal()">
                        ➕ ${i18n.t('participant.add')}
                    </button>
                    <button class="btn btn-outline" onclick="autoFillParticipants()">
                        🎲 ${i18n.currentLang === 'cs' ? 'Demo účastníci' : 'Demo Participants'}
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
                        ${i18n.currentLang === 'cs' ? 'Pokračovat na losování →' : 'Continue to Draw →'}
                    </button>
                    <button class="btn btn-outline" onclick="goToSetup()">
                        ← ${i18n.t('btn.back')}
                    </button>
                </div>
            </div>
        `;
    },

    renderDraw() {
        return `
            <div class="card">
                <h2>🎲 ${i18n.t('step.draw')}</h2>
                
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
                        🎲 ${State.current.rounds.length > 0 ? (i18n.currentLang === 'cs' ? 'Přelosovat' : 'Redraw') : (i18n.currentLang === 'cs' ? 'Losovat' : 'Draw')}
                    </button>
                    <button class="btn btn-primary" onclick="Matches.generate()">
                        ⚽ ${i18n.currentLang === 'cs' ? 'Vygenerovat zápasy →' : 'Generate Matches →'}
                    </button>
                    <button class="btn btn-outline" onclick="goToParticipants()">
                        ← ${i18n.t('btn.back')}
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
                <h2>⚽ ${i18n.t('step.matches')}</h2>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${completed}/${total}</div>
                        <div class="stat-label">${i18n.currentLang === 'cs' ? 'Dokončeno' : 'Completed'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${playing}</div>
                        <div class="stat-label">${i18n.t('match.playing')}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${State.current.rounds.length}</div>
                        <div class="stat-label">${i18n.currentLang === 'cs' ? 'Kol' : 'Rounds'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(progress)}%</div>
                        <div class="stat-label">${i18n.currentLang === 'cs' ? 'Postup' : 'Progress'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${estimatedEnd}</div>
                        <div class="stat-label">${i18n.currentLang === 'cs' ? 'Odhad konce' : 'Estimated End'}</div>
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
                                        <strong>${Utils.getPlayerDisplayName(item.player1)}</strong> vs <strong>${Utils.getPlayerDisplayName(item.player2)}</strong>
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
                ${State.current.playoffBracket && State.current.playoffBracket.currentRound < State.current.playoffBracket.totalRounds - 1 ? `
                    <button class="btn btn-secondary" onclick="advancePlayoffRound()" id="advance-playoff-btn"
                            ${State.current.matches.filter(m => m.knockoutRound === State.current.playoffBracket.currentRound).every(m => m.completed) ? '' : 'disabled'}>
                        🏆 Generovat další fázi playoff
                    </button>
                ` : ''}
                ${State.current.system === 'groups' && !State.current.playoffBracket && State.current.matches.filter(m => !m.isPlayoff).every(m => m.completed) && State.current.matches.filter(m => !m.isPlayoff).length > 0 ? `
                    <button class="btn btn-warning" onclick="if(Playoff.generateFromGroups()) UI.render();">
                        🏆 Vygenerovat playoff pavouk
                    </button>
                ` : ''}
                    <button class="btn btn-primary" onclick="goToResults()">
                        ${i18n.currentLang === 'cs' ? 'Zobrazit výsledky →' : 'View Results →'}
                    </button>
                    <button class="btn btn-outline" onclick="goToDraw()">← ${i18n.t('btn.back')}</button>
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
                <h2>🏆 ${i18n.t('step.results')}</h2>
                
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
                            <th>${i18n.t('results.position')}</th><th>${i18n.t('results.player')}</th><th>${i18n.currentLang === 'cs' ? 'Z' : 'M'}</th><th>${i18n.currentLang === 'cs' ? 'V' : 'W'}</th><th>${i18n.currentLang === 'cs' ? 'R' : 'D'}</th><th>${i18n.currentLang === 'cs' ? 'P' : 'L'}</th>
                            <th>${i18n.t('results.sets')}</th><th>${i18n.currentLang === 'cs' ? 'Body v setech' : 'Set Points'}</th><th>${i18n.t('results.points')}</th>
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
                    <button class="btn btn-outline" onclick="goToMatches()">← ${i18n.t('btn.back')}</button>
                    ${allCompleted ? `
                        <button class="btn btn-primary" onclick="saveToHistory()">💾 ${i18n.currentLang === 'cs' ? 'Uložit do historie' : 'Save to History'}</button>
                        <button class="btn btn-danger" onclick="if(State.reset()) UI.render()">🆕 ${i18n.currentLang === 'cs' ? 'Nový turnaj' : 'New Tournament'}</button>
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
