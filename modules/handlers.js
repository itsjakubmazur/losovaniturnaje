// modules/handlers.js - Všechny event handlery

import { saveData, exportToFile, importFromFile } from './storage.js';
import { renderUI, showNotification, updateParticipantsList } from './ui.js';
import { addParticipant, removeParticipant } from './setup.js';
import { generateRoundRobin, renderRoundRobin } from './roundrobin.js';
import { generateGroups, renderGroups } from './groups.js';
import { generateSwiss, renderSwiss, nextSwissRound } from './swiss.js';
import { generatePlayoffMatches, renderPlayoff } from './playoff.js';

export function initHandlers() {
    // Použít event delegation na document
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('keypress', handleKeypress);
}

function handleClick(e) {
    const target = e.target;
    
    // Dark mode
    if (target.id === 'darkModeBtn') {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    }
    
    // Export
    if (target.id === 'exportBtn') {
        exportToFile();
        addToHistory('data_export', {});
    }
    
    // Přidat účastníka
    if (target.id === 'addParticipantBtn') {
        const input = document.getElementById('newParticipant');
        const name = input.value.trim();
        if (name) {
            addParticipant(name);
            addToHistory('participant_add', { name });
            input.value = '';
            updateParticipantsList();
            saveData();
        }
    }
    
    // Odstranit účastníka
    if (target.classList.contains('remove-participant')) {
        const id = parseInt(target.dataset.id);
        const p = window.tournamentData.participants.find(p => p.id === id);
        removeParticipant(id);
        if (p) addToHistory('participant_remove', { name: p.name });
        updateParticipantsList();
        saveData();
    }
    
    // Spustit turnaj
    if (target.id === 'startTournamentBtn') {
        startTournament();
    }
    
    // Další kolo (švýcar)
    if (target.id === 'nextRoundBtn') {
        nextSwissRound();
        renderSwiss();
        saveData();
    }
    
    // Generovat play-off
    if (target.id === 'playoffBtn') {
        generatePlayoffMatches();
        addToHistory('playoff_generate', { type: window.tournamentData.playoffType });
        window.tournamentData.step = 'playoff';
        renderUI();
        renderPlayoff();
        saveData();
    }
    
    // Zpět na skupiny
    if (target.id === 'backToGroupsBtn') {
        window.tournamentData.step = 'matches';
        renderUI();
        const system = window.tournamentData.system;
        if (system === 'groups') renderGroups();
        saveData();
    }
    
    // Reset
    if (target.id === 'resetBtn') {
        if (confirm('Opravdu resetovat turnaj?')) {
            resetTournament();
        }
    }
    
    // Duplikovat
    if (target.id === 'duplicateBtn') {
        duplicateTournament();
    }
    
    // Tisk
    if (target.id === 'printBtn') {
        window.print();
    }
    
    // Modaly
    if (target.id === 'searchBtn') openModal('searchModal');
    if (target.id === 'statsBtn') {
        openModal('statsModal');
        renderStats();
    }
    if (target.id === 'historyBtn') {
        openModal('historyModal');
        renderHistory();
    }
    if (target.id === 'qrBtn') {
        openModal('qrModal');
        renderQR();
    }
    
    // Zavřít modaly
    if (target.id === 'closeSearchBtn') closeModal('searchModal');
    if (target.id === 'closeStatsBtn') closeModal('statsModal');
    if (target.id === 'closeHistoryBtn') closeModal('historyModal');
    if (target.id === 'closeQRBtn') closeModal('qrModal');
    
    // Klik mimo modal
    if (target.classList.contains('modal')) {
        target.classList.add('hidden');
    }
}

function handleChange(e) {
    const target = e.target;
    
    // Import souboru
    if (target.id === 'importFile') {
        importFromFile(e, () => {
            addToHistory('data_import', {});
            renderUI();
            showNotification('✅ Data importována', 'success');
        });
    }
    
    // Změna systému
    if (target.id === 'systemSelect') {
        window.tournamentData.system = target.value;
        const groupSettings = document.getElementById('groupSettings');
        const swissInfo = document.getElementById('swissInfo');
        
        if (groupSettings) {
            groupSettings.classList.toggle('hidden', target.value !== 'groups');
        }
        if (swissInfo) {
            swissInfo.classList.toggle('hidden', target.value !== 'swiss');
        }
        
        saveData();
    }
}

function handleKeypress(e) {
    // Enter v input pro účastníka
    if (e.target.id === 'newParticipant' && e.key === 'Enter') {
        document.getElementById('addParticipantBtn')?.click();
    }
}

