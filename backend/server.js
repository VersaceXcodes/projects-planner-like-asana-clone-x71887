// server.mjs
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import sgMail from '@sendgrid/mail';

// -----------------------------------------------------------------------------
// 1. SendGrid configuration
// -----------------------------------------------------------------------------
const {
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  FRONTEND_BASE_URL,
  SENDGRID_VERIFICATION_TEMPLATE_ID,
  SENDGRID_RESET_TEMPLATE_ID,
  SENDGRID_WORKSPACE_INVITE_TEMPLATE_ID,
  SENDGRID_EMAIL_CHANGE_TEMPLATE_ID
} = process.env;

if (!SENDGRID_API_KEY) {
  throw new Error('Missing env var: SENDGRID_API_KEY');
}
sgMail.setApiKey(SENDGRID_API_KEY);

// -----------------------------------------------------------------------------
// 2. Postgres pool (exactly as provided) 
// -----------------------------------------------------------------------------
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
const pool = new Pool({
  host:     PGHOST     || "ep-ancient-dream-abbsot9k-pooler.eu-west-2.aws.neon.tech",
  database: PGDATABASE || "neondb",
  username: PGUSER     || "neondb_owner",
  password: PGPASSWORD || "npg_jAS3aITLC5DX",
  port: 5432,
  ssl: { require: true },
});

// -----------------------------------------------------------------------------
// 3. Express & HTTP & Socket.io setup
// -----------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET","POST","PATCH","DELETE"] }
});

// Middlewares
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Serve attachments statically
const STORAGE_DIR = path.join(process.cwd(), 'storage');
fs.mkdirSync(STORAGE_DIR, { recursive: true });
app.use('/storage', express.static(STORAGE_DIR));

// Multer config for file uploads (max 10MB)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, STORAGE_DIR),
    filename:    (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// JWT & Auth
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

// -----------------------------------------------------------------------------
// Utility: send JSON error
// -----------------------------------------------------------------------------
function sendError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

// -----------------------------------------------------------------------------
// Utility: Generate and verify password
// -----------------------------------------------------------------------------
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// -----------------------------------------------------------------------------
// Utility: Generate JWT
// -----------------------------------------------------------------------------
function generateJWT(user) {
  return jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

// -----------------------------------------------------------------------------
// Middleware: authenticate Bearer JWT for REST 
// -----------------------------------------------------------------------------
function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized', 'No token provided');
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;  // { user_id }
    next();
  } catch {
    return sendError(res, 401, 'Unauthorized', 'Invalid token');
  }
}

// Attach auth to all /api except open endpoints:
const openPaths = [
  '/api/auth/sign_up',
  '/api/auth/log_in',
  '/api/auth/forgot_password',
  '/api/auth/reset_password',
  '/api/auth/verify_email',
  '/api/email_change_requests/confirm'
];
app.use('/api', (req, res, next) => {
  if (openPaths.includes(req.path)) return next();
  return authenticateToken(req, res, next);
});

// -----------------------------------------------------------------------------
// Mock External APIs → REAL SendGrid email functions
// -----------------------------------------------------------------------------

/**
 * Send an email verification message using SendGrid Dynamic Template
 */
