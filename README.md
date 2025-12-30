# DSBScraper
*aka DSB Mobile 2.0*

Nach über einem Jahr Entwicklungszeit ist der DSBScraper endlich free und open-source.
Diese Repository ist zweigeteilt: in den *client* Teil (die Webseite) und den *server* Teil (das API). Unten sind jeweils die Schritte gegeben, wie man den jeweiligen Teil startet.
Dabei wird davon ausgegangen, dass [NodeJS](https://nodejs.org/en) installiert ist und man ein UNIX-ähnliches Terminal nutzt. [VSCode](https://code.visualstudio.com/download) ist optional aber empfohlen.

## Der erste Schritt:
Zuerst muss man diese Repository lokal auf seinen PC klonen. Dies kann man über `git clone https://github.com/Kirillathome/DSBScraper` machen (falls *git* installiert ist) oder von Hand über *<> Code ▼ -> Download ZIP*.

Ab da kann man auf den *client* und den *server* zugreifen.

## Die Webseite (client)
Die folgenden Befehle bitte in dem *client* Ordner ausführen (`cd client/`).
1. `npm install` zum installieren der benötigten Pakete (nur das erste Mal notwendig)
2. `npx astro dev` zum starten des lokalen Servers

Man kann dann auf die Webseite über [localhost:4321](http://localhost:4321) zugreifen.
Sobald man fertig ist mit seinen Änderungen, kann man die Webseite mit `npx astro build` kompilieren (und den Output aus `dist/` auf seinen Server kopieren).

Hier sind Tutorials zum lernen der Basics von [Astro](https://docs.astro.build/en/getting-started/) und [Preact](https://preactjs.com/tutorial).

## Das API (server)

Die folgenden Befehle bitte in dem *server* Ordner ausführen (`cd server/`).
1. `npm install` zum installieren der benötigten Pakete (nur das erste Mal notwendig)
2. in `src/dsbscraper.ts`, die Konstanten `user` und `key` **(Zeile 29 & 30)** auf ihren richtigen Wert setzen **(WICHTIG!)**
3. Die Klausurlisten in den `pdf/` Ordner tun und in `src/exams.ts` registrieren (in der Konstante `available_lists` in **Zeile 30**, eine Template ist in den Kommentaren zu finden)

Und jedes mal wenn man etwas verändert hat und den Server (neu-)starten will:
1. `npx tsc` zum kompilieren
2. `node .` zum starten

Sobald der Server läuft, kann man diesen mit `curl` (oder z.B. einem Tool wie [Insomnia](https://insomnia.rest/) testen), wobei man wo nötig die Header `user` und `key` zum Authentifizieren hinzufügt:

```
$ curl localhost:3000/ping
-> pong

$ curl localhost:3000/dsb
-> {"error":"Unauthorized"}

$ curl -H "user: bepis" -H "key: bepis" localhost:3000/dsb
-> {}

$ curl localhost:3000/bepis
-> 404: nicht gefunden
```