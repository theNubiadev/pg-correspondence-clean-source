-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'PROVOST_STAFF', 'DEPARTMENT_STAFF');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."OfficeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."CorrespondenceStatus" AS ENUM ('RECEIVED', 'DIRECTED_TO_OFFICE', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."ApplicantType" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('DIRECTED', 'UNATTENDED_REMINDER');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "user_type" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'PROVOST_STAFF',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "destination_office_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."destination_offices" (
    "id" TEXT NOT NULL,
    "office_name" TEXT NOT NULL,
    "status" "public"."OfficeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destination_offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reference_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL DEFAULT 'PG',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "public"."correspondence" (
    "id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "applicant_type" "public"."ApplicantType" NOT NULL DEFAULT 'STUDENT',
    "student_name" TEXT NOT NULL,
    "matric_number" TEXT NOT NULL DEFAULT '',
    "faculty" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "staff_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "remarks" TEXT,
    "date_received" TIMESTAMP(3) NOT NULL,
    "date_sent_to_office" TIMESTAMP(3),
    "destination_office_id" TEXT NOT NULL,
    "status" "public"."CorrespondenceStatus" NOT NULL DEFAULT 'RECEIVED',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correspondence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "correspondence_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_user_type_idx" ON "public"."users"("user_type");

-- CreateIndex
CREATE INDEX "users_destination_office_id_idx" ON "public"."users"("destination_office_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "public"."sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "public"."sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "public"."password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "public"."password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "destination_offices_office_name_key" ON "public"."destination_offices"("office_name");

-- CreateIndex
CREATE INDEX "destination_offices_status_idx" ON "public"."destination_offices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "correspondence_reference_number_key" ON "public"."correspondence"("reference_number");

-- CreateIndex
CREATE INDEX "correspondence_status_idx" ON "public"."correspondence"("status");

-- CreateIndex
CREATE INDEX "correspondence_date_received_idx" ON "public"."correspondence"("date_received");

-- CreateIndex
CREATE INDEX "correspondence_destination_office_id_idx" ON "public"."correspondence"("destination_office_id");

-- CreateIndex
CREATE INDEX "correspondence_created_by_id_idx" ON "public"."correspondence"("created_by_id");

-- CreateIndex
CREATE INDEX "correspondence_reference_number_idx" ON "public"."correspondence"("reference_number");

-- CreateIndex
CREATE INDEX "correspondence_matric_number_idx" ON "public"."correspondence"("matric_number");

-- CreateIndex
CREATE INDEX "correspondence_student_name_idx" ON "public"."correspondence"("student_name");

-- CreateIndex
CREATE INDEX "correspondence_applicant_type_idx" ON "public"."correspondence"("applicant_type");

-- CreateIndex
CREATE INDEX "correspondence_year_sequence_idx" ON "public"."correspondence"("year", "sequence");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "public"."notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "public"."notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_correspondence_id_type_user_id_idx" ON "public"."notifications"("correspondence_id", "type", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "public"."audit_logs"("module");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_destination_office_id_fkey" FOREIGN KEY ("destination_office_id") REFERENCES "public"."destination_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."correspondence" ADD CONSTRAINT "correspondence_destination_office_id_fkey" FOREIGN KEY ("destination_office_id") REFERENCES "public"."destination_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."correspondence" ADD CONSTRAINT "correspondence_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_correspondence_id_fkey" FOREIGN KEY ("correspondence_id") REFERENCES "public"."correspondence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
