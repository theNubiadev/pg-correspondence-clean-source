/**
 * Export the full correspondence register to Excel.
 * Usage: tsx --env-file=.env scripts/export-correspondence.ts
 */

import { format } from "date-fns";
import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { STATUS_META } from "../src/lib/constants";
import { formatDate } from "../src/lib/format";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.correspondence.findMany({
    include: {
      destinationOffice: { select: { officeName: true } },
      createdBy: { select: { fullName: true } },
    },
    orderBy: [{ dateReceived: "desc" }, { referenceNumber: "desc" }],
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Register");
  sheet.addRow([
    "Reference",
    "Student",
    "Matric",
    "Faculty",
    "Department",
    "Phone",
    "Subject",
    "Destination",
    "Status",
    "Date received",
    "Date sent to office",
    "Logged by",
  ]);

  for (const row of rows) {
    sheet.addRow([
      row.referenceNumber,
      row.studentName,
      row.matricNumber,
      row.faculty,
      row.department,
      row.phoneNumber,
      row.subject,
      row.destinationOffice?.officeName ?? "",
      STATUS_META[row.status].label,
      formatDate(row.dateReceived),
      row.dateSentToOffice ? formatDate(row.dateSentToOffice) : "",
      row.createdBy.fullName,
    ]);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 18;
  });
  sheet.getColumn(7).width = 40;

  const stamp = format(new Date(), "yyyy-MM-dd");
  const outDir = path.join(process.cwd(), "data", "export");
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `pg-register-${stamp}.xlsx`);
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(file, Buffer.from(buffer));

  console.log(`Exported ${rows.length} correspondence records to ${file}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
