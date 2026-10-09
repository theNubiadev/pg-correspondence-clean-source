-- Rollback (after backup):
--   DROP TABLE IF EXISTS `correspondence_events`;
--   ALTER TABLE `notifications` MODIFY `type` ENUM('DIRECTED', 'UNATTENDED_REMINDER') NOT NULL;
--   ALTER TABLE `audit_logs` DROP COLUMN `details`;
-- Restore the MySQL dump taken before this migration if counts or references diverge.

-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `details` TEXT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('DIRECTED', 'UNATTENDED_REMINDER', 'CLOSED') NOT NULL;

-- CreateTable
CREATE TABLE `correspondence_events` (
    `id` VARCHAR(191) NOT NULL,
    `correspondence_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `type` ENUM('CREATED', 'UPDATED', 'ADVANCED', 'DISPATCHED', 'CLOSED', 'PARKED_KIV', 'RESUMED_KIV', 'CORRECTED', 'IMPORTED') NOT NULL,
    `from_status` ENUM('RECEIVED', 'AWAITING_PROVOST_ACTION', 'TREATED', 'DISPATCHED', 'CLOSED', 'KIV') NULL,
    `to_status` ENUM('RECEIVED', 'AWAITING_PROVOST_ACTION', 'TREATED', 'DISPATCHED', 'CLOSED', 'KIV') NULL,
    `from_office_id` VARCHAR(191) NULL,
    `to_office_id` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `correspondence_events_correspondence_id_created_at_idx`(`correspondence_id`, `created_at`),
    INDEX `correspondence_events_actor_id_idx`(`actor_id`),
    INDEX `correspondence_events_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `correspondence_events` ADD CONSTRAINT `correspondence_events_correspondence_id_fkey` FOREIGN KEY (`correspondence_id`) REFERENCES `correspondence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `correspondence_events` ADD CONSTRAINT `correspondence_events_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one import event per existing letter without inventing actors or times.
INSERT INTO `correspondence_events` (`id`, `correspondence_id`, `actor_id`, `type`, `from_status`, `to_status`, `from_office_id`, `to_office_id`, `note`, `created_at`)
SELECT CONCAT('imp_', `id`), `id`, NULL, 'IMPORTED', NULL, `status`, NULL, `destination_office_id`, 'Existing register record', `created_at`
FROM `correspondence`;
