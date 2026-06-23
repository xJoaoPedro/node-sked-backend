<p align="center"><img src="src/assets/readme.svg" width="400" alt="Sked API"></p>

# Requisitos e instalação

### Requisitos

<p align="center">
<a href="https://nodejs.org/pt">
<img src="https://img.shields.io/badge/Node-24.14.*-3C873A?logo=node.js&logoColor=FFF" alt="node 24.14.*"></a>
&nbsp
<a href="https://docs.npmjs.com/downloading-and-installing-node-js-and-npm">
<img src="https://img.shields.io/badge/NPM-11.9.*-CC3534?logo=npm&logoColor=FFF" alt="npm 11.9.*"></a>
&nbsp
<a href="https://www.postgresql.org/download/">
<img src="https://img.shields.io/badge/PostgreSQL-16.13.*-4169E1?logo=postgresql&logoColor=FFF" alt="Postgres 16.13.*"></a>

### Instalação e teste

Para rodar o backend localmente, configure um banco PostgreSQL e preencha o arquivo `.env` a partir de `.env.example`.

#### Configuração do banco

Exemplo de criação de banco e usuário:

```sql
CREATE DATABASE bancoexemplo;
CREATE USER meuuser WITH PASSWORD '123456';
ALTER DATABASE bancoexemplo OWNER TO meuuser;
```

Valores esperados no `.env`:

- `DB_DATABASE=bancoexemplo`
- `DB_USERNAME=meuuser`
- `DB_PASSWORD=123456`
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DATABASE_URL=postgresql://meuuser:123456@localhost:5432/bancoexemplo`

<div id="projConfig">

#### Configuração do projeto

Depois de clonar o repositório:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

O servidor sobe por padrão em `http://localhost:3000`, ou na porta definida em `API_PORT`.

<p style="color:yellow">
  ⚠️ Atenção: a maior parte das rotas de <code>/api</code> exige JWT no header <code>Authorization: Bearer &lt;token&gt;</code>.
</p>

</div>

<br />

### Tecnologias usadas

O projeto usa:

- `Node.js` + `Express 5`
- `Prisma ORM` com `PostgreSQL`
- `JWT` para autenticação
- `Zod` para validação
- `Socket.IO` para eventos em tempo real
- `Nodemailer` para formulário de contato
- `bcrypt` para hash de senha
- `dotenv` para carregamento de variáveis de ambiente
- `pg` como driver PostgreSQL
- `QRCode` para geração de QR Code da integração
- `Anthropic API` para recursos de IA
- integração com `Evolution API` para WhatsApp

<div align="center">
<a href="https://nodejs.org/pt"><img src="https://img.shields.io/badge/Node.js-5FA04E?logo=node.js&logoColor=FFF" alt="logo Node" height="20" /></a>
<a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=FFF" alt="logo Express" height="20" /></a>
<a href="https://www.jwt.io/"><img src="https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=FFF" alt="logo JWT" height="20" /></a>
<a href="https://www.prisma.io/orm"><img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=FFF" alt="logo Prisma" height="20" /></a>
<a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=FFF" alt="logo PostgreSQL" height="20" /></a>
<a href="https://zod.dev/"><img src="https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=FFF" alt="logo Zod" height="20" /></a>
<a href="https://socket.io/"><img src="https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=FFF" alt="logo Socket.IO" height="20" /></a>

<a href="https://nodemailer.com/"><img src="https://img.shields.io/badge/Nodemailer-0F9D58?logo=gmail&logoColor=FFF" alt="logo Nodemailer" height="20" /></a>
<a href="https://www.npmjs.com/package/bcrypt"><img src="https://img.shields.io/badge/Bcrypt-7952B3?logoColor=FFF" alt="logo Bcrypt" height="20" /></a>
<a href="https://www.npmjs.com/package/dotenv"><img src="https://img.shields.io/badge/Dotenv-ECD53F?logo=dotenv&logoColor=000" alt="logo Dotenv" height="20" /></a>
<a href="https://www.npmjs.com/package/qrcode"><img src="https://img.shields.io/badge/QRCode-222222?logoColor=FFF" alt="logo QRCode" height="20" /></a>
<a href="https://www.anthropic.com/api"><img src="https://img.shields.io/badge/Anthropic-191919?logoColor=FFF" alt="logo Anthropic" height="20" /></a>
<a href="https://doc.evolution-api.com/"><img src="https://img.shields.io/badge/Evolution_API-25D366?logo=whatsapp&logoColor=FFF" alt="logo Evolution API" height="20" /></a>
</div>

