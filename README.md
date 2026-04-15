

# Sked API

# Requisitos e instalação

### Requisitos  

<p align="center">
<a href="https://nodejs.org/pt">
<img src="https://img.shields.io/badge/Node-24.14.*-3C873A?logo=node.js&logoColor=FFF" alt="node 24.14.*"></a>
&nbsp
<a href="https://docs.npmjs.com/downloading-and-installing-node-js-and-npm">
<img src="https://img.shields.io/badge/NPM-11.9.*-CC3534?logo=npm&logoColor=FFF" alt="npm 11.9.*"></a>


### Instalação e teste

Após clonar o repositório e certificar que todos os programas acima estão instalados, você deve clonar o arquivo `.env.example`, renomear para `.env` e preencher conforme seus endereços locais, e rodar os seguintes comandos no seu terminal:
```
npm install

                         demais comandos aqui

```

Agora com o projeto configurado, basta rodar o seguinte comando:
```
npm run watch
```

E pronto! basta acessar seu `localhost:3000` (ou a porta configurada no `.env`) nos endpoints da API para testar o projeto!

<br>

# Sobre o projeto e models

Criada durante a cadeira de _Programação Web_, a aplicação trata-se de um CRUD temático sobre Pokémon, que permite a criação, leitura, atualização e exclusão de informações sobre o mundo Pokémon. Através desta aplicação web, é possível gerenciar as informações de suas entidades conforme:
- **Pokémon -** nome, tipo, poder, treinador e imagem.
- **Treinador -** nome e imagem. 

<div align="center">
<img src="assets/readme/readme2.gif" alt="ash e pikachu caminhando" height="60">
</div>

## Tecnologias usadas



O sistema foi desenvolvido utilizando o framework _[Laravel](https://laravel.com)_, em uma arquitetura MVC (Model, View e Controller) para gerenciar as informações e utilizando o _[Blade](https://laravel.com/docs/11.x/blade)_ junto do framework _[Tailwind](https://tailwindcss.com/)_ para criação e estilização das views.

<div align="center">
<img src="https://img.shields.io/badge/Laravel-FF2D20?logo=laravel&logoColor=FFF" alt="logo Laravel" height="20"> 
<img src="https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=FFF" alt="logo tailwind" height="20">
</div>

## Autenticação e criação de perfil

<img src="assets/readme/readme3.gif" width="70" align="right" alt="ash e pikachu">

<p align="left">

Além do CRUD completo de ambas entidades, a aplicação ainda implementa funcionalidades de log in e registro através do _[Laravel Breeze](https://laravel.com/docs/11.x/starter-kits#laravel-breeze)_, podendo visualizar os Pokémon e treinadores criados somente se estiver logado no sistema.
</p>

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