/**
 * Meater Card
 * A Home Assistant Lovelace custom card that visualizes a Meater meat
 * thermometer probe. Layout inspired by the official Meater app widget,
 * but built entirely from Home Assistant's own visual language (ha-card,
 * ha-icon, theme variables) for a clean, native, non-square look.
 *
 * Repository / distribution: HACS (Lovelace plugin)
 */

const CARD_VERSION = "2.0.0";
const CARD_TAG = "meater-card";
const EDITOR_TAG = "meater-card-editor";

/* eslint-disable no-console */
console.info(
  `%c METEAR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #44739e; font-weight: 700;",
  "color: #44739e; background: white; font-weight: 700;"
);

/* -------------------------------------------------------------------- */
/*  Helpers                                                              */
/* -------------------------------------------------------------------- */

const UNAVAILABLE_STATES = ["unavailable", "unknown", "", undefined, null];

function hasValue(hass, entityId) {
  if (!entityId || !hass || !hass.states || !hass.states[entityId]) {
    return false;
  }
  return !UNAVAILABLE_STATES.includes(hass.states[entityId].state);
}

function getState(hass, entityId) {
  if (!hasValue(hass, entityId)) return null;
  return hass.states[entityId].state;
}

function getNumeric(hass, entityId) {
  const s = getState(hass, entityId);
  if (s === null) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function getUnit(hass, entityId) {
  if (!entityId || !hass || !hass.states || !hass.states[entityId]) return "";
  return hass.states[entityId].attributes?.unit_of_measurement || "";
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function fmtSeconds(s) {
  s = Math.round(s);
  if (isNaN(s) || s < 0) return "–";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} Std. ${m} Min.`;
  if (m > 0) return `${m} Min. ${sec} Sek.`;
  return `${sec} Sek.`;
}

function fmtElapsed(raw) {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return fmtSeconds(parseFloat(raw));
  return fmtSeconds(Math.max(0, (Date.now() - d.getTime()) / 1000));
}

function fmtRemaining(raw) {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return fmtSeconds(parseFloat(raw));
  return fmtSeconds(Math.max(0, (d.getTime() - Date.now()) / 1000));
}

function fmtTemp(hass, entityId, fallback = "–") {
  const n = getNumeric(hass, entityId);
  if (n === null) return fallback;
  const unit = getUnit(hass, entityId) || "°C";
  return `${n.toFixed(1).replace(/\.0$/, "")}${unit}`;
}

/* -------------------------------------------------------------------- */
/*  Card                                                                 */
/* -------------------------------------------------------------------- */

class MeaterCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return { type: `custom:${CARD_TAG}` };
  }

  _discoverEntities(hass) {
    const states = (hass && hass.states) || {};
    const cfg = this._config;

    // If all mandatory fields are explicitly set, use them as-is
    if (cfg.entity_innen && cfg.entity_ziel) return cfg;

    // Find first Meater probe prefix in hass states
    let prefix = null;
    for (const id of Object.keys(states)) {
      const m = id.match(/^(sensor\.meater_probe_[^_]+)_/);
      if (m) { prefix = m[1]; break; }
    }
    if (!prefix) return cfg;

    const pick = (key, suffix) =>
      cfg[key] || (states[`${prefix}_${suffix}`] ? `${prefix}_${suffix}` : "");

    return {
      ...cfg,
      entity_innen:    pick("entity_innen",    "innentemperatur"),
      entity_ziel:     pick("entity_ziel",     "soll_temperatur"),
      entity_aussen:   pick("entity_aussen",   "umgebungstemperatur"),
      entity_name:     pick("entity_name",     "kocht"),
      entity_status:   pick("entity_status",   "kochstatus"),
      entity_remaining:pick("entity_remaining","verbleibende_zeit"),
      entity_elapsed:  pick("entity_elapsed",  "verstrichene_zeit"),
      entity_peak:     pick("entity_peak",     "spitzentemperatur"),
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Ungültige Konfiguration");
    this._config = { gauge_min: 0, gauge_max: 100, ...config };
    this._built = false;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) {
      this._render();
    }
  }

  getCardSize() {
    return 3;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    if (this._config && this._hass) {
      this._render();
    }
  }

  /* ---------------------------------------------------------------- */

  _buildSkeleton() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 12px 16px 14px 16px;
          overflow: hidden;
        }

        /* ---- Header ---- */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .header-text {
          min-width: 0;
        }
        .title {
          font-size: 1.2em;
          font-weight: 500;
          color: var(--ha-card-header-color, var(--primary-text-color));
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status-chip {
          flex: 0 0 auto;
          font-size: 12px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 12px;
          background: var(--secondary-background-color, rgba(127,127,127,0.15));
          color: var(--secondary-text-color);
          white-space: nowrap;
        }

        /* ---- Metrics row ---- */
        .metrics {
          display: flex;
          align-items: stretch;
        }
        .metric {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 4px 2px;
          min-width: 0;
        }
        .metric + .metric {
          border-left: 1px solid var(--divider-color, rgba(127,127,127,0.15));
        }
        .metric-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12);
        }
        .metric-icon ha-icon {
          --mdc-icon-size: 20px;
          color: var(--primary-color);
        }
        .metric-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--primary-text-color);
          line-height: 1.1;
        }
        .metric-label {
          font-size: 11px;
          color: var(--secondary-text-color);
        }

        /* ---- Progress ---- */
        .progress-section {
          margin-top: 14px;
        }
        .progress-status {
          text-align: center;
          font-size: 13px;
          color: var(--primary-text-color);
          margin-bottom: 8px;
        }
        .progress-status .sub {
          display: block;
          font-size: 11px;
          color: var(--secondary-text-color);
          margin-top: 1px;
          font-weight: 400;
        }
        .progress-track {
          position: relative;
          height: 8px;
          border-radius: 4px;
          background: var(--divider-color, rgba(127,127,127,0.25));
          margin: 0 4px;
        }
        .progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0%;
          border-radius: 4px;
          background: var(--primary-color);
          transition: width 0.4s ease;
        }
        .progress-target {
          position: absolute;
          top: -3px;
          width: 2px;
          height: 14px;
          border-radius: 1px;
          background: var(--primary-text-color);
          opacity: 0.6;
          transform: translateX(-1px);
        }

        .hidden { display: none !important; }
      </style>
      <ha-card>
        <div class="header">
          <div class="header-text">
            <div class="title" id="title">Meater</div>
          </div>
          <span class="status-chip hidden" id="status"></span>
        </div>

        <div class="metrics">
          <div class="metric">
            <div class="metric-icon"><ha-icon icon="mdi:thermometer"></ha-icon></div>
            <div class="metric-value" id="v-innen">–</div>
            <div class="metric-label">Innen</div>
          </div>
          <div class="metric">
            <div class="metric-icon"><ha-icon icon="mdi:thermometer-check"></ha-icon></div>
            <div class="metric-value" id="v-ziel">–</div>
            <div class="metric-label">Ziel</div>
          </div>
          <div class="metric" id="metric-aussen">
            <div class="metric-icon"><ha-icon icon="mdi:grill-outline"></ha-icon></div>
            <div class="metric-value" id="v-aussen">–</div>
            <div class="metric-label">Außen</div>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-status">
            <span id="center-line1">Garzeit wird abgeschätzt</span>
            <span class="sub" id="center-line2"></span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="progress-fill"></div>
            <div class="progress-target" id="progress-target"></div>
          </div>
        </div>

      </ha-card>
    `;
    this._els = {
      status: root.getElementById("status"),
      title: root.getElementById("title"),
      vInnen: root.getElementById("v-innen"),
      vZiel: root.getElementById("v-ziel"),
      vAussen: root.getElementById("v-aussen"),
      metricAussen: root.getElementById("metric-aussen"),
      progressFill: root.getElementById("progress-fill"),
      progressTarget: root.getElementById("progress-target"),
      centerLine1: root.getElementById("center-line1"),
      centerLine2: root.getElementById("center-line2"),
    };
    this._built = true;
  }

  /* ---------------------------------------------------------------- */
  /*  Progress bar                                                     */
  /* ---------------------------------------------------------------- */

  _updateProgress(currentVal, targetVal) {
    const min = this._config.gauge_min;
    const max = this._config.gauge_max;

    const curPct =
      currentVal === null ? 0 : clamp((currentVal - min) / (max - min), 0, 1);
    this._els.progressFill.style.width = `${curPct * 100}%`;

    if (targetVal === null) {
      this._els.progressTarget.classList.add("hidden");
    } else {
      const tgtPct = clamp((targetVal - min) / (max - min), 0, 1);
      this._els.progressTarget.classList.remove("hidden");
      this._els.progressTarget.style.left = `${tgtPct * 100}%`;
    }
  }

  /* ---------------------------------------------------------------- */

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._built) this._buildSkeleton();

    const hass = this._hass;
    const cfg = this._discoverEntities(hass);
    const els = this._els;

    const foodName =
      (cfg.entity_name && getState(hass, cfg.entity_name)) ||
      cfg.name ||
      cfg.title ||
      "Meater";
    els.title.textContent = foodName;
    els.title.title = foodName;

    // Status chip
    const status = cfg.entity_status ? getState(hass, cfg.entity_status) : null;
    els.status.classList.toggle("hidden", !status);
    if (status) els.status.textContent = status;

    // Metrics
    els.vInnen.textContent = fmtTemp(hass, cfg.entity_innen);
    els.vZiel.textContent = fmtTemp(hass, cfg.entity_ziel);

    if (cfg.entity_aussen) {
      els.metricAussen.classList.remove("hidden");
      els.vAussen.textContent = fmtTemp(hass, cfg.entity_aussen);
    } else {
      els.metricAussen.classList.add("hidden");
    }

    // Progress
    const innenVal = getNumeric(hass, cfg.entity_innen);
    const zielVal = getNumeric(hass, cfg.entity_ziel);
    this._updateProgress(innenVal, zielVal);

    // Status text
    const remainingRaw = cfg.entity_remaining
      ? getState(hass, cfg.entity_remaining)
      : null;
    const elapsedRaw = cfg.entity_elapsed
      ? getState(hass, cfg.entity_elapsed)
      : null;

    if (
      remainingRaw &&
      !["unbekannt", "unknown", "0"].includes(remainingRaw.toLowerCase())
    ) {
      els.centerLine1.textContent = `Noch ${fmtRemaining(remainingRaw)}`;
      els.centerLine2.textContent =
        innenVal !== null && zielVal !== null
          ? `${fmtTemp(hass, cfg.entity_innen)} von ${fmtTemp(hass, cfg.entity_ziel)}`
          : "";
    } else if (elapsedRaw) {
      els.centerLine1.textContent = "Garzeit wird abgeschätzt";
      els.centerLine2.textContent = `Seit ${fmtElapsed(elapsedRaw)}`;
    } else {
      els.centerLine1.textContent = "Garzeit wird abgeschätzt";
      els.centerLine2.textContent = "";
    }

  }
}

/* -------------------------------------------------------------------- */
/*  Editor                                                               */
/* -------------------------------------------------------------------- */

class MeaterCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  _schema() {
    return [
      {
        name: "entity_innen",
        required: true,
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "entity_ziel",
        required: true,
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "entity_aussen",
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "entity_name",
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "entity_status",
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "entity_remaining",
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "entity_elapsed",
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "entity_peak",
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "name",
        selector: { text: {} },
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "gauge_min", selector: { number: { mode: "box" } } },
          { name: "gauge_max", selector: { number: { mode: "box" } } },
        ],
      },
      {
        name: "show_brand",
        selector: { boolean: {} },
      },
    ];
  }

  _computeLabel(schema) {
    const labels = {
      entity_innen: "Innentemperatur (Pflichtfeld)",
      entity_ziel: "Soll-/Zieltemperatur (Pflichtfeld)",
      entity_aussen: "Umgebungstemperatur",
      entity_name: "Gericht / Speisenname (z. B. 'Kocht')",
      entity_status: "Kochstatus",
      entity_remaining: "Verbleibende Zeit",
      entity_elapsed: "Verstrichene Zeit",
      entity_peak: "Spitzentemperatur",
      name: "Titel überschreiben (optional)",
      gauge_min: "Skala Minimum (°C)",
      gauge_max: "Skala Maximum (°C)",
      show_brand: "Marken-Label anzeigen",
    };
    return labels[schema.name] || schema.name;
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._hass || !this._config) {
      this.shadowRoot.innerHTML = "";
      return;
    }

    this.shadowRoot.innerHTML = `<style>ha-form{display:block;padding:8px 0;}</style>`;

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = {
      gauge_min: 0,
      gauge_max: 100,
      show_brand: true,
      ...this._config,
    };
    form.schema = this._schema();
    form.computeLabel = this._computeLabel.bind(this);

    form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const newConfig = { ...this._config, ...ev.detail.value };
      this._config = newConfig;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: newConfig },
          bubbles: true,
          composed: true,
        })
      );
    });

    this.shadowRoot.appendChild(form);
  }
}

/* -------------------------------------------------------------------- */
/*  Registration                                                         */
/* -------------------------------------------------------------------- */

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, MeaterCard);
}
if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, MeaterCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: "Meater Card",
  description:
    "Zeigt einen Meater Fleischthermometer-Fühler kompakt im nativen Home-Assistant-Design an.",
  preview: false,
  documentationURL:
    "https://github.com/YOUR_GITHUB_USER/meater-card",
});