<br />

# Models e Endpoints

Os models atuais são definidos no Prisma em `prisma/schema.prisma`. Abaixo está a documentação atualizada da API com base nas rotas, validators e controllers do código.

## Convenções da API

### Autenticação

- Rotas públicas: `/auth`, `/contact`, `/webhooks/evolution`
- Rotas protegidas: todo o namespace `/api`
- Header JWT:

```http
Authorization: Bearer <token>
```

- Header do admin:

```http
x-admin-password: <ADMIN_PANEL_PASSWORD>
```

### Regras de acesso

- Tokens de empresa não aprovada recebem `403` em `/api` com `code: "COMPANY_APPROVAL_PENDING"`.
- Rotas `/api/companies/:id/*` validam se o `company_id` do token bate com o `:id`.
- Rotas que recebem `company_id` no body/query também validam acesso.
- Rotas `/api/users/:id` só permitem acesso ao próprio usuário autenticado.

### Padrão de resposta

Sucesso com dados:

```json
{
  "message": "Consulta realizada com sucesso!",
  "data": {}
}
```

Erro de validação:

```json
{
  "message": "Dados inválidos",
  "errors": {}
}
```

Erros de autenticação costumam retornar:

```json
{
  "error": "Token inválido"
}
```

---

## 👤 Usuários (`users`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `name` | String |
| `email` | String |
| `password` | String |
| `phone` | String |
| `status` | `ACTIVE \| DISABLED` |
| `last_login` | DateTime nullable |
| `created_at` | DateTime |
| `updated_at` | DateTime |

### Auth

| Endpoint | Body | Response |
| --- | --- | --- |
| `POST /auth/users/register` | `{ "name": "João", "email": "joao@email.com", "password": "123456", "phone": "51999999999" }` | `204 No Content` |
| `POST /auth/users/login` | `{ "email": "joao@email.com", "password": "123456" }` | `{ "token": "...", "companyId": 1, "employeeId": 3, "role": "EMPLOYEE" }` |
| `POST /auth/refresh` | sem body, com JWT | `{ "token": "..." }` |

