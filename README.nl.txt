Lees je warmtepomp of cv-ketel uit in Homey via een EMS-ESP-gateway.

EMS-ESP is een open-source gateway (bijvoorbeeld van BBQKees) die aansluit op de EMS-bus van warmtepompen en ketels van Bosch, Buderus, Nefit, Junkers en Worcester. Deze app praat rechtstreeks met de gateway via je lokale netwerk: geen MQTT-broker en geen handmatige koppeling.

Vul het IP-adres van de gateway in en kies de apparaten op de bus, zoals de warmtepomp en de thermostaat. De app vraagt de gateway welke waarden er zijn en zet ze in Homey: temperaturen, vermogen, compressorstatus, energietellers en meer. Waarden verversen elke 30 seconden en zijn te gebruiken in Flows en Insights.

De namen van de waarden volgen de taal die in de EMS-ESP-webinterface is ingesteld.

De app leest alleen, op één ding na: een schakelaar voor extra warm water bij het thermostaatapparaat. Schakelen vraagt het toegangstoken van de gateway (EMS-ESP-webinterface → Settings → Security → Manage Users → sleutelicoon bij een admin-gebruiker), dat je invult in de instellingen van het thermostaatapparaat. Het token wordt bewaard in die apparaatinstellingen op je Homey en gaat alleen naar je EMS-ESP-gateway in je lokale netwerk, wanneer je de schakelaar gebruikt. Zonder token leest de app alleen en verandert ze niets.

Vereist: EMS-ESP 3.7 of nieuwer.
