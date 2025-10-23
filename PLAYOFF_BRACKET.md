# 🏆 Vizuální Playoff Pavouk

## ✨ Nové featury:

### **Vizuální pavouk**
- Zobrazuje celou strukturu playoff
- Horizontální layout (zleva doprava)
- Názvy kol (Osmifinále → Čtvrtfinále → Semifinále → Finále)
- Propojovací čáry mezi koly

### **Interaktivní**
- Kliknutím na zápas v pavouku → scroll na detail
- Zelené zvýraznění vítěze
- Živé zápasy mají oranžovou animaci
- TBD pro zápasy co ještě nejsou určeny

### **Design**
- 🎯 Nasazení hráčů (seed) v kroužcích
- ✅ Dokončené zápasy zelené
- ▶️ Právě hrající zápasy oranžové s animací
- Hover efekt + scroll efekt

---

## 🎯 Jak to vypadá:

```
┌─────────────────────────────────────────────────────────────┐
│                    🏆 Playoff Pavouk                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Osmifinále    Čtvrtfinále    Semifinále       Finále      │
│  ┌────────┐    ┌────────┐    ┌────────┐      ┌────────┐   │
│  │ ① Novák│───→│        │    │        │      │        │   │
│  │   vs   │    │  TBD   │───→│  TBD   │─────→│  TBD   │   │
│  │ ⑧ Horák│    │   vs   │    │   vs   │      │   vs   │   │
│  └────────┘    │  TBD   │    │  TBD   │      │  TBD   │   │
│                └────────┘    └────────┘      └────────┘   │
│  ┌────────┐                                                │
│  │④Svoboda│                                                │
│  │   vs   │                                                │
│  │⑤Černý  │                                                │
│  └────────┘                                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📥 Co stáhnout:

**4 SOUBORY:**

1. **[css/styles.css](computer:///mnt/user-data/outputs/css/styles.css)** - CSS pro pavouk
2. **[js/playoff.js](computer:///mnt/user-data/outputs/js/playoff.js)** - rendering pavouka
3. **[js/ui.js](computer:///mnt/user-data/outputs/js/ui.js)** - zobrazení v UI
4. **[js/matches.js](computer:///mnt/user-data/outputs/js/matches.js)** - data-match atribut
5. **[js/app.js](computer:///mnt/user-data/outputs/js/app.js)** - scroll funkce

---

## 🎮 Jak používat:

1. **Vytvoř knockout turnaj nebo skupiny s playoff**
2. **V sekci Zápasy uvidíš nahoře velký vizuální pavouk**
3. **Klikni na zápas v pavouku → scrollne dolů na detail**
4. **Zadej výsledky → vítěz se zvýrazní zeleně**
5. **Generuj další fázi → pavouk se aktualizuje**

---

## 💡 Tipy:

- **Scroll horizontálně** pokud je pavouk velký (hodně hráčů)
- **Zelený = vítěz** v dokončených zápasech
- **Oranžový = hraje se** živé zápasy
- **TBD = To Be Determined** = ještě neznáme hráče

---

**Enjoy!** 🏆
