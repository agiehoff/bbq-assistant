/**
 * Meater Card
 * A Home Assistant Lovelace custom card that visualizes a Meater meat
 * thermometer probe, inspired by the layout of the official Meater app
 * widget, adapted to Home Assistant's design language.
 *
 * Repository / distribution: HACS (Lovelace plugin)
 */

const CARD_VERSION = "1.0.0";
const CARD_TAG = "meater-card";
const EDITOR_TAG = "meater-card-editor";

/* eslint-disable no-console */
console.info(
  `%c METEAR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #b8266b; font-weight: 700;",
  "color: #b8266b; background: white; font-weight: 700;"
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

  static getStubConfig(hass) {
    const states = (hass && hass.states) || {};
    const ids = Object.keys(states).filter((id) =>
      id.startsWith("sensor.meater_probe_")
    );

    // Try to find a common device prefix, e.g. sensor.meater_probe_c40cca86
    let prefix = null;
    for (const id of ids) {
      const m = id.match(/^(sensor\.meater_probe_[^_]+)_/);
      if (m) {
        prefix = m[1];
        break;
      }
    }

    if (!prefix) {
      return {
        type: `custom:${CARD_TAG}`,
        entity_innen: "",
        entity_ziel: "",
        entity_aussen: "",
        entity_name: "",
        entity_status: "",
        entity_remaining: "",
        entity_elapsed: "",
        entity_peak: "",
      };
    }

    const pick = (suffix) =>
      states[`${prefix}_${suffix}`] ? `${prefix}_${suffix}` : "";

    return {
      type: `custom:${CARD_TAG}`,
      entity_innen: pick("innentemperatur"),
      entity_ziel: pick("soll_temperatur"),
      entity_aussen: pick("umgebungstemperatur"),
      entity_name: pick("kocht"),
      entity_status: pick("kochstatus"),
      entity_remaining: pick("verbleibende_zeit"),
      entity_elapsed: pick("verstrichene_zeit"),
      entity_peak: pick("spitzentemperatur"),
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Ungültige Konfiguration");
    }
    if (!config.entity_innen || !config.entity_ziel) {
      throw new Error(
        "meater-card: 'entity_innen' und 'entity_ziel' müssen konfiguriert sein."
      );
    }

    this._config = {
      gauge_min: 0,
      gauge_max: 100,
      show_brand: true,
      ...config,
    };
    this._built = false;

    if (this._hass) {
      this._render();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) {
      this._render();
    }
  }

  getCardSize() {
    return 4;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  /* ---------------------------------------------------------------- */

  _buildSkeleton() {
    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px 16px 12px 16px;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .brand {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--secondary-text-color);
          font-weight: 600;
        }
        .status-chip {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--secondary-background-color, rgba(127,127,127,0.15));
          color: var(--secondary-text-color);
        }
        .title {
          font-size: 22px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin: 2px 0 14px 0;
          line-height: 1.2;
        }
        .body {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .circles {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 0 0 auto;
        }
        .circle {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          color: #fff;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
        }
        .circle .val {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.1;
        }
        .circle-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .circle-label {
          font-size: 12px;
          color: var(--secondary-text-color);
          min-width: 46px;
        }
        .circle.innen { background: linear-gradient(135deg, #c026a3, #7c1f9e); }
        .circle.ziel  { background: linear-gradient(135deg, #3d9bf5, #2265d6); }
        .circle.aussen{ background: linear-gradient(135deg, #3fc76e, #1f9e4c); }

        .gauge-wrap {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
        }
        .gauge-wrap svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }
        .center-text {
          text-align: center;
          margin-top: -34px;
        }
        .center-text .line1 {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-text-color);
        }
        .center-text .line2 {
          font-size: 11px;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--divider-color, rgba(127,127,127,0.2));
        }
        .footer-item {
          text-align: center;
          flex: 1;
        }
        .footer-item .flabel {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--secondary-text-color);
        }
        .footer-item .fvalue {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin-top: 2px;
        }
        .hidden { display: none !important; }
      </style>
      <ha-card>
        <div class="header">
          <span class="brand" id="brand">Meater</span>
          <span class="status-chip" id="status"></span>
        </div>
        <div class="title" id="title">Meater</div>
        <div class="body">
          <div class="circles">
            <div class="circle-row">
              <div class="circle innen"><span class="val" id="v-innen">–</span></div>
              <span class="circle-label">Innen</span>
            </div>
            <div class="circle-row">
              <div class="circle ziel"><span class="val" id="v-ziel">–</span></div>
              <span class="circle-label">Ziel</span>
            </div>
            <div class="circle-row" id="row-aussen">
              <div class="circle aussen"><span class="val" id="v-aussen">–</span></div>
              <span class="circle-label">Außen</span>
            </div>
          </div>
          <div class="gauge-wrap">
            <svg id="gauge" viewBox="0 0 210 130" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="track-gradient" x1="10" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#4a2882"/>
                  <stop offset="30%" stop-color="#b8266b"/>
                  <stop offset="55%" stop-color="#e6483f"/>
                  <stop offset="80%" stop-color="#f6a623"/>
                  <stop offset="100%" stop-color="#ffe066"/>
                </linearGradient>
              </defs>
              <path id="track-bg" fill="none" stroke="var(--divider-color, rgba(127,127,127,0.25))" stroke-width="10" stroke-linecap="round"/>
              <path id="track-fill" fill="none" stroke="url(#track-gradient)" stroke-width="10" stroke-linecap="round"/>
              <polygon id="marker-target" points="0,-8 7,5 -7,5" fill="#2a9df4" stroke="var(--card-background-color, #fff)" stroke-width="1.5"/>
              <polygon id="marker-current" points="0,-8 7,5 -7,5" fill="#c026a3" stroke="var(--card-background-color, #fff)" stroke-width="1.5"/>
            </svg>
            <div class="center-text">
              <div class="line1" id="center-line1">Garzeit wird abgeschätzt</div>
              <div class="line2" id="center-line2"></div>
            </div>
          </div>
        </div>
        <div class="footer" id="footer">
          <div class="footer-item hidden" id="foot-peak">
            <div class="flabel">Spitze</div>
            <div class="fvalue" id="v-peak">–</div>
          </div>
          <div class="footer-item hidden" id="foot-elapsed">
            <div class="flabel">Verstrichen</div>
            <div class="fvalue" id="v-elapsed">–</div>
          </div>
          <div class="footer-item hidden" id="foot-remaining">
            <div class="flabel">Verbleibend</div>
            <div class="fvalue" id="v-remaining">–</div>
          </div>
        </div>
      </ha-card>
    `;
    this._els = {
      brand: root.getElementById("brand"),
      status: root.getElementById("status"),
      title: root.getElementById("title"),
      vInnen: root.getElementById("v-innen"),
      vZiel: root.getElementById("v-ziel"),
      vAussen: root.getElementById("v-aussen"),
      rowAussen: root.getElementById("row-aussen"),
      trackBg: root.getElementById("track-bg"),
      trackFill: root.getElementById("track-fill"),
      markerTarget: root.getElementById("marker-target"),
      markerCurrent: root.getElementById("marker-current"),
      centerLine1: root.getElementById("center-line1"),
      centerLine2: root.getElementById("center-line2"),
      footPeak: root.getElementById("foot-peak"),
      vPeak: root.getElementById("v-peak"),
      footElapsed: root.getElementById("foot-elapsed"),
      vElapsed: root.getElementById("v-elapsed"),
      footRemaining: root.getElementById("foot-remaining"),
      vRemaining: root.getElementById("v-remaining"),
    };
    this._built = true;
  }

  /* ---------------------------------------------------------------- */
  /*  Gauge geometry                                                   */
  /* ---------------------------------------------------------------- */

  _pointAtPct(p, cx, cy, r) {
    const angle = Math.PI - p * Math.PI;
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  }

  _updateGauge(currentVal, targetVal) {
    const cx = 105;
    const cy = 115;
    const r = 90;
    const min = this._config.gauge_min;
    const max = this._config.gauge_max;

    const left = this._pointAtPct(0, cx, cy, r);
    const right = this._pointAtPct(1, cx, cy, r);
    this._els.trackBg.setAttribute(
      "d",
      `M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`
    );

    const curPct =
      currentVal === null ? 0 : clamp((currentVal - min) / (max - min), 0, 1);
    const curPoint = this._pointAtPct(curPct, cx, cy, r);
    const largeArc = curPct > 0.5 ? 1 : 0;

    if (currentVal === null || curPct <= 0.001) {
      this._els.trackFill.setAttribute("d", "");
    } else {
      this._els.trackFill.setAttribute(
        "d",
        `M ${left.x} ${left.y} A ${r} ${r} 0 ${largeArc} 1 ${curPoint.x} ${curPoint.y}`
      );
    }

    const curRot = 180 * curPct - 90;
    if (currentVal === null) {
      this._els.markerCurrent.setAttribute("class", "hidden");
    } else {
      this._els.markerCurrent.removeAttribute("class");
      this._els.markerCurrent.setAttribute(
        "transform",
        `translate(${curPoint.x},${curPoint.y}) rotate(${curRot})`
      );
    }

    if (targetVal === null) {
      this._els.markerTarget.setAttribute("class", "hidden");
    } else {
      const tgtPct = clamp((targetVal - min) / (max - min), 0, 1);
      const tgtPoint = this._pointAtPct(tgtPct, cx, cy, r);
      const tgtRot = 180 * tgtPct - 90;
      this._els.markerTarget.removeAttribute("class");
      this._els.markerTarget.setAttribute(
        "transform",
        `translate(${tgtPoint.x},${tgtPoint.y}) rotate(${tgtRot})`
      );
    }
  }

  /* ---------------------------------------------------------------- */

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._built) this._buildSkeleton();

    const hass = this._hass;
    const cfg = this._config;
    const els = this._els;

    // Brand / title
    els.brand.textContent = cfg.title_label || "Meater";
    if (cfg.show_brand === false) {
      els.brand.classList.add("hidden");
    } else {
      els.brand.classList.remove("hidden");
    }

    const foodName =
      (cfg.entity_name && getState(hass, cfg.entity_name)) ||
      cfg.name ||
      cfg.title ||
      "Meater";
    els.title.textContent = foodName;

    // Status chip
    const status = cfg.entity_status ? getState(hass, cfg.entity_status) : null;
    if (status) {
      els.status.textContent = status;
      els.status.classList.remove("hidden");
    } else {
      els.status.classList.add("hidden");
    }

    // Circles
    els.vInnen.textContent = fmtTemp(hass, cfg.entity_innen);
    els.vZiel.textContent = fmtTemp(hass, cfg.entity_ziel);

    if (cfg.entity_aussen) {
      els.rowAussen.classList.remove("hidden");
      els.vAussen.textContent = fmtTemp(hass, cfg.entity_aussen);
    } else {
      els.rowAussen.classList.add("hidden");
    }

    // Gauge
    const innenVal = getNumeric(hass, cfg.entity_innen);
    const zielVal = getNumeric(hass, cfg.entity_ziel);
    this._updateGauge(innenVal, zielVal);

    // Center text
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
      els.centerLine1.textContent = `Noch ${remainingRaw}`;
      els.centerLine2.textContent =
        innenVal !== null && zielVal !== null
          ? `${fmtTemp(hass, cfg.entity_innen)} von ${fmtTemp(hass, cfg.entity_ziel)}`
          : "";
    } else if (elapsedRaw) {
      els.centerLine1.textContent = "Garzeit wird abgeschätzt";
      els.centerLine2.textContent = `Seit ${elapsedRaw}`;
    } else {
      els.centerLine1.textContent = "Garzeit wird abgeschätzt";
      els.centerLine2.textContent = "";
    }

    // Footer
    if (cfg.entity_peak && hasValue(hass, cfg.entity_peak)) {
      els.footPeak.classList.remove("hidden");
      els.vPeak.textContent = fmtTemp(hass, cfg.entity_peak);
    } else {
      els.footPeak.classList.add("hidden");
    }

    if (cfg.entity_elapsed && hasValue(hass, cfg.entity_elapsed)) {
      els.footElapsed.classList.remove("hidden");
      els.vElapsed.textContent = getState(hass, cfg.entity_elapsed);
    } else {
      els.footElapsed.classList.add("hidden");
    }

    if (
      cfg.entity_remaining &&
      hasValue(hass, cfg.entity_remaining) &&
      getState(hass, cfg.entity_remaining).toLowerCase() !== "unbekannt"
    ) {
      els.footRemaining.classList.remove("hidden");
      els.vRemaining.textContent = getState(hass, cfg.entity_remaining);
    } else {
      els.footRemaining.classList.add("hidden");
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
    "Zeigt einen Meater Fleischthermometer-Fühler im Stil der Meater-App an.",
  preview: false,
  documentationURL:
    "https://github.com/YOUR_GITHUB_USER/meater-card",
});
