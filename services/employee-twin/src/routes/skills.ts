import { Router, Request, Response } from 'express';
import { Skill } from '../models/Skill';
import { SkillValidationSchema } from '../models/Skill';

const router = Router();

// Middleware to extract tenant ID
const extractTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// Create or update skills for an employee
router.post('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { employeeId } = req.params;

    // Validate input
    const validatedData = SkillValidationSchema.parse({
      tenantId,
      employeeId,
      ...req.body
    });

    // Check if skills record exists
    let skill = await Skill.findOne({ tenantId, employeeId });

    if (skill) {
      // Update existing
      Object.assign(skill, validatedData);
      await skill.save();
    } else {
      // Create new
      skill = new Skill(validatedData);
      await skill.save();
    }

    res.status(201).json({
      success: true,
      data: skill,
      message: 'Skills updated successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get skills for an employee
router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const skill = await Skill.findOne({
      tenantId,
      employeeId: req.params.employeeId
    });

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.json({
      success: true,
      data: skill
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update languages
router.patch('/:employeeId/languages', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { languages } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      { $set: { languages } },
      { new: true, runValidators: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.json({
      success: true,
      data: skill.languages,
      message: 'Languages updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update products
router.patch('/:employeeId/products', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { products } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      { $set: { products } },
      { new: true, runValidators: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.json({
      success: true,
      data: skill.products,
      message: 'Products updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update channels
router.patch('/:employeeId/channels', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { channels } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      { $set: { channels } },
      { new: true, runValidators: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.json({
      success: true,
      data: skill.channels,
      message: 'Channels updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update soft skills
router.patch('/:employeeId/soft-skills', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { softSkills } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      { $set: { softSkills } },
      { new: true, runValidators: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.json({
      success: true,
      data: skill.softSkills,
      message: 'Soft skills updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Add language
router.post('/:employeeId/languages', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { language, proficiency, certified } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      {
        $push: {
          languages: { language, proficiency, certified }
        }
      },
      { new: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.status(201).json({
      success: true,
      data: skill.languages,
      message: 'Language added successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Add product
router.post('/:employeeId/products', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { productName, proficiency, yearsOfExperience, lastUsed } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      {
        $push: {
          products: { productName, proficiency, yearsOfExperience, lastUsed }
        }
      },
      { new: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.status(201).json({
      success: true,
      data: skill.products,
      message: 'Product added successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Add channel
router.post('/:employeeId/channels', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { channel, proficiency, certifications } = req.body;

    const skill = await Skill.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      {
        $push: {
          channels: { channel, proficiency, certifications: certifications || [] }
        }
      },
      { new: true }
    );

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.status(201).json({
      success: true,
      data: skill.channels,
      message: 'Channel added successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get employees by skill
router.get('/search/by-skill', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { product, language, channel } = req.query;

    const filter: any = { tenantId };

    if (product) {
      filter['products.productName'] = product;
    }
    if (language) {
      filter['languages.language'] = language;
    }
    if (channel) {
      filter['channels.channel'] = channel;
    }

    const employees = await Skill.find(filter).select('employeeId');

    res.json({
      success: true,
      data: employees,
      count: employees.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete skills record
router.delete('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const result = await Skill.deleteOne({
      tenantId,
      employeeId: req.params.employeeId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Skills record not found'
      });
    }

    res.json({
      success: true,
      message: 'Skills record deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
