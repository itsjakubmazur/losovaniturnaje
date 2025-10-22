// modules/pwa.js - Progressive Web App support

export function initPWA() {
    // Service Worker registrace
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker registrován');
                })
                .catch(error => {
                    console.log('Service Worker registrace selhala:', error);
                });
        });
    }
    
    // Install prompt
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Zobrazit prompt po 3 sekundách (pokud nebyl zamítnut)
        if (!localStorage.getItem('pwaPromptDismissed')) {
            setTimeout(() => {
                showInstallPrompt(deferredPrompt);
            }, 3000);
        }
    });
    
    // Detekce standalone módu
    window.addEventListener('DOMContentLoaded', () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || window.navigator.standalone 
            || document.referrer.includes('android-app://');
        
        if (isStandalone) {
            console.log('✅ Aplikace běží v standalone módu');
        }
    });
}

function showInstallPrompt(deferredPrompt) {
    const container = document.getElementById('pwa-prompt');
    
    container.innerHTML = `
        <div class="pwa-card">
            <div class="flex items-start gap-3">
                <div class="text-4xl">📱</div>
                <div class="flex-1">
                    <h4 class="font-bold text-gray-800 mb-1">Instalovat aplikaci?</h4>
                    <p class="text-sm text-gray-600 mb-3">Přidejte si Badminton Turnaje na plochu pro rychlý přístup!</p>
                    <div class="flex gap-2">
                        <button id="pwaInstallBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-sm">
                            Instalovat
                        </button>
                        <button id="pwaDismissBtn" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded font-semibold text-sm">
                            Později
                        </button>
                    </div>
                </div>
                <button id="pwaCloseBtn" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
        </div>
    `;
    
    // Event handlers
    document.getElementById('pwaInstallBtn')?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ PWA instalována');
            }
            
            deferredPrompt = null;
            container.innerHTML = '';
        }
    });
    
    document.getElementById('pwaDismissBtn')?.addEventListener('click', () => {
        container.innerHTML = '';
        localStorage.setItem('pwaPromptDismissed', 'true');
    });
    
    document.getElementById('pwaCloseBtn')?.addEventListener('click', () => {
        container.innerHTML = '';
        localStorage.setItem('pwaPromptDismissed', 'true');
    });
}