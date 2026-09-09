import { DISEASE_OUTBREAK_THRESHOLD } from '../data/constants.js';
import {
  approachingOutbreak,
  holeDiseasePressure,
  holeSprayUntil,
  holeTreatmentUntil,
} from './disease.js';
import { holeKind, presentHoles } from './holes.js';

export function inputsStatus(state, surface) {
  const holes = presentHoles(state, surface);
  const kind = holeKind(surface);
  const fertCovered = [];
  const fertOpen = [];
  const sprayCovered = [];
  const sprayOpen = [];
  let pressureSum = 0;
  let approaching = false;
  let outbreak = false;
  let fertUntil = 0;
  let sprayUntil = 0;

  for (const hole of holes) {
    const record = hole[kind];
    const fert = holeTreatmentUntil(record, state.fertiliserUntil?.[surface]);
    const spray = holeSprayUntil(record, state.sprayedUntil?.[surface]);
    const pressure = holeDiseasePressure(state, record, surface);
    pressureSum += pressure;
    if (approachingOutbreak(pressure)) approaching = true;
    if (pressure >= DISEASE_OUTBREAK_THRESHOLD) outbreak = true;
    if (fert > state.day) {
      fertCovered.push(hole.id);
      if (!fertUntil || fert < fertUntil) fertUntil = fert;
    } else {
      fertOpen.push(hole.id);
    }
    if (spray > state.day) {
      sprayCovered.push(hole.id);
      if (!sprayUntil || spray < sprayUntil) sprayUntil = spray;
    } else {
      sprayOpen.push(hole.id);
    }
  }

  return {
    pressure: holes.length ? pressureSum / holes.length : 0,
    approaching,
    outbreak,
    fertCovered,
    fertOpen,
    sprayCovered,
    sprayOpen,
    fertUntil,
    sprayUntil,
    partialFert: fertCovered.length > 0 && fertOpen.length > 0,
    partialSpray: sprayCovered.length > 0 && sprayOpen.length > 0,
  };
}
