# 🏸 Badminton Tournament Manager PRO

## ✨ Vylepšení v této verzi:

### ✅ Implementované funkce:

1. **Švýcarský systém** - Postupné párování podle výsledků
2. **Sety** - Best of 3/5, validace skóre (21:19, 21:18...)
3. **Časování** - Stopky, odhady, průměrná délka zápasu
4. **Rozšířené účastníky** - Debly/týmy, fotky, kontakty, nasazení
5. **Pokročilé statistiky** - Head-to-head, průměry, grafy
6. **Live zobrazení** - "Právě hraje", zvýrazněné zápasy
7. **Playoff pavouk** - Po skupinách automatický pavouk
8. **Fronta čekajících** - Kdo hraje další, odhad času
9. **Vizuální vylepšení** - Motivy (modrá/zelená/fialová/oranžová), dark mode, animace
10. **Historie turnajů** - Ukládání dokončených turnajů
11. **Pokročilé losování** - Respektování nasazení, vyvážení skupin

### Nové (kurty, rozhodčí, monitor):

12. **Tabule kurtů** – každý kurt jako malé hřiště; „Vyvolat další zápas“ pošle na volný kurt první zápas, jehož hráči zrovna nehrají (přednost mají odpočatí)
13. **Automatické vyvolávání** – po dohrání zápasu jde na uvolněný kurt rovnou další; volitelně hlasové hlášení („Kurt 2. Novák proti Svobodovi.“)
14. **Prezence** – u účastníka přepínač Přítomen / Chybí; nepřítomní se nelosují
15. **Zápis výsledku rozhodčím přes QR** – rozhodčí naskenuje kód (na kurtu, na kartě zápasu nebo na vytištěném lístku), zadá sety v mobilu a výsledek se organizátorovi zapíše sám (vyžaduje živé sdílení přes Firebase)
16. **Režim pro monitor** – odkaz `#live=…&tv=1` s velkými kurty, frontou a tabulkami pro televizi v hale
17. **Tiskoviny** – zápasové lístky s QR, rozpis zápasů na nástěnku, čísla kurtů na A4

## 📦 Instalace:

1. Stáhni `index.html`
2. Nahraj na GitHub do repozitáře
3. Aktivuj GitHub Pages
4. Hotovo!

## 🎯 Použití:

### Krok 1: Nastavení
- Vyber herní systém (každý s každým / švýcarský / skupiny / vyřazovací)
- Nastav počet kurtů
- Nastav pravidla (body za výhru, best of 3/5, body na set)

### Krok 2: Účastníci
- Přidej účastníky (jednotlivce nebo debly)
- Nastav nasazení (1-10)
- Přidej kontakty, kluby

### Krok 3: Losování
- Proveď losování
- Systém respektuje nasazení

### Krok 4: Zápasy
- Zadávej výsledky po setech
- Spouštěj stopky
- Sleduj frontu čekajících

### Krok 5: Výsledky
- Automatická tabulka
- Statistiky
- Export (JSON/CSV/PDF)
- Ulož do historie

## 💡 Tipy:

- **Švýcarský systém**: Po každém kole klikni "Generovat další kolo"
- **Časování**: Klikni "Začít zápas" pro spuštění stopek
- **Fronta**: Hráči vidí kdy přibližně budou hrát
- **Historie**: Ukládej dokončené turnaje pro pozdější prohlížení

## 🎨 Motivy:

- Modrý (výchozí)
- Zelený
- Fialový
- Oranžový
- + Tmavý režim

## 📊 Export:

- JSON - pro import do jiných systémů
- CSV - pro Excel
- PDF - tisknout (Ctrl+P)

---

**Vytvořeno s ❤️ pro badmintonovou komunitu**
