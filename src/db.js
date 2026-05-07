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
    // ── Tabela de projetos ──────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        position   INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // ── Blocos da linha do tempo ────────────────────────
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

    // ── Escopo do projeto ───────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS project_scopes (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        project_id  INT NOT NULL UNIQUE,
        descricao   TEXT,
        responsavel VARCHAR(255),
        cliente     VARCHAR(255),
        prioridade  ENUM('alta','media','baixa') DEFAULT 'media',
        status      ENUM('planejado','em andamento','concluído','atrasado') DEFAULT 'planejado',
        progresso   INT DEFAULT 0,
        orc_total   DECIMAL(15,2) DEFAULT 0,
        orc_gasto   DECIMAL(15,2) DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // ── Objetivos do escopo ────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS scope_objectives (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        text       VARCHAR(500) NOT NULL,
        done       TINYINT(1) DEFAULT 0,
        position   INT DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // ── Riscos do escopo ───────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS scope_risks (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        nivel      ENUM('alto','medio','baixo') DEFAULT 'medio',
        text       VARCHAR(500) NOT NULL,
        position   INT DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // ── Membros da equipe ──────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS scope_team (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name       VARCHAR(255) NOT NULL,
        role       VARCHAR(255),
        position   INT DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // ── Seed de exemplo se banco estiver vazio ─────────
    const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM projects');
    if (count === 0) {
      await conn.query(`
        INSERT INTO projects (name, position) VALUES
        ('App mobile v2', 1),
        ('Redesign do site', 2),
        ('Campanha de marketing', 3),
        ('Dashboard analytics', 4)
      `);
      await conn.query(`
        INSERT INTO segments (project_id, label, start_date, end_date, status, position) VALUES
        (1,'Planejamento','2026-01-20','2026-02-28','concluído',1),
        (1,'Sprint 1','2026-03-01','2026-04-30','em andamento',2),
        (1,'Sprint 2','2026-05-01','2026-07-31','planejado',3),
        (2,'Pesquisa','2026-01-10','2026-02-15','concluído',1),
        (2,'Wireframes','2026-02-16','2026-03-10','concluído',2),
        (2,'Desenvolvimento','2026-03-11','2026-05-30','concluído',3),
        (3,'Briefing','2026-03-01','2026-03-20','concluído',1),
        (3,'Produção','2026-03-21','2026-05-10','atrasado',2),
        (3,'Veiculação','2026-05-11','2026-07-31','planejado',3),
        (4,'Escopo','2026-05-01','2026-06-15','planejado',1),
        (4,'Build','2026-06-16','2026-09-30','planejado',2)
      `);
      await conn.query(`
        INSERT INTO project_scopes (project_id, descricao, responsavel, cliente, prioridade, status, progresso, orc_total, orc_gasto) VALUES
        (1,'Desenvolvimento da segunda versão do aplicativo mobile, com foco em redesign da UX, integração com novas APIs e suporte a notificações push.','Eduardo Pinto','Interno — Produto','alta','em andamento',33,120000,41500),
        (2,'Reformulação completa do site institucional com novo design system, melhorias de performance e SEO.','Mariana Costa','Interno — Marketing','media','concluído',100,45000,44200),
        (3,'Campanha multicanal para lançamento do novo produto, incluindo redes sociais, email marketing e mídia paga.','Camila Reis','Externo — Cliente ABC','alta','atrasado',20,80000,22000),
        (4,'Criação de dashboard interno de analytics para acompanhamento de métricas de negócio em tempo real.','Felipe Torres','Interno — Dados','baixa','planejado',0,60000,0)
      `);
      await conn.query(`
        INSERT INTO scope_objectives (project_id, text, done, position) VALUES
        (1,'Redesign completo da interface',1,1),(1,'Integração com API de pagamentos',1,2),(1,'Suporte a notificações push',0,3),(1,'Lançamento nas lojas',0,4),
        (2,'Novo design system',1,1),(2,'Otimização de performance',1,2),(2,'Melhoria de SEO',1,3),
        (3,'Briefing aprovado',1,1),(3,'Produção dos materiais',0,2),(3,'Veiculação nos canais',0,3),
        (4,'Definição de escopo',0,1),(4,'Desenvolvimento do dashboard',0,2),(4,'Treinamento da equipe',0,3)
      `);
      await conn.query(`
        INSERT INTO scope_risks (project_id, nivel, text, position) VALUES
        (1,'alto','Atraso na integração com API de terceiros pode impactar o prazo do Sprint 2',1),
        (1,'medio','Rotatividade na equipe de desenvolvimento',2),
        (1,'baixo','Mudanças nos requisitos de lojas de aplicativos',3),
        (2,'baixo','Manutenção futura do design system',1),
        (3,'alto','Aprovação criativa pelo cliente está atrasada 2 semanas',1),
        (3,'medio','Budget de mídia pode ser insuficiente para o alcance esperado',2),
        (4,'medio','Dependência de acesso aos dados de produção',1)
      `);
      await conn.query(`
        INSERT INTO scope_team (project_id, name, role, position) VALUES
        (1,'Eduardo Pinto','Gerente de projeto',1),(1,'Mariana Costa','Dev frontend',2),(1,'Rafael Lima','Dev backend',3),
        (2,'Mariana Costa','Dev frontend',1),(2,'Ana Souza','Designer UX',2),
        (3,'Camila Reis','Product Owner',1),
        (4,'Felipe Torres','DevOps',1)
      `);
    }

    console.log('✅ Banco de dados pronto');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
