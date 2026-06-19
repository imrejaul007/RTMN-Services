const express = require('express');
const router = express.Router();

// In-memory document storage
const documents = new Map();

// Document types
const documentTypes = [
  { id: 'pdf', name: 'PDF Document', icon: '📄', extensions: ['pdf'] },
  { id: 'presentation', name: 'Presentation', icon: '📊', extensions: ['pptx', 'pdf'] },
  { id: 'report', name: 'Report', icon: '📋', extensions: ['pdf', 'docx'] },
  { id: 'proposal', name: 'Business Proposal', icon: '📑', extensions: ['pdf', 'docx'] },
  { id: 'resume', name: 'Resume/CV', icon: '📝', extensions: ['pdf', 'docx'] },
  { id: 'contract', name: 'Contract', icon: '📜', extensions: ['pdf'] },
  { id: 'invoice', name: 'Invoice', icon: '💵', extensions: ['pdf'] },
  { id: 'letter', name: 'Letter', icon: '✉️', extensions: ['pdf', 'docx'] }
];

// Create document
router.post('/create', (req, res) => {
  const { userId, type, title, content, metadata } = req.body;

  if (!type || !title) {
    return res.status(400).json({
      success: false,
      error: 'type and title are required'
    });
  }

  const docType = documentTypes.find(d => d.id === type) || documentTypes[0];

  const document = {
    id: `doc-${Date.now()}`,
    userId,
    type: docType,
    title,
    content: content || generateDefaultContent(title, type),
    metadata: metadata || {},
    pages: estimatePages(content || '', type),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloads: 0
  };

  if (!documents.has(userId)) {
    documents.set(userId, []);
  }
  documents.get(userId).push(document);

  res.json({
    success: true,
    message: 'Document created',
    data: {
      document,
      downloadFormats: docType.extensions
    }
  });
});

// Generate presentation
router.post('/presentation', (req, res) => {
  const { userId, topic, slides, style, audience } = req.body;

  if (!topic) {
    return res.status(400).json({
      success: false,
      error: 'topic is required'
    });
  }

  const slideCount = slides || 10;
  const presentationStyle = style || 'professional';

  const slides_content = [];
  for (let i = 1; i <= slideCount; i++) {
    slides_content.push({
      number: i,
      title: generateSlideTitle(topic, i, slideCount),
      content: generateSlideContent(topic, i, slideCount),
      notes: generateSlideNotes(topic, i),
      layout: getSlideLayout(i, slideCount),
      visuals: generateSlideVisuals(topic, i)
    });
  }

  const presentation = {
    id: `pres-${Date.now()}`,
    userId,
    topic,
    slides: slides_content,
    slideCount,
    style: presentationStyle,
    audience: audience || 'General',
    duration: Math.round(slideCount * 2) + ' minutes',
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Presentation generated',
    data: {
      presentation,
      estimatedDuration: presentation.duration
    }
  });
});

// Generate report
router.post('/report', (req, res) => {
  const { userId, type, title, sections, data } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'title is required'
    });
  }

  const reportTypes = {
    annual: {
      sections: ['Executive Summary', 'Company Overview', 'Financial Highlights', 'Achievements', 'Challenges', 'Future Outlook']
    },
    quarterly: {
      sections: ['Executive Summary', 'Key Metrics', 'Performance Analysis', 'Goals Progress', 'Next Quarter Planning']
    },
    analysis: {
      sections: ['Introduction', 'Data Sources', 'Methodology', 'Findings', 'Recommendations', 'Conclusion']
    },
    status: {
      sections: ['Project Overview', 'Current Status', 'Milestones', 'Risks', 'Resources', 'Timeline']
    }
  };

  const reportConfig = reportTypes[type] || reportTypes.analysis;

  const report = {
    id: `report-${Date.now()}`,
    userId,
    type: type || 'analysis',
    title,
    sections: reportConfig.sections.map((section, i) => ({
      number: i + 1,
      title: section,
      content: generateReportSection(section, title, data)
    })),
    metadata: {
      createdAt: new Date().toISOString(),
      wordCount: reportConfig.sections.length * 300,
      pages: reportConfig.sections.length * 1.5
    }
  };

  res.json({
    success: true,
    message: 'Report generated',
    data: report
  });
});

// Generate resume
router.post('/resume', (req, res) => {
  const { userId, personalInfo, experience, education, skills } = req.body;

  if (!personalInfo?.name) {
    return res.status(400).json({
      success: false,
      error: 'personalInfo.name is required'
    });
  }

  const resume = {
    id: `resume-${Date.now()}`,
    userId,
    sections: {
      header: {
        name: personalInfo.name,
        title: personalInfo.title || 'Professional',
        email: personalInfo.email || '',
        phone: personalInfo.phone || '',
        location: personalInfo.location || '',
        linkedin: personalInfo.linkedin || '',
        website: personalInfo.website || ''
      },
      summary: personalInfo.summary || generateProfessionalSummary(personalInfo),
      experience: (experience || []).map(exp => ({
        title: exp.title,
        company: exp.company,
        location: exp.location || '',
        dates: `${exp.startDate} - ${exp.endDate || 'Present'}`,
        bullets: exp.bullets || generateExperienceBullets(exp)
      })),
      education: (education || []).map(edu => ({
        degree: edu.degree,
        school: edu.school,
        location: edu.location || '',
        dates: edu.dates || '',
        gpa: edu.gpa || ''
      })),
      skills: skills || ['Communication', 'Leadership', 'Problem Solving', 'Technical Skills']
    },
    templates: ['modern', 'classic', 'minimal'],
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Resume generated',
    data: {
      resume,
      atsScore: calculateATSScore(resume),
      suggestions: generateResumeSuggestions(resume)
    }
  });
});

