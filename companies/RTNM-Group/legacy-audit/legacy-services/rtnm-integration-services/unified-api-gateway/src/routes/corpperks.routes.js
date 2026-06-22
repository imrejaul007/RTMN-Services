/**
 * CorpPerks HRMS Routes
 * Routes requests to CorpPerks HRMS services
 */

const express = require('express');
const axios = require('axios');
const { EventBus } = require('../services/event-bus.service');

const router = express.Router();
const eventBus = new EventBus();

const CORPPERKS_BASE_URL = process.env.CORPPERKS_URL || 'http://localhost:4700';

// Create employee (triggers downstream services)
router.post('/employees', async (req, res) => {
    try {
        const { name, email, phone, department, role, joinDate, salary } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Name and email required'
            });
        }

        // Create employee in CorpPerks
        const response = await axios.post(
            `${CORPPERKS_BASE_URL}/api/employees`,
            { name, email, phone, department, role, joinDate, salary },
            {
                headers: {
                    'Authorization': req.headers.authorization,
                    'X-Tenant-ID': req.user.tenantId
                }
            }
        );

        const employee = response.data;

        // Trigger downstream integrations via event bus
        await eventBus.emit('corpperks.employee.created', {
            employeeId: employee.id,
            email: employee.email,
            name: employee.name,
            department: employee.department,
            tenantId: req.user.tenantId
        });

        res.json({
            success: true,
            data: employee,
            meta: {
                product: 'corpperks',
                integrations: ['rabtul', 'safeqr', 'nexha']
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.error || 'Employee creation failed'
        });
    }
});

// Get employee
router.get('/employees/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;

        const response = await axios.get(
            `${CORPPERKS_BASE_URL}/api/employees/${employeeId}`,
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'corpperks'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Employee lookup failed'
        });
    }
});

// List employees
router.get('/employees', async (req, res) => {
    try {
        const { department, status, page = 1, limit = 50 } = req.query;

        const response = await axios.get(
            `${CORPPERKS_BASE_URL}/api/employees`,
            {
                params: { department, status, page, limit },
                headers: {
                    'Authorization': req.headers.authorization,
                    'X-Tenant-ID': req.user.tenantId
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'corpperks',
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Employee list failed'
        });
    }
});

// Update employee
router.put('/employees/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const updates = req.body;

        const response = await axios.put(
            `${CORPPERKS_BASE_URL}/api/employees/${employeeId}`,
            updates,
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        // Emit update event
        await eventBus.emit('corpperks.employee.updated', {
            employeeId,
            updates,
            tenantId: req.user.tenantId
        });

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'corpperks'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Employee update failed'
        });
    }
});

// Payroll
router.post('/payroll/run', async (req, res) => {
    try {
        const { month, year, employees } = req.body;

        const response = await axios.post(
            `${CORPPERKS_BASE_URL}/api/payroll/run`,
            { month, year, employees },
            {
                headers: {
                    'Authorization': req.headers.authorization,
                    'X-Tenant-ID': req.user.tenantId
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'corpperks'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Payroll run failed'
        });
    }
});

// Get payroll details
router.get('/payroll/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;

        const response = await axios.get(
            `${CORPPERKS_BASE_URL}/api/payroll/${employeeId}`,
            {
                params: { month, year },
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'corpperks'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Payroll lookup failed'
        });
    }
});

// Attendance
router.post('/attendance', async (req, res) => {
    try {
        const { employeeId, date, checkIn, checkOut } = req.body;

        const response = await axios.post(
            `${CORPPERKS_BASE_URL}/api/attendance`,
            { employeeId, date, checkIn, checkOut },
            {
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'corpperks'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Attendance recording failed'
        });
    }
});

module.exports = router;
