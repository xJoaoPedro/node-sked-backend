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

Para rodar este projeto é necessário ter um banco de dados Postgres instalado e configurado, caso você já tenha um banco configurado, pode pular esta sessão e ir direto para a <a href="#projConfig">configuração do projeto</a>.

<br />

#### Configuração do banco

Para a configuração padrão, o banco utilizado é o PostgreSQL, outro banco pode ser utilizado, mas poderão ocorrer inconsistências.

Após fazer o download do banco de acordo com a <a href="https://www.postgresql.org/download/">documentação</a>, é necessário acessá-lo para configurá-lo.

Comandos de conexão:
```
# Windows
psql -U postgres

# Linux
sudo -u postgres psql
```

Após, criaremos o banco:
```
# "bancoExemplo" será o nome do nosso banco
CREATE DATABASE bancoExemplo;

# "meuuser" será o usuário e "123456" será a senha 
CREATE USER meuuser WITH PASSWORD '123456';
ALTER DATABASE meubanco OWNER TO meuuser;
```

Com isso, temos o banco configurado!

e devem ser colocados no .env os valores

`database` - `bancoExemplo`

`username` - `meuuser`

`password` - `123456`

`host` - `postgres`

`Porta` - `5432`

<br />

<div id="projConfig">

#### Configuração do projeto

Após a configuração do banco, a clonagem do repositório e certificar que todos os requisitos necessários estão atendidos, você deve clonar o arquivo `.env.example`, renomear para `.env` e preencher conforme suas variáveis locais, e rodar os seguintes comandos no seu terminal:

<p style="color:yellow">
  ⚠️ Atenção: É expressamente necessário ter os endereços no .env preenchidos antes de rodar os comandos, caso contrário, terá que preencher e rodar os comandos novamente.
</p>

```
# instalar dependências do projeto
npm install

# gerar client do prisma
npx prisma generate

# rodar migrations
npx prisma migrate deploy

```

Agora com o projeto configurado, basta rodar `npm run dev`

E pronto! basta acessar seu `localhost:3000` (ou a porta configurada no `.env`) nos endpoints da API para testar o projeto!

<p style="color:red">
  ⚠️ Atenção: Grande parte das rotas são protegidas com token JWT, então será necessário gerar um token e enviá-lo junto na requisição para testar.
</p>
</div>

<br />

### Tecnologias usadas

