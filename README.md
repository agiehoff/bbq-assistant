# Meater Card

Eine Lovelace-Karte für Home Assistant, die einen **Meater**-Fleischthermometer-Fühler
im Stil des offiziellen Meater-App-Widgets darstellt – visuell jedoch an das
Home-Assistant-Design angepasst (Farben passen sich automatisch an
Light-/Dark-Theme an, `ha-card`-Look, native Editor-UI).

![Vorschau](https://raw.githubusercontent.com/YOUR_GITHUB_USER/meater-card/main/preview.png)

## Funktionen

- Drei farbige Kreise für **Innentemperatur**, **Ziel-Temperatur** und
  **Umgebungstemperatur** (analog zum App-Widget)
- Halbrundes Gauge mit Farbverlauf, aktuellem Fortschritts-Pfeil und
  Ziel-Marker
- Anzeige von Gericht/Name, Kochstatus, verbleibender/verstrichener Zeit
  und Spitzentemperatur (alles optional)
- **Alle Entitäten sind über den grafischen Karten-Editor konfigurierbar** –
  kein manuelles YAML notwendig
- Kompatibel mit der HACS Waste/Meater-Integrationsstruktur
  (`sensor.meater_probe_<id>_...`), funktioniert aber mit beliebigen
  Entitäten, die passende Werte liefern

## Installation über HACS

1. HACS → Frontend → Menü (⋮) → **Benutzerdefinierte Repositories**
2. Repository-URL dieses Projekts eintragen, Kategorie **Lovelace**
   auswählen, hinzufügen
3. „Meater Card" in HACS suchen und installieren
4. Home Assistant neu laden (Browser-Cache leeren, falls die Karte nicht
   sofort erscheint)

Manuelle Installation (ohne HACS): `meater-card.js` nach
`config/www/` kopieren und als Lovelace-Ressource
(`/local/meater-card.js`, Typ **JavaScript-Modul**) hinzufügen.

## Verwendung

Karte über **Karte hinzufügen → Meater Card** hinzufügen und im Editor die
gewünschten Entitäten auswählen, oder per YAML:

```yaml
type: custom:meater-card
entity_innen: sensor.meater_probe_c40cca86_innentemperatur
entity_ziel: sensor.meater_probe_c40cca86_soll_temperatur
entity_aussen: sensor.meater_probe_c40cca86_umgebungstemperatur
entity_name: sensor.meater_probe_c40cca86_kocht
entity_status: sensor.meater_probe_c40cca86_kochstatus
entity_remaining: sensor.meater_probe_c40cca86_verbleibende_zeit
entity_elapsed: sensor.meater_probe_c40cca86_verstrichene_zeit
entity_peak: sensor.meater_probe_c40cca86_spitzentemperatur
```

### Konfigurationsoptionen

| Option              | Pflicht | Beschreibung                                            |
|---------------------|:-------:|-----------------------------------------------------------|
| `entity_innen`      | ✅      | Sensor für die Innentemperatur des Fühlers                |
| `entity_ziel`       | ✅      | Sensor für die Soll-/Zieltemperatur                        |
| `entity_aussen`     |         | Sensor für die Umgebungs-/Ofentemperatur                  |
| `entity_name`       |         | Sensor, dessen Zustand als Titel/Gericht angezeigt wird (`Kocht`) |
| `entity_status`     |         | Sensor für den Kochstatus (Chip oben rechts)               |
| `entity_remaining`  |         | Sensor für die verbleibende Zeit                            |
| `entity_elapsed`    |         | Sensor für die verstrichene Zeit                             |
| `entity_peak`       |         | Sensor für die Spitzentemperatur                             |
| `name`              |         | Überschreibt den Titel, falls `entity_name` nicht gesetzt ist |
| `gauge_min`         |         | Untergrenze der Gauge-Skala (Standard `0`)                 |
| `gauge_max`         |         | Obergrenze der Gauge-Skala (Standard `100`)                |
| `show_brand`        |         | Kleines "Meater"-Label oben links ein-/ausblenden (Standard `true`) |

## Lizenz

MIT
