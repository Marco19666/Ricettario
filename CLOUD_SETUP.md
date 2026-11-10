# Archivio cloud del Ricettario

Il Worker usa Cloudflare Access per identificare l'utente, D1 per i dati e R2 per le fotografie. Il salvataggio locale continua a funzionare anche prima della configurazione cloud.

## Risorse da creare in Cloudflare
1. Crea un database D1 chiamato `ricettario-db`.
2. Apri il database, scegli **Console** ed esegui il contenuto di `migrations/0001_recipes.sql`.
3. Crea un bucket R2 chiamato `ricettario-foto`.
4. Nel Worker `ricettario`, apri **Settings → Bindings** e aggiungi un binding D1 con variabile `DB` e un binding R2 con variabile `PHOTOS`.
5. In Cloudflare Zero Trust crea **Access → Applications → Self-hosted** per proteggere il dominio dell'app. Aggiungi una regola Allow per il tuo indirizzo e-mail.
6. Imposta nelle variabili del Worker `CF_ACCESS_TEAM_DOMAIN` (per esempio `mio-team.cloudflareaccess.com`) e `CF_ACCESS_AUD` (Application Audience/AUD Tag dell'applicazione Access).
7. Salva le impostazioni e ridistribuisci il Worker.

## Privacy
Le API personali verificano la firma del token JWT di Cloudflare Access. Ogni query D1 è filtrata per l'identificativo dell'utente autenticato; le fotografie sono archiviate con chiavi separate per utente. Non rendere pubblici il database D1 o il bucket R2.

## Prima sincronizzazione
Quando si apre **Le mie ricette**, l'app importa sul tablet le ricette già presenti nel cloud. Le nuove ricette e le foto vengono inviate al cloud al momento del salvataggio. Quando si apre **Le mie ricette** con il cloud configurato, le ricette già presenti sul tablet vengono caricate automaticamente insieme alle fotografie disponibili.