async function sendEmailVerificationLink(email, token) {
  if (!SENDGRID_VERIFICATION_TEMPLATE_ID) {
    throw new Error('Env var SENDGRID_VERIFICATION_TEMPLATE_ID is required');
  }
  const verification_link = `${FRONTEND_BASE_URL}/verify-email?token=${token}`;
  const msg = {
    to: email,
    from: SENDGRID_FROM_EMAIL,
    template_id: SENDGRID_VERIFICATION_TEMPLATE_ID,
    dynamic_template_data: { verification_link, token }
  };
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error('SendGrid sendEmailVerificationLink error:', err);
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send a password reset message using SendGrid Dynamic Template
 */
async function sendPasswordResetEmail(email, token) {
  if (!SENDGRID_RESET_TEMPLATE_ID) {
    throw new Error('Env var SENDGRID_RESET_TEMPLATE_ID is required');
  }
  const reset_link = `${FRONTEND_BASE_URL}/reset-password?token=${token}`;
  const msg = {
    to: email,
    from: SENDGRID_FROM_EMAIL,
    template_id: SENDGRID_RESET_TEMPLATE_ID,
    dynamic_template_data: { reset_link, token }
  };
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error('SendGrid sendPasswordResetEmail error:', err);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send a workspace invitation email using SendGrid Dynamic Template
 */
async function sendWorkspaceInviteEmail(email, token) {
  if (!SENDGRID_WORKSPACE_INVITE_TEMPLATE_ID) {
    throw new Error('Env var SENDGRID_WORKSPACE_INVITE_TEMPLATE_ID is required');
  }
  const invite_link = `${FRONTEND_BASE_URL}/accept-invite?token=${token}`;
  const msg = {
    to: email,
    from: SENDGRID_FROM_EMAIL,
    template_id: SENDGRID_WORKSPACE_INVITE_TEMPLATE_ID,
    dynamic_template_data: { invite_link, token }
  };
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error('SendGrid sendWorkspaceInviteEmail error:', err);
    throw new Error('Failed to send workspace invite email');
  }
}

/**
 * Send an email-change confirmation message using SendGrid Dynamic Template
 */
async function sendEmailChangeRequestEmail(new_email, token) {
  if (!SENDGRID_EMAIL_CHANGE_TEMPLATE_ID) {
    throw new Error('Env var SENDGRID_EMAIL_CHANGE_TEMPLATE_ID is required');
  }
  const confirm_link = `${FRONTEND_BASE_URL}/confirm-email-change?token=${token}`;
  const msg = {
    to: new_email,
    from: SENDGRID_FROM_EMAIL,
    template_id: SENDGRID_EMAIL_CHANGE_TEMPLATE_ID,
    dynamic_template_data: { confirm_link, token }
  };
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error('SendGrid sendEmailChangeRequestEmail error:', err);
    throw new Error('Failed to send email-change confirmation');
  }
}

// -----------------------------------------------------------------------------
// Socket.io authentication & room-joining
// -----------------------------------------------------------------------------
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
                || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) return next(new Error('Unauthorized'));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;  // { user_id }
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const user_id = socket.user.user_id;
  socket.join(`user:${user_id}`);
  try {
    const { rows } = await pool.query(
      `SELECT workspace_id FROM workspace_members WHERE user_id=$1`, [user_id]
    );
    rows.forEach(r => socket.join(`workspace:${r.workspace_id}`));
  } catch (err) {
    console.error("Socket join workspace error:", err);
  }
});

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// 2.B.1 Authentication & Onboarding
// ----------------------------------------------------------------------------

/*
  POST /api/auth/sign_up
  - Insert user & email_verification_tokens within a transaction
  - Use real SendGrid sendEmailVerificationLink
*/
app.post('/api/auth/sign_up', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return sendError(res, 400, 'BadRequest', 'name,email,password required');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // check unique email
    const dup = await client.query(`SELECT 1 FROM users WHERE email=$1`, [email]);
    if (dup.rowCount) {
      await client.query('ROLLBACK');
      return sendError(res, 409, 'Conflict', 'Email already registered');
    }
    // create user
    const id = uuidv4();
    const now = new Date().toISOString();
    const password_hash = await hashPassword(password);
    await client.query(`
      INSERT INTO users(id,name,email,password_hash,avatar_url,notify_in_app,created_at,updated_at)
      VALUES($1,$2,$3,$4,NULL,true,$5,$5)
    `, [id, name, email, password_hash, now]);
    // email verification token
    const token = uuidv4();
    const expires_at = new Date(Date.now() + 24*3600*1000).toISOString();
    await client.query(`
      INSERT INTO email_verification_tokens(id,user_id,token,expires_at,created_at)
      VALUES($1,$2,$3,$4,$5)
    `, [uuidv4(), id, token, expires_at, now]);
    // send real email
    await sendEmailVerificationLink(email, token);
    await client.query('COMMIT');
    return res.status(201).json({
      user: {
        id, name, email,
        avatar_url: null,
        notify_in_app: true,
        created_at: now
      },
      verification_expires_at: expires_at
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('SignUpError:', err);
    return sendError(res, 500, 'InternalError', err.message);
  } finally {
    client.release();
  }
});

