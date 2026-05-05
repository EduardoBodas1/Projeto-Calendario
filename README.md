# 📅 Calendário de Projetos

App de linha do tempo colaborativo para equipes, com backend Node.js + MySQL.

## Stack
- **Frontend:** HTML + CSS + JS puro (sem framework)
- **Backend:** Node.js + Express
- **Banco:** MySQL
- **Deploy:** Railway (gratuito para começar)

---

## 🚀 Deploy no Railway (recomendado)

### 1. Suba o código para o GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Crie um repositório no GitHub e siga as instruções de push
```

### 2. Crie o banco MySQL no Railway
1. Acesse [railway.app](https://railway.app) e faça login com o GitHub
2. Clique em **New Project → Deploy MySQL**
3. Aguarde o banco subir e clique nele
4. Na aba **Variables**, copie os valores de:
   - `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

### 3. Adicione o serviço Node.js
1. No mesmo projeto, clique em **New → GitHub Repo** e selecione seu repositório
2. Railway detecta automaticamente o Node.js
3. Vá em **Variables** do serviço Node e adicione:

| Variável       | Valor (copiar do MySQL acima)     |
|---------------|-----------------------------------|
| `DB_HOST`     | valor de `MYSQLHOST`              |
| `DB_PORT`     | valor de `MYSQLPORT`              |
| `DB_USER`     | valor de `MYSQLUSER`              |
| `DB_PASSWORD` | valor de `MYSQLPASSWORD`          |
| `DB_NAME`     | valor de `MYSQLDATABASE`          |
| `PORT`        | `3000`                            |

4. Railway faz o deploy automaticamente
5. Clique em **Settings → Generate Domain** para obter a URL pública

### 4. Adicionar como aba no Teams
1. No canal do Teams, clique em **+**
2. Escolha **Website**
3. Cole a URL gerada pelo Railway
4. Salve — pronto! 🎉

---

## 💻 Rodar localmente

```bash
# 1. Instale as dependências
npm install

# 2. Configure o .env
cp .env.example .env
# Edite .env com suas credenciais MySQL locais

# 3. Inicie o servidor
npm run dev   # desenvolvimento (com nodemon)
npm start     # produção
```

Acesse: http://localhost:3000

---

## 📁 Estrutura do projeto

```
project-calendar/
├── public/
│   └── index.html        # Frontend completo
├── src/
│   ├── server.js         # Servidor Express
│   ├── routes.js         # Rotas da API REST
│   └── db.js             # Conexão MySQL + schema
├── .env.example          # Variáveis de ambiente
├── package.json
└── README.md
```

## 🔌 API REST

| Método | Rota                          | Descrição                  |
|--------|-------------------------------|----------------------------|
| GET    | /api/projects                 | Lista todos os projetos     |
| POST   | /api/projects                 | Cria projeto               |
| PUT    | /api/projects/:id             | Renomeia projeto           |
| DELETE | /api/projects/:id             | Remove projeto (+ blocos)  |
| POST   | /api/projects/:pid/segments   | Cria bloco em um projeto   |
| PUT    | /api/segments/:id             | Edita bloco                |
| DELETE | /api/segments/:id             | Remove bloco               |
