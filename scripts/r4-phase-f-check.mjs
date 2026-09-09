/**
 * Round 4 Phase F: event invitations persist with accept/decline responses.
 * Run: node scripts/r4-phase-f-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EVENT_ACCEPT_STANDING,
  EVENT_DECLINE_STANDING,
  EVENT_INVITE_DAY_OF_SEASON,
  EVENT_KIND_MEMBER_DAY,
  EVENT_MAIL_KIND,
  EVENT_RESPOND_DAYS,
  EVENT_RESPONSE_ACCEPT,
  EVENT_RESPONSE_DECLINE,
  STARTING_MACHINE_ID,
} from '../src/data/constants.js';
import { acceptEvent, canRespondToEvent, declineEvent, tickEvents } from '../src/engine/events.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';

assert.equal(EVENT_KIND_MEMBER_DAY, 'memberDay');
assert.equal(EVENT_MAIL_KIND, 'eventInvite');
assert.equal(EVENT_RESPONSE_ACCEPT, 'accept');
assert.equal(EVENT_RESPONSE_DECLINE, 'decline');
assert.equal(EVENT_INVITE_DAY_OF_SEASON, 10);
assert.equal(EVENT_RESPOND_DAYS, 5);
assert.equal(EVENT_ACCEPT_STANDING, 4);
assert.equal(EVENT_DECLINE_STANDING, 3);

const start = createInitialState();
assert.deepEqual(start.eventInvitations, []);
assert.equal(start.inbox.filter((item) => item.kind === EVENT_MAIL_KIND).length, 0);

let before = start;
for (let i = 1; i < EVENT_INVITE_DAY_OF_SEASON; i += 1) {
  before = reducer(before, { type: 'END_DAY' });
}
assert.equal(before.day, EVENT_INVITE_DAY_OF_SEASON);
assert.equal(before.eventInvitations.length, 1);
assert.equal(before.eventInvitations[0].kind, EVENT_KIND_MEMBER_DAY);
assert.equal(before.eventInvitations[0].response, null);
assert.equal(before.eventInvitations[0].respondBy, EVENT_INVITE_DAY_OF_SEASON + EVENT_RESPOND_DAYS);
const mail = before.inbox.find((item) => item.kind === EVENT_MAIL_KIND);
assert.ok(mail);
assert.equal(mail.inviteId, before.eventInvitations[0].id);
assert.equal(mail.deadlineDay, before.eventInvitations[0].respondBy);

const twice = tickEvents(before);
assert.equal(twice.eventInvitations.length, 1);

const inviteId = before.eventInvitations[0].id;
assert.equal(canRespondToEvent(before, inviteId).ok, true);

const accepted = reducer(before, { type: 'ACCEPT_EVENT', inviteId });
assert.equal(accepted.eventInvitations[0].response, EVENT_RESPONSE_ACCEPT);
assert.equal(accepted.gmStanding, before.gmStanding + EVENT_ACCEPT_STANDING);
assert.equal(canRespondToEvent(accepted, inviteId).ok, false);
const again = reducer(accepted, { type: 'ACCEPT_EVENT', inviteId });
assert.equal(again.gmStanding, accepted.gmStanding);

const declined = reducer(before, { type: 'DECLINE_EVENT', inviteId });
assert.equal(declined.eventInvitations[0].response, EVENT_RESPONSE_DECLINE);
assert.equal(declined.gmStanding, before.gmStanding - EVENT_DECLINE_STANDING);

assert.equal(acceptEvent(before, inviteId).eventInvitations[0].response, EVENT_RESPONSE_ACCEPT);
assert.equal(declineEvent(before, inviteId).eventInvitations[0].response, EVENT_RESPONSE_DECLINE);

const migrated = migrateSave({
  day: 4,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
  ownedMachines: [STARTING_MACHINE_ID],
});
assert.deepEqual(migrated.eventInvitations, []);

const officeSrc = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const gameSrc = readFileSync(new URL('../src/engine/gameState.js', import.meta.url), 'utf8');
assert.match(officeSrc, /EVENT_MAIL_KIND/);
assert.match(officeSrc, /onAcceptEvent/);
assert.match(officeSrc, /onDeclineEvent/);
assert.match(appSrc, /ACCEPT_EVENT/);
assert.match(appSrc, /DECLINE_EVENT/);
assert.match(gameSrc, /case 'ACCEPT_EVENT'/);
assert.match(gameSrc, /case 'DECLINE_EVENT'/);

console.log('GATE F1 PASS named event constants exported');
console.log(`GATE F2 PASS invitation arrives on season day ${EVENT_INVITE_DAY_OF_SEASON} with a null response`);
console.log('GATE F3 PASS accept and decline persist on the invitation and change standing in the engine');
console.log('GATE F4 PASS a second answer is a no-op; old saves migrate to an empty invitation list');
console.log('GATE F5 PASS Office inbox can accept or decline');
console.log('round 4 phase F checks passed');