/*
  POST /api/auth/log_in
  (unchanged)
*/
app.post('/api/auth/log_in', async (req, res) => {
  const { email, password } = req.body;
  if (!email||!password) {
    return sendError(res,400,'BadRequest','email,password required');
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id,name,email,password_hash,avatar_url,notify_in_app
      FROM users WHERE email=$1
    `, [email]);
    if (!rows.length) {
      return sendError(res,401,'Unauthorized','Invalid credentials');
    }
    const user = rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return sendError(res,401,'Unauthorized','Invalid credentials');
    }
    const token = generateJWT(user);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        notify_in_app: user.notify_in_app
      }
    });
  } catch (err) {
    console.error(err);
    return sendError(res,500,'InternalError','Login failed');
  } finally {
    client.release();
  }
});

/*
  POST /api/auth/forgot_password
  (unchanged aside from real sendPasswordResetEmail)
*/
app.post('/api/auth/forgot_password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return sendError(res,400,'BadRequest','email required');
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id FROM users WHERE email=$1`, [email]
    );
    if (rows.length) {
      const now = new Date().toISOString();
      const token = uuidv4();
      const expires_at = new Date(Date.now()+24*3600*1000).toISOString();
      await client.query(`
        INSERT INTO password_reset_tokens(id,user_id,token,expires_at,created_at)
        VALUES($1,$2,$3,$4,$5)
      `, [uuidv4(), rows[0].id, token, expires_at, now]);
      await sendPasswordResetEmail(email, token);
    }
    return res.json({ message: 'If that email exists, a reset link was sent' });
  } catch (err) {
    console.error(err);
    return sendError(res,500,'InternalError','Failed to send reset email');
  } finally {
    client.release();
  }
});

/*
  POST /api/auth/reset_password
  (unchanged)
*/
app.post('/api/auth/reset_password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token||!new_password) {
    return sendError(res,400,'BadRequest','token,new_password required');
  }
  const client = await pool.connect();
  try {
    const now = new Date().toISOString();
    const tokRes = await client.query(`
      SELECT * FROM password_reset_tokens
      WHERE token=$1 AND used_at IS NULL AND expires_at >= $2
    `, [token, now]);
    if (!tokRes.rows.length) {
      return sendError(res,404,'NotFound','Invalid or expired token');
    }
    const prt = tokRes.rows[0];
    const new_hash = await hashPassword(new_password);
    await client.query(`
      UPDATE users SET password_hash=$1, updated_at=$2 WHERE id=$3
    `, [new_hash, now, prt.user_id]);
    await client.query(`
      UPDATE password_reset_tokens SET used_at=$1 WHERE id=$2
    `, [now, prt.id]);
    return res.json({ message:'Password reset successful' });
  } catch (err) {
    console.error(err);
    return sendError(res,500,'InternalError','Reset failed');
  } finally {
    client.release();
  }
});

/*
  POST /api/auth/verify_email
  (unchanged)
*/
app.post('/api/auth/verify_email', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return sendError(res,400,'BadRequest','token required');
  }
  const client = await pool.connect();
  try {
    const now = new Date().toISOString();
    const tv = await client.query(`
      SELECT * FROM email_verification_tokens
      WHERE token=$1 AND used_at IS NULL AND expires_at >= $2
    `, [token, now]);
    if (!tv.rows.length) {
      return sendError(res,404,'NotFound','Invalid or expired token');
    }
    await client.query(`
      UPDATE email_verification_tokens SET used_at=$1 WHERE id=$2
    `, [now, tv.rows[0].id]);
    return res.json({ message:'Email verified' });
  } catch (err) {
    console.error(err);
    return sendError(res,500,'InternalError','Verification failed');
  } finally {
    client.release();
  }
});

/*
  POST /api/auth/invite_accept
  (unchanged)
*/
app.post('/api/auth/invite_accept', async (req, res) => {
  const user_id = req.user.user_id;
  const { token } = req.body;
  if (!token) {
    return sendError(res,400,'BadRequest','token required');
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT * FROM workspace_invites WHERE token=$1 AND status='pending'
    `, [token]);
    if (!rows.length) {
      return sendError(res,400,'BadRequest','Invalid or already used invite');
    }
    const invite = rows[0];
    const now = new Date().toISOString();
    await client.query(`
      UPDATE workspace_invites SET status='accepted',responded_at=$1 WHERE id=$2
    `, [now, invite.id]);
    await client.query(`
      INSERT INTO workspace_members(id,workspace_id,user_id,role,joined_at)
      VALUES($1,$2,$3,'member',$4)
    `, [uuidv4(), invite.workspace_id, user_id, now]);
    const memberData = {
      id: uuidv4(),
      user: { id:user_id, name:null, email:null, avatar_url:null },
      role:'member',
      joined_at: now
    };
    io.to(`workspace:${invite.workspace_id}`)
      .emit('workspace_member_added', { user: memberData });
    return res.json({
      workspace_id: invite.workspace_id,
      joined_at: now
    });
  } catch (err) {
    console.error(err);
    return sendError(res,500,'InternalError','Invite acceptance failed');
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// 2.B.2 Workspace Management
// ----------------------------------------------------------------------------
// ... All workspace routes remain unchanged (GET /api/workspaces, POST /api/workspaces, etc.)
// ----------------------------------------------------------------------------
// 2.B.3 Project Management
// ----------------------------------------------------------------------------
// ... All project routes remain unchanged
// ----------------------------------------------------------------------------
// 2.B.4 Section Management
// ----------------------------------------------------------------------------
// ... All section routes remain unchanged
// ----------------------------------------------------------------------------
// 2.B.5 Task Management
// ----------------------------------------------------------------------------
// ... All task routes remain unchanged
// ----------------------------------------------------------------------------
// 2.B.6 Comment Management
// ----------------------------------------------------------------------------
// ... All comment routes remain unchanged
// ----------------------------------------------------------------------------
// 2.B.7 Attachment Management
// ----------------------------------------------------------------------------
// ... All attachment routes remain unchanged
// ----------------------------------------------------------------------------
// 2.B.8 Notification Management
// ----------------------------------------------------------------------------
// ... All notification routes remain unchanged
// ----------------------------------------------------------------------------
// 2.B.9 Aggregations
// ----------------------------------------------------------------------------
// ... My tasks & inbox_count remain unchanged
// ----------------------------------------------------------------------------
// 2.B.10 Search & Filter
// ----------------------------------------------------------------------------
// ... Search route remains unchanged
// ----------------------------------------------------------------------------
// 2.B.11 User Settings & Email Change
// ----------------------------------------------------------------------------

/*
  POST /api/email_change_requests
  - Insert & email within a transaction
*/
app.post('/api/email_change_requests', async (req, res) => {
  const user_id = req.user.user_id;
  const { new_email } = req.body;
  if (!new_email) {
    return sendError(res,400,'BadRequest','new_email required');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const now = new Date().toISOString();
    const expires_at = new Date(Date.now() + 24*3600*1000).toISOString();
    const id = uuidv4();
    const token = uuidv4();
    await client.query(`
      INSERT INTO email_change_requests(
        id,user_id,new_email,token,status,created_at,expires_at
      ) VALUES($1,$2,$3,$4,'pending',$5,$6)
    `, [id, user_id, new_email, token, now, expires_at]);
    await sendEmailChangeRequestEmail(new_email, token);
    await client.query('COMMIT');
    return res.status(201).json({ request_id: id, expires_at });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('EmailChangeError:', err);
    return sendError(res,500,'InternalError',err.message);
  } finally {
    client.release();
  }
});

/*
  POST /api/email_change_requests/confirm
  (unchanged)
*/
app.post('/api/email_change_requests/confirm', async (req, res) => {
  const { token } = req.body;
  if (!token) return sendError(res,400,'BadRequest','token required');
  const client = await pool.connect();
  try {
    const now = new Date().toISOString();
    const qr = await client.query(`
      SELECT * FROM email_change_requests
      WHERE token=$1 AND status='pending' AND expires_at>=$2
    `, [token, now]);
    if (!qr.rows.length) {
      return sendError(res,404,'NotFound','Invalid or expired token');
    }
    const req0 = qr.rows[0];
    await client.query(`
      UPDATE users SET email=$1, updated_at=$2 WHERE id=$3
    `, [req0.new_email, now, req0.user_id]);
    await client.query(`
      UPDATE email_change_requests
      SET status='confirmed',confirmed_at=$1 WHERE id=$2
    `, [now, req0.id]);
    const { rows } = await client.query(`
      SELECT id,name,email,avatar_url,notify_in_app,created_at,updated_at
      FROM users WHERE id=$1
    `, [req0.user_id]);
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return sendError(res,500,'InternalError','Confirm email change failed');
  } finally {
    client.release();
  }
});

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT) || 1337;
server.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));