# Meater Card

Eine Lovelace-Karte für Home Assistant, die einen **Meater**-Fleischthermometer-Fühler
kompakt im nativen Home-Assistant-Design darstellt – Farben passen sich automatisch an
Light-/Dark-Theme an.

## Funktionen

- Automatische Erkennung des Meater-Geräts – **keine Entitäts-IDs in der Konfiguration notwendig**
- Anzeige von Innentemperatur, Ziel-Temperatur und Umgebungstemperatur
- Linearer Fortschrittsbalken mit aktuellem Stand und Ziel-Marker
- Verbleibende oder verstrichene Garzeit als lesbare Dauer (z. B. `23 Min. 12 Sek.`)
- Statusanzeige oben rechts (z. B. Kochstatus)
- Passt sich automatisch an, falls ein neues Meater-Gerät mit anderer ID eingerichtet wird

## Installation über HACS

1. HACS → Frontend → Menü (⋮) → **Benutzerdefinierte Repositories**
2. Repository-URL dieses Projekts eintragen, Kategorie **Lovelace** auswählen, hinzufügen
3. „Meater Card" in HACS suchen und installieren
4. Home Assistant neu laden (Browser-Cache leeren, falls die Karte nicht sofort erscheint)

Manuelle Installation (ohne HACS): `meater-card.js` nach `config/www/` kopieren und als
Lovelace-Ressource (`/local/meater-card.js`, Typ **JavaScript-Modul**) hinzufügen.

## Verwendung

### Minimalkonfiguration (empfohlen)

Die Karte erkennt das Meater-Gerät automatisch:

```yaml
type: custom:meater-card
```

### Mit expliziten Entitäten (optional)

Entitäten können manuell überschrieben werden, z. B. wenn mehrere Fühler vorhanden sind:

```yaml
type: custom:meater-card
entity_innen: sensor.meater_probe_<id>_innentemperatur
entity_ziel: sensor.meater_probe_<id>_soll_temperatur
entity_aussen: sensor.meater_probe_<id>_umgebungstemperatur
entity_name: sensor.meater_probe_<id>_kocht
entity_status: sensor.meater_probe_<id>_kochstatus
entity_remaining: sensor.meater_probe_<id>_verbleibende_zeit
entity_elapsed: sensor.meater_probe_<id>_verstrichene_zeit
entity_peak: sensor.meater_probe_<id>_spitzentemperatur
```

### Konfigurationsoptionen

| Option               | Beschreibung                                                        |
|----------------------|---------------------------------------------------------------------|
| `entity_innen`       | Sensor für die Innentemperatur (überschreibt Auto-Discovery)        |
| `entity_ziel`        | Sensor für die Soll-/Zieltemperatur (überschreibt Auto-Discovery)   |
| `entity_aussen`      | Sensor für die Umgebungs-/Ofentemperatur                            |
| `entity_name`        | Sensor, dessen Zustand als Titel/Gericht angezeigt wird             |
| `entity_status`      | Sensor für den Kochstatus (Badge oben rechts)                       |
| `entity_remaining`   | Sensor für die verbleibende Zeit (ISO-Timestamp oder Sekunden)      |
| `entity_elapsed`     | Sensor für die verstrichene Zeit (ISO-Timestamp oder Sekunden)      |
| `entity_peak`        | Sensor für die Spitzentemperatur                                    |
| `name`               | Überschreibt den Titel, falls `entity_name` nicht gesetzt ist       |
| `gauge_min`          | Untergrenze der Fortschrittsanzeige in °C (Standard: `0`)           |
| `gauge_max`          | Obergrenze der Fortschrittsanzeige in °C (Standard: `100`)          |

## Lizenz

MIT