### Endpoints protegidos

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/users` | sem body | lista de usuários sem senha |
| `GET /api/users/:id` | sem body | usuário sem senha |
| `PATCH /api/users/:id` | qualquer campo de usuário | `204 No Content` |
| `DELETE /api/users/:id` | sem body | `204 No Content` |

Exemplo de retorno:

```json
{
  "message": "Usuário encontrado com sucesso!",
  "data": {
    "id": 1,
    "name": "João",
    "email": "joao@email.com",
    "phone": "51999999999",
    "status": "ACTIVE",
    "last_login": "2026-06-22T12:00:00.000Z",
    "created_at": "2026-06-20T12:00:00.000Z",
    "updated_at": "2026-06-22T12:00:00.000Z"
  }
}
```

---

## 🏢 Empresas (`companies`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `legal_name` | String |
| `fantasy_name` | String |
| `cnpj` | String |
| `email` | String |
| `password` | String |
| `phone` | String |
| `approved` | Boolean |
| `photo` | String nullable |
| `website` | String nullable |
| `accepted_payment_methods` | `PIX \| CREDIT \| DEBIT \| CASH`[] |
| `amenities` | enum[] |
| `low_stock_threshold` | Int |
| `plan` | `FREE \| PRO` |
| `status` | `PENDING \| APPROVED \| DENIED` |
| `approve_date` | DateTime nullable |

### Auth

| Endpoint | Body | Response |
| --- | --- | --- |
| `POST /auth/companies/register` | dados da empresa | `204 No Content` |
| `POST /auth/companies/login` | `{ "email": "empresa@email.com", "password": "123456" }` | `{ "token": "...", "id": 1, "approved": false, "status": "PENDING", "approve_date": null }` |

Body de cadastro:

```json
{
  "legal_name": "Empresa LTDA",
  "fantasy_name": "Sked Barber",
  "cnpj": "12345678000199",
  "email": "empresa@email.com",
  "password": "123456",
  "phone": "51999999999",
  "photo": null,
  "website": "https://empresa.com",
  "accepted_payment_methods": ["PIX", "CREDIT"],
  "amenities": ["WIFI", "PARKING"],
  "low_stock_threshold": 3,
  "plan": "FREE"
}
```

### Endpoints protegidos

| Endpoint | Body / Query | Response |
| --- | --- | --- |
| `GET /api/companies` | sem body | lista de empresas |
| `GET /api/companies/:id` | sem body | empresa |
| `PATCH /api/companies/:id` | campos parciais da empresa | `{ "message": "Empresa atualizada com sucesso!", "data": { "phoneChanged": false } }` |
| `DELETE /api/companies/:id` | sem body | `204 No Content` |
| `GET /api/companies/:id/data` | sem body | payload agregado do dashboard |
| `GET /api/companies/:id/appointments` | `page`, `limit`, `date`, `service`, `client`, `status`, `employeeId`, `timeStart`, `timeEnd`, `excludeId` | paginação de agendamentos |
| `GET /api/companies/:id/appointments/export` | mesmos filtros de appointments | lista completa sem paginação |
| `GET /api/companies/:id/cancellations` | `page`, `limit`, `filterPeriod=month\|week\|day\|year` | paginação de cancelamentos |
| `GET /api/companies/:id/cancellations/summary` | `page`, `limit`, `filterPeriod` | métricas e gráficos de cancelamentos |
| `GET /api/companies/:id/revenue` | `page`, `limit`, `filterPeriod` | paginação de receitas |
| `GET /api/companies/:id/revenue/summary` | `page`, `limit`, `filterPeriod` | métricas e gráficos de receitas |
| `GET /api/companies/:id/revenue/appointments` | `limit` | opções de agendamento para lançamento financeiro |
| `POST /api/companies/:id/revenue/transactions` | lançamento de receita | receita criada |
| `GET /api/companies/:id/services` | sem body | lista de serviços da empresa |
| `GET /api/companies/:id/products` | sem body | estoque + métricas |
| `GET /api/companies/:id/professionals` | sem body | profissionais + vínculos |
| `GET /api/companies/:id/customers` | `page`, `limit` | paginação de clientes |
| `GET /api/companies/:id/customers/summary` | `limit` | resumo inicial de clientes |
| `GET /api/companies/:id/settings` | sem body | configurações da empresa |
| `GET /api/companies/:id/evolution/status` | sem body | status da instância WhatsApp |
| `POST /api/companies/:id/evolution/connect` | sem body | início de conexão da instância |
| `POST /api/companies/:id/evolution/disconnect` | sem body | desconexão da instância |
| `PATCH /api/companies/:id/evolution/auto-messages` | `{ "enabled": true }` | status atualizado |

Exemplo de retorno de `GET /api/companies/:id/settings`:

```json
{
  "message": "Configurações encontradas com sucesso!",
  "data": {
    "photo": null,
    "fantasy_name": "Sked Barber",
    "email": "empresa@email.com",
    "phone": "51999999999",
    "website": "https://empresa.com",
    "acceptedPaymentMethods": ["PIX", "CREDIT"],
    "amenities": ["WIFI", "PARKING"],
    "lowStockThreshold": 3,
    "evolution": {
      "instanceName": "company-1-sked-barber",
      "status": "open",
      "profilePictureUrl": null,
      "autoMessagesEnabled": true,
      "companyPhone": "51999999999",
      "connectedPhone": "51999999999",
      "phoneMatchesCompany": true,
      "phoneMismatch": false,
      "rawConnected": true,
      "connected": true
    }
  }
}
```

Exemplo de retorno de `GET /api/companies/:id/appointments`:

```json
{
  "message": "Agendamentos encontrados com sucesso!",
  "data": {
    "data": [],
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 0
  }
}
```

Exemplo de body para `POST /api/companies/:id/revenue/transactions`:

```json
{
  "appointment_id": 10,
  "description": "Entrada parcial",
  "amount": 35.5,
  "payment_method": "PIX",
  "status": "RECEIVED",
  "occurred_at": "2026-06-22T14:00:00.000Z"
}
```

Retorno:

```json
{
  "message": "Receita registrada com sucesso!",
  "data": {
    "id": "7",
    "date": "2026-06-22T14:00:00.000Z",
    "clientName": "Maria",
    "serviceName": "Corte",
    "professionalName": "Carlos",
    "paymentMethod": "PIX",
    "value": 35.5,
    "status": "COMPLETED",
    "description": "Entrada parcial",
    "appointmentId": 10
  }
}
```

---

## 📍 Endereços (`addresses`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `cep` | String |
| `street` | String |
| `number` | String |
| `complement` | String nullable |
| `neighborhood` | String |
| `city` | String |
| `state` | String |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/addresses` | sem body | lista de endereços |
| `GET /api/addresses/:id` | sem body | endereço |
| `POST /api/addresses` | `{ "company_id": 1, "cep": "90000000", "street": "Rua A", "number": "123", "complement": null, "neighborhood": "Centro", "city": "Porto Alegre", "state": "RS" }` | `204 No Content` |
| `PATCH /api/addresses/:id` | campos parciais | `204 No Content` |
| `DELETE /api/addresses/:id` | sem body | `204 No Content` |

