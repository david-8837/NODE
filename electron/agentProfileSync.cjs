'use strict';

const crypto = require('crypto');

const KEY_SLOTS = [
  'r1c1', 'r1c2', 'r1c3',
  'r2c1', 'r2c2', 'r2c3',
];
const GRID_KEY_SLOTS = [...KEY_SLOTS, 'r3c1', 'r3c2', 'r3c3'];
const ENCODER_SLOT = 'dial-tl';

function revisionOf(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function buildAgentProfilesPayload(profiles, activeProfileIndex) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('At least one saved profile is required for Agent synchronization');
  }
  const ids = new Set();
  const converted = profiles.map((profile) => {
    if (!profile || typeof profile.id !== 'string' || !profile.id.trim() || ids.has(profile.id)) {
      throw new Error('Every saved profile must have a unique identity');
    }
    ids.add(profile.id);
    if (!Array.isArray(profile.layers) || profile.layers.length === 0 || profile.layers.length > 8) {
      throw new Error(`Profile ${profile.id} must contain 1 to 8 layers`);
    }
    const layers = profile.layers.map((layer, layerIndex) => {
      if (!layer || typeof layer !== 'object' || Array.isArray(layer)) {
        throw new Error(`Profile ${profile.id} contains an invalid layer`);
      }
      const slots = {};
      const dial = {};
      for (const slot of GRID_KEY_SLOTS) {
        const entry = layer[slot];
        if (entry) slots[slot] = entry;
      }
      const encoder = layer[ENCODER_SLOT];
      if (encoder && typeof encoder === 'object') {
        const actions = encoder.encoderActions;
        if (actions?.press) slots[ENCODER_SLOT] = actions.press;
        if (actions?.cw) dial.cw = actions.cw;
        if (actions?.ccw) dial.ccw = actions.ccw;
      }
      return { layerIndex, slots, dial };
    });
    return {
      id: profile.id,
      name: typeof profile.name === 'string' ? profile.name : 'Untitled Profile',
      tappingTermMs: 180,
      holdThresholdMs: 300,
      layers,
    };
  });
  const selectedProfile = converted[activeProfileIndex] || converted[0];
  const payload = {
    format: 'node-studio-agent-profiles',
    version: 1,
    activeProfileId: selectedProfile.id,
    profiles: converted,
  };
  return { ...payload, studioRevision: revisionOf(payload) };
}

module.exports = { buildAgentProfilesPayload };
