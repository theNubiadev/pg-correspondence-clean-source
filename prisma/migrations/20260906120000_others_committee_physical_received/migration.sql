-- Applicant type: Others
ALTER TABLE `correspondence`
  MODIFY COLUMN `applicant_type` ENUM('STUDENT', 'STAFF', 'OTHERS') NOT NULL DEFAULT 'STUDENT';

-- In-app notification when a unit confirms full physical receipt
ALTER TABLE `notifications`
  MODIFY COLUMN `type` ENUM(
    'DIRECTED',
    'UNATTENDED_REMINDER',
    'CLOSED',
    'HANDOFF_AWAITING',
    'PHYSICAL_RECEIVED',
    'PHYSICAL_NOT_RECEIVED',
    'PHYSICAL_RESENT',
    'VIRTUAL_RECORD_MISSING',
    'DISCREPANCY_RESOLVED',
    'HANDOFF_OVERDUE'
  ) NOT NULL;