---

## 👔 Profissionais (`professionals` / `employees`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `user_id` | Int nullable |
| `name` | String |
| `email` | String |
| `phone` | String |
| `role` | `MANAGER \| EMPLOYEE` |
| `status` | `ACTIVE \| DISABLED` |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/professionals` | sem body | lista de profissionais da empresa do token |
| `GET /api/professionals/:id` | sem body | profissional |
| `POST /api/professionals` | profissional + `services[]` + `scheduleOpenings[]` | `204 No Content` |
| `PATCH /api/professionals/:id` | campos parciais | `204 No Content` |
| `DELETE /api/professionals/:id` | sem body | `204 No Content` |

Body de criação:

```json
{
  "company_id": 1,
  "user_id": null,
  "name": "Carlos",
  "email": "carlos@email.com",
  "phone": "51999999999",
  "role": "EMPLOYEE",
  "status": "ACTIVE",
  "services": [1, 2],
  "scheduleOpenings": [
    { "week_day": 1, "start_time": "09:00", "end_time": "18:00" }
  ]
}
```

---

## 🕒 Aberturas de agenda (`schedule_openings`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `employee_id` | Int |
| `week_day` | Int (`0` a `6`) |
| `start_time` | `HH:mm` |
| `end_time` | `HH:mm` |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/schedule-openings` | sem body | lista |
| `GET /api/schedule-openings/:id` | sem body | item |
| `POST /api/schedule-openings` | `{ "company_id": 1, "employee_id": 2, "week_day": 1, "start_time": "09:00", "end_time": "18:00" }` | `204 No Content` |
| `PATCH /api/schedule-openings/:id` | campos parciais | `204 No Content` |
| `DELETE /api/schedule-openings/:id` | sem body | `204 No Content` |

---

## 🚫 Bloqueios de agenda (`schedule_blocks`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `employee_id` | Int |
| `start_time` | DateTime |
| `end_time` | DateTime nullable |
| `reason` | String |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/schedule-blocks` | sem body | lista |
| `GET /api/schedule-blocks/:id` | sem body | item |
| `POST /api/schedule-blocks` | `{ "company_id": 1, "employee_id": 2, "start_time": "2026-06-22T13:00:00.000Z", "end_time": "2026-06-22T14:00:00.000Z", "reason": "Almoço" }` | `204 No Content` |
| `PATCH /api/schedule-blocks/:id` | campos parciais | `204 No Content` |
| `DELETE /api/schedule-blocks/:id` | sem body | `204 No Content` |

---

## ✂️ Serviços (`services`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `name` | String |
| `category` | enum |
| `description` | String nullable |
| `duration_minutes` | Int |
| `price` | Decimal |
| `commission` | Decimal |
| `status` | `ACTIVE \| DISABLED` |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/services` | sem body | lista |
| `GET /api/services/:id` | sem body | item |
| `POST /api/services` | `{ "company_id": 1, "name": "Corte", "description": "Corte masculino", "duration_minutes": 45, "commission": 40, "category": "HAIR", "price": 50, "status": "ACTIVE" }` | `{ "message": "Serviço criado com sucesso!", "data": { ... } }` |
| `PATCH /api/services/:id` | campos parciais | `204 No Content` |
| `DELETE /api/services/:id` | sem body | `204 No Content` |

Categorias aceitas em `services` e `products`:

`HAIR`, `BEARD`, `AESTHETIC`, `NAILS`, `MASSAGE`, `THERAPY`, `HEALTH`, `DENTAL`, `FITNESS`, `BEAUTY`, `AUTOMOTIVE`, `TECHNICAL`, `HOME_SERVICE`, `PET`, `CONSULTING`, `EDUCATION`, `OTHER`

---

## 📅 Agendamentos (`appointments`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `service_id` | Int |
| `employee_id` | Int |
| `client_id` | Int |
| `start_time` | DateTime |
| `end_time` | DateTime |
| `observations` | String nullable |
| `status` | `PENDING \| CONFIRMED \| COMPLETED \| CANCELED \| NO_SHOW` |
| `cancel_reason` | enum nullable |
| `payment_method` | enum nullable |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/appointments` | sem body | lista |
| `GET /api/appointments/:id` | sem body | agendamento |
| `GET /api/appointments/:id/:date` | `:id` = company_id, `:date` = `YYYY-MM-DD` | agendamentos da data |
| `POST /api/appointments` | payload de agendamento | `201 Created` com agendamento criado |
| `PATCH /api/appointments/:id` | campos parciais | `200 OK` com agendamento atualizado |
| `DELETE /api/appointments/:id` | sem body | `204 No Content` |

Body de criação:

```json
{
  "company_id": 1,
  "service_id": 1,
  "employee_id": 2,
  "client_id": 3,
  "start_time": "2026-06-22T15:00:00.000Z",
  "observations": "Cliente prefere tesoura",
  "status": "CONFIRMED"
}
```

Regras importantes:

- `end_time` é calculado automaticamente a partir da duração do serviço.
- o horário precisa caber em uma abertura de agenda do profissional.
- conflitos de horário retornam `409`.

Exemplo de retorno de criação:

```json
{
  "message": "Agendamento criado com sucesso!",
  "data": {
    "id": 12,
    "company_id": 1,
    "service_id": 1,
    "employee_id": 2,
    "client_id": 3,
    "start_time": "2026-06-22T15:00:00.000Z",
    "end_time": "2026-06-22T15:45:00.000Z",
    "observations": "Cliente prefere tesoura",
    "status": "CONFIRMED"
  }
}
```

---

## 🤖 Interações do bot (`bot_interactions`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `client_id` | Int |
| `type` | `APPOINTMENT \| CANCELLATION \| REAPPOINTMENT \| INQUIRY \| OTHER` |
| `status` | `IN_PROGRESS \| WAITING_PAYMENT \| SCHEDULED \| CANCELED \| OTHER` |
| `data` | JSON |

### Endpoints REST

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/bot-interactions` | sem body | lista |
| `GET /api/bot-interactions/:id` | sem body | item |
| `POST /api/bot-interactions` | `{ "company_id": 1, "client_id": 3, "type": "INQUIRY", "status": "IN_PROGRESS", "data": {} }` | `204 No Content` |
| `PATCH /api/bot-interactions/:id` | campos parciais | `204 No Content` |
| `DELETE /api/bot-interactions/:id` | sem body | `204 No Content` |

### Endpoints Evolution

| Endpoint | Body / Query | Response |
| --- | --- | --- |
| `POST /api/bot-interactions/evolution/instance` | `{ "company_id": 1, "instanceName": "company-1-sked", "qrcode": true }` | `201` com dados da instância |
| `POST /api/bot-interactions/evolution/instance/connect` | `{ "company_id": 1, "instanceName": "company-1-sked" }` | `200` com status da conexão |
| `GET /api/bot-interactions/evolution/instance/status?company_id=1&instanceName=company-1-sked` | query string | `200` com status |
| `POST /api/bot-interactions/evolution/message/text` | `{ "company_id": 1, "instanceName": "company-1-sked", "number": "5511999999999", "text": "Olá", "delay": 0, "linkPreview": false }` | `200` com retorno da Evolution |

### Webhook

| Endpoint | Header | Response |
| --- | --- | --- |
| `POST /webhooks/evolution` | `x-webhook-secret` opcional | `204 No Content` |
| `POST /webhooks/evolution/:event` | `x-webhook-secret` opcional | `204 No Content` |

Se `EVOLUTION_WEBHOOK_SECRET` estiver definido e o header não bater, a API retorna:

```json
{
  "message": "Webhook nao autorizado"
}
```

---

## 🧾 Assinaturas (`signatures`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `plan` | `FREE \| PRO` |
| `status` | `PENDING \| ACTIVE \| EXPIRED \| CANCELED` |
| `start_date` | DateTime |
| `renovation_date` | DateTime |
| `cancellation_date` | DateTime nullable |
| `paid` | Boolean |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/signatures` | sem body | lista |
| `GET /api/signatures/:id` | sem body | item |
| `POST /api/signatures` | `{ "company_id": 1, "plan": "PRO", "status": "ACTIVE", "start_date": "2026-06-01T00:00:00.000Z", "renovation_date": "2026-07-01T00:00:00.000Z", "cancellation_date": null, "paid": true }` | `204 No Content` |
| `PATCH /api/signatures/:id` | campos parciais | `204 No Content` |
| `DELETE /api/signatures/:id` | sem body | `204 No Content` |

---

## 📦 Produtos (`products`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `company_id` | Int |
| `name` | String |
| `category` | enum |
| `quantity` | Int |
| `cost_price` | Decimal |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /api/products` | sem body | lista |
| `GET /api/products/:id` | sem body | item |
| `POST /api/products` | `{ "company_id": 1, "name": "Pomada", "category": "BEAUTY", "quantity": 10, "cost_price": 18.9 }` | `{ "message": "Produto criado com sucesso!", "data": { ... } }` |
| `PATCH /api/products/:id` | campos parciais | `204 No Content` |
| `DELETE /api/products/:id` | sem body | `204 No Content` |

