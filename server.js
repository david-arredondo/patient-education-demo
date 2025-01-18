const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
app.use(bodyParser.json());
app.use(session({
  secret: 'demo-secret-key',
  resave: false,
  saveUninitialized: true
}));

// In-memory or JSON file data store
let patientsData = require('./patients.json'); 
// patients.json might look like:
// {
//   "patients": [
//     { "id": 123, "name": "John Doe", "slidesViewed": [], "flags": [] }
//   ]
// }

// Static file serving if we choose to serve front-end from here
app.use(express.static(path.join(__dirname, 'public')));

// Doctor login endpoint
app.post('/api/doctor/login', (req, res) => {
  const { username, password } = req.body;
  // Hardcoded credentials for demo
  if (username === 'doctor' && password === 'password123') {
    req.session.doctor = true;
    return res.json({ success: true });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Protected doctor route to get patient data
app.get('/api/doctor/patients', (req, res) => {
  if (!req.session.doctor) return res.status(403).json({ message: 'Unauthorized' });
  res.json(patientsData);
});

// Generate QR code for a patient
app.get('/api/doctor/generate-qr', async (req, res) => {
  if (!req.session.doctor) return res.status(403).json({ message: 'Unauthorized' });
  
  const patientId = req.query.patientId;
  const url = `https://patient-education-demo.vercel.app/patient.html`;
  
  try {
    const qrDataURL = await QRCode.toDataURL(url);
    // Return the data URL of the QR code image
    res.json({ qrCode: qrDataURL });
  } catch (err) {
    res.status(500).json({ message: 'Error generating QR code' });
  }
});

// Update patient progress (front-end calls this on slide changes)
app.post('/api/patient/:id/progress', (req, res) => {
  const { id } = req.params;
  const { slideIndex, flagged } = req.body;
  
  const patient = patientsData.patients.find(p => p.id == id);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  
  // Record slide view
  if (!patient.slidesViewed.includes(slideIndex)) {
    patient.slidesViewed.push(slideIndex);
  }
  
  // Record flag if any
  if (flagged) {
    patient.flags.push({ slideIndex, time: new Date().toISOString() });
  }

  // Save updated data to file for demonstration
  fs.writeFileSync(path.join(__dirname, 'patients.json'), JSON.stringify(patientsData, null, 2));

  res.json({ success: true });
});

// Patient slideshow serving (if SSR or direct serving)
// If front-end is separate, this could simply serve an index.html
app.get('/patient/:id', (req, res) => {
  // This could serve a static HTML that includes the patient ID in a JS variable
  res.sendFile(path.join(__dirname, 'public', 'patient.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
