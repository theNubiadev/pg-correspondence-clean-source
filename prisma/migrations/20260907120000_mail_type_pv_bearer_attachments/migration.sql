-- Mail types: Unit + External
ALTER TABLE `correspondence`
  MODIFY COLUMN `applicant_type` ENUM('STUDENT', 'STAFF', 'UNIT', 'EXTERNAL', 'OTHERS') NOT NULL DEFAULT 'STUDENT';

-- Optional bearer and Finance PV number
ALTER TABLE `correspondence`
  ADD COLUMN `on_behalf_of` VARCHAR(191) NULL AFTER `student_name`,
  ADD COLUMN `pv_number` VARCHAR(64) NULL AFTER `on_behalf_of`;

CREATE UNIQUE INDEX `correspondence_pv_number_key` ON `correspondence`(`pv_number`);

-- Optional letter scans / photos / PDFs
CREATE TABLE `correspondence_attachments` (
  `id` VARCHAR(191) NOT NULL,
  `correspondence_id` VARCHAR(191) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(120) NOT NULL,
  `size_bytes` INT NOT NULL,
  `uploaded_by_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `correspondence_attachments_correspondence_id_idx`(`correspondence_id`),
  INDEX `correspondence_attachments_uploaded_by_id_idx`(`uploaded_by_id`),
  CONSTRAINT `correspondence_attachments_correspondence_id_fkey`
    FOREIGN KEY (`correspondence_id`) REFERENCES `correspondence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `correspondence_attachments_uploaded_by_id_fkey`
    FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
