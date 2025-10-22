// modules/storage.js
export function loadData() {
    const saved = localStorage.getItem('tournamentData');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(window.tournamentData, data);
    }
}

export function saveData() {
    localStorage.setItem('tournamentData', JSON.stringify(window.tournamentData));
}

export function exportToFile() {
    const data = {
        ...window.tournamentData,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `${window.tournamentData.name.replace(/\s+/g, '_') || 'turnaj'}_${new Date().toISOString().split('T')[0]}.json`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

export function importFromFile(event, callback) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            Object.assign(window.tournamentData, data);
            saveData();
            alert('Data úspěšně importována!');
            if (callback) callback();
        } catch (error) {
            alert('Chyba při načítání souboru!');
        }
    };
    reader.readAsText(file);
}