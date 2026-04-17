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

        if (State.readOnly) {
            try {
                content.innerHTML = this.renderSpectatorView();
            } catch(e) {
                console.error('Spectator render error:', e);
                content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
                    <div style="font-size:2em;margin-bottom:10px;">⚠️</div>
                    <div>Chyba zobrazení turnaje. Zkuste obnovit stránku.</div>
                    <div style="font-size:0.8em;margin-top:8px;opacity:0.6;">${e.message}</div>
                </div>`;
            }
        } else {
            switch(State.current.step) {
                case 'setup': content.innerHTML = banner + this.renderSetup(); break;
                case 'participants': content.innerHTML = banner + this.renderParticipants(); break;
                case 'draw': content.innerHTML = banner + this.renderDraw(); break;
                case 'matches': content.innerHTML = banner + this.renderMatches(); break;
                case 'results': content.innerHTML = banner + this.renderResults(); break;
            }
        }

        this.attachEventListeners();
        this.setupSwipeNavigation();
        updateUndoRedoButtons();
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

                <h3 style="margin-top: 30px; margin-bottom: 15px; color: var(--primary);">🏸 Typ disciplíny</h3>

                <div class="input-group">
                    <div class="system-options" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                        <div class="system-option ${State.current.disciplineType === 'singles' ? 'active' : ''}" data-discipline="singles">
                            <div style="font-size:2.5em;">👤</div>
                            <h3>Dvouhra</h3>
                            <p>Jednotlivci hrají proti sobě (1 vs 1)</p>
                        </div>
                        <div class="system-option ${State.current.disciplineType === 'doubles' ? 'active' : ''}" data-discipline="doubles">
                            <div style="font-size:2.5em;">👥</div>
                            <h3>Čtyřhra</h3>
                            <p>Páry hrají proti sobě (2 vs 2)</p>
                        </div>
                        <div class="system-option ${State.current.disciplineType === 'mixed' ? 'active' : ''}" data-discipline="mixed">
                            <div style="font-size:2.5em;">🔀</div>
                            <h3>Smíšené</h3>
                            <p>Dvouhry i čtyřhry dohromady</p>
                        </div>
                    </div>
                </div>

                <h3 style="margin-top: 30px; margin-bottom: 15px; color: var(--primary);">🎯 Herní systém</h3>

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
                    <button class="btn btn-primary" onclick="openParticipantModal()" aria-label="Přidat účastníka">
                        ➕ ${i18n.t('participant.add')}
                    </button>
                    <button class="btn btn-outline" onclick="showCSVImportModal()" title="Importovat více účastníků z CSV souboru">
                        📥 ${i18n.currentLang === 'cs' ? 'Import CSV' : 'Import CSV'}
                    </button>
                    <button class="btn btn-outline" onclick="autoFillParticipants()">
                        🎲 ${i18n.currentLang === 'cs' ? 'Demo účastníci' : 'Demo Participants'}
                    </button>
                </div>
                <div class="swipe-hint">← přejetím navigujte mezi kroky →</div>

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
                        ${State.current.groups.map((group, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const color = UI.getGroupColor(letter);
                            return `
                            <div style="background: var(--bg); padding: 0; border-radius: 12px; border-top: 4px solid ${color}; overflow: hidden;">
                                <div style="background: ${color}; color: white; padding: 10px 15px; font-weight: bold; font-size: 0.95em;">
                                    🏸 Skupina ${letter} (${group.length} hráčů)
                                </div>
                                <div style="padding: 15px;">
                                ${group.map((p, pi) => `
                                    <div style="padding: 8px 10px; margin: 5px 0; background: var(--card); border-radius: 6px; display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75em; font-weight: bold; flex-shrink: 0;">${Utils.getInitials(p.name || p)}</div>
                                        <span>${p.name || p}${p.partner ? ` & ${p.partner}` : ''}</span>
                                        ${p.seed ? `<span style="margin-left:auto;font-size:0.75em;color:var(--text-muted);">💪 ${p.seed}</span>` : ''}
                                    </div>
                                `).join('')}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                ` : ''}

                <div class="button-group">
                    <button class="btn btn-secondary" onclick="performDraw()">
                        🎲 ${State.current.rounds.length > 0 ? (i18n.currentLang === 'cs' ? 'Přelosovat' : 'Redraw') : (i18n.currentLang === 'cs' ? 'Losovat' : 'Draw')}
                    </button>
                    ${State.current.matches.length > 0 ? `
                    <button class="btn btn-primary" onclick="goToMatches()">
                        ⚽ ${i18n.currentLang === 'cs' ? 'Pokračovat na zápasy →' : 'Continue to Matches →'}
                    </button>
                    <button class="btn btn-secondary" onclick="if(confirm('${i18n.currentLang === 'cs' ? 'Přegenerování smaže všechna zadaná skóre. Opravdu pokračovat?' : 'Regenerating will erase all entered scores. Continue?'}')) Matches.generate()">
                        🔄 ${i18n.currentLang === 'cs' ? 'Přegenerovat zápasy' : 'Regenerate Matches'}
                    </button>
                    ` : `
                    <button class="btn btn-primary" onclick="Matches.generate()">
                        ⚽ ${i18n.currentLang === 'cs' ? 'Vygenerovat zápasy →' : 'Generate Matches →'}
                    </button>
                    `}
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

                <div class="progress-bar-wrapper">
                    <div class="progress-label">
                        <span>${i18n.currentLang === 'cs' ? 'Průběh turnaje' : 'Tournament Progress'}</span>
                        <span>${completed}/${total} zápasů (${Math.round(progress)}%)</span>
                    </div>
                    <div class="progress-bar" role="progressbar" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>

                ${(() => {
                    const conflicts = detectCourtConflicts();
                    if (conflicts.length === 0) return '';
                    return `<div class="conflict-warning" role="alert">
                        <span class="conflict-icon">⚠️</span>
                        <div>
                            <strong>Upozornění na konflikt!</strong>
                            ${conflicts.map(c => `<div style="font-size:0.875em;color:var(--danger);">
                                Hráč <strong>${c.players.join(', ')}</strong> hraje zároveň v zápasech č. ${c.match1 + 1} a ${c.match2 + 1}
                            </div>`).join('')}
                        </div>
                    </div>`;
                })()}

                ${this.renderMatchFilters()}

                ${State.current.playoffBracket ? Playoff.renderBracket() : ''}

                ${State.current.system === 'groups' && !State.current.playoffBracket ? this.renderGroupStandings() : ''}

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

    // ===== SPECTATOR VIEW =====

    renderSpectatorView() {
        if (!State.current.tournamentName && !State.current.matches.length) {
            return `
                <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                    <div style="font-size:3em;margin-bottom:15px;">📡</div>
                    <div style="font-size:1.1em;font-weight:500;margin-bottom:8px;">Připojuji se k živému turnaji...</div>
                    <div style="font-size:0.875em;">Prosím čekejte...</div>
                </div>
            `;
        }
        Stats.calculate();

        const numCourts = State.current.numCourts || 1;
        const allMatches = State.current.matches;
        const playingMatches = allMatches.filter(m => m.playing);
        const pendingMatches = allMatches.filter(m => !m.completed && !m.playing);
        const upcomingMatches = pendingMatches.slice(0, numCourts);
        const completed = allMatches.filter(m => m.completed).length;
        const total = allMatches.length;
        const progress = total > 0 ? Math.round(completed / total * 100) : 0;
        const isComplete = completed === total && total > 0;

        const hasPlayoff = !!State.current.playoffBracket;
        const hasGroups = State.current.system === 'groups' && !hasPlayoff;

        const tournamentDate = State.current.tournamentDate
            ? new Date(State.current.tournamentDate + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

        let standingsContent;
        if (hasPlayoff) {
            standingsContent = this.renderSpectatorBracket();
        } else if (hasGroups) {
            standingsContent = this.renderSpectatorGroupStandings();
        } else {
            standingsContent = this.renderSpectatorStandings();
        }

        return `
            <div class="spectator-view">
                <div class="spectator-header-bar">
                    <div class="spectator-header-left">
                        <div class="spectator-tournament-name">${State.current.tournamentName || 'Turnaj'}</div>
                        <div class="spectator-header-meta">
                            ${tournamentDate ? `📅 ${tournamentDate} &nbsp;·&nbsp;` : ''}
                            ${numCourts} ${numCourts === 1 ? 'kurt' : numCourts < 5 ? 'kurty' : 'kurtů'}
                            &nbsp;·&nbsp; ${completed}/${total} zápasů
                        </div>
                    </div>
                    <div class="spectator-header-right">
                        ${isComplete ? '<span class="spectator-complete-badge">🏆 Turnaj dokončen</span>' : ''}
                        <div class="spectator-progress-wrap">
                            <div class="spectator-progress-bar-wrap">
                                <div class="spectator-progress-fill" style="width:${progress}%"></div>
                            </div>
                            <span class="spectator-progress-pct">${progress}%</span>
                        </div>
                        <button class="btn spectator-save-btn"
                            onclick="if(confirm('Uložit tento turnaj lokálně pro editaci?')){State.isShared=false;State.readOnly=false;State.save();window.history.replaceState(null,'',window.location.pathname);Utils.showNotification('Turnaj uložen');UI.render();}">
                            💾 Uložit a upravovat
                        </button>
                    </div>
                </div>

                <div class="spectator-dashboard">
                    <div class="spectator-col">
                        <div class="spectator-col-title spectator-col-live">
                            ${playingMatches.length > 0
                                ? '<span class="live-indicator"><span class="live-dot"></span> LIVE</span>'
                                : '🎾'}
                            Probíhají zápasy
                            <span class="spectator-badge">${playingMatches.length}</span>
                        </div>
                        ${playingMatches.length > 0
                            ? playingMatches.map(m => this.renderSpectatorMatchCard(m, 'live')).join('')
                            : '<div class="spectator-empty">Momentálně žádný zápas neprobíhá</div>'
                        }
                    </div>

                    <div class="spectator-col">
                        <div class="spectator-col-title spectator-col-next">
                            ⏭ Připravuje se na kurt
                            <span class="spectator-badge">${upcomingMatches.length}</span>
                        </div>
                        ${upcomingMatches.length > 0
                            ? upcomingMatches.map((m, i) => this.renderSpectatorMatchCard(m, 'next', i + 1)).join('')
                            : `<div class="spectator-empty">${isComplete ? 'Všechny zápasy odehrány' : 'Žádné čekající zápasy'}</div>`
                        }
                    </div>

                    <div class="spectator-col">
                        <div class="spectator-col-title spectator-col-standings">
                            ${hasPlayoff ? '🏆 Playoff pavouk' : hasGroups ? '📊 Tabulky skupin' : '📊 Aktuální tabulka'}
                            <span class="spectator-badge">${State.current.standings.length}</span>
                        </div>
                        ${standingsContent}
                    </div>
                </div>
            </div>
        `;
    },

    renderSpectatorMatchCard(match, type, position) {
        const idx = State.current.matches.indexOf(match);
        const p1Name = Utils.getPlayerDisplayName(match.player1);
        const p2Name = Utils.getPlayerDisplayName(match.player2);

        let scoreDisplay = '';
        if (type === 'live') {
            const scores = match.sets
                .filter(s => s.score1 !== null && s.score2 !== null)
                .map(s => `<span class="sp-set-score">${s.score1}:${s.score2}</span>`);
            scoreDisplay = scores.length > 0
                ? `<div class="sp-scores">${scores.join('')}</div>`
                : '<div class="sp-scores"><span class="sp-set-score">—</span></div>';
        }

        return `
            <div class="sp-match-card sp-match-${type}">
                <div class="sp-match-meta">
                    <span class="sp-court-badge">Kurt ${match.court}</span>
                    ${match.group ? `<span class="sp-group-badge" style="color:${UI.getGroupColor(match.group)};border-color:${UI.getGroupColor(match.group)}20;">Sk. ${match.group}</span>` : ''}
                    ${match.roundName ? `<span class="sp-round-label">${match.roundName}</span>` : ''}
                    ${type === 'live' && match.startTime
                        ? `<span class="sp-timer" id="spectator-timer-${idx}">⏱ ${Utils.calculateElapsed(match.startTime)}</span>`
                        : ''}
                    ${type === 'next' ? `<span class="sp-next-pos">#${position}</span>` : ''}
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
                        <th title="Body">B</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((s, i) => `
                        <tr class="${i === 0 ? 'sp-gold' : i === 1 ? 'sp-silver' : i === 2 ? 'sp-bronze' : ''}">
                            <td class="sp-pos">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</td>
                            <td class="sp-name">${s.player}</td>
                            <td>${s.played}</td>
                            <td class="sp-wins">${s.wins}</td>
                            <td class="sp-sets">${s.setsWon}:${s.setsLost}</td>
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
                    <div class="sp-group-header" style="background:${color};">Skupina ${letter}</div>
                    <table class="sp-table">
                        <thead><tr><th>#</th><th class="sp-col-name">Hráč</th><th>Z</th><th>V</th><th>Sety</th><th>B</th></tr></thead>
                        <tbody>
                            ${standings.map((s, i) => `
                                <tr class="${i < 2 ? 'sp-qualify' : ''}">
                                    <td class="sp-pos">${i + 1}</td>
                                    <td class="sp-name">${s.player}</td>
                                    <td>${s.played}</td>
                                    <td class="sp-wins">${s.wins}</td>
                                    <td class="sp-sets">${s.setsWon}:${s.setsLost}</td>
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
                (m.isPlayoff === true || State.current.playoffBracket.isKnockout === true)
            );
            if (roundMatches.length > 0) {
                rounds.push({ round: r, name: Playoff.getRoundName(r, totalRounds), matches: roundMatches });
            }
        }
        if (rounds.length === 0) {
            return '<div class="spectator-empty">Playoff ještě nezačal</div>';
        }
        return `
            <div class="sp-bracket">
                ${rounds.map(round => `
                    <div class="sp-bracket-round">
                        <div class="sp-bracket-round-name">${round.name}</div>
                        ${round.matches.map(m => {
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
                        }).join('')}
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderMatchFilters() {
        return `
            <div style="background: var(--bg); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <div style="flex: 1; min-width: 200px;">
                    <input type="text" id="match-search" placeholder="🔍 Vyhledat hráče..."
                           style="width: 100%; padding: 10px 15px; margin: 0;"
                           oninput="filterMatches()">
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-outline filter-btn active" data-filter="all" onclick="setMatchFilter('all')">
                        Všechny (${State.current.matches.length})
                    </button>
                    <button class="btn btn-outline filter-btn" data-filter="pending" onclick="setMatchFilter('pending')">
                        Čekající (${State.current.matches.filter(m => !m.completed && !m.playing).length})
                    </button>
                    <button class="btn btn-outline filter-btn" data-filter="playing" onclick="setMatchFilter('playing')">
                        Probíhající (${State.current.matches.filter(m => m.playing).length})
                    </button>
                    <button class="btn btn-outline filter-btn" data-filter="completed" onclick="setMatchFilter('completed')">
                        Dokončené (${State.current.matches.filter(m => m.completed).length})
                    </button>
                </div>
            </div>
        `;
    },

    renderGroupStandings() {
        const groupStandings = Stats.calculateGroupStandings();
        if (!groupStandings) return '';

        return `
            <div style="background: var(--bg); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="color: var(--primary); margin-bottom: 20px;">📊 Tabulky skupin</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
                    ${Object.keys(groupStandings).map(groupLetter => {
                        const standings = groupStandings[groupLetter];
                        const groupColor = UI.getGroupColor(groupLetter);
                        return `
                            <div style="background: var(--card); border-radius: 12px; overflow: hidden; border: 2px solid var(--border); border-top: 4px solid ${groupColor};" class="group-color-${groupLetter}">
                                <div style="background: ${groupColor}; color: white; padding: 12px 15px; font-weight: bold;" class="group-header-${groupLetter}">
                                    🏸 Skupina ${groupLetter}
                                </div>
                                <div style="overflow-x: auto;">
                                    <table style="width: 100%; margin: 0;">
                                        <thead>
                                            <tr style="background: var(--bg);">
                                                <th style="padding: 10px; font-size: 0.875em;">#</th>
                                                <th style="padding: 10px; text-align: left; font-size: 0.875em;">Hráč</th>
                                                <th style="padding: 10px; font-size: 0.875em;">Z</th>
                                                <th style="padding: 10px; font-size: 0.875em;">V</th>
                                                <th style="padding: 10px; font-size: 0.875em;">P</th>
                                                <th style="padding: 10px; font-size: 0.875em;">S</th>
                                                <th style="padding: 10px; font-size: 0.875em; font-weight: bold;">B</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${standings.map((s, i) => `
                                                <tr style="border-bottom: 1px solid var(--border);">
                                                    <td style="padding: 10px; text-align: center;">
                                                        ${i < 2 ? `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:var(--secondary);color:white;line-height:24px;font-weight:bold;font-size:0.875em;">${i + 1}</span>` : i + 1}
                                                    </td>
                                                    <td style="padding: 10px; font-weight: 500;">${s.player}</td>
                                                    <td style="padding: 10px; text-align: center;">${s.played}</td>
                                                    <td style="padding: 10px; text-align: center; color: var(--secondary);">${s.wins}</td>
                                                    <td style="padding: 10px; text-align: center; color: var(--danger);">${s.losses}</td>
                                                    <td style="padding: 10px; text-align: center; font-size: 0.875em;">${s.setsWon}:${s.setsLost}</td>
                                                    <td style="padding: 10px; text-align: center; font-weight: bold; color: var(--primary); font-size: 1.1em;">${s.points}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ${standings.length > 0 && standings[0].played > 0 ? `
                                    <div style="padding: 10px 15px; background: var(--bg); font-size: 0.875em; color: var(--text-muted);">
                                        💡 Top 2 postupují do playoff
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
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

        document.querySelectorAll('.system-option[data-system]').forEach(opt => {
            opt.addEventListener('click', () => {
                State.current.system = opt.dataset.system;
                this.render();
            });
        });

        document.querySelectorAll('.system-option[data-discipline]').forEach(opt => {
            opt.addEventListener('click', () => {
                State.current.disciplineType = opt.dataset.discipline;
                State.save();
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

        // Klikatelné kroky v liště
        document.querySelectorAll('.step[data-step]').forEach(stepEl => {
            stepEl.addEventListener('click', () => {
                const step = stepEl.dataset.step;
                if (step === State.current.step) return;
                switch (step) {
                    case 'setup': goToSetup(); break;
                    case 'participants': goToParticipants(); break;
                    case 'draw': goToDraw(); break;
                    case 'matches':
                        if (State.current.matches.length > 0) goToMatches();
                        else Utils.showNotification('Nejprve vygenerujte zápasy', 'error');
                        break;
                    case 'results':
                        if (State.current.matches.length > 0) goToResults();
                        else Utils.showNotification('Nejprve vygenerujte zápasy', 'error');
                        break;
                }
            });
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
                             onmouseout="this.style.borderColor='var(--border)'"
                             role="button" tabindex="0"
                             aria-label="Načíst turnaj ${t.name}">
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
    },

    // GROUP COLOR HELPERS
    getGroupColor(letter) {
        const colors = { A: '#3b82f6', B: '#10b981', C: '#8b5cf6', D: '#f59e0b', E: '#ef4444', F: '#06b6d4', G: '#ec4899', H: '#84cc16' };
        return colors[letter] || '#3b82f6';
    },

    // SETUP SWIPE NAVIGATION
    setupSwipeNavigation() {
        const content = document.getElementById('app-content');
        if (!content) return;

        let touchStartX = 0;
        let touchStartY = 0;

        content.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        content.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;

            // Only register horizontal swipes (dx > 60, dy < 50)
            if (Math.abs(dx) < 60 || Math.abs(dy) > 50) return;

            // Don't swipe if user is interacting with a form element
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            const steps = ['setup', 'participants', 'draw', 'matches', 'results'];
            const currentIdx = steps.indexOf(State.current.step);

            if (dx < 0 && currentIdx < steps.length - 1) {
                // Swipe left → next step
                const nextStep = steps[currentIdx + 1];
                if (nextStep === 'draw' && State.current.participants.length < 2) return;
                State.current.step = nextStep;
                UI.render();
            } else if (dx > 0 && currentIdx > 0) {
                // Swipe right → previous step
                State.current.step = steps[currentIdx - 1];
                UI.render();
            }
        }, { passive: true });
    }
};
