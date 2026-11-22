# Playbook — brief di passaggio a Claude Code

## Chi è l'utente e come lavora
Preparatore atletico/S&C (basket e altri sport), italiano, NON programmatore. Vuole vedere il risultato a fine di ogni fase e dare l'ok. Risposte e interfaccia in italiano, brevi. Odia le interfacce lente, "giocattolose" o con troppi passaggi.

## Obiettivo
Web app NEUTRA (non di una squadra) per creare programmi di allenamento, assegnarli ad atleti/squadre/clienti e consultarne lo storico. L'atleta riceve solo un PDF. NIENTE area atleta, login atleta, pagamenti, chat, social.

## Requisiti non negoziabili (decisi con l'utente)
1. **Deve funzionare per sempre senza Claude e senza abbonamenti**: costo zero (solo piani gratuiti).
2. **Offline-first + sincronizzata**: stessi dati su PC, tablet e telefono (come Google Sheets), e usabile senza rete (palestra). PWA installabile con service worker.
3. **Stack consigliato**: PWA statica + **Firebase** (Firestore con persistenza offline nativa, Auth con login Google, Hosting) sul piano gratuito. Alternativa: Supabase (attenzione: il piano gratuito mette in pausa il progetto dopo 7 giorni di inattività; l'offline va scritto a mano). Niente Next.js server-side necessario.
4. **PDF**: generazione lato client con CSS di stampa + `window.print()` ("Salva come PDF"), A4, senza librerie esterne (deve funzionare offline). Opzione: librerie vendorizzate nel repo.
5. **AI facoltativa**: generazione/modifica programmi da frase, con la chiave API Anthropic dell'utente salvata solo sul suo dispositivo (chiamata diretta dal browser, header `anthropic-dangerous-direct-browser-access`). Output SEMPRE JSON strutturato. Se la chiave manca, tutto il resto funziona. Dettatura vocale: Web Speech API / tastiera del telefono.
6. **Grafica**: tema scuro minimale stile Relay Athletic (solo ispirazione, NON copiare logo/testi), accento ROSSO (#E5262D), bianco/nero. Layout "foglio" pulito, bottoni grandi su mobile.
7. **Responsive**: PC = griglia completa con mouse; tablet touch; telefono = lista per giorno, non griglia.
8. Lingua UI italiano, struttura pronta per altre lingue.

## Preferenze emerse (importanti)
- **Gli esercizi si scrivono a mano, liberamente** (nessun elenco/picker obbligatorio, niente autocompletamento invadente). La libreria serve all'AI e a chi la vuole; l'AI può proporre esercizi nuovi da confermare con un tocco.
- **Inserimento rapido a testo/voce**: "Back squat 4x5 100kg +5kg rec 2'" → compila serie, rip, carico, recupero, progressione. Esiste già un parser in `reference/quick.js` (`parseLine`) e un prompt per l'AI (`AI_PROMPT`).
- **Progressioni automatiche** di carico/volume (kg, non %): settimana 1 base, le altre calcolate, correzioni manuali conservate. Motore pronto in `reference/core.js` (`PRESETS`, `progVals`, `autoVals`, `recompute`).
- **Struttura sessione tipica**: blocco balistico → potenza → forza arto inferiore + complementari → complementari. Blocchi A,B,C… con esercizi A1,A2… (superset/triset), come nel brief originale.
- **Scheda classica a colonne** con le settimane affiancate (circa 5 settimane), anche per la stampa.
- **Stampa per l'atleta**: celle vuote per scrivere a mano il carico della sessione, colonna "Reale". Vedi `reference/print.js` (`sheetModel`).
- **Atleti e squadre/clienti in UNA sola schermata** (già fatto): dropdown in alto con "Tutti", "+ Nuova squadra o cliente"; nella scheda atleta si crea il gruppo al volo.

## Modello dati
Team(id, nome, colore) · Athlete(id, nome, nascita, ruolo, infortuni/note, contatti, teamIds[]) · Exercise(id, nome, categoria, note) · Program(id, nome, teamId, durataSettimane) · Week · Workout(id, weekId, giorno, titolo) · Block(id, workoutId, lettera, tipo, serie/round, recupero) · BlockExercise(blockId, exerciseId|nome, ordine, serie, reps, carico, recupero, note, progressione) · Assignment(programId, athleteId/teamId, dataInizio, override?) · WorkoutLog(athleteId, workoutId, data, dati reali). Il dropdown squadra filtra TUTTO.

## Stato dei lavori
- **Aggiunte dopo la Fase 2 (richieste dell'utente)**: programma assegnato a un atleta (Program.athleteId; "Assegna" crea una copia per ogni atleta con data di inizio, visibile nella scheda atleta come storico personale; il menu squadra filtra anche i programmi personali degli atleti del gruppo). Annulla/ripristina (Ctrl+Z, Ctrl+Shift+Z/Ctrl+Y e pulsanti ↶ ↷) nell'editor. Pagina "Stampa per l'atleta" separata dall'editor (`src/print.js`): foglio bianco A4 con settimane affiancate (orizzontale, un foglio per allenamento) o una settimana (verticale), kg scritti o vuoti, spazio facoltativo per i kg usati, stampa con window.print() / Salva come PDF.
- **Fase 2 FATTA** (in attesa dell'ok dell'utente). Sorgenti in `playbook/src/` (util, progress, quick, program, app, programs, workout, demo), `python3 playbook/build.py` → `playbook/dist/index.html`. Modello: Programma → Fasi (settimane collegate: stessi esercizi, valori per settimana con progressione automatica, correzioni a mano conservate) → Allenamenti per Giorno 1-7 → Blocchi A/B/C (1 es. = singolo, 2 superset, 3 triset, 4+ circuito) → Righe. "Kg vuoti: li scrive l'atleta" per riga o per tutto il programma. Calendario (compatta/normale/espansa, drag&drop, + Settimana, duplica/elimina settimana, nuova fase da una settimana, dialog Fasi), editor a colonne con settimane affiancate, inserimento rapido e "Scrivi più righe". Telefono: lista per giorno + editor una settimana alla volta. Libreria esercizi rimandata (decisione utente), il JSON resta per l'AI. Dati ancora solo sul dispositivo (IndexedDB): Firestore in Fase 6.
- **Fase 1 FATTA** (prototipo in `playbook/`, JS vanilla in un solo file): shell scura, sidebar collassabile, dropdown squadra, atleti+squadre unificati, dati demo, store offline-first con coda di sincronizzazione (da sostituire con Firestore).
- **Da fare**: Fase 2 libreria + editor a griglia calendario (una riga per settimana, 7 colonne Giorno 1-7, card allenamento con blocchi dalla barra colorata laterale A/B/C/D/E…, viste compatta/normale/espansa, "+ Settimana", Fasi, duplica giorno/settimana, drag&drop); Fase 3 assegnazione (singolo/gruppo/squadra, override per atleta) + storico (calendario+elenco, filtri, allenamenti passati con carichi reali); Fase 4 PDF; Fase 5 AI; Fase 6 mobile + PWA + offline reale.
- Dati demo richiesti: 1 squadra, 5 atleti, 1 programma di 8 settimane già compilato (baseball off-season).
- Libreria: `reference/esercizi-698.json` (array [nome, enfasi, pattern, attrezzatura]).

## Come lavorare
1. Riassumi in poche righe, fai al massimo 3-5 domande, poi costruisci per fasi. 2. Mostra il risultato a fine fase e aspetta l'ok. 3. Chiedi all'utente SOLO i passaggi che richiedono i suoi account (Google/Firebase, eventuale GitHub, chiave API): guidalo passo passo, in italiano, con istruzioni semplici. 4. Testa offline/online e su viewport telefono prima di consegnare.
