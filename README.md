# Meld: a sample React application for brainstorming with EVIs

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Description

This example project showcases the use of Hume AI's Empathic Voice Interface (EVI) to boost brainstorming sessions through a React-based application.

Utilizing a unique system prompt, EVI can adopt three distinct personas, providing diverse insights tailored to your topics. With our [System Prompt](src/system_prompt.txt) we define three distinct personas EVI will take to provide insights our topic.

This project leverages [Hume's React SDK](https://github.com/HumeAI/empathic-voice-api-js/tree/main/packages/react), a straightforward React interface, designed to seamlessly integrate EVI capabilities into your React applications.

## Table of Contents

- [Description](#description)
- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Dependencies](#dependencies)
- [Infrastructure](#infrastructure)
- [Usage](#usage)
- [License](#license)

## Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ and pnpm
- [Hume AI Account](https://beta.hume.ai/settings/keys)

### Environment Variables

1. Create a `.env` file in the root directory:

```bash
# Hume AI Keys
VITE_HUME_API_KEY=<YOUR HUME API KEY>
VITE_HUME_SECRET_KEY=<YOUR HUME SECRET KEY>

# Supabase Configuration
POSTGRES_PASSWORD=your-super-secret-postgres-pwd
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres

KONG_HTTP_PORT=54321
KONG_HTTPS_PORT=54322
SUPABASE_PUBLIC_URL=http://localhost:54321

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-token
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key

# Connection Pooling
POOLER_PORT=6543
POOLER_POOL_SIZE=15
POOLER_MAX_CLIENT_CONN=100
```

### Installing Dependencies

1. Install Node.js dependencies:
```bash
pnpm install
```

2. Create required directories:
```bash
mkdir -p volumes/{api,db,logs}
touch volumes/api/kong.yml
touch volumes/logs/vector.yml
```

## Infrastructure

The project uses Supabase for its backend infrastructure:

- **Database**: PostgreSQL with vector operations support
- **Real-time**: WebSocket-based real-time subscriptions
- **Connection Pooling**: Efficient database connection management
- **Vector Operations**: Support for embedding and similarity searches
- **Studio**: Web-based database management interface

Start the infrastructure:

```bash
docker compose up -d
```

Access points:
- Studio UI: http://localhost:54323
- API Gateway: http://localhost:54321
- Database: localhost:5432

## Usage

### Configuring EVI

First, create an EVI configuration with the [provided system prompt](src/system_prompt.txt). Once the configuration has been created, set your `config_id` in `src/App.tsx`.

Learn how to create your config and get your `config_id` [here](https://dev.hume.ai/docs/empathic-voice-interface-evi/configuration).

### Running the Application

Start the development server:

```bash
pnpm dev
```

Visit [http://localhost:5173/](http://localhost:5173/) in your browser to interact with the project.

## License

This project is licensed under the [MIT License](LICENSE).


