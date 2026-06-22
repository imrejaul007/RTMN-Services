/**
 * Authentication Routes
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-secret-key-change-in-production';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password, industry } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // In production, validate against user service
    // This is a simplified version
    const user = {
      id: uuidv4(),
      username,
      industry: industry || 'general',
      roles: ['user']
    };
    
    const token = jwt.sign(
      { 
        sub: user.id, 
        username: user.username, 
        industry: user.industry,
        roles: user.roles 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        industry: user.industry
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Token verification
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.json({ valid: false, error: error.message });
  }
});

// Refresh token
router.post('/refresh', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    const newToken = jwt.sign(
      { 
        sub: decoded.sub, 
        username: decoded.username, 
        industry: decoded.industry,
        roles: decoded.roles 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (client-side token removal, but we can track invalidated tokens)
router.post('/logout', (req, res) => {
  // In production, add token to blacklist in Redis
  res.json({ success: true });
});

export default router;
