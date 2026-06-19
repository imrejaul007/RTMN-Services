const express = require('express');
const router = express.Router();

// In-memory certificate storage
const certificates = new Map();

// Get certificate for completed course
router.post('/course/:courseId', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required'
    });
  }

  // Mock course completion check
  const certificate = {
    id: `cert-${Date.now()}`,
    userId,
    courseId: req.params.courseId,
    courseName: 'Course Certificate',
    recipient: 'Student Name', // Would come from user profile
    issuedAt: new Date().toISOString(),
    verificationId: `VERIFY-${Date.now()}`,
    expiresAt: null, // Certificates don't expire
    status: 'issued',
    credential: {
      type: 'Course Completion',
      issuer: 'Genie Life University',
      description: 'Successfully completed all course requirements'
    }
  };

  if (!certificates.has(userId)) {
    certificates.set(userId, []);
  }
  certificates.get(userId).push(certificate);

  res.json({
    success: true,
    message: 'Certificate issued! 🎓',
    data: {
      certificate,
      downloadUrl: `/certification/download/${certificate.id}`,
      shareUrl: `/certification/share/${certificate.verificationId}`
    }
  });
});

// Get certificate for completed curriculum
router.post('/curriculum/:curriculumId', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required'
    });
  }

  const certificate = {
    id: `cert-curriculum-${Date.now()}`,
    userId,
    curriculumId: req.params.curriculumId,
    curriculumName: 'Professional Certificate',
    recipient: 'Student Name',
    issuedAt: new Date().toISOString(),
    verificationId: `VERIFY-CURR-${Date.now()}`,
    status: 'issued',
    credential: {
      type: 'Professional Certificate',
      issuer: 'Genie Life University',
      description: 'Completed comprehensive professional development program'
    }
  };

  if (!certificates.has(userId)) {
    certificates.set(userId, []);
  }
  certificates.get(userId).push(certificate);

  res.json({
    success: true,
    message: 'Professional Certificate issued! 🎓',
    data: {
      certificate,
      downloadUrl: `/certification/download/${certificate.id}`,
      shareUrl: `/certification/share/${certificate.verificationId}`
    }
  });
});

// Get user's certificates
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  const userCertificates = certificates.get(userId) || [];

  res.json({
    success: true,
    data: {
      certificates: userCertificates,
      count: userCertificates.length
    }
  });
});

// Verify certificate
router.get('/verify/:verificationId', (req, res) => {
  const { verificationId } = req.params;

  // Search all certificates
  let found = null;
  for (const userCerts of certificates.values()) {
    const cert = userCerts.find(c => c.verificationId === verificationId);
    if (cert) {
      found = cert;
      break;
    }
  }

  if (!found) {
    return res.json({
      success: true,
      data: {
        valid: false,
        message: 'Certificate not found or invalid'
      }
    });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      certificate: {
        recipient: found.recipient,
        courseName: found.courseName || found.curriculumName,
        issuedAt: found.issuedAt,
        issuer: found.credential.issuer,
        type: found.credential.type
      }
    }
  });
});

// Download certificate (mock)
router.get('/download/:certificateId', (req, res) => {
  const { certificateId } = req.params;

  res.json({
    success: true,
    data: {
      downloadUrl: `https://certificates.genie/${certificateId}.pdf`,
      format: 'PDF',
      size: '~500KB'
    }
  });
});

// Get certificate templates
router.get('/templates/all', (req, res) => {
  const templates = [
    {
      id: 'course-completion',
      name: 'Course Completion Certificate',
      type: 'course',
      description: 'Awarded for completing a single course',
      elements: ['Recipient name', 'Course name', 'Completion date', 'Instructor signature']
    },
    {
      id: 'professional-cert',
      name: 'Professional Certificate',
      type: 'curriculum',
      description: 'Awarded for completing a learning path',
      elements: ['Recipient name', 'Program name', 'Completion date', 'Skills acquired', 'Instructor signatures']
    },
    {
      id: 'achievement',
      name: 'Achievement Certificate',
      type: 'milestone',
      description: 'Awarded for reaching learning milestones',
      elements: ['Recipient name', 'Achievement', 'Date', 'Badge']
    }
  ];

  res.json({
    success: true,
    data: templates
  });
});

module.exports = router;