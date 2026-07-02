import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

export async function sendEmail({ to, subject, body, leadData }) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  // Apply placeholders substitution
  const formattedSubject = replacePlaceholders(subject, leadData);
  const formattedBody = replacePlaceholders(body, leadData);

  if (!gmailUser || !gmailPass) {
    console.log(`[MAILER] [SIMULATION] Drafted email for ${to}:\nSubject: ${formattedSubject}\nBody: ${formattedBody}`);
    return {
      simulation: true,
      subject: formattedSubject,
      body: formattedBody
    };
  }

  // Set up Nodemailer transport for Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });

  const mailOptions = {
    from: `"Sales Outreach" <${gmailUser}>`,
    to: to,
    subject: formattedSubject,
    text: formattedBody
  };

  console.log(`[MAILER] Sending email to: ${to} (Subject: "${formattedSubject}")...`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`[MAILER] Email successfully sent. MessageId: ${info.messageId}`);
  return info;
}

function replacePlaceholders(templateStr, data) {
  if (!templateStr) return '';
  
  // Clean owner name formatting
  const ownerName = data.estimated_owner_name && data.estimated_owner_name !== 'Unknown' 
    ? data.estimated_owner_name 
    : 'Owner';

  return templateStr
    .replace(/\{\{business_name\}\}/g, data.business_name || '')
    .replace(/\{\{estimated_owner_name\}\}/g, ownerName)
    .replace(/\{\{quick_pitch_hook\}\}/g, data.quick_pitch_hook || '')
    .replace(/\{\{phone_number\}\}/g, data.phone_number || '')
    .replace(/\{\{location\}\}/g, data.location || '')
    .replace(/\{\{personalized_subject\}\}/g, data.personalized_subject || '')
    .replace(/\{\{personalized_body\}\}/g, data.personalized_body || '');
}