// Generate business proposal
router.post('/proposal', (req, res) => {
  const { userId, clientName, projectTitle, scope, timeline, budget } = req.body;

  const proposal = {
    id: `proposal-${Date.now()}`,
    userId,
    clientName: clientName || 'Client',
    projectTitle: projectTitle || 'Project',
    sections: {
      cover: {
        title: projectTitle || 'Business Proposal',
        client: clientName || 'Client Name',
        date: new Date().toLocaleDateString(),
        preparedBy: 'Your Company Name'
      },
      executiveSummary: generateExecutiveSummary(projectTitle, scope),
      problemStatement: `Understanding of the client's needs and challenges in ${clientName || 'their business'}`,
      proposedSolution: scope || 'Comprehensive solution tailored to client needs',
      timeline: timeline || 'Project timeline with key milestones',
      budget: budget || {
        total: 'TBD',
        breakdown: ['Discovery & Planning', 'Design & Development', 'Testing & Launch', 'Maintenance & Support']
      },
      terms: 'Standard terms and conditions apply',
      nextSteps: ['Review proposal', 'Schedule call', 'Sign agreement', 'Kickoff meeting']
    },
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Proposal generated',
    data: proposal
  });
});

// Get documents
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { type } = req.query;

  let userDocs = documents.get(userId) || [];

  if (type) {
    userDocs = userDocs.filter(d => d.type.id === type);
  }

  userDocs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({
    success: true,
    data: {
      documents: userDocs,
      count: userDocs.length
    }
  });
});

// Get document types
router.get('/types/all', (req, res) => {
  res.json({
    success: true,
    data: documentTypes
  });
});

// Helper functions
function generateDefaultContent(title, type) {
  return `${title}\n\nThis document contains comprehensive information about ${title}.`;
}

function estimatePages(content, type) {
  const wordsPerPage = type === 'presentation' ? 50 : 250;
  return Math.max(1, Math.ceil((content?.split(/\s+/).length || 0) / wordsPerPage));
}

function generateSlideTitle(topic, slideNum, totalSlides) {
  const titles = {
    1: topic,
    2: 'Introduction',
    3: 'Key Concepts',
    4: 'Main Discussion',
    5: 'Analysis',
    6: 'Case Studies',
    7: 'Best Practices',
    8: 'Implementation',
    9: 'Results',
    10: 'Q&A'
  };

  const specialSlides = Math.floor(totalSlides / 2);
  const conclusionSlide = totalSlides - 1;

  if (slideNum === 1) return topic;
  if (slideNum === conclusionSlide) return 'Conclusion';
  if (slideNum === totalSlides) return 'Questions?';
  if (slideNum === specialSlides) return 'Deep Dive';

  return titles[slideNum] || `Section ${slideNum}`;
}

function generateSlideContent(topic, slideNum, totalSlides) {
  return `Key points about ${topic} for slide ${slideNum}`;
}

function generateSlideNotes(topic, slideNum) {
  return `Speaker notes for slide ${slideNum}: Elaborate on ${topic} concepts`;
}

function getSlideLayout(slideNum, totalSlides) {
  if (slideNum === 1) return 'title';
  if (slideNum === totalSlides) return 'closing';
  if (slideNum % 3 === 0) return 'two-column';
  return 'content';
}

function generateSlideVisuals(topic, slideNum) {
  return {
    chart: slideNum % 4 === 0 ? 'bar' : null,
    image: slideNum % 2 === 0 ? 'related' : null,
    icons: slideNum % 3 === 0 ? ['icon1', 'icon2', 'icon3'] : []
  };
}

function generateReportSection(section, title, data) {
  return `Content for ${section} section of ${title} report.`;
}

function generateProfessionalSummary(personalInfo) {
  return `${personalInfo.title || 'Professional'} with expertise in relevant skills. Passionate about delivering results and continuous improvement.`;
}

function generateExperienceBullets(exp) {
  return [
    `Led ${exp.title?.toLowerCase() || 'team'} initiatives resulting in improved outcomes`,
    'Collaborated with cross-functional teams to achieve goals',
    'Implemented process improvements increasing efficiency'
  ];
}

function calculateATSScore(resume) {
  // Simplified ATS score calculation
  let score = 70;

  if (resume.sections.header.name) score += 5;
  if (resume.sections.header.email) score += 5;
  if (resume.sections.experience.length >= 2) score += 10;
  if (resume.sections.skills.length >= 5) score += 5;
  if (resume.sections.education.length >= 1) score += 5;

  return Math.min(100, score);
}

function generateResumeSuggestions(resume) {
  const suggestions = [];

  if (resume.sections.experience.length < 2) {
    suggestions.push('Add more professional experience to strengthen your resume');
  }

  if (resume.sections.skills.length < 5) {
    suggestions.push('Include more relevant skills to improve ATS score');
  }

  suggestions.push('Use action verbs at the beginning of each bullet point');
  suggestions.push('Quantify achievements where possible');

  return suggestions;
}

function generateExecutiveSummary(projectTitle, scope) {
  return `This proposal outlines our approach to ${projectTitle || 'the project'}. We will deliver ${scope || 'a comprehensive solution'} that meets your business objectives.`;
}

module.exports = router;