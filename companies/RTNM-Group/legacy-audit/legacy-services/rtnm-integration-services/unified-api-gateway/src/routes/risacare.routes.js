/**
 * RisaCare Healthcare Routes
 * Routes requests to RisaCare healthcare services
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const RISACARE_BASE_URL = process.env.RISACARE_URL || 'http://localhost:4700';

// Patient Management

// Create patient
router.post('/patients', async (req, res) => {
    try {
        const { name, email, phone, dob, gender, address } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Name and phone required'
            });
        }

        const response = await axios.post(
            `${RISACARE_BASE_URL}/api/patients`,
            { name, email, phone, dob, gender, address },
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
                product: 'risacare'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Patient creation failed'
        });
    }
});

// Get patient
router.get('/patients/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const response = await axios.get(
            `${RISACARE_BASE_URL}/api/patients/${patientId}`,
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
                product: 'risacare'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Patient lookup failed'
        });
    }
});

// Book appointment
router.post('/appointments', async (req, res) => {
    try {
        const { patientId, doctorId, date, time, department } = req.body;

        if (!patientId || !doctorId || !date) {
            return res.status(400).json({
                success: false,
                error: 'Patient, doctor, and date required'
            });
        }

        const response = await axios.post(
            `${RISACARE_BASE_URL}/api/appointments`,
            { patientId, doctorId, date, time, department },
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
                product: 'risacare'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Appointment booking failed'
        });
    }
});

// Get appointments
router.get('/appointments', async (req, res) => {
    try {
        const { patientId, doctorId, date, status } = req.query;

        const response = await axios.get(
            `${RISACARE_BASE_URL}/api/appointments`,
            {
                params: { patientId, doctorId, date, status },
                headers: {
                    'Authorization': req.headers.authorization
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
            meta: {
                product: 'risacare'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Appointment lookup failed'
        });
    }
});

// Medical records
router.post('/records', async (req, res) => {
    try {
        const { patientId, type, diagnosis, prescription, notes } = req.body;

        const response = await axios.post(
            `${RISACARE_BASE_URL}/api/records`,
            { patientId, type, diagnosis, prescription, notes },
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
                product: 'risacare'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Record creation failed'
        });
    }
});

// Get medical records
router.get('/records/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const response = await axios.get(
            `${RISACARE_BASE_URL}/api/records/${patientId}`,
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
                product: 'risacare'
            }
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Record lookup failed'
        });
    }
});

module.exports = router;
