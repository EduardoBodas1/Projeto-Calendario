const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'project_calendar',
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        position   INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS segments (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        label      VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date   DATE NOT NULL,
        status     ENUM('planejado','em andamento','concluído','atrasado') DEFAULT 'planejado',
        position   INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Seed com dados de exemplo se estiver vazio
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM projects');
    if (rows[0].count === 0) {
      await conn.query(`
        INSERT INTO projects (name, position) VALUES
        ('Redesign do site', 1),
        ('App mobile v2', 2),
        ('Campanha de marketing', 3),
        ('Dashboard analytics', 4)
      `);
      await conn.query(`
        INSERT INTO segments (project_id, label, start_date, end_date, status, position) VALUES
        (1, 'Pesquisa',       '2026-01-10', '2026-02-15', 'concluído',    1),
        (1, 'Wireframes',     '2026-02-16', '2026-03-10', 'concluído',    2),
        (1, 'Desenvolvimento','2026-03-11', '2026-05-30', 'em andamento', 3),
        (2, 'Planejamento',   '2026-01-20', '2026-02-28', 'concluído',    1),
        (2, 'Sprint 1',       '2026-03-01', '2026-04-30', 'em andamento', 2),
        (2, 'Sprint 2',       '2026-05-01', '2026-07-31', 'planejado',    3),
        (3, 'Briefing',       '2026-03-01', '2026-03-20', 'concluído',    1),
        (3, 'Produção',       '2026-03-21', '2026-05-10', 'atrasado',     2),
        (3, 'Veiculação',     '2026-05-11', '2026-07-31', 'planejado',    3),
        (4, 'Escopo',         '2026-05-01', '2026-06-15', 'planejado',    1),
        (4, 'Build',          '2026-06-16', '2026-09-30', 'planejado',    2)
      `);
    }

    console.log('✅ Banco de dados pronto');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
