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

Os models são feitos utilizando o Prisma ORM, que pode ser configurado de acordo com a necessidade, mas a configuração padrão das models junto com seus endpoints é a seguinte:

### 👤 Usuários (users)

#### Model

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

#### Endpoints

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
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


<p style="color:yellow">⚠️ Protegidas por JWT</p>

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

<br />

### 🏢 Empresas (companies)

#### Model

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

#### Endpoints

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
</table>

<p style="color:yellow">⚠️ Protegidas por JWT</p>

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
    <td><code>GET /api/companies/:id/data</code></td>
    <td>No Body</td>
    <td><pre><code>//// atualizar com a response certa</code></pre></td>
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
<br />

### 🔗 Empresas-Usuários (companies_users)
Tabela pivô de usuários e empresas (cadastro de funcionários)

#### Model

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

#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/companies-users</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"user_id": 1,
			"role": "MANAGER",
			"status": "ACTIVE",
			"created_at": "2026-03-10T23:40:48.565Z",
			"updated_at": "2026-03-10T23:40:48.565Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/companies-users/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Funcionário encontrado com sucesso!",
	"data": {
		"id": 1,
		"company_id": 1,
		"user_id": 1,
		"role": "MANAGER",
		"status": "ACTIVE",
		"created_at": "2026-04-13T21:58:46.432Z",
		"updated_at": "2026-04-13T21:58:46.432Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/companies-users</code></td>
    <td><pre><code>{
	"company_id": "1",
	"user_id": "4",
	"role": "EMPLOYEE"
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/companies-users/:id</code></td>
    <td>
      <pre><code>{
	"role": "EMPLOYEE"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/companies-users/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>
<br />

### 📍 Endereços (addresses)

#### Model

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


#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/addresses</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"cep": "95555000",
			"street": "Rua teste",
			"number": "0041",
			"complement": null,
			"neighborhood": "Centro",
			"city": "Cidade teste",
			"state": "RJ",
			"created_at": "2026-04-16T21:49:25.074Z",
			"updated_at": "2026-04-16T21:49:25.074Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/addresses/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Endereço encontrado com sucesso!",
	"data": {
		"id": 1,
		"company_id": 1,
		"cep": "95555000",
		"street": "Rua teste",
		"number": "0041",
		"complement": null,
		"neighborhood": "Centro",
		"city": "Cidade teste",
		"state": "RJ",
		"created_at": "2026-04-16T21:49:25.074Z",
		"updated_at": "2026-04-16T21:49:25.074Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/addresses</code></td>
    <td><pre><code>{
	"company_id": "1",
	"cep": "95555000",
	"street": "Rua teste",
	"number": "0041",
	"neighborhood": "Centro",
	"city": "Cidade teste",
	"state": "RJ"
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/addresses/:id</code></td>
    <td>
      <pre><code>{
	"cep": "55555999"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/addresses/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>
<br />

### 🕒 Aberturas de agenda (schedule_openings)
Utilizada para configurar os horários disponíveis de funcionários

#### Model

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

#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/schedule-openings</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"employee_id": 1,
			"week_day": 0,
			"start_time": "1970-01-01T11:00:00.000Z",
			"end_time": "1970-01-01T16:30:00.000Z",
			"created_at": "2026-04-16T21:54:06.605Z",
			"updated_at": "2026-04-16T21:54:06.605Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/schedule-openings/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Abertura de agenda encontrada com sucesso!",
	"data": {
		"id": 1,
		"company_id": 1,
		"employee_id": 1,
		"week_day": 0,
		"start_time": "1970-01-01T11:00:00.000Z",
		"end_time": "1970-01-01T16:30:00.000Z",
		"created_at": "2026-04-16T21:54:06.605Z",
		"updated_at": "2026-04-16T21:54:06.605Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/schedule-openings</code></td>
    <td><pre><code>{
	"company_id": "1",
	"employee_id": "1",
	"week_day": "0",
	"start_time": "08:00",
	"end_time": "13:30"
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/schedule-openings/:id</code></td>
    <td>
      <pre><code>{
	"start_time": "09:00"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/schedule-openings/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>
<br />

### 🚫 Bloqueios de agenda (schedule_blocks)
Utilizada para configurar os horários bloqueados de funcionários

#### Model

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

#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/schedule-blocks</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"employee_id": 1,
			"start_time": "2026-03-11T08:00:00.000Z",
			"end_time": "2026-03-11T13:30:00.000Z",
			"reason": "Consulta médica",
			"created_at": "2026-04-16T22:04:45.387Z",
			"updated_at": "2026-04-16T22:04:45.387Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/schedule-blocks/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Bloqueio de agenda encontrado com sucesso!",
	"data": {
		"id": 1,
		"company_id": 1,
		"employee_id": 1,
		"start_time": "2026-03-11T08:00:00.000Z",
		"end_time": "2026-03-11T13:30:00.000Z",
		"reason": "Consulta médica",
		"created_at": "2026-04-16T22:04:45.387Z",
		"updated_at": "2026-04-16T22:04:45.387Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/schedule-blocks</code></td>
    <td><pre><code>{
	"company_id": "1",
	"employee_id": "1",
	"start_time": "2026-03-11T08:00:00.000Z",
  "end_time": "2026-03-11T13:30:00.000Z",
	"reason": "Consulta médica"
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/schedule-blocks/:id</code></td>
    <td>
      <pre><code>{
	"reason": "Sem motivo aparente"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/schedule-blocks/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>
<br />

### 💼 Serviços (services)

#### Model

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

#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/services</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"name": "Corte de cabelo",
			"description": null,
			"duration_minutes": 30,
			"buffer_minutes": 0,
			"price": "50",
			"status": "ACTIVE",
			"created_at": "2026-04-13T21:58:46.449Z",
			"updated_at": "2026-04-13T21:58:46.449Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/services/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Serviço encontrado com sucesso!",
	"data": {
		"id": 1,
		"company_id": 1,
		"name": "Corte de cabelo",
		"description": null,
		"duration_minutes": 30,
		"buffer_minutes": 0,
		"price": "50",
		"status": "ACTIVE",
		"created_at": "2026-04-13T21:58:46.449Z",
		"updated_at": "2026-04-13T21:58:46.449Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/services</code></td>
    <td><pre><code>{
	"company_id": "1",
	"name": "serviço teste",
  "duration_minutes": "30",
	"price": "149.99"
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/services/:id</code></td>
    <td>
      <pre><code>{
	"name": "Serviço com novo nome"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/services/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>
<br />

### 📅 Agendamentos (appointments)

#### Model

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

#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/appointments</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"service_id": 1,
			"employee_id": 1,
			"client_id": 1,
			"start_time": "2026-03-12T10:00:00.000Z",
			"end_time": "2026-03-12T11:30:00.000Z",
			"observations": null,
			"status": "PENDING",
			"created_at": "2026-03-12T23:24:36.737Z",
			"updated_at": "2026-03-12T23:24:36.737Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/appointments/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Agendamento encontrado com sucesso!",
	"data": {
		"id": 4,
		"company_id": 1,
		"service_id": 4,
		"employee_id": 2,
		"client_id": 4,
		"start_time": "2025-12-30T14:58:46.461Z",
		"end_time": "2025-12-30T16:58:46.461Z",
		"observations": null,
		"status": "COMPLETED",
		"created_at": "2026-04-13T21:58:46.594Z",
		"updated_at": "2026-04-13T21:58:46.594Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/appointments</code></td>
    <td><pre><code>{
	"company_id": "1",
	"service_id": "2",
	"employee_id": "1",
	"client_id": "3",
	"start_time": "2026-03-12T10:00:00Z",
  "end_time": "2026-03-12T11:30:00Z"
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/appointments/:id</code></td>
    <td>
      <pre><code>{
	"observations": "Observação no agendamento"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/appointments/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>
<br />

### 🤖 Interações com bot (bot_interactions)

#### Model

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

#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/bot-interactions</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"client_id": 3,
			"type": "APPOINTMENT",
			"status": "SCHEDULED",
			"data": {
				"notes": "Cliente quer atendimento presencial",
				"service": "Consulta inicial",
				"duration_minutes": 60
			},
			"created_at": "2026-04-16T23:01:42.049Z",
			"updated_at": "2026-04-16T23:01:42.049Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/bot-interactions/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Agendamento encontrado com sucesso!",
	"data": {
		"id": 4,
		"company_id": 1,
		"service_id": 4,
		"employee_id": 2,
		"client_id": 4,
		"start_time": "2025-12-30T14:58:46.461Z",
		"end_time": "2025-12-30T16:58:46.461Z",
		"observations": null,
		"status": "COMPLETED",
		"created_at": "2026-04-13T21:58:46.594Z",
		"updated_at": "2026-04-13T21:58:46.594Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/bot-interactions</code></td>
    <td><pre><code>{
  "company_id": "1",
  "client_id": "1",
  "type": "APPOINTMENT",
  "status": "SCHEDULED",
  "data": {
    "notes": "Cliente quer atendimento presencial",
    "service": "Consulta inicial",
    "duration_minutes": 60
  }
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/bot-interactions/:id</code></td>
    <td>
      <pre><code>{
	"status": "CANCELED"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/bot-interactions/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>
<br />

### 💳 Assinaturas (signatures)

#### Model

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

#### Endpoints

<p style="color:yellow">⚠️ Protegidas por JWT</p>

<table>
  <tr>
    <th>Endpoint</th>
    <th>Body</th>
    <th>Response</th>
  </tr>
  <tr>
    <td><code>GET /api/appointments</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Consulta realizada com sucesso!",
	"data": [
		{
			"id": 1,
			"company_id": 1,
			"plan": "PRO",
			"status": "PENDING",
			"start_date": "2026-03-12T09:00:00.000Z",
			"renovation_date": "2026-04-12T09:00:00.000Z",
			"cancellation_date": null,
			"paid": true,
			"created_at": "2026-04-16T23:03:51.909Z",
			"updated_at": "2026-04-16T23:03:51.909Z"
		}
	]
}</code></pre></td>
  </tr>

  <tr>
    <td><code>GET /api/appointments/:id</code></td>
    <td>No Body</td>
    <td><pre><code>{
	"message": "Assinatura encontrada com sucesso!",
	"data": {
		"id": 1,
		"company_id": 1,
		"plan": "PRO",
		"status": "PENDING",
		"start_date": "2026-03-12T09:00:00.000Z",
		"renovation_date": "2026-04-12T09:00:00.000Z",
		"cancellation_date": null,
		"paid": true,
		"created_at": "2026-04-16T23:03:51.909Z",
		"updated_at": "2026-04-16T23:03:51.909Z"
	}
}</code></pre></td>
  </tr>

  <tr>
    <td><code>POST /api/appointments</code></td>
    <td><pre><code>{
  "company_id": "1",
  "plan": "PRO",
  "start_date": "2026-03-12T09:00:00Z",
  "renovation_date": "2026-04-12T09:00:00Z",
  "paid": true
}</code></pre></td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>PATCH /api/appointments/:id</code></td>
    <td>
      <pre><code>{
	"status": "CANCELED"
}</code></pre>
    </td>
    <td>204 No Content</td>
  </tr>

  <tr>
    <td><code>DELETE /api/appointments/:id</code></td>
    <td>No Body</td>
    <td>204 No Content</td>
  </tr>
</table>