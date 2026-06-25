/**
 * Template Routes — list scenario templates
 */

const express = require('express');

module.exports = function({ templatesStore }) {
  const router = express.Router();

  /**
   * GET /templates/list
   * Query: ?category=career|life|finance|family
   */
  router.get('/list', (req, res) => {
    const { category } = req.query;
    let templates = Array.from(templatesStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    res.json({ success: true, total: templates.length, templates });
  });

  /**
   * GET /templates/get/:templateId
   */
  router.get('/get/:templateId', (req, res) => {
    const { templateId } = req.params;
    const tpl = templatesStore.get(templateId);
    if (!tpl) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: tpl });
  });

  return router;
};