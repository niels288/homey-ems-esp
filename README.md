# EMS-ESP voor Homey

Homey Pro-app voor een [EMS-ESP](https://emsesp.org)-gateway (BBQKees) op een
Bosch/Buderus/Nefit-warmtepomp of -ketel. Je vult alleen het IP-adres van de
gateway in; de app leest zelf welke waarden er zijn en maakt ze aan in Homey.
Geen MQTT-broker nodig.

**Status:** in ontwikkeling, alleen lezen. Getest met een Nefit EnviLine
(EMS-ESP 3.6.3).

## Installeren (ontwikkelversie)

```bash
npm install -g homey
homey login
homey app run        # of: homey app install
```

Daarna in Homey: *Apparaat toevoegen → EMS-ESP → IP-adres van de gateway*.
Kies welke EMS-apparaten (warmtepomp/ketel, thermostaat) je wilt toevoegen.
Bij het eerste starten leest de app ongeveer 20 seconden de waarden uit.

## Ontwikkelen

```bash
npm test                              # unit tests, geen Homey nodig
npx biome check .                     # lint + format
node scripts/discover.js 10.99.1.253  # toont welke capabilities een gateway oplevert
```

Werkafspraken staan in [`AGENTS.md`](AGENTS.md), keuzes in [`docs/adr`](docs/adr).
