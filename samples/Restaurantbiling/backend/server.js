#!/usr/bin/env node
/**
 * Restaurant Billing Center — Zero-Dependency Node.js HTTP Backend
 *
 * Serves:
 * - GET  /api/menu           -> Full restaurant menu & promo codes
 * - POST /api/bills/preview  -> Live bill calculation (subtotal, discount, 5% GST, grand total)
 * - POST /api/bills          -> Finalize & store invoice (`INV-1001`)
 * - GET  /api/bills          -> List all invoices + daily revenue summary
 * - GET  /*                  -> Static POS frontend from `frontend/`
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, MENU_ITEMS, PROMO_CODES } from './menu-data.js';
import { BillingEngine } from './billing-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = join(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 64) {
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export function createRestaurantServer(engine = new BillingEngine()) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    const url = new URL(req.url, 'http://127.0.0.1');

    try {
      // 1. GET /api/menu
      if (req.method === 'GET' && url.pathname === '/api/menu') {
        sendJson(res, 200, {
          categories: CATEGORIES,
          items: MENU_ITEMS,
          promoCodes: Object.values(PROMO_CODES)
        });
        return;
      }

      // 2. POST /api/bills/preview
      if (req.method === 'POST' && url.pathname === '/api/bills/preview') {
        const body = await readJsonBody(req);
        const breakdown = engine.calculateBill(body);
        sendJson(res, 200, breakdown);
        return;
      }

      // 3. POST /api/bills
      if (req.method === 'POST' && url.pathname === '/api/bills') {
        const body = await readJsonBody(req);
        const bill = engine.createBill(body);
        sendJson(res, 201, bill);
        return;
      }

      // 4. GET /api/bills
      if (req.method === 'GET' && url.pathname === '/api/bills') {
        sendJson(res, 200, engine.getBillsSummary());
        return;
      }

      // 5. Static Frontend Serving
      const relPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
      const filePath = join(FRONTEND_DIR, relPath);
      if (filePath.startsWith(FRONTEND_DIR) && existsSync(filePath)) {
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'text/plain; charset=utf-8';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(readFileSync(filePath));
        return;
      }

      sendJson(res, 404, { error: `Route not found: ${url.pathname}` });
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Bad Request' });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 4000);
  const server = createRestaurantServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`🍽️  Restaurant Billing Center running at http://127.0.0.1:${port}`);
  });
}