function startTournament() {
    const name = document.getElementById('tournamentName')?.value.trim();
    const participants = window.tournamentData.participants;
    
    if (!name) {
        showNotification('❌ Zadejte název turnaje!', 'error');
        return;
    }
    
    if (participants.length < 2) {
        showNotification('❌ Přidejte alespoň 2 účastníky!', 'error');
        return;
    }
    
    window.tournamentData.name = name;
    window.tournamentData.step = 'matches';
    window.tournamentData.pointSystem = parseInt(document.getElementById('pointSystem')?.value || 2);
    window.tournamentData.tieBreakRules = document.getElementById('tieBreakRules')?.value || 'wins-sets-direct';
    
    const system = window.tournamentData.system;
    
    if (system === 'roundrobin') {
        generateRoundRobin();
        addToHistory('tournament_start', { system: 'RR', participants: participants.length });
        showNotification(`✅ Turnaj "${name}" spuštěn!`, 'success');
    } else if (system === 'groups') {
        const numGroups = parseInt(document.getElementById('numGroups')?.value || 2);
        window.tournamentData.numGroups = numGroups;
        window.tournamentData.playoffType = document.getElementById('playoffType')?.value || 'winners';
        generateGroups(numGroups);
        addToHistory('tournament_start', { system: 'Groups', numGroups, participants: participants.length });
        showNotification(`✅ Skupiny vygenerovány!`, 'success');
    } else if (system === 'swiss') {
        generateSwiss();
        addToHistory('tournament_start', { system: 'Swiss', participants: participants.length });
        showNotification(`✅ Švýcarský systém spuštěn!`, 'success');
    }
    
    renderUI();
    
    // Vykreslit obsah podle systému
    if (system === 'roundrobin') {
        renderRoundRobin();
    } else if (system === 'groups') {
        renderGroups();
    } else if (system === 'swiss') {
        renderSwiss();
    }
    
    saveData();
}

function resetTournament() {
    window.tournamentData.step = 'setup';
    window.tournamentData.matches = [];
    window.tournamentData.groups = [];
    window.tournamentData.playoffMatches = [];
    window.tournamentData.swissRound = 1;
    window.tournamentData.participants = window.tournamentData.participants.map(p => ({
        ...p,
        wins: 0,
        losses: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        points: 0
    }));
    
    addToHistory('tournament_reset', {});
    saveData();
    renderUI();
    showNotification('🔄 Turnaj resetován', 'warning');
}

function duplicateTournament() {
    if (!confirm('Vytvořit nový turnaj se stejnými účastníky?')) return;
    
    const newData = {
        name: window.tournamentData.name + ' (kopie)',
        system: window.tournamentData.system,
        numGroups: window.tournamentData.numGroups,
        playoffType: window.tournamentData.playoffType,
        pointSystem: window.tournamentData.pointSystem,
        tieBreakRules: window.tournamentData.tieBreakRules,
        participants: window.tournamentData.participants.map(p => ({
            ...p,
            wins: 0,
            losses: 0,
            draws: 0,
            setsWon: 0,
            setsLost: 0,
            points: 0
        })),
        matches: [],
        groups: [],
        playoffMatches: [],
        swissRound: 1,
        step: 'setup',
        history: []
    };
    
    Object.assign(window.tournamentData, newData);
    saveData();
    renderUI();
    showNotification('✅ Turnaj duplikován!', 'success');
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

function renderStats() {
    const content = document.getElementById('statsContent');
    if (!content) return;
    
    const participants = window.tournamentData.participants;
    const system = window.tournamentData.system;
    let allMatches = [];
    
    if (system === 'groups') {
        window.tournamentData.groups.forEach(g => {
            allMatches = allMatches.concat(g.matches);
        });
    } else {
        allMatches = window.tournamentData.matches;
    }
    
    const finished = allMatches.filter(m => m.finished).length;
    const total = allMatches.length;
    const percent = total > 0 ? Math.round((finished / total) * 100) : 0;
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <div class="text-sm text-gray-600">Dokončeno zápasů</div>
                <div class="text-2xl font-bold">${finished} / ${total}</div>
                <div class="text-sm text-blue-600">${percent}%</div>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <div class="text-sm text-gray-600">Celkem účastníků</div>
                <div class="text-2xl font-bold">${participants.length}</div>
            </div>
        </div>
    `;
}

function renderHistory() {
    const content = document.getElementById('historyContent');
    if (!content) return;
    
    const history = window.tournamentData.history || [];
    
    if (history.length === 0) {
        content.innerHTML = '<p class="text-gray-500 text-center py-8">Zatím žádná historie</p>';
        return;
    }
    
    const sorted = [...history].reverse();
    
    content.innerHTML = sorted.map(entry => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="bg-gray-50 p-3 rounded-lg mb-2">
                <div class="flex justify-between">
                    <div class="font-semibold">${entry.action}</div>
                    <div class="text-xs text-gray-500">${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderQR() {
    const content = document.getElementById('qrContent');
    if (!content) return;
    
    const data = JSON.stringify(window.tournamentData);
    const encoded = btoa(encodeURIComponent(data));
    const url = window.location.href.split('?')[0] + '?data=' + encoded;
    
    content.innerHTML = `
        <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">Zkopírujte odkaz pro sdílení:</p>
            <input type="text" value="${url}" readonly 
                class="w-full px-3 py-2 border rounded text-sm bg-white mb-2"
                onclick="this.select()">
            <button onclick="navigator.clipboard.writeText('${url}').then(()=>alert('Zkopírováno!'))" 
                class="w-full bg-blue-600 text-white px-4 py-2 rounded">
                📋 Zkopírovat
            </button>
        </div>
    `;
}

function addToHistory(action, details) {
    if (!window.tournamentData.history) {
        window.tournamentData.history = [];
    }
    
    window.tournamentData.history.push({
        timestamp: new Date().toISOString(),
        action,
        details
    });
    
    if (window.tournamentData.history.length > 100) {
        window.tournamentData.history = window.tournamentData.history.slice(-100);
    }
}