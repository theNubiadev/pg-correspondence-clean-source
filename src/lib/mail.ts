import "server-only";

/**
 * Thin mail helper. When SMTP is not configured the body is logged so local
 * development still proves the notification path without a real mailbox.
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info(
      `\n[mail] To: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n`,
    );
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
    });

    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ??
        process.env.SMTP_USER ??
        "noreply@pgcollege.ui.edu.ng",
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  } catch (error) {
    console.warn(
      "[mail] SMTP delivery failed:",
      error instanceof Error ? error.message : error,
    );
    console.info(
      `\n[mail:fallback] To: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n`,
    );
  }
}
