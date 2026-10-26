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
                <div class="readonly-banner">
                    <div>
                        <strong>Prohlížíte sdílený turnaj</strong>
                        <p>Změny se neuloží, dokud si turnaj neuložíte k sobě.</p>
                    </div>
                    <button class="btn btn-outline"
                            onclick="if(confirm('Uložit tento turnaj lokálně?')) { State.isShared = false; State.readOnly = false; State.save(); window.history.replaceState(null, '', window.location.pathname); Utils.showNotification('Turnaj uložen'); UI.render(); }">
                        Uložit k sobě
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
        if (State.readOnly) {
            document.getElementById('steps-container').innerHTML = '';
            return;
        }
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
            <div class="step ${State.current.step === 'matches' ? 'active' : State.current.matches.length > 0 && Utils.allMatchesCompleted() ? 'completed' : ''}" data-step="matches">
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
                `${Utils.formatDate(State.current.tournamentDate)}, ${State.current.participants.length} ${i18n.currentLang === 'cs' ? 'účastníků' : 'participants'}, ${State.current.numCourts} ${State.current.numCourts === 1 ? 'kurt' : (i18n.currentLang === 'cs' ? (State.current.numCourts < 5 ? 'kurty' : 'kurtů') : 'courts')}` :
                i18n.t('tournament.subtitle');
    },

    renderSetup() {
        return `
            <div class="card">
                <h2>${i18n.t('setup.title')}</h2>

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

                <h3 class="section-title">Disciplína</h3>

                <div class="input-group">
                    <div class="system-options system-options-3">
                        <div class="system-option ${State.current.disciplineType === 'singles' ? 'active' : ''}" data-discipline="singles">
                            ${UI.glyph('singles')}
                            <h3>Dvouhra</h3>
                            <p>Jednotlivci hrají proti sobě (1 vs 1)</p>
                        </div>
                        <div class="system-option ${State.current.disciplineType === 'doubles' ? 'active' : ''}" data-discipline="doubles">
                            ${UI.glyph('doubles')}
                            <h3>Čtyřhra</h3>
                            <p>Páry hrají proti sobě (2 vs 2)</p>
                        </div>
                        <div class="system-option ${State.current.disciplineType === 'mixed' ? 'active' : ''}" data-discipline="mixed">
                            ${UI.glyph('mixed')}
                            <h3>Smíšené</h3>
                            <p>Dvouhry i čtyřhry dohromady</p>
                        </div>
                    </div>
                </div>

                <h3 class="section-title">Herní systém</h3>

                <div class="input-group">
                    <div class="system-options">
                        <div class="system-option ${State.current.system === 'roundrobin' ? 'active' : ''}" data-system="roundrobin">
                            ${UI.glyph('roundrobin')}
                            <h3>${i18n.t('system.roundrobin')}</h3>
                            <p>${i18n.currentLang === 'cs' ? 'Round-robin - všichni hrají proti všem' : 'Everyone plays against everyone'}</p>
                        </div>
                        <div class="system-option ${State.current.system === 'swiss' ? 'active' : ''}" data-system="swiss">
                            ${UI.glyph('swiss')}
                            <h3>${i18n.t('system.swiss')}</h3>
                            <p>${i18n.currentLang === 'cs' ? 'Postupné párování podle výsledků' : 'Progressive pairing by results'}</p>
                        </div>
                        <div class="system-option ${State.current.system === 'groups' ? 'active' : ''}" data-system="groups">
                            ${UI.glyph('groups')}
                            <h3>${i18n.t('system.groups')}</h3>
                            <p>${i18n.currentLang === 'cs' ? 'Skupinová fáze, pak vyřazovací pavouk' : 'Group stage, then knockout bracket'}</p>
                        </div>
                        <div class="system-option ${State.current.system === 'knockout' ? 'active' : ''}" data-system="knockout">
                            ${UI.glyph('knockout')}
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
                    <div class="input-group">
                        <label>Typ playoff</label>
                        <div class="system-options system-options-2">
                            <div class="system-option ${(State.current.playoffType || 'cross') === 'cross' ? 'active' : ''}" data-playoff-type="cross">
                                ${UI.glyph('cross')}
                                <h3>Křížový pavouk</h3>
                                <p>1. vs 2. z jiné skupiny, semifinále a finále</p>
                            </div>
                            <div class="system-option ${State.current.playoffType === 'positional' ? 'active' : ''}" data-playoff-type="positional">
                                ${UI.glyph('positional')}
                                <h3>Poziční finále</h3>
                                <p>1. místa spolu, 2. místa spolu atd.</p>
                            </div>
                        </div>
                    </div>
                    ${(State.current.playoffType || 'cross') === 'cross' ? `
                    <div class="input-group option-panel">
                        <label class="option-panel-title">Možnosti playoff</label>
                        <label class="check-row">
                            <input type="checkbox" id="consolation-bracket" ${State.current.consolationBracket ? 'checked' : ''}>
                            <span><strong>Hrát o pořadí nepostupivších</strong><br><small style="color:var(--text-muted);">Hráči, kteří nepostoupí do playoff, odehrají vlastní mini-pavouk (3. místa spolu, 4. místa spolu atd.)</small></span>
                        </label>
                        <label class="check-row">
                            <input type="checkbox" id="third-place-match" ${State.current.thirdPlaceMatch ? 'checked' : ''}>
                            <span><strong>Zápas o 3. místo</strong><br><small style="color:var(--text-muted);">Poražení ze semifinále odehrají zápas o bronz</small></span>
                        </label>
                    </div>
                    ` : ''}
                ` : ''}
                ${State.current.system === 'knockout' ? `
                    <div class="input-group">
                        <label class="check-row">
                            <input type="checkbox" id="third-place-match" ${State.current.thirdPlaceMatch ? 'checked' : ''}>
                            <span><strong>Zápas o 3. místo</strong></span>
                        </label>
                        <small>Poražení ze semifinále odehrají zápas o bronz</small>
                    </div>
                ` : ''}

                ${State.current.system === 'swiss' ? `
                    <div class="alert alert-info">
                        Ve švýcarském systému se po každém kole párují hráči s podobným počtem bodů. Obvykle se hraje 5-7 kol.
                    </div>
                ` : ''}

                <h3 class="section-title">Pravidla a bodování</h3>

                <div class="input-row">
                    <div class="input-group">
                        <label>Sport</label>
                        <select id="sport">
                            <option value="badminton" ${State.current.sport === 'badminton' ? 'selected' : ''}>🏸 Badminton</option>
                            <option value="tennis" ${State.current.sport === 'tennis' ? 'selected' : ''}>🎾 Tenis</option>
                        </select>
                    </div>
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
                        <label>${Utils.scoreUnitLabel()} na set</label>
                        <input type="number" id="points-per-set" min="1" max="30" value="${State.current.pointsPerSet}">
                        <small>${State.current.sport === 'tennis' ? 'Obvykle 10 gemů (tie-break sada)' : 'Obvykle 21 bodů'}</small>
                    </div>
                    <div class="input-group">
                        <label>Tie-break limit</label>
                        <input type="number" id="tiebreak-points" min="1" max="50" value="${State.current.tieBreakPoints}">
                        <small>Maximum ${Utils.scoreUnitLabel().toLowerCase()} v setu (obvykle ${State.current.sport === 'tennis' ? '20' : '30'})</small>
                    </div>
                    <div class="input-group">
                        <label>Vyhrát o dva rozdílové</label>
                        <select id="win-by-two">
                            <option value="1" ${State.current.winByTwo !== false ? 'selected' : ''}>Ano</option>
                            <option value="0" ${State.current.winByTwo === false ? 'selected' : ''}>Ne</option>
                        </select>
                    </div>
                </div>

                <div class="input-row">
                    <div class="input-group">
                        <label class="check-row">
                            <input type="checkbox" id="overtime-scoring" ${State.current.overtimeScoring ? 'checked' : ''}>
                            <span><strong>Bodovat prodloužení zvlášť</strong></span>
                        </label>
                        <small>Vítěz v prodloužení dostane jiný počet bodů do tabulky</small>
                    </div>
                    ${State.current.overtimeScoring ? `
                    <div class="input-group">
                        <label>Body za výhru v prodloužení</label>
                        <input type="number" id="points-overtime-win" min="0" max="10" value="${State.current.pointsForOvertimeWin}">
                    </div>
                    <div class="input-group">
                        <label>Body za prohru v prodloužení</label>
                        <input type="number" id="points-overtime-loss" min="0" max="10" value="${State.current.pointsForOvertimeLoss}">
                    </div>
                    ` : ''}
                </div>

                <h3 class="section-title">Kurty a čas</h3>

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
                        ${i18n.currentLang === 'cs' ? 'Pokračovat k účastníkům' : 'Continue to Participants'}
                    </button>
                    <button class="btn btn-ghost-danger" onclick="if(State.reset()) UI.render()">
                        ${i18n.currentLang === 'cs' ? 'Začít nový turnaj' : 'New Tournament'}
                    </button>
                </div>
            </div>
        `;
    },

    renderParticipants() {
        const list = State.current.participants;
        const present = list.filter(p => !p.absent).length;
        return `
            <div class="card">
                <div class="card-head">
                    <h2>${i18n.t('step.participants')}</h2>
                    ${list.length > 0 ? `<span class="card-head-meta">Přítomno <strong>${present}</strong> z ${list.length}</span>` : ''}
                </div>

                <div class="button-group button-group-top">
                    <button class="btn btn-primary" onclick="openParticipantModal()">
                        ${i18n.t('participant.add')}
                    </button>
                    <button class="btn btn-outline" onclick="showCSVImportModal()" title="Importovat více účastníků z CSV souboru">
                        Import z CSV
                    </button>
                    <button class="btn btn-outline" onclick="autoFillParticipants()">
                        Vložit ukázkové hráče
                    </button>
                    ${list.length > 0 && present < list.length ? `
                    <button class="btn btn-outline" onclick="markAllPresent()">Všichni přítomni</button>` : ''}
                </div>

                ${list.length > 0 ? `
                    <p class="hint">Prezence: kdo nepřišel, toho klepnutím na „Přítomen“ přepněte na „Chybí“. Do losu se nezapočítá.</p>
                    <div class="participants-grid">
                        ${list.map((p, i) => `
                            <div class="participant-card ${p.absent ? 'is-absent' : ''}">
                                <div class="participant-avatar">${Utils.getInitials(p)}</div>
                                <div class="participant-info">
                                    <div class="participant-name">${Utils.getPlayerDisplayName(p)}</div>
                                    <div class="participant-meta">
                                        ${p.club || 'Bez klubu'}${p.seed ? `, nasazení ${p.seed}` : ''}
                                    </div>
                                </div>
                                <button class="presence ${p.absent ? 'off' : 'on'}" onclick="togglePresence(${i})" aria-pressed="${!p.absent}" title="Přepnout prezenci">
                                    ${p.absent ? 'Chybí' : 'Přítomen'}
                                </button>
                                <div class="participant-actions">
                                    <button class="icon-btn icon-btn-sm" onclick="editParticipant(${i})" title="Upravit" aria-label="Upravit ${Utils.getPlayerDisplayNamePlain(p)}">${UI.glyph('edit')}</button>
                                    <button class="icon-btn icon-btn-sm" onclick="removeParticipant(${i})" title="Odebrat" aria-label="Odebrat ${Utils.getPlayerDisplayNamePlain(p)}">${UI.glyph('trash')}</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <p><strong>Zatím tu nikdo není.</strong></p>
                        <p>Přidejte hráče ručně, nahrajte je z CSV (třeba z přihlášek), nebo si turnaj vyzkoušejte s ukázkovými hráči.</p>
                    </div>
                `}

                <div class="button-group">
                    <button class="btn btn-primary" onclick="goToDraw()" ${present < 2 ? 'disabled' : ''}>
                        ${i18n.currentLang === 'cs' ? 'Pokračovat na losování' : 'Continue to Draw'}
                    </button>
                    <button class="btn btn-outline" onclick="goToSetup()">
                        ${i18n.t('btn.back')}
                    </button>
                </div>
            </div>
        `;
    },

    renderDraw() {
        const present = State.current.participants.filter(p => !p.absent).length;
        return `
            <div class="card">
                <h2>${i18n.t('step.draw')}</h2>

                <dl class="facts">
                    <div><dt>Systém</dt><dd>${Utils.getSystemName()}</dd></div>
                    <div><dt>Hráčů v losu</dt><dd>${present}</dd></div>
                    <div><dt>Kurtů</dt><dd>${State.current.numCourts}</dd></div>
                </dl>

                ${State.current.groups.length > 0 ? `
                    ${State.current.matches.length === 0 ? `
                    <p class="hint">Před vygenerováním zápasů můžete hráče přesouvat mezi skupinami tlačítkem ↔ u jména.</p>
                    ` : ''}
                    <div class="groups-grid">
                        ${State.current.groups.map((group, i) => {
                            const letter = String.fromCharCode(65 + i);
                            const color = UI.getGroupColor(letter);
                            const canMove = State.current.matches.length === 0;
                            return `
                            <div class="group-box" style="--group:${color};">
                                <div class="group-box-head"><span class="group-letter">${letter}</span> Skupina ${letter}<span class="group-count">${group.length}</span></div>
                                <ol class="group-list">
                                ${group.map((p, pi) => `
                                    <li>
                                        <span class="group-player">${Utils.getPlayerDisplayName(p)}</span>
                                        ${p.seed ? `<span class="seed-chip" title="Nasazení">${p.seed}</span>` : ''}
                                        ${canMove ? `<button class="icon-btn icon-btn-sm" onclick="openMovePlayerModal(${i}, ${pi})" title="Přesunout do jiné skupiny" aria-label="Přesunout">↔</button>` : ''}
                                    </li>
                                `).join('')}
                                </ol>
                            </div>`;
                        }).join('')}
                    </div>
                ` : ''}

                <div class="button-group">
                    ${State.current.matches.length > 0 ? `
                    <button class="btn btn-primary" onclick="goToMatches()">
                        ${i18n.currentLang === 'cs' ? 'Pokračovat na zápasy' : 'Continue to Matches'}
                    </button>
                    <button class="btn btn-secondary" onclick="performDraw()">
                        ${i18n.currentLang === 'cs' ? 'Přelosovat' : 'Redraw'}
                    </button>
                    <button class="btn btn-secondary" onclick="if(confirm('${i18n.currentLang === 'cs' ? 'Přegenerování smaže všechna zadaná skóre. Opravdu pokračovat?' : 'Regenerating will erase all entered scores. Continue?'}')) Matches.generate()">
                        ${i18n.currentLang === 'cs' ? 'Přegenerovat zápasy' : 'Regenerate Matches'}
                    </button>
                    ` : `
                    <button class="btn ${State.current.system === 'groups' && State.current.groups.length === 0 ? 'btn-primary' : 'btn-secondary'}" onclick="performDraw()">
                        ${State.current.rounds.length > 0 || State.current.groups.length > 0 ? (i18n.currentLang === 'cs' ? 'Přelosovat' : 'Redraw') : (i18n.currentLang === 'cs' ? 'Losovat' : 'Draw')}
                    </button>
                    <button class="btn ${State.current.system === 'groups' && State.current.groups.length === 0 ? 'btn-secondary' : 'btn-primary'}" onclick="Matches.generate()">
                        ${i18n.currentLang === 'cs' ? 'Vygenerovat zápasy' : 'Generate Matches'}
                    </button>
                    `}
                    <button class="btn btn-outline" onclick="goToParticipants()">
                        ${i18n.t('btn.back')}
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
                        <p style="color: var(--text-muted);">Zápasy ještě nejsou vygenerované.</p>
                        <button class="btn btn-primary" onclick="goToDraw()" style="margin-top: 20px;">Přejít na losování</button>
                    </div>
                </div>
            `;
        }

        const total = State.current.matches.length;
        const completed = State.current.matches.filter(m => m.completed).length;
        const playing = State.current.matches.filter(m => m.playing).length;
        const progress = total > 0 ? (completed / total) * 100 : 0;

        const estimatedEnd = Utils.calculateEstimatedTime();

        return `
            <div class="card">
                <h2>${i18n.t('step.matches')}</h2>

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
                        <span>${completed} z ${total} zápasů</span>
                    </div>
                    <div class="progress-bar" role="progressbar" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>

                ${Courts.renderBoard()}

                ${(() => {
                    const conflicts = detectCourtConflicts();
                    if (conflicts.length === 0) return '';
                    return `<div class="conflict-warning" role="alert">
                        <div>
                            <strong>Hráč je na dvou kurtech zároveň</strong>
                            ${conflicts.map(c => `<div style="font-size:0.875em;color:var(--danger);">
                                Hráč <strong>${c.players.join(', ')}</strong> hraje zároveň v zápasech č. ${c.match1 + 1} a ${c.match2 + 1}
                            </div>`).join('')}
                        </div>
                    </div>`;
                })()}

                ${this.renderMatchFilters()}

                ${State.current.playoffBracket
                    ? (State.current.playoffBracket.type === 'positional'
                        ? Playoff.renderPositionalPlayoff()
                        : Playoff.renderBracket())
                    : ''}

                ${State.current.consolationBrackets && State.current.consolationBrackets.length > 0
                    ? Playoff.renderConsolationBrackets()
                    : ''}

                ${State.current.knockoutLosersBrackets && State.current.knockoutLosersBrackets.length > 0
                    ? Playoff.renderLosersBrackets()
                    : ''}

                ${(() => {
                    if (!State.current.playoffBracket || !State.current.knockoutLosers) return '';
                    const generatedRounds = (State.current.knockoutLosersBrackets || []).map(b => b.fromRound);
                    const pendingRounds = Object.keys(State.current.knockoutLosers)
                        .map(Number)
                        .filter(r => !generatedRounds.includes(r));
                    if (pendingRounds.length === 0) return '';
                    return `<div class="card">
                        <h3 style="margin:0 0 12px;">Zápasy o pořadí poražených</h3>
                        <p style="color:var(--text-muted);margin:0 0 15px;font-size:0.9em;">
                            Můžete vygenerovat zápasy pro poražené z jednotlivých kol. Rozhodněte se kdykoliv v průběhu turnaje.
                        </p>
                        <div class="button-group" style="flex-wrap:wrap;">
                            ${pendingRounds.sort((a,b)=>a-b).map(r => {
                                const totalRounds = State.current.playoffBracket.totalRounds;
                                const posEnd = Math.pow(2, totalRounds - r);
                                const posStart = Math.pow(2, totalRounds - r - 1) + 1;
                                const lbl = posStart === posEnd ? `O ${posStart}. místo` : `O ${posStart}.-${posEnd}. místo`;
                                return `<button class="btn btn-secondary" onclick="generateLosersBracketRound(${r})">
                                    Generovat ${lbl}
                                </button>`;
                            }).join('')}
                        </div>
                    </div>`;
                })()}

                ${State.current.system === 'groups' && !State.current.playoffBracket ? this.renderGroupStandings() : ''}

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
                                    <span class="round-count ${roundCompleted ? 'is-done' : ''}">
                                        ${roundCompleted ? 'Dohráno' : `${roundMatches.filter(m => m.completed).length} z ${roundMatches.length}`}
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
                        Generovat ${State.current.swissRound + 1}. kolo
                    </button>
                ` : ''}
                ${State.current.playoffBracket && State.current.playoffBracket.type !== 'positional' && State.current.playoffBracket.currentRound < State.current.playoffBracket.totalRounds - 1 ? `
                    <button class="btn btn-secondary" onclick="advancePlayoffRound()" id="advance-playoff-btn"
                            ${State.current.matches.filter(m => m.knockoutRound === State.current.playoffBracket.currentRound).every(m => m.completed) ? '' : 'disabled'}>
                        Generovat další fázi playoff
                    </button>
                ` : ''}
                ${State.current.system === 'groups' && !State.current.playoffBracket && State.current.matches.filter(m => !m.isPlayoff).every(m => m.completed) && State.current.matches.filter(m => !m.isPlayoff).length > 0 ? `
                    <button class="btn btn-warning" onclick="if(Playoff.generateFromGroups()) UI.render();">
                        ${State.current.playoffType === 'positional' ? 'Vygenerovat poziční finále' : 'Vygenerovat playoff pavouk'}
                    </button>
                ` : ''}
                    <button class="btn btn-primary" onclick="goToResults()">
                        ${i18n.currentLang === 'cs' ? 'Zobrazit výsledky' : 'View Results'}
                    </button>
                    <button class="btn btn-outline" onclick="goToDraw()">${i18n.t('btn.back')}</button>
                </div>
            </div>
        `;
    },

    // Shared podium renderer used by both admin results and spectator completed view
    renderPodium() {
        const standings = State.current.standings;
        const medals = ['🥇', '🥈', '🥉'];
        const podiumOrder = [1, 0, 2]; // silver left, gold center, bronze right
        const podiumLabels = ['1. místo', '2. místo', '3. místo'];

        const podiumItems = podiumOrder
            .filter(i => standings[i])
            .map(i => {
                const s = standings[i];
                const name = Utils.getPlayerDisplayName(s.playerRef || s.player);
                return { medal: medals[i], label: podiumLabels[i], name, pos: i };
            });

        if (podiumItems.length === 0) return '';

        return `
            <div class="sp-podium-wrap">
                <div class="sp-podium">
                    ${podiumItems.map(p => `
                        <div class="sp-podium-card sp-podium-pos-${p.pos}">
                            <div class="sp-podium-medal-icon">${p.pos + 1}</div>
                            <div class="sp-podium-name">${p.name}</div>
                            <div class="sp-podium-label">${p.label}</div>
                            <div class="sp-podium-bar sp-podium-bar-${p.pos}"></div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    renderResults() {
        Stats.calculate();

        const completed = State.current.matches.filter(m => m.completed).length;
        const total = State.current.matches.length;
        const allCompleted = completed === total;
        const isGroups = State.current.system === 'groups';

        const statsGrid = `
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
            </div>`;

        const buttons = `
            <div class="button-group">
                ${allCompleted ? `
                    <button class="btn btn-primary" onclick="saveToHistory()">${i18n.currentLang === 'cs' ? 'Uložit do historie' : 'Save to History'}</button>
                ` : ''}
                <button class="btn btn-secondary" onclick="Export.toCSV()">Stáhnout CSV pro Excel</button>
                <button class="btn btn-secondary" onclick="Export.toJSON()">Stáhnout JSON</button>
                <button class="btn btn-outline" onclick="goToMatches()">${i18n.t('btn.back')}</button>
                ${allCompleted ? `
                    <button class="btn btn-ghost-danger" onclick="if(State.reset()) UI.render()">${i18n.currentLang === 'cs' ? 'Začít nový turnaj' : 'New Tournament'}</button>
                ` : ''}
            </div>`;

        if (isGroups) {
            const bracketHTML = State.current.playoffBracket
                ? (State.current.playoffBracket.type === 'positional'
                    ? Playoff.renderPositionalPlayoff()
                    : Playoff.renderBracket())
                : '';

            const consolationHTML = State.current.consolationBrackets && State.current.consolationBrackets.length > 0
                ? Playoff.renderConsolationBrackets()
                : '';

            return `
                <div class="card">
                    <h2>${i18n.t('step.results')}</h2>
                    ${allCompleted ? `
                        <div class="alert alert-success">Turnaj je dohraný. Gratulujeme vítězům.</div>
                        ${this.renderPodium()}
                    ` : `
                        <div class="alert alert-warning">
                            Zbývá dohrát ${total - completed} z ${total} zápasů. Pořadí je zatím průběžné.
                        </div>
                    `}
                    ${statsGrid}
                    ${this.renderGroupStandings()}
                    ${bracketHTML}
                    ${consolationHTML}
                    ${buttons}
                </div>
            `;
        }

        return `
            <div class="card">
                <h2>${i18n.t('step.results')}</h2>

                ${allCompleted ? `
                    <div class="alert alert-success">Turnaj je dohraný. Gratulujeme vítězům.</div>
                    ${this.renderPodium()}
                ` : `
                    <div class="alert alert-warning">
                        Zbývá dohrát ${total - completed} z ${total} zápasů. Pořadí je zatím průběžné.
                    </div>
                `}

                ${statsGrid}

                <div class="table-wrap"><table class="standings">
                    <thead>
                        <tr>
                            <th>${i18n.t('results.position')}</th><th class="name-cell">${i18n.t('results.player')}</th><th>${i18n.currentLang === 'cs' ? 'Z' : 'M'}</th><th>${i18n.currentLang === 'cs' ? 'V' : 'W'}</th><th>${i18n.currentLang === 'cs' ? 'R' : 'D'}</th><th>${i18n.currentLang === 'cs' ? 'P' : 'L'}</th>
                            <th>${i18n.t('results.sets')}</th><th>${i18n.currentLang === 'cs' ? Utils.scoreUnitLabel() + ' v setech' : 'Set Points'}</th><th>${i18n.t('results.points')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${State.current.standings.map((s, i) => `
                            <tr>
                                <td><span class="position-badge ${i < 3 ? `position-${i + 1}` : ''}">${i + 1}</span></td>
                                <td class="name-cell">${Utils.getPlayerDisplayName(s.playerRef || s.player)}</td>
                                <td>${s.played}</td>
                                <td>${s.wins}</td>
                                <td>${s.draws}</td>
                                <td>${s.losses}</td>
                                <td>${s.setsWon}:${s.setsLost}</td>
                                <td>${s.pointsWon}:${s.pointsLost}</td>
                                <td class="pts-cell">${s.points}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table></div>

                ${buttons}
            </div>
        `;
    },

    // ===== SPECTATOR VIEW =====

    renderSpectatorView() {
        if (!State.current.tournamentName && !State.current.matches.length) {
            return `
                <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                    <div style="font-size:1.1em;font-weight:600;margin-bottom:8px;">Připojuji se k turnaji…</div>
                    <div style="font-size:0.875em;">Pokud se nic nenačte, organizátor možná sdílení ukončil.</div>
                </div>
            `;
        }
        Stats.calculate();

        const numCourts = State.current.numCourts || 1;
        const allMatches = State.current.matches;
        const playingMatches = allMatches.filter(m => m.playing);
        const pendingMatches = allMatches.filter(m => !m.completed && !m.playing);
        const upcomingMatches = Courts.queue(Math.max(numCourts * 2, 4)).map(q => q.m);
        const completed = allMatches.filter(m => m.completed).length;
        const total = allMatches.length;
        const progress = total > 0 ? Math.round(completed / total * 100) : 0;
        const isComplete = completed === total && total > 0;

        const hasPlayoff = !!State.current.playoffBracket;
        const hasGroups = State.current.system === 'groups';

        const tournamentDate = State.current.tournamentDate
            ? new Date(State.current.tournamentDate + 'T00:00:00').toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

        const header = `
            <div class="spectator-header-bar">
                <div class="spectator-header-left">
                    <div class="spectator-tournament-name">${State.current.tournamentName || 'Turnaj'}</div>
                    <div class="spectator-header-meta">
                        ${tournamentDate ? `${tournamentDate}, ` : ''}${numCourts} ${numCourts === 1 ? 'kurt' : numCourts < 5 ? 'kurty' : 'kurtů'}
                    </div>
                </div>
                <div class="spectator-header-right">
                    ${isComplete ? '<span class="spectator-complete-badge">Turnaj dohrán</span>' : '<span class="spectator-live-badge"><span class="live-dot"></span>Živě</span>'}
                    <div class="spectator-progress-wrap" title="${completed} z ${total} zápasů">
                        <div class="spectator-progress-bar-wrap">
                            <div class="spectator-progress-fill" style="width:${progress}%"></div>
                        </div>
                        <span class="spectator-progress-pct">${completed}/${total}</span>
                    </div>
                    ${State.tvMode ? `<span class="tv-clock" id="tv-clock">${new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>` : `
                    <button class="btn btn-outline spectator-save-btn"
                        onclick="if(confirm('Uložit tento turnaj k sobě a upravovat ho?')){State.isShared=false;State.readOnly=false;State.save();window.history.replaceState(null,'',window.location.pathname);Utils.showNotification('Turnaj uložen');UI.render();}">
                        Uložit k sobě
                    </button>`}
                </div>
            </div>`;

        // ── COMPLETED VIEW ────────────────────────────────────────────────
        if (isComplete) {
            return `<div class="spectator-view">${header}${this.renderSpectatorCompleted(hasPlayoff, hasGroups)}</div>`;
        }

        // ── LIVE VIEW ─────────────────────────────────────────────────────
        let standingsContent = '';
        if (hasPlayoff) {
            standingsContent += State.current.playoffBracket.type === 'positional'
                ? this.renderSpectatorPositionalPlayoff()
                : this.renderSpectatorBracket();
        }
        if (hasGroups) {
            standingsContent += `
                <div style="margin-top:${hasPlayoff ? '16px' : '0'};">
                    ${hasPlayoff ? '<h4 class="spectator-subtitle">Skupinová fáze</h4>' : ''}
                    ${this.renderSpectatorGroupStandings()}
                </div>`;
        }
        if (!hasPlayoff && !hasGroups) {
            standingsContent = this.renderSpectatorStandings();
        }

        return `
            <div class="spectator-view">
                ${header}
                <section class="spectator-courts" aria-label="Kurty">
                    <h3 class="spectator-col-title">Na kurtech <span class="spectator-badge">${playingMatches.length}</span></h3>
                    ${Courts.renderSpectatorBoard()}
                </section>
                <div class="spectator-dashboard">
                    <div class="spectator-col">
                        <h3 class="spectator-col-title spectator-col-next">
                            Na řadě
                            <span class="spectator-badge">${upcomingMatches.length}</span>
                        </h3>
                        ${upcomingMatches.length > 0
                            ? upcomingMatches.map((m, i) => this.renderSpectatorMatchCard(m, 'next', i + 1)).join('')
                            : '<div class="spectator-empty">Žádné další zápasy</div>'
                        }
                    </div>
                    <div class="spectator-col spectator-col-wide">
                        <h3 class="spectator-col-title spectator-col-standings">
                            ${hasPlayoff
                                ? (hasGroups ? 'Playoff a skupiny' : 'Playoff')
                                : hasGroups ? 'Tabulky skupin' : 'Průběžné pořadí'}
                        </h3>
                        ${standingsContent}
                    </div>
                </div>
            </div>
        `;
    },

    renderSpectatorCompleted(hasPlayoff, hasGroups) {
        // Build content panels
        const bracketPanel = hasPlayoff ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">
                    ${State.current.playoffBracket.type === 'positional' ? 'Finálové umístění' : 'Playoff pavouk'}
                </div>
                ${State.current.playoffBracket.type === 'positional'
                    ? this.renderSpectatorPositionalPlayoff()
                    : this.renderSpectatorBracket()}
            </div>` : '';

        const groupsPanel = hasGroups ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">Skupinová fáze</div>
                ${this.renderSpectatorGroupStandings()}
            </div>` : '';

        const standingsPanel = !hasPlayoff && !hasGroups ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">Konečné pořadí</div>
                ${this.renderSpectatorStandings()}
            </div>` : '';

        const mainStandingsPanel = (hasPlayoff || hasGroups) ? `
            <div class="spectator-col sp-result-col">
                <div class="spectator-col-title spectator-col-standings">Konečné pořadí</div>
                ${this.renderSpectatorStandings()}
            </div>` : '';

        const contentCols = [bracketPanel, groupsPanel, standingsPanel, mainStandingsPanel]
            .filter(Boolean).join('');

        return `
            ${this.renderPodium()}
            <div class="sp-result-grid">${contentCols}</div>
        `;
    },

    renderSpectatorMatchCard(match, type, position) {
        const idx = State.current.matches.indexOf(match);
        const p1Name = Utils.getPlayerDisplayName(match.player1);
        const p2Name = Utils.getPlayerDisplayName(match.player2);

        let scoreDisplay = '';
        if (type === 'live') {
            const scores = (match.sets || [])
                .filter(s => s && s.score1 !== null && s.score2 !== null)
                .map(s => `<span class="sp-set-score">${s.score1}:${s.score2}</span>`);
            scoreDisplay = scores.length > 0
                ? `<div class="sp-scores">${scores.join('')}</div>`
                : '<div class="sp-scores"><span class="sp-set-score">—</span></div>';
        }

        return `
            <div class="sp-match-card sp-match-${type}">
                <div class="sp-match-meta">
                    ${type === 'next' ? `<span class="sp-next-pos">${position}.</span>` : ''}
                    ${type === 'live' ? `<span class="sp-court-badge">Kurt ${match.court}</span>` : ''}
                    ${match.group ? `<span class="sp-group-badge" style="color:${UI.getGroupColor(match.group)};border-color:${UI.getGroupColor(match.group)}20;">Sk. ${match.group}</span>` : ''}
                    ${match.roundName ? `<span class="sp-round-label">${match.roundName}</span>` : ''}
                    ${type === 'live' && match.startTime
                        ? `<span class="sp-timer" id="spectator-timer-${idx}">${Utils.calculateElapsed(match.startTime)}</span>`
                        : ''}
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
                        <th title="${Utils.scoreUnitLabel()}">${Utils.scoreUnitLabel()}</th>
                        <th title="Body">B</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((s, i) => `
                        <tr class="${i === 0 ? 'sp-gold' : i === 1 ? 'sp-silver' : i === 2 ? 'sp-bronze' : ''}">
                            <td class="sp-pos"><span class="position-badge ${i < 3 ? `position-${i + 1}` : ''}">${i + 1}</span></td>
                            <td class="sp-name">${Utils.getPlayerDisplayName(s.playerRef || s.player)}</td>
                            <td>${s.played}</td>
                            <td class="sp-wins">${s.wins}</td>
                            <td class="sp-sets">${s.setsWon}:${s.setsLost}</td>
                            <td class="sp-balls">${s.pointsWon}:${s.pointsLost}</td>
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
                    <div class="sp-group-header" style="--group:${color};"><span class="group-letter">${letter}</span>Skupina ${letter}</div>
                    <table class="sp-table">
                        <thead><tr><th>#</th><th class="sp-col-name">Hráč</th><th>Z</th><th>V</th><th>Sety</th><th>${Utils.scoreUnitLabel()}</th><th>B</th></tr></thead>
                        <tbody>
                            ${standings.map((s, i) => `
                                <tr class="${i < 2 ? 'sp-qualify' : ''}">
                                    <td class="sp-pos">${i + 1}</td>
                                    <td class="sp-name">${Utils.getPlayerDisplayName(s.playerRef || s.player)}</td>
                                    <td>${s.played}</td>
                                    <td class="sp-wins">${s.wins}</td>
                                    <td class="sp-sets">${s.setsWon}:${s.setsLost}</td>
                                    <td class="sp-balls">${s.pointsWon}:${s.pointsLost}</td>
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
                !m.isThirdPlace &&
                (m.isPlayoff === true || State.current.playoffBracket.isKnockout === true)
            );
            if (roundMatches.length > 0) {
                rounds.push({ round: r, name: Playoff.getRoundName(r, totalRounds), matches: roundMatches });
            }
        }
        const thirdPlaceMatch = State.current.matches.find(m => m.isThirdPlace);
        if (rounds.length === 0 && !thirdPlaceMatch) {
            return '<div class="spectator-empty">Playoff ještě nezačal</div>';
        }

        const renderSpBracketMatch = (m) => {
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
        };

        return `
            <div class="sp-bracket">
                ${rounds.map(round => `
                    <div class="sp-bracket-round">
                        <div class="sp-bracket-round-name">${round.name}</div>
                        ${round.matches.map(renderSpBracketMatch).join('')}
                    </div>
                `).join('')}
                ${thirdPlaceMatch ? `
                    <div class="sp-bracket-round">
                        <div class="sp-bracket-round-name">O 3. místo</div>
                        ${renderSpBracketMatch(thirdPlaceMatch)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderSpectatorPositionalPlayoff() {
        const tiers = {};
        State.current.matches.filter(m => m.isPlayoff && m.positionTier !== undefined).forEach(m => {
            if (!tiers[m.positionTier]) tiers[m.positionTier] = { name: m.roundName, matches: [] };
            if (!tiers[m.positionTier].matches.includes(m)) tiers[m.positionTier].matches.push(m);
        });
        if (Object.keys(tiers).length === 0) return '<div class="spectator-empty">Poziční finále ještě nezačalo</div>';

        return `<div class="sp-bracket">
            ${Object.keys(tiers).sort((a, b) => a - b).map(tier => {
                const { name, matches } = tiers[tier];
                return `
                    <div class="sp-bracket-round">
                        <div class="sp-bracket-round-name">${name}</div>
                        ${matches.map(m => {
                            const p1 = Utils.getPlayerDisplayName(m.player1);
                            const p2 = Utils.getPlayerDisplayName(m.player2);
                            const p1w = m.sets ? m.sets.filter(s => s.score1 !== null && s.score1 > s.score2).length : 0;
                            const p2w = m.sets ? m.sets.filter(s => s.score2 !== null && s.score2 > s.score1).length : 0;
                            const winner = m.completed ? (p1w > p2w ? p1 : p2) : null;
                            return `<div class="sp-bracket-match ${m.playing ? 'sp-bm-live' : ''} ${m.completed ? 'sp-bm-done' : ''}">
                                <div class="sp-bm-player ${winner === p1 ? 'sp-bm-winner' : ''}">${p1}</div>
                                <div class="sp-bm-player ${winner === p2 ? 'sp-bm-winner' : ''}">${p2}</div>
                            </div>`;
                        }).join('')}
                    </div>
                `;
            }).join('')}
        </div>`;
    },

    renderMatchFilters() {
        return `
            <div style="background: var(--bg); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                <div style="flex: 1; min-width: 200px;">
                    <input type="text" id="match-search" placeholder="Hledat hráče"
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
            <section class="group-standings">
                <h3 class="section-title">Tabulky skupin</h3>
                <div class="groups-grid groups-grid-wide">
                    ${Object.keys(groupStandings).map(groupLetter => {
                        const standings = groupStandings[groupLetter];
                        const groupColor = UI.getGroupColor(groupLetter);
                        return `
                            <div class="group-box" style="--group:${groupColor};">
                                <div class="group-box-head"><span class="group-letter">${groupLetter}</span> Skupina ${groupLetter}</div>
                                <div class="table-wrap">
                                    <table class="standings standings-compact">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th class="name-cell">Hráč</th>
                                                <th title="Zápasy">Z</th>
                                                <th title="Výhry">V</th>
                                                <th title="Prohry">P</th>
                                                <th title="Sety">S</th>
                                                <th title="Body">B</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${standings.map((s, i) => `
                                                <tr class="${i < 2 ? 'is-qualified' : ''}">
                                                    <td><span class="position-badge">${i + 1}</span></td>
                                                    <td class="name-cell">${Utils.getPlayerDisplayName(s.playerRef || s.player)}</td>
                                                    <td>${s.played}</td>
                                                    <td>${s.wins}</td>
                                                    <td>${s.losses}</td>
                                                    <td>${s.setsWon}:${s.setsLost}</td>
                                                    <td class="pts-cell">${s.points}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ${standings.length > 0 && standings[0].played > 0 ? `
                                    <div class="group-box-foot">První dva postupují do playoff</div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
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

        document.querySelectorAll('.system-option[data-playoff-type]').forEach(opt => {
            opt.addEventListener('click', () => {
                State.current.playoffType = opt.dataset.playoffType;
                State.save();
                UI.render();
            });
        });

        const thirdPlaceCheckbox = document.getElementById('third-place-match');
        if (thirdPlaceCheckbox) {
            thirdPlaceCheckbox.addEventListener('change', e => {
                State.current.thirdPlaceMatch = e.target.checked;
                State.save();
            });
        }

        const consolationCheckbox = document.getElementById('consolation-bracket');
        if (consolationCheckbox) {
            consolationCheckbox.addEventListener('change', e => {
                State.current.consolationBracket = e.target.checked;
                State.save();
            });
        }

        ['num-courts', 'match-duration', 'break-time', 'num-groups', 'points-win', 'points-draw',
         'best-of', 'points-per-set', 'tiebreak-points', 'points-overtime-win', 'points-overtime-loss'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', e => {
                    const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    State.current[key] = parseInt(e.target.value) || e.target.value;
                    State.save();
                });
            }
        });

        const sportSelect = document.getElementById('sport');
        if (sportSelect) {
            sportSelect.addEventListener('change', e => {
                const presets = {
                    badminton: {
                        bestOf: 3, pointsPerSet: 21, tieBreakPoints: 30, winByTwo: true,
                        pointsForWin: 2, overtimeScoring: false
                    },
                    tennis: {
                        bestOf: 1, pointsPerSet: 10, tieBreakPoints: 20, winByTwo: true,
                        pointsForWin: 3, overtimeScoring: true,
                        pointsForOvertimeWin: 2, pointsForOvertimeLoss: 1, matchDuration: 25
                    }
                };
                const preset = presets[e.target.value];
                State.current.sport = e.target.value;
                if (preset) {
                    Object.assign(State.current, preset);
                }
                State.save();
                UI.render();
            });
        }

        const winByTwoSelect = document.getElementById('win-by-two');
        if (winByTwoSelect) {
            winByTwoSelect.addEventListener('change', e => {
                State.current.winByTwo = e.target.value === '1';
                State.save();
            });
        }

        const overtimeScoringCheckbox = document.getElementById('overtime-scoring');
        if (overtimeScoringCheckbox) {
            overtimeScoringCheckbox.addEventListener('change', e => {
                State.current.overtimeScoring = e.target.checked;
                State.save(); UI.render();
            });
        }

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
        const show = type === 'double' ? 'block' : 'none';
        document.getElementById('partner-group').style.display = show;
        document.getElementById('teamname-group').style.display = show;
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
                <div class="history-grid">
                    ${State.current.history.map(t => `
                        <div class="history-card"
                             onclick="loadTournamentFromHistory(${t.id})"
                             role="button" tabindex="0"
                             aria-label="Načíst turnaj ${t.name}">
                            <div class="history-card-title">${t.name}</div>
                            <div style="font-size:0.875em;color:var(--text-muted);">
                                ${Utils.formatDate(t.date)}<br>
                                ${Utils.getSystemName(t.system)}<br>
                                ${t.participants} účastníků, ${t.matches} zápasů<br>
                                Vítěz: <strong>${t.winner}</strong>
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
        const colors = { A: '#2f6fb0', B: '#2e8a5f', C: '#7a55b5', D: '#c27a12', E: '#c2412d', F: '#1b8a95', G: '#b8467c', H: '#6b8a1f' };
        return colors[letter] || '#2f6fb0';
    },

    // Piktogramy: nákresy kurtu a herních systémů, ikony akcí
    glyph(name) {
        const court = '<rect x="2" y="5" width="44" height="22" rx="1.5"/><path d="M24 5v22" class="g-net"/>';
        const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.4" class="g-fill"/>`;
        const paths = {
            singles: court + dot(13, 16) + dot(35, 16),
            doubles: court + dot(13, 11) + dot(13, 21) + dot(35, 11) + dot(35, 21),
            mixed: court + dot(13, 16) + dot(35, 11) + dot(35, 21),
            roundrobin: (() => {
                const pts = [0, 1, 2, 3, 4].map(i => {
                    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
                    return [24 + 12 * Math.cos(a), 16 + 12 * Math.sin(a)].map(v => v.toFixed(1));
                });
                let d = '';
                for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) d += `M${pts[i][0]} ${pts[i][1]}L${pts[j][0]} ${pts[j][1]}`;
                return `<path d="${d}"/>` + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.2" class="g-fill"/>`).join('');
            })(),
            swiss: '<path d="M10 7h10M28 7h10M14 16h10M32 16h4M10 25h4M22 25h16" />' + [[10, 7], [20, 7], [28, 7], [38, 7], [14, 16], [24, 16], [32, 16], [36, 16], [10, 25], [14, 25], [22, 25], [38, 25]].map(([x, y]) => dot(x, y)).join(''),
            groups: '<rect x="3" y="4" width="15" height="11" rx="2"/><rect x="3" y="18" width="15" height="11" rx="2"/><path d="M18 9.5h7v7h6M18 23.5h7v-7"/><path d="M31 16.5h6v-6h8M37 16.5v6h8"/>',
            knockout: '<path d="M4 6h10v8H4M14 10h10M4 20h10v8H4M14 24h10M24 10v14M24 17h12"/>' + '<circle cx="40" cy="17" r="3" class="g-fill"/>',
            cross: '<path d="M4 7h10l6 9-6 9H4M44 7H34l-6 9 6 9h10"/><path d="M20 16h8"/>',
            positional: '<path d="M6 25h10V13H6zM19 25h10V6H19zM32 25h10V17H32z"/>',
            edit: '<path d="M17 6.5 21.5 11 11 21.5H6.5V17z"/>',
            trash: '<path d="M7 9h14M11 9V6.5h6V9M9 9l1 13h8l1-13"/>'
        };
        const small = name === 'edit' || name === 'trash';
        return `<svg class="${small ? 'g-icon' : 'glyph'}" viewBox="${small ? '0 0 28 28' : '0 0 48 32'}" aria-hidden="true">${paths[name] || ''}</svg>`;
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
