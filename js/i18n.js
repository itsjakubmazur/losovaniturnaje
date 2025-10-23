// i18n.js - Internationalization (Multi-language support)

const i18n = {
    currentLang: 'cs',

    translations: {
        cs: {
            // Header
            'tournament.title': 'Losovací web',
            'tournament.subtitle': 'Správa turnajů',

            // Buttons
            'btn.share': 'QR kód - Sdílet',
            'btn.stats': 'Statistiky napříč turnaji',
            'btn.theme': 'Motiv',
            'btn.darkmode': 'Tmavý režim',
            'btn.history': 'Historie',
            'btn.print': 'Tisk',
            'btn.export': 'Export',
            'btn.save': 'Uložit',
            'btn.cancel': 'Zrušit',
            'btn.next': 'Další',
            'btn.back': 'Zpět',
            'btn.add': 'Přidat',
            'btn.edit': 'Upravit',
            'btn.delete': 'Smazat',
            'btn.start': 'Začít',
            'btn.finish': 'Dokončit',

            // Steps
            'step.setup': 'Nastavení',
            'step.participants': 'Účastníci',
            'step.draw': 'Losování',
            'step.matches': 'Zápasy',
            'step.results': 'Výsledky',

            // Setup
            'setup.title': 'Nastavení turnaje',
            'setup.name': 'Název turnaje',
            'setup.date': 'Datum',
            'setup.system': 'Herní systém',
            'setup.courts': 'Počet kurtů',
            'setup.matchDuration': 'Průměrná délka zápasu (min)',
            'setup.pointsWin': 'Body za výhru',
            'setup.pointsDraw': 'Body za remízu',
            'setup.bestOf': 'Best of',
            'setup.pointsPerSet': 'Body na set',

            // Systems
            'system.roundrobin': 'Každý s každým',
            'system.swiss': 'Švýcarský systém',
            'system.groups': 'Skupiny + Playoff',
            'system.knockout': 'Vyřazovací',

            // Participants
            'participant.add': 'Přidat účastníka',
            'participant.edit': 'Upravit účastníka',
            'participant.name': 'Jméno',
            'participant.partner': 'Partner',
            'participant.club': 'Klub/Město',
            'participant.seed': 'Nasazení (1-10)',
            'participant.email': 'E-mail',
            'participant.phone': 'Telefon',
            'participant.type': 'Typ',
            'participant.single': 'Jednotlivec',
            'participant.double': 'Debl (dvojice)',

            // Matches
            'match.round': 'Kolo',
            'match.court': 'Kurt',
            'match.start': 'Začít zápas',
            'match.finish': 'Dokončit',
            'match.edit': 'Upravit',
            'match.notes': 'Poznámky',
            'match.playing': 'Právě hraje',

            // Results
            'results.standings': 'Konečné pořadí',
            'results.position': 'Pořadí',
            'results.player': 'Jméno',
            'results.matches': 'Zápasy',
            'results.wins': 'Výhry',
            'results.draws': 'Remízy',
            'results.losses': 'Prohry',
            'results.sets': 'Sety',
            'results.points': 'Body',

            // Notifications
            'notify.participantAdded': 'Účastník přidán',
            'notify.participantEdited': 'Účastník upraven',
            'notify.participantRemoved': 'Účastník odebrán',
            'notify.drawPerformed': 'Losování provedeno',
            'notify.tournamentSaved': 'Turnaj uložen do historie',
            'notify.exportPDF': 'PDF se generuje...',
            'notify.exportJSON': 'JSON exportován',
            'notify.exportCSV': 'CSV exportován',
            'notify.linkCopied': 'Odkaz zkopírován',

            // Modals
            'modal.share': 'Sdílet turnaj',
            'modal.share.text': 'Naskenujte QR kód pro zobrazení turnaje',
            'modal.stats': 'Statistiky napříč turnaji',
            'modal.stats.text': 'Agregované statistiky ze všech {count} turnajů v historii',
            'modal.export': 'Export dat',
            'modal.history': 'Historie turnajů',
            'modal.theme': 'Vyberte motiv'
        },

        en: {
            // Header
            'tournament.title': 'Tournament Manager',
            'tournament.subtitle': 'Tournament Management',

            // Buttons
            'btn.share': 'QR Code - Share',
            'btn.stats': 'Statistics Across Tournaments',
            'btn.theme': 'Theme',
            'btn.darkmode': 'Dark Mode',
            'btn.history': 'History',
            'btn.print': 'Print',
            'btn.export': 'Export',
            'btn.save': 'Save',
            'btn.cancel': 'Cancel',
            'btn.next': 'Next',
            'btn.back': 'Back',
            'btn.add': 'Add',
            'btn.edit': 'Edit',
            'btn.delete': 'Delete',
            'btn.start': 'Start',
            'btn.finish': 'Finish',

            // Steps
            'step.setup': 'Setup',
            'step.participants': 'Participants',
            'step.draw': 'Draw',
            'step.matches': 'Matches',
            'step.results': 'Results',

            // Setup
            'setup.title': 'Tournament Setup',
            'setup.name': 'Tournament Name',
            'setup.date': 'Date',
            'setup.system': 'Game System',
            'setup.courts': 'Number of Courts',
            'setup.matchDuration': 'Average Match Duration (min)',
            'setup.pointsWin': 'Points for Win',
            'setup.pointsDraw': 'Points for Draw',
            'setup.bestOf': 'Best of',
            'setup.pointsPerSet': 'Points per Set',

            // Systems
            'system.roundrobin': 'Round Robin',
            'system.swiss': 'Swiss System',
            'system.groups': 'Groups + Playoff',
            'system.knockout': 'Knockout',

            // Participants
            'participant.add': 'Add Participant',
            'participant.edit': 'Edit Participant',
            'participant.name': 'Name',
            'participant.partner': 'Partner',
            'participant.club': 'Club/City',
            'participant.seed': 'Seeding (1-10)',
            'participant.email': 'E-mail',
            'participant.phone': 'Phone',
            'participant.type': 'Type',
            'participant.single': 'Singles',
            'participant.double': 'Doubles',

            // Matches
            'match.round': 'Round',
            'match.court': 'Court',
            'match.start': 'Start Match',
            'match.finish': 'Finish',
            'match.edit': 'Edit',
            'match.notes': 'Notes',
            'match.playing': 'Playing Now',

            // Results
            'results.standings': 'Final Standings',
            'results.position': 'Position',
            'results.player': 'Name',
            'results.matches': 'Matches',
            'results.wins': 'Wins',
            'results.draws': 'Draws',
            'results.losses': 'Losses',
            'results.sets': 'Sets',
            'results.points': 'Points',

            // Notifications
            'notify.participantAdded': 'Participant added',
            'notify.participantEdited': 'Participant edited',
            'notify.participantRemoved': 'Participant removed',
            'notify.drawPerformed': 'Draw performed',
            'notify.tournamentSaved': 'Tournament saved to history',
            'notify.exportPDF': 'Generating PDF...',
            'notify.exportJSON': 'JSON exported',
            'notify.exportCSV': 'CSV exported',
            'notify.linkCopied': 'Link copied',

            // Modals
            'modal.share': 'Share Tournament',
            'modal.share.text': 'Scan QR code to view tournament',
            'modal.stats': 'Statistics Across Tournaments',
            'modal.stats.text': 'Aggregated statistics from all {count} tournaments in history',
            'modal.export': 'Export Data',
            'modal.history': 'Tournament History',
            'modal.theme': 'Select Theme'
        }
    },

    // Initialize language from localStorage
    init() {
        const saved = localStorage.getItem('language');
        if (saved && this.translations[saved]) {
            this.currentLang = saved;
        }
        this.updateHTMLLang();
    },

    // Get translation
    t(key, replacements = {}) {
        let text = this.translations[this.currentLang][key] || key;

        // Replace placeholders like {count}
        Object.keys(replacements).forEach(placeholder => {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        });

        return text;
    },

    // Switch language
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.updateHTMLLang();
            // Trigger re-render if UI object exists
            if (typeof UI !== 'undefined' && UI.render) {
                UI.render();
            }
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(lang === 'cs' ? 'Jazyk změněn' : 'Language changed');
            }
        }
    },

    // Update HTML lang attribute
    updateHTMLLang() {
        document.documentElement.lang = this.currentLang;
    },

    // Language selector modal
    showLanguageSelector() {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🌍 ${this.currentLang === 'cs' ? 'Vyberte jazyk' : 'Select Language'}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                    <button class="btn ${this.currentLang === 'cs' ? 'btn-primary' : 'btn-outline'}"
                            onclick="i18n.setLanguage('cs'); this.closest('.modal').remove();">
                        🇨🇿 Čeština
                    </button>
                    <button class="btn ${this.currentLang === 'en' ? 'btn-primary' : 'btn-outline'}"
                            onclick="i18n.setLanguage('en'); this.closest('.modal').remove();">
                        🇬🇧 English
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}