O sistema foi desenvolvido utilizando _[Node.js](https://nodejs.org/pt)_, com autenticação baseada em JSON Web Token _[(JWT)](https://www.jwt.io/)_ para controle seguro de acesso às rotas protegidas. Para a camada de persistência de dados, foi utilizado o ORM _[Prisma](https://www.prisma.io/orm)_, responsável pela comunicação com o banco de dados e mapeamento das entidades.

A aplicação segue uma arquitetura em camadas, organizada em routes, controllers, services, models e validators, garantindo uma clara separação de responsabilidades: as routes definem os endpoints, os controllers lidam com as requisições e respostas, os services concentram as regras de negócio, os models representam os dados e os validators asseguram a integridade das informações recebidas.

<div align="center">
<a href="https://nodejs.org/pt"><img src="https://img.shields.io/badge/Node.js-5FA04E?logo=node.js&logoColor=FFF" alt="logo Node" height="20" /></a>
<a href="https://www.jwt.io/"><img src="https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=FFF" alt="logo Node" height="20" /></a>
<a href="https://www.prisma.io/orm"><img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=FFF" alt="logo tailwind" height="20" /></a>
</div>

<br />

# Models e Endpoints

### Models

Os models são feitos utilizando o Prisma ORM que pode ser configurado de acordo com a necessidade, mas a configuração padrão das models é a seguinte:

### 👤 Usuários (users)

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id | Int | Identificador do usuário | PK |
| name  | String | Nome do usuário | NOT NULL |
| email | String | Email do usuário | NOT NULL, UNIQUE |
| password | String | Senha criptografada | NOT NULL |
| phone | String | Telefone | NOT NULL |
| status | enum | Status do usuário (ACTIVE, DISABLED) | NOT NULL |
| last_login | DateTime | Último login | NULL |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |



### 🏢 Empresas (companies)

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id | Int | Identificador da empresa | PK |
| legal_name | String | Razão social | NOT NULL |
| fantasy_name | String | Nome fantasia | NOT NULL |
| cnpj | String | CNPJ da empresa | NOT NULL |
| email | String | Email da empresa | NOT NULL, UNIQUE |
| password | String | Senha criptografada | NOT NULL |
| phone | String | Telefone | NULL |
| interval_slot |	Int |	Intervalo entre agendamentos (minutos) |	NOT NULL, DEFAULT (15) |
| plan |	enum |	Plano (FREE, PRO) |	NOT NULL, DEFAULT (FREE) |
| status |	enum |	Status (PENDING, APPROVED, DENIED) |	NOT NULL, DEFAULT (PENDING) |
| approve_date |	DateTime |	Data de aprovação |	NULL |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |



### 🔗 Empresas-Usuários (companies_users)
Tabela pivô de usuários e empresas

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa vinculada |	FK, NOT NULL |
| user_id |	Int |	Usuário vinculado |	FK, NOT NULL |
| role |	enum |	Papel (MANAGER, EMPLOYEE) |	NOT NULL |
| status |	enum |	Status (ACTIVE, DISABLED) |	NOT NULL, DEFAULT (ACTIVE) |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |

Constraints compostas:
* UNIQUE (company_id, user_id)



### 📍 Endereços (addresses)

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa |	FK, NOT NULL |
| cep |	String |	CEP |	NOT NULL |
| street |	String |	Rua |	NOT NULL |
| number |	String |	Número de endereço |	NOT NULL |
| complement |	String |	Complemento |	NULL |
| neighborhood |	String |	Bairro |	NOT NULL |
| city |	String |	Cidade |	NOT NULL |
| state |	String |	Estado |	NOT NULL |




### 🕒 Aberturas de agenda (schedule_openings)
Utilizada para configurar os horários disponíveis de funcionários

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa |	FK, NOT NULL |
| employee_id |	Int |	Funcionário |	FK, NOT NULL |
| week_day |	Int |	Dia da semana (0=Domingo ... 6=Sábado) |	NOT NULL |
| start_time |	Time |	Hora de início |	NOT NULL |
| end_time |	Time |	Hora de fim |	NOT NULL |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |



### 🚫 Bloqueios de agenda (schedule_blocks)
Utilizada para configurar os horários bloqueados de funcionários

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa |	FK, NOT NULL |
| employee_id |	Int |	Funcionário |	FK, NOT NULL |
| start_time |	DateTime |	Início do bloqueio |	NOT NULL |
| end_time |	DateTime |	Fim do bloqueio |	NULL |
| reason |	String |	Motivo do bloqueio |	NOT NULL |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |



### 💼 Serviços (services)

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa |	FK, NOT NULL |
| name |	String |	Nome do serviço |	NOT NULL |
| description |	String |	Descrição |	NULL |
| duration_minutes |	Int |	Duração em minutos |	NOT NULL |
| buffer_minutes |	Int |	Tempo extra entre atendimentos |	NOT NULL, DEFAULT (0) |
| price |	Decimal |	Preço |	NOT NULL |
| status |	enum |	Status (ACTIVE, DISABLED) |	NOT NULL, DEFAULT (ACTIVE) |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |



### 📅 Agendamentos (appointments)

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa |	FK, NOT NULL |
| service_id |	Int |	Serviço |	FK, NOT NULL |
| employee_id |	Int |	Funcionário |	FK, NOT NULL |
| client_id |	Int |	Cliente |	FK, NOT NULL |
| start_time |	DateTime |	Início do atendimento	| NOT NULL |
| end_time |	DateTime |	Fim do atendimento |	NOT NULL |
| observations |	String |	Observações |	NULL |
| status |	enum |	Status (PENDING, CONFIRMED, COMPLETED, CANCELED, NO_SHOW) |	NOT NULL, DEFAULT (PENDING) |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |



### 🤖 Interações com bot (bot_interactions)

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa |	FK, NOT NULL |
| client_id |	Int |	Cliente |	FK, NOT NULL |
| type |	enum |	Tipo (APPOINTMENT, CANCELLATION, REAPPOINTMENT, INQUIRY, OTHER) |	NOT NULL |
| status |	enum |	Status (IN_PROGRESS, WAITING_PAYMENT, SCHEDULED, CANCELED, OTHER) |	NOT NULL |
| data |	Json |	Dados da interação |	NOT NULL |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |



### 💳 Assinaturas (signatures)

| Campo | Tipo | Descrição | Constraints |
| ----- | ---- | --------- | ----------- |
| id |	Int |	Identificador |	PK |
| company_id |	Int |	Empresa |	FK, NOT NULL |
| plan |	enum |	Plano (FREE, PRO) |	NOT NULL, DEFAULT (FREE) |
| status |	enum |	Status (PENDING, ACTIVE, EXPIRED, CANCELED) |	NOT NULL, DEFAULT (PENDING) |
| start_date |	DateTime |	Início da assinatura |	NOT NULL |
| renovation_date |	DateTime |	Data de renovação |	NOT NULL |
| cancellation_date |	DateTime |	Data de cancelamento |	NULL |
| paid |	Boolean |	Indica se está pago |	NOT NULL, DEFAULT (false) |
| created_at | DateTime | Data de criação | NOT NULL, DEFAUT (now()) |
| updated_at | DateTime | Última atualização | NOT NULL, AUTO UPDATE |

<br />

### Endpoints

### Rotas de autenticação (sem proteção de tokens JWT)
<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>POST /auth/companies/register</code></td>
    <td>
      <pre><code>{
  "legal_name": "nome legal",
  "fantasy_name": "nome fantasia",
  "cnpj": "12391239123",
  "email": "exemplo@exemplo.com",
  "password": "123456",
  "phone": "51998557211"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>POST /auth/companies/login</code></td>
    <td>
      <pre><code>{
  "email": "exemplo@exemplo.com",
  "password": "123456",
}</code></pre>
    </td>
    <td><pre><code>{
	"token": "dksljadsjkadkljsajkdls",
	"id": 1
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /auth/users/register</code></td>
    <td>
      <pre><code>{
  "name": "Nome teste",
  "email": "teste@teste.com",
  "password": "123456",
  "phone": "51999999999"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>POST /auth/users/login</code></td>
    <td>
      <pre><code>{
  "email": "teste@teste.com",
  "password": "123456",
}</code></pre>
    </td>
    <td><pre><code>{
	"token": "hdasjkdasjkhdfjkdshf",
	"id": 1
}</code></pre></td>
  </tr>
</table>

### Rotas de API <span p style="color:red">(protegidas com token JWT)</span> 

### Usuário
<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/users</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"name": "Nome teste",
			"email": "teste@teste.com",
			"password": "$2b$10$E3l.LA8dPWE0rbVSh24OtOUB",
			"phone": "51999999999",
			"status": "ACTIVE",
			"last_login": null,
			"created_at": "2026-04-16T02:25:51.374Z",
			"updated_at": "2026-04-16T02:25:51.374Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/users/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Usuário encontrado com sucesso!",
	"data": {
		"id": 1,
		"name": "Nome teste",
		"email": "teste@teste.com",
		"password": "$2b$10$E3l.LA8dPWE0rbVSh24OtOUB",
		"phone": "51999999999",
		"status": "ACTIVE",
		"last_login": null,
		"created_at": "2026-04-16T02:25:51.374Z",
		"updated_at": "2026-04-16T02:25:51.374Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>PATCH /api/users/:id</code></td>
    <td>
      <pre><code>{
	"name": "Nome editado"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/users/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>

### Empresas
<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/companies</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"legal_name": "nome legal",
			"fantasy_name": "nome fantasia",
			"cnpj": "12391239123",
			"email": "exemplo@exemplo.com",
			"password": "$2b$10$CC.DCPVDQ5X76go3fGXce",
			"phone": "51998557211",
			"interval_slot": 15,
			"plan": "FREE",
			"status": "PENDING",
			"approve_date": null,
			"created_at": "2026-04-16T02:09:07.800Z",
			"updated_at": "2026-04-16T02:09:07.800Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/companies/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Empresa encontrada com sucesso!",
	"data": {
		"id": 4,
		"legal_name": "nome legal",
		"fantasy_name": "nome fantasia",
		"cnpj": "12391239123",
		"email": "exemplo@exemplo.com",
		"password": "$2b$10$CC.DCPVDQ5X76go3fGXce",
		"phone": "51998557211",
		"interval_slot": 15,
		"plan": "FREE",
		"status": "PENDING",
		"approve_date": null,
		"created_at": "2026-04-16T02:09:07.800Z",
		"updated_at": "2026-04-16T02:09:07.800Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>PATCH /api/companies/:id</code></td>
    <td>
      <pre><code>{
	"legal_name": "Nome legal editado"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/companies/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>