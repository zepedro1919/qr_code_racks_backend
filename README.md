# QR Racks - Backend API

API REST para Sistema de Gestão de Inventário com QR Codes

## 🚀 Deploy no Railway

### Variáveis de Ambiente

Configure no Railway:
```
DATABASE_URL=postgresql://...  (da DB PostgreSQL do Railway)
JWT_SECRET=uma_chave_secreta_muito_forte
JWT_EXPIRES_IN=24h
NODE_ENV=production
FRONTEND_URL=https://seu-frontend.up.railway.app
```

### Deploy
O Railway usa automaticamente o `railway.toml` para executar `npm start`

## 🔧 Desenvolvimento Local

```bash
npm install
# Cria .env (ver .env.example)
npm run dev
```

Servidor em http://localhost:3001

## 📋 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registo

### Racks
- `GET /api/racks` - Listar racks
- `POST /api/racks` - Criar rack
- `PUT /api/racks/:id` - Atualizar rack
- `DELETE /api/racks/:id` - Eliminar rack

### Encomendas
- `GET /api/encomendas` - Listar encomendas
- `POST /api/encomendas/import` - Importar CSV

### Racks-Encomendas (Inventário)
- `GET /api/racks-encomendas` - Listar inventário
- `POST /api/racks-encomendas/adicionar` - Adicionar produto a rack
- `POST /api/racks-encomendas/remover` - Remover produto de rack
- `GET /api/racks-encomendas/quantidade-alocada` - Quantidade alocada
- `GET /api/racks-encomendas/quantidade-rack` - Quantidade numa rack

### Health
- `GET /api/health` - Health check

## 🗄️ Base de Dados

### Tabelas
- `users` - Utilizadores
- `racks` - Racks do armazém
- `encomendas_fornecedor` - Encomendas importadas
- `racks_encomendas` - Associação produtos/racks

### Setup inicial
Execute os scripts SQL em `database/` ou crie as tabelas manualmente.
