import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

import './App.css';
import logoImage from './assets/image.png';
import bgImage from './assets/background.jpg';

function App() {
  // Existing fields
  const [name, setName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [date, setDate] = useState('');
  const [indexRows, setIndexRows] = useState([
    { sno: '1', content: 'Seminars & Technical Talks' },
    { sno: '2', content: 'Hands-on Workshops' },
    { sno: '3', content: 'Add-on Programs' },
    { sno: '4', content: 'Centre of Excellence' },
    { sno: '5', content: 'Custom Programs' }
  ]);
  const [mode, setMode] = useState('generate'); // 'generate' | 'edit'
  const [selectedFile, setSelectedFile] = useState(null); // PDF file

  // NEW: Add DOCX support
  const [fileType, setFileType] = useState('pdf'); // 'pdf' | 'docx'
  const [selectedWordFile, setSelectedWordFile] = useState(null); // DOCX file

  // NEW: fields that correspond to highlighted/variable text in your PDF
  // Cover / Letter page (Page 1)
  const [recipientTitle, setRecipientTitle] = useState('THE PRINCIPAL');
  const [recipientDept, setRecipientDept] = useState('Department of Computer Applications');
  const [recipientCollege, setRecipientCollege] = useState('Dayananda Sagar College of Arts, Science and Commerce');
  const [recipientCity, setRecipientCity] = useState('Bengaluru');
  const [letterDate, setLetterDate] = useState('July 30, 2025'); // or bind to `date`
  const [salutation, setSalutation] = useState('Greetings!');
  const [signoffName, setSignoffName] = useState('Team SwipeGen');

  // Contract / Compensation (Page ~4)
  const [compensationPerStudent, setCompensationPerStudent] = useState('100'); // INR per student
  const [advancePercent, setAdvancePercent] = useState('50'); // 50%
  const [postPercent, setPostPercent] = useState('50'); // remainder after 70%
  const [cancelDays, setCancelDays] = useState('5'); // days window for cancellation penalty
  const [cancelForfeitPercent, setCancelForfeitPercent] = useState('50');

  // Exhibit B / Attribute Detail table (Last page)
  const [targetAudience, setTargetAudience] = useState('MCA Students');
  const [semester, setSemester] = useState('Semester 2');
  const [durationHours, setDurationHours] = useState('30');
  const [programDate, setProgramDate] = useState('TBD');
  const [noOfStudents, setNoOfStudents] = useState('120');
  const [batchesNote, setBatchesNote] = useState('This proposal has been prepared assuming two batches of 60 students each.');

  // Utility (PDF)
  const handlePDFUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  // Utility (DOCX)
  const handleWordUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedWordFile(file);
  };

  /** Helper to blank an area and write new text (PDF) */
  const drawReplace = (page, {
    x, y, w, h, text, font, size = 12, color = rgb(0, 0, 0),
    lineHeight = 14, align = 'left'
  }) => {
    // White patch old content
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1) });

    // Very simple text wrap
    const maxCharsPerLine = Math.max(1, Math.floor((w / (size * 0.55))));
    const words = (text || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = (line ? line + ' ' : '') + word;
      if (test.length > maxCharsPerLine) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);

    let drawY = y + h - lineHeight; // start top-down
    lines.forEach(l => {
      let drawX = x + 4;
      if (align === 'center') drawX = x + (w / 2) - (l.length * size * 0.27);
      if (align === 'right') drawX = x + w - 4 - (l.length * size * 0.55);
      page.drawText(l, { x: drawX, y: drawY, size, font, color });
      drawY -= lineHeight;
    });
  };

  // -------- PDF EDITING (kept from your app, tuned to your Sample.pdf) --------
  const editPDF = async () => {
    if (!selectedFile) return alert('Please upload a PDF file');

    const reader = new FileReader();
    reader.readAsArrayBuffer(selectedFile);
    reader.onload = async () => {
      const existingPdfBytes = reader.result;
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 0: Cover letter with recipient block & date
      const safePage = (idx) => pages[idx] ? pages[idx] : null;

      const p0 = safePage(0);
      if (p0) {
        // Recipient block
        drawReplace(p0, {
          x: 60, y: 620, w: 480, h: 120,
          text: `${recipientTitle}\n${recipientDept}\n${recipientCollege}\n${recipientCity}`,
          font: fontBold, size: 12, color: rgb(0, 0, 0), lineHeight: 16
        });

        // Date
        drawReplace(p0, {
          x: 420, y: 585, w: 150, h: 20,
          text: letterDate || date, font: font, size: 12, color: rgb(0, 0, 0)
        });

        // Salutation
        drawReplace(p0, {
          x: 60, y: 560, w: 200, h: 20,
          text: salutation, font: fontBold, size: 12, color: rgb(0, 0, 0)
        });

        // Sign-off name
        drawReplace(p0, {
          x: 60, y: 220, w: 200, h: 24,
          text: signoffName, font: fontBold, size: 12, color: rgb(0, 0, 0)
        });
      }

      // Page ~4 (index 3): Compensation & Cancellation
      const p3 = safePage(3);
      if (p3) {
        drawReplace(p3, {
          x: 60, y: 680, w: 480, h: 18,
          text: `The total cost to be paid to the Trainer by the Client for the services hereunder shall be INR ${compensationPerStudent} per student.`,
          font: font, size: 12, color: rgb(0, 0, 0)
        });

        drawReplace(p3, {
          x: 60, y: 658, w: 480, h: 36,
          text: `At least ${advancePercent}% of the payment needs to be completed before the commencement of the training and remaining amount (${postPercent}%) to be paid after completion of 70% of the training.`,
          font: font, size: 12, color: rgb(0, 0, 0), lineHeight: 14
        });

        drawReplace(p3, {
          x: 60, y: 565, w: 480, h: 60,
          text: `The Client agrees and acknowledges that a change in the schedule may be a significant burden for the Trainer and thus the Client shall forfeit ${cancelForfeitPercent}% of the amount already paid to the Trainer if the Client must cancel the training services within ${cancelDays} days of the date on which the training services are to be scheduled.`,
          font: font, size: 12, color: rgb(0, 0, 0), lineHeight: 14
        });
      }

      // LAST PAGE: Exhibit B
      const lastIdx = pages.length - 1;
      const pLast = safePage(lastIdx);
      if (pLast) {
        drawReplace(pLast, {
          x: 250, y: 680, w: 280, h: 18,
          text: targetAudience, font: fontBold, size: 12, color: rgb(0, 0, 0)
        });
        drawReplace(pLast, {
          x: 250, y: 656, w: 280, h: 18,
          text: semester, font: fontBold, size: 12, color: rgb(0, 0, 0)
        });
        drawReplace(pLast, {
          x: 250, y: 632, w: 280, h: 18,
          text: `${durationHours} hours of Training`, font: fontBold, size: 12, color: rgb(0, 0, 0)
        });
        drawReplace(pLast, {
          x: 250, y: 608, w: 280, h: 18,
          text: programDate, font: fontBold, size: 12, color: rgb(0, 0, 0)
        });
        drawReplace(pLast, {
          x: 250, y: 584, w: 280, h: 18,
          text: noOfStudents, font: fontBold, size: 12, color: rgb(0, 0, 0)
        });
        drawReplace(pLast, {
          x: 60, y: 520, w: 500, h: 40,
          text: batchesNote, font: font, size: 12, color: rgb(0, 0, 0), lineHeight: 14
        });
      }

      // Optional: Index page
      const indexCandidates = [2, 1, 0, 3, lastIdx].filter(i => i >= 0 && i < pages.length);
      let indexPage = pages[2] || pages[indexCandidates[0]];
      if (indexPage) {
        const indexYStart = 640;
        const lineSpacing = 18;

        indexPage.drawRectangle({
          x: 40,
          y: indexYStart - (indexRows.length + 6) * lineSpacing,
          width: 520,
          height: (indexRows.length + 6) * lineSpacing,
          color: rgb(1, 1, 1)
        });

        let y = indexYStart;
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        indexPage.drawText(`Index`, { x: 50, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.6) });
        y -= lineSpacing;
        indexPage.drawText(`Name: ${name}`, { x: 50, y, size: 12, font, color: rgb(0.1, 0.2, 0.7) });
        y -= lineSpacing;
        indexPage.drawText(`College: ${collegeName}`, { x: 50, y, size: 12, font, color: rgb(0.1, 0.2, 0.7) });
        y -= lineSpacing;
        indexPage.drawText(`Date: ${date || letterDate}`, { x: 50, y, size: 12, font, color: rgb(0.1, 0.2, 0.7) });
        y -= lineSpacing;

        indexRows.forEach(row => {
          indexPage.drawText(`${row.sno}. ${row.content}`, { x: 60, y, size: 11, font, color: rgb(0.1, 0.2, 0.7) });
          y -= lineSpacing;
        });
      }

      // Save + download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Edited-SwipeGen.pdf';
      link.click();
      URL.revokeObjectURL(link.href);
    };
  };

  // -------- DOCX EDITING (new) --------
  // Expects a .docx with placeholders like {{recipientTitle}}, {{recipientDept}}, {{compensationPerStudent}}, etc.
  const editDOCX = async () => {
    if (!selectedWordFile) return alert('Please upload a DOCX file');

    const arrayBuffer = await selectedWordFile.arrayBuffer();

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Build the data map from the same fields you use for PDF
    const data = {
      // Basic
      name,
      collegeName,
      date: date || letterDate,

      // Cover / letter
      recipientTitle,
      recipientDept,
      recipientCollege,
      recipientCity,
      letterDate,
      salutation,
      signoffName,

      // Compensation & cancellation
      compensationPerStudent,
      advancePercent,
      postPercent,
      cancelDays,
      cancelForfeitPercent,

      // Exhibit B
      targetAudience,
      semester,
      durationHours,
      programDate,
      noOfStudents,
      batchesNote,

      // Index table: also provide array for tables/loops if template uses it
      indexRows,
    };

    try {
      doc.render(data);
    } catch (error) {
      console.error('Docxtemplater render error:', error);
      return alert('Failed to render the DOCX. Make sure your template placeholders match the field names.');
    }

    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const url = URL.createObjectURL(out);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Edited-SwipeGen.docx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // -------- PDF GENERATION (unchanged) --------
  const generatePDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    const bg = await fetch(bgImage).then(res => res.blob());
    const bgReader = new FileReader();
    bgReader.readAsDataURL(bg);
    bgReader.onloadend = () => {
      doc.addImage(bgReader.result, 'JPEG', 0, 0, 210, 297);
      doc.addImage(logoImage, 'PNG', 150, 10, 40, 20);

      doc.setFontSize(18).setFont('helvetica', 'bold');
      doc.text("SwipeGen Training Proposal", 20, 20);
      doc.setFontSize(12).setFont('helvetica', 'normal');
      doc.text(`Name: ${name}`, 20, 30);
      doc.text(`College Name: ${collegeName}`, 20, 38);
      doc.text(`Date: ${date || letterDate}`, 20, 46);

      doc.setFontSize(14).setFont('helvetica', 'bold');
      doc.text("Index", 20, 60);
      doc.setFontSize(11);

      let y = 70;
      indexRows.forEach(row => {
        doc.text(`${row.sno}. ${row.content}`, 25, y);
        y += 8;
      });

      doc.save('SwipeGen-Custom-Proposal.pdf');
    };
  };

  const handleIndexChange = (i, field, value) => {
    const updated = [...indexRows];
    updated[i][field] = value;
    setIndexRows(updated);
  };

  const addRow = () => setIndexRows([...indexRows, { sno: (indexRows.length + 1).toString(), content: '' }]);
  const removeRow = (i) => setIndexRows(indexRows.filter((_, idx) => idx !== i));

  return (
    <div
      className="app-container"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        minHeight: '100vh',
        padding: '40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="form-card" style={{ maxWidth: 980 }}>
        <img src={logoImage} alt="Logo" style={{ width: 80, margin: '0 auto 20px', display: 'block' }} />
        <h2>📄 SwipeGen Proposal Editor (PDF & Word)</h2>

        {/* Mode + File type */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 16 }}>
          <div className="mode-toggle">
            <label>
              <input type="radio" checked={mode === 'generate'} onChange={() => setMode('generate')} /> Generate PDF
            </label>
            <label style={{ marginLeft: 16 }}>
              <input type="radio" checked={mode === 'edit'} onChange={() => setMode('edit')} /> Edit Existing
            </label>
          </div>

          {mode === 'edit' && (
            <div className="filetype-toggle">
              <label style={{ marginLeft: 24 }}>
                <input type="radio" checked={fileType === 'pdf'} onChange={() => setFileType('pdf')} /> PDF
              </label>
              <label style={{ marginLeft: 16 }}>
                <input type="radio" checked={fileType === 'docx'} onChange={() => setFileType('docx')} /> Word (.docx)
              </label>
            </div>
          )}
        </div>

        {/* Basic fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input type="text" placeholder="Enter Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" placeholder="Enter College Name" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="text" placeholder="Alternate Letter Date (e.g., July 30, 2025)" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} />
        </div>

        {/* Cover page (green highlights) */}
        <h4 style={{ marginTop: 20 }}>Cover Letter (Green-highlight fields)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input type="text" placeholder="Recipient Title" value={recipientTitle} onChange={(e) => setRecipientTitle(e.target.value)} />
          <input type="text" placeholder="Recipient Department" value={recipientDept} onChange={(e) => setRecipientDept(e.target.value)} />
          <input type="text" placeholder="Recipient College" value={recipientCollege} onChange={(e) => setRecipientCollege(e.target.value)} />
          <input type="text" placeholder="Recipient City" value={recipientCity} onChange={(e) => setRecipientCity(e.target.value)} />
          <input type="text" placeholder="Salutation" value={salutation} onChange={(e) => setSalutation(e.target.value)} />
          <input type="text" placeholder="Sign-off Name" value={signoffName} onChange={(e) => setSignoffName(e.target.value)} />
        </div>

        {/* Index Table */}
        <h4 style={{ marginTop: 20 }}>Index Table:</h4>
        {indexRows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" value={row.sno} onChange={(e) => handleIndexChange(i, 'sno', e.target.value)} style={{ width: '60px' }} />
            <input type="text" value={row.content} onChange={(e) => handleIndexChange(i, 'content', e.target.value)} style={{ flex: 1 }} />
            <button onClick={() => removeRow(i)} style={{ backgroundColor: 'red', color: 'white' }}>X</button>
          </div>
        ))}
        <button onClick={addRow} style={{ marginBottom: '15px' }}>+ Add Row</button>

        {/* Compensation & Cancellation */}
        <h4 style={{ marginTop: 20 }}>Compensation & Cancellation</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <input type="number" placeholder="INR per Student" value={compensationPerStudent} onChange={(e) => setCompensationPerStudent(e.target.value)} />
          <input type="number" placeholder="Advance % before start" value={advancePercent} onChange={(e) => setAdvancePercent(e.target.value)} />
          <input type="number" placeholder="Post-70% % after start" value={postPercent} onChange={(e) => setPostPercent(e.target.value)} />
          <input type="number" placeholder="Cancel Window (days)" value={cancelDays} onChange={(e) => setCancelDays(e.target.value)} />
          <input type="number" placeholder="Forfeit % on Cancel" value={cancelForfeitPercent} onChange={(e) => setCancelForfeitPercent(e.target.value)} />
        </div>

        {/* Exhibit B / Attribute Detail table */}
        <h4 style={{ marginTop: 20 }}>Exhibit B – Attribute Detail (Table)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input type="text" placeholder="Target Audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
          <input type="text" placeholder="Semester" value={semester} onChange={(e) => setSemester(e.target.value)} />
          <input type="number" placeholder="Duration (hours)" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
          <input type="text" placeholder="Program Date (e.g., TBD)" value={programDate} onChange={(e) => setProgramDate(e.target.value)} />
          <input type="number" placeholder="No. of Students" value={noOfStudents} onChange={(e) => setNoOfStudents(e.target.value)} />
          <input type="text" placeholder="Batches Note" value={batchesNote} onChange={(e) => setBatchesNote(e.target.value)} />
        </div>

        {/* Mode-specific controls */}
        <div style={{ marginTop: 20 }}>
          {mode === 'edit' && fileType === 'pdf' && (
            <input type="file" accept="application/pdf" onChange={handlePDFUpload} style={{ marginBottom: '10px' }} />
          )}
          {mode === 'edit' && fileType === 'docx' && (
            <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleWordUpload} style={{ marginBottom: '10px' }} />
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            {mode === 'generate' ? (
              <button onClick={generatePDF}>Generate PDF</button>
            ) : fileType === 'pdf' ? (
              <button onClick={editPDF}>Edit & Download PDF</button>
            ) : (
              <button onClick={editDOCX}>Edit & Download DOCX</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
