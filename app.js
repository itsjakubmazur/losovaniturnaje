// app.js - Hlavní vstupní bod aplikace

// Globální data
window.tournamentData = {
    name: '',
    system: 'roundrobin',
    numGroups: 2,
    playoffType: 'winners',
    pointSystem: 2,
    tieBreakRules: 'wins-sets-direct',
    participants: [],
    matches: [],
    groups: [],
    playoffMatches: [],
    swissRound: 1,
    step: 'setup',
    history: []
};

// Import modulů
import { loadData, saveData } from './modules/storage.js';
import { renderUI } from './modules/ui.js';
import { initHandlers } from './modules/handlers.js';
import { initPWA } from './modules/pwa.js';

// Inicializace aplikace
async function init() {
    try {
        // Načíst uložená data
        loadData();
        
        // Vykreslit UI
        renderUI();
        
        // Inicializovat event handlery
        initHandlers();
        
        // Inicializovat PWA
        initPWA();
        
        // Dark mode
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
        
        console.log('✅ Aplikace inicializována');
    } catch (error) {
        console.error('❌ Chyba při inicializaci:', error);
        alert('Chyba při načítání aplikace. Zkuste obnovit stránku.');
    }
}

// Spustit po načtení stránky
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}