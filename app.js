import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import './App.css';
import logoImage from './assets/image.png';
import bgImage from './assets/background.jpg';

function App() {
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
  const [mode, setMode] = useState('generate');
  const [selectedFile, setSelectedFile] = useState(null);

  const handlePDFUpload = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const editPDF = async () => {
    if (!selectedFile) return alert('Please upload a PDF file');

    const reader = new FileReader();
    reader.readAsArrayBuffer(selectedFile);
    reader.onload = async () => {
      const existingPdfBytes = reader.result;
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let indexPage = null;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const textBox = page.getTextContent ? await page.getTextContent() : null;
        const allText = textBox?.items?.map(item => item.str).join(' ').toLowerCase();

        if (allText?.includes('index') && allText?.includes('seminars')) {
          indexPage = page;
          break;
        }
      }

      if (!indexPage) {
        indexPage = pages[2] || pages[0];
      }

      const indexYStart = 640;
      const lineSpacing = 20;

      indexPage.drawRectangle({
        x: 40,
        y: indexYStart - (indexRows.length + 5) * lineSpacing,
        width: 520,
        height: (indexRows.length + 5) * lineSpacing,
        color: rgb(1, 1, 1)
      });

      let y = indexYStart;
      indexPage.drawText(`Updated Index`, { x: 50, y, size: 14, font, color: rgb(0.1, 0.1, 0.6) });
      y -= lineSpacing;
      indexPage.drawText(`Name: ${name}`, { x: 50, y, size: 12, font, color: rgb(0.1, 0.2, 0.7) });
      y -= lineSpacing;
      indexPage.drawText(`College: ${collegeName}`, { x: 50, y, size: 12, font, color: rgb(0.1, 0.2, 0.7) });
      y -= lineSpacing;
      indexPage.drawText(`Date: ${date}`, { x: 50, y, size: 12, font, color: rgb(0.1, 0.2, 0.7) });
      y -= lineSpacing;

      indexRows.forEach(row => {
        indexPage.drawText(`${row.sno}. ${row.content}`, { x: 60, y, size: 11, font, color: rgb(0.1, 0.2, 0.7) });
        y -= lineSpacing;
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Edited-SwipeGen.pdf';
      link.click();
    };
  };

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
      doc.text(`Date: ${date}`, 20, 46);

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
      <div className="form-card">
        <img src={logoImage} alt="Logo" style={{ width: 80, margin: '0 auto 20px', display: 'block' }} />
        <h2>📄 SwipeGen Proposal PDF Tool</h2>

        <div className="mode-toggle">
          <label>
            <input type="radio" checked={mode === 'generate'} onChange={() => setMode('generate')} /> Generate
          </label>
          <label style={{ marginLeft: '20px' }}>
            <input type="radio" checked={mode === 'edit'} onChange={() => setMode('edit')} /> Edit
          </label>
        </div>

        <input type="text" placeholder="Enter Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="Enter College Name" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <h4 style={{ marginTop: '20px' }}>Index Table:</h4>
        {indexRows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" value={row.sno} onChange={(e) => handleIndexChange(i, 'sno', e.target.value)} style={{ width: '40px' }} />
            <input type="text" value={row.content} onChange={(e) => handleIndexChange(i, 'content', e.target.value)} style={{ flex: 1 }} />
            <button onClick={() => removeRow(i)} style={{ backgroundColor: 'red', color: 'white' }}>X</button>
          </div>
        ))}
        <button onClick={addRow} style={{ marginBottom: '15px' }}>+ Add Row</button>

        {mode === 'edit' && <input type="file" accept="application/pdf" onChange={handlePDFUpload} style={{ marginBottom: '10px' }} />}

        <button onClick={mode === 'generate' ? generatePDF : editPDF}>
          {mode === 'generate' ? 'Generate PDF' : 'Edit & Download'}
        </button>
      </div>
    </div>
  );
}

export default App;