Exemplo de retorno agregado em `GET /api/companies/:id/products`:

```json
{
  "message": "Produtos encontrados com sucesso!",
  "data": {
    "products": [],
    "totalProducts": 0,
    "totalCost": 0,
    "lowStock": 0,
    "outOfStock": 0,
    "lowStockThreshold": 2
  }
}
```

---

## 👥 Clientes (`customers`)

### Model

| Campo | Tipo |
| ----- | ---- |
| `id` | Int |
| `name` | String |
| `phone` | String |

### Endpoints

| Endpoint | Body | Response |
| --- | --- | --- |
| `POST /api/customers` | `{ "company_id": 1, "name": "Maria", "phone": "51988887777" }` | `{ "message": "Cliente cadastrado com sucesso!", "data": { ... } }` |
| `PATCH /api/customers/:id` | campos parciais | `{ "message": "Cliente atualizado com sucesso!", "data": { ... } }` |
| `GET /api/companies/:id/customers` | `page`, `limit` | paginação |
| `GET /api/companies/:id/customers/summary` | `limit` | resumo inicial |

Exemplo de retorno de resumo:

```json
{
  "message": "Clientes encontrados com sucesso!",
  "data": {
    "totalCustomers": 120,
    "newCustomers": 15,
    "returningCustomers": 38,
    "customers": []
  }
}
```

---

## 🛠️ Admin

As rotas de admin exigem o header `x-admin-password`.

| Endpoint | Header | Response |
| --- | --- | --- |
| `GET /admin/companies/pending` | `x-admin-password` | lista de empresas pendentes |
| `PATCH /admin/companies/:id/approve` | `x-admin-password` | empresa aprovada |

Exemplo:

```json
{
  "message": "Empresa aprovada com sucesso!",
  "data": {
    "id": 1,
    "fantasy_name": "Sked Barber",
    "legal_name": "Empresa LTDA",
    "approved": true,
    "status": "APPROVED",
    "approve_date": "2026-06-22T15:00:00.000Z"
  }
}
```

Erros de admin:

```json
{
  "error": "Senha do painel admin inválida"
}
```

---

## ✉️ Contato

| Endpoint | Body | Response |
| --- | --- | --- |
| `POST /contact` | `{ "name": "João", "email": "joao@email.com", "message": "Quero saber mais." }` | `204 No Content` |

Erros possíveis:

- `400` para dados inválidos
- `503` quando SMTP não estiver configurado
- `500` quando o envio falhar

---

## Enums úteis

### `status_enum`

`ACTIVE`, `DISABLED`

### `plan_enum`

`FREE`, `PRO`

### `company_status_enum`

`PENDING`, `APPROVED`, `DENIED`

### `appointment_status`

`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELED`, `NO_SHOW`

### `cancel_reason`

`NO_SHOW`, `SCHEDULE_CONFLICT`, `ILLNESS`, `EMERGENCY`, `PROFESSIONAL_UNAVAILABLE`, `OTHER`

### `payment_method_enum`

`PIX`, `CREDIT`, `DEBIT`, `CASH`

### `company_amenity_enum`

`ACCEPTS_CHILDREN`, `WIFI`, `PARKING`, `ACCEPTS_AUTISTIC`, `ACCESSIBILITY`, `PET_FRIENDLY`

---

## Variáveis de ambiente

O arquivo `.env.example` já reflete o estado atual do projeto. As principais variáveis são:

- `API_PORT`
- `ADMIN_PANEL_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_URL`
- `APP_TIMEZONE`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_TO_EMAIL`
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_URL`, `EVOLUTION_WEBHOOK_SECRET`
- `EVOLUTION_AUTO_REPLY_ENABLED`, `EVOLUTION_AUTO_REPLY_MAX_MESSAGE_AGE_SECONDS`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL`

---

## Scripts

```bash
npm run dev
npx prisma generate
npx prisma migrate deploy
npm run seed:aesthetic
```
