/**
 * REZ SSO Service - Entry Point
 * Port: 4045
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import './sso'; // This starts the server

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Forward to sso.ts routes
app.use('/', require('./sso'));

const PORT = process.env.PORT || 4045;

// Note: sso.ts already calls app.listen()
// This index.ts is just for type exports if needed
