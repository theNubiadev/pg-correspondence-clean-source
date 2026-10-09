-- New letters start awaiting Provost action.
-- Re-routes between units are recorded as FORWARDED events.

ALTER TABLE `correspondence`
  MODIFY `status` ENUM(
    'RECEIVED',
    'AWAITING_PROVOST_ACTION',
    'TREATED',
    'DISPATCHED',
    'CLOSED',
    'KIV'
  ) NOT NULL DEFAULT 'AWAITING_PROVOST_ACTION';

ALTER TABLE `correspondence_events`
  MODIFY `type` ENUM(
    'CREATED',
    'UPDATED',
    'ADVANCED',
    'DISPATCHED',
    'FORWARDED',
    'CLOSED',
    'PARKED_KIV',
    'RESUMED_KIV',
    'CORRECTED',
    'IMPORTED'
  ) NOT NULL;
