-- Physical-copy handoffs and orphan intake, plus new event/notification types.

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
    'IMPORTED',
    'HANDOFF_CREATED',
    'PHYSICAL_RECEIVED',
    'PHYSICAL_NOT_RECEIVED',
    'PHYSICAL_RESENT',
    'VIRTUAL_RECORD_MISSING',
    'DISCREPANCY_RESOLVED'
  ) NOT NULL;

ALTER TABLE `notifications`
  MODIFY `type` ENUM(
    'DIRECTED',
    'UNATTENDED_REMINDER',
    'CLOSED',
    'HANDOFF_AWAITING',
    'PHYSICAL_NOT_RECEIVED',
    'PHYSICAL_RESENT',
    'VIRTUAL_RECORD_MISSING',
    'DISCREPANCY_RESOLVED',
    'HANDOFF_OVERDUE'
  ) NOT NULL;

CREATE TABLE `correspondence_handoffs` (
  `id` VARCHAR(191) NOT NULL,
  `correspondence_id` VARCHAR(191) NOT NULL,
  `correspondence_event_id` VARCHAR(191) NULL,
  `from_office_id` VARCHAR(191) NULL,
  `to_office_id` VARCHAR(191) NOT NULL,
  `sent_by_id` VARCHAR(191) NOT NULL,
  `virtual_sent_at` DATETIME(3) NOT NULL,
  `state` ENUM('PENDING', 'RECEIVED', 'NOT_RECEIVED') NOT NULL DEFAULT 'PENDING',
  `current` BOOLEAN NOT NULL DEFAULT TRUE,
  `acknowledged_at` DATETIME(3) NULL,
  `acknowledged_by_id` VARCHAR(191) NULL,
  `resent_at` DATETIME(3) NULL,
  `resent_by_id` VARCHAR(191) NULL,
  `released_at` DATETIME(3) NULL,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `correspondence_handoffs_correspondence_event_id_key` (`correspondence_event_id`),
  INDEX `correspondence_handoffs_correspondence_id_current_idx` (`correspondence_id`, `current`),
  INDEX `correspondence_handoffs_to_office_id_state_current_idx` (`to_office_id`, `state`, `current`),
  INDEX `correspondence_handoffs_from_office_id_idx` (`from_office_id`),
  CONSTRAINT `correspondence_handoffs_correspondence_id_fkey`
    FOREIGN KEY (`correspondence_id`) REFERENCES `correspondence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `correspondence_handoffs_correspondence_event_id_fkey`
    FOREIGN KEY (`correspondence_event_id`) REFERENCES `correspondence_events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `correspondence_handoffs_from_office_id_fkey`
    FOREIGN KEY (`from_office_id`) REFERENCES `destination_offices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `correspondence_handoffs_to_office_id_fkey`
    FOREIGN KEY (`to_office_id`) REFERENCES `destination_offices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `correspondence_handoffs_sent_by_id_fkey`
    FOREIGN KEY (`sent_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `correspondence_handoffs_acknowledged_by_id_fkey`
    FOREIGN KEY (`acknowledged_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `correspondence_handoffs_resent_by_id_fkey`
    FOREIGN KEY (`resent_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `physical_orphan_reports` (
  `id` VARCHAR(191) NOT NULL,
  `reporting_office_id` VARCHAR(191) NOT NULL,
  `reported_by_id` VARCHAR(191) NOT NULL,
  `sending_office_id` VARCHAR(191) NULL,
  `reference_hint` VARCHAR(191) NULL,
  `applicant_name_hint` VARCHAR(191) NULL,
  `subject_hint` VARCHAR(191) NULL,
  `date_physical_received` DATETIME(3) NOT NULL,
  `note` TEXT NOT NULL,
  `status` ENUM('OPEN', 'LINKED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  `linked_correspondence_id` VARCHAR(191) NULL,
  `linked_at` DATETIME(3) NULL,
  `linked_by_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `physical_orphan_reports_status_idx` (`status`),
  INDEX `physical_orphan_reports_reporting_office_id_idx` (`reporting_office_id`),
  INDEX `physical_orphan_reports_sending_office_id_idx` (`sending_office_id`),
  CONSTRAINT `physical_orphan_reports_reporting_office_id_fkey`
    FOREIGN KEY (`reporting_office_id`) REFERENCES `destination_offices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `physical_orphan_reports_sending_office_id_fkey`
    FOREIGN KEY (`sending_office_id`) REFERENCES `destination_offices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `physical_orphan_reports_reported_by_id_fkey`
    FOREIGN KEY (`reported_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `physical_orphan_reports_linked_by_id_fkey`
    FOREIGN KEY (`linked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `physical_orphan_reports_linked_correspondence_id_fkey`
    FOREIGN KEY (`linked_correspondence_id`) REFERENCES `correspondence`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill an open handoff for every letter still assigned to a unit.
INSERT INTO `correspondence_handoffs` (
  `id`,
  `correspondence_id`,
  `from_office_id`,
  `to_office_id`,
  `sent_by_id`,
  `virtual_sent_at`,
  `state`,
  `current`,
  `created_at`,
  `updated_at`
)
SELECT
  CONCAT('hof_', c.id),
  c.id,
  NULL,
  c.destination_office_id,
  c.created_by_id,
  COALESCE(c.date_sent_to_office, c.updated_at),
  'PENDING',
  TRUE,
  NOW(3),
  NOW(3)
FROM `correspondence` c
WHERE c.status IN ('DISPATCHED', 'KIV')
  AND c.destination_office_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `correspondence_handoffs` h WHERE h.correspondence_id = c.id
  );
