import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

let pool;

export async function connectDB() {
  if (pool) return pool;

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'client_scrapper',
  };

  try {
    // Attempt connection without database first to create the database if it doesn't exist
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await connection.end();

    // Create the connection pool with database selected
    pool = mysql.createPool(dbConfig);
    
    // Initialize tables
    await initTables(pool);
    
    console.log(`[DATABASE] MySQL database connected and initialized: "${dbConfig.database}"`);
    return pool;
  } catch (err) {
    console.error('[DATABASE] Database initialization failed. Check credentials in Settings/.env.', err.message);
    throw err;
  }
}

async function initTables(db) {
  // Leads table
  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NULL,
      location VARCHAR(255) NULL,
      phone_number VARCHAR(100) NULL,
      rating DECIMAL(3,2) NULL,
      reviews_count INT NULL,
      status VARCHAR(50) DEFAULT 'Scraped',
      estimated_owner_name VARCHAR(255) NULL,
      primary_contact_email VARCHAR(255) NULL,
      primary_social_pitch_url TEXT NULL,
      confidence_score VARCHAR(50) NULL,
      quick_pitch_hook TEXT NULL,
      personalized_subject TEXT NULL,
      personalized_body TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Templates table
  await db.query(`
    CREATE TABLE IF NOT EXISTS templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Campaigns table
  await db.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      template_name VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'Draft',
      total_leads INT DEFAULT 0,
      sent_leads INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert mock templates if empty
  const [rows] = await db.query('SELECT COUNT(*) as count FROM templates');
  if (rows[0].count === 0) {
    await db.query(`
      INSERT INTO templates (name, subject, body) VALUES 
      ('AI Personalized Outreach', '{{personalized_subject}}', '{{personalized_body}}'),
      ('Custom Web Design Pitch', '💡 Website idea for {{business_name}}', 'Hi {{estimated_owner_name}},\\n\\nI was looking up some highly rated local businesses in the area and noticed your excellent services at {{business_name}} (loved your Google review rating!).\\n\\nHowever, I noticed that your business currently doesn\'\'t have an active website. In today\'\'s digital market, having a strong web presence is key to getting new leads without middle-man fees.\\n\\n{{quick_pitch_hook}}\\n\\nI designed a quick mockup of how your website could look, featuring direct online booking and customer review testimonials. Would you be open to a 5-minute chat sometime this week to take a look?\\n\\nBest regards,\\nArt Halimi - arthalimi.com'),
      ('Mobile Optimization Landing Page Pitch', '📱 Quick suggestion for {{business_name}}', 'Dear {{estimated_owner_name}},\\n\\nI hope this email finds you well.\\n\\nMy name is Art Halimi, and I am a web developer at arthalimi.com. I recently found {{business_name}} while looking for services in your area. While you have amazing reviews on Google Maps, it looks like you don\'\'t have a website to convert those visitors into direct customers.\\n\\n{{quick_pitch_hook}}\\n\\nHaving a simple, fast-loading, mobile-optimized landing page can increase your direct client calls by up to 40%.\\n\\nWould you be open to seeing a free custom visual concept I drafted for you?\\n\\nKind regards,\\nArt Halimi - arthalimi.com')
    `);
  }
}
