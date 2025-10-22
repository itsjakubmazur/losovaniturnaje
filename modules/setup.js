// modules/setup.js
import { saveData } from './storage.js';

export function renderParticipants() {
    const list = document.getElementById('participantsList');
    const count = document.getElementById('participantCount');
    const participants = window.tournamentData.participants;
    
    count.textContent = participants.length;
    
    list.innerHTML = participants.map((p, index) => `
        <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span class="font-medium text-gray-700">${index + 1}. ${p.name}</span>
            <button onclick="removeParticipant(${p.id})" 
                class="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1">
                🗑️ Odstranit
            </button>
        </div>
    `).join('');
    
    const startBtn = document.getElementById('startButton');
    if (participants.length >= 2) {
        startBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
    }
}

export function addParticipant() {
    const input = document.getElementById('newParticipant');
    const name = input.value.trim();
    
    if (!name) return;
    
    window.tournamentData.participants.push({
        id: Date.now(),
        name: name,
        wins: 0,
        losses: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        points: 0
    });
    
    input.value = '';
    saveData();
}

export function removeParticipant(id) {
    window.tournamentData.participants = window.tournamentData.participants.filter(p => p.id !== id);
    saveData();
}