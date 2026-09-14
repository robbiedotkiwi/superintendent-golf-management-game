import {
  MORALE_HOME_REASON,
  MORALE_NOSHOW_BELOW,
  SICK_REASON,
  TRAINING_BACK_DAY_REASON,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_OFF_REASON,
  WORKER_ABSENT_REASON,
} from '../data/constants.js';
import { dayOfWeek } from './staff.js';

export function isVolunteerOnDuty(state) {
  return dayOfWeek(state.day) === (state.volunteerWeekday ?? VOLUNTEER_DEFAULT_WEEKDAY);
}

/** Round 5 Phase D: why this worker cannot be assigned today, or null if they can. */
export function workerAbsenceReason(state, worker) {
  if (!worker) return WORKER_ABSENT_REASON;
  if ((worker.minutesToday ?? 0) > 0) return null;
  if (worker.isVolunteer && !isVolunteerOnDuty(state)) {
    return VOLUNTEER_OFF_REASON;
  }
  if (worker.trainingUntilDay && state.day < worker.trainingUntilDay) {
    return TRAINING_BACK_DAY_REASON(worker.name, worker.trainingUntilDay);
  }
  if (worker.sickUntilDay && state.day < worker.sickUntilDay) {
    return SICK_REASON(worker.name);
  }
  if ((worker.morale ?? 50) < MORALE_NOSHOW_BELOW) {
    return MORALE_HOME_REASON(worker.name);
  }
  return WORKER_ABSENT_REASON;
}

export function isWorkerAvailable(state, worker) {
  return workerAbsenceReason(state, worker) === null;
}

export function workerOptionLabel(state, worker) {
  return workerAbsenceReason(state, worker) ?? worker.name;
}
