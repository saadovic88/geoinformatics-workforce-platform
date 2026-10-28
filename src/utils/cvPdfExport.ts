import { jsPDF } from 'jspdf';
import type { User } from '../types';

export type CVPdfData = { professionalSummary: string; specializations: string; experienceHighlights: string; educationCertifications: string; languages: string; phone: string; linkedin: string; portfolio: string; location: string };

const writeSection = (doc: jsPDF, title: string, value: string, y: number) => {
  if (!value.trim()) return y;
  doc.setFillColor(232, 241, 252); doc.roundedRect(16, y - 5, 178, 8, 2, 2, 'F');
  doc.setTextColor(22, 59, 109); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(title.toUpperCase(), 20, y);
  doc.setTextColor(35, 48, 66); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(value, 168) as string[];
  if (y + lines.length * 5 + 12 > 278) { doc.addPage(); y = 22; }
  doc.text(lines, 20, y + 8, { lineHeightFactor: 1.35 });
  return y + lines.length * 5 + 16;
};

export function downloadCVPdf(user: User, data: CVPdfData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setFillColor(17, 47, 83); doc.rect(0, 0, 210, 47, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(23); doc.text(user.nameEn, 16, 21);
  doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text(user.jobTitleEn, 16, 29);
  doc.setFontSize(8.5); doc.text(`${user.employeeCode}  |  Geoinformatics for Information Systems`, 16, 36);
  const contact = [data.phone || user.phone, user.email, data.location, data.linkedin, data.portfolio].filter(Boolean).join('  |  ');
  doc.setTextColor(55, 74, 95); doc.setFontSize(8.5); doc.text(doc.splitTextToSize(contact, 178), 16, 57);
  let y = 72;
  y = writeSection(doc, 'Professional Summary', data.professionalSummary, y);
  y = writeSection(doc, 'Specializations & Skills', data.specializations, y);
  y = writeSection(doc, 'Experience Highlights', data.experienceHighlights, y);
  y = writeSection(doc, 'Education & Certifications', data.educationCertifications, y);
  writeSection(doc, 'Languages', data.languages, y);
  doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.text('Generated from the Geoinformatics Workforce Platform', 16, 290);
  doc.save(`${user.nameEn.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '')}-CV.pdf`);
}
