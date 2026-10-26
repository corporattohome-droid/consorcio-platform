-- Script de inicialização do PostgreSQL
-- Cria schema separado para o Keycloak

CREATE SCHEMA IF NOT EXISTS keycloak;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Comentário de auditoria
COMMENT ON DATABASE consorcio_db IS 'Plataforma de Administração de Consórcios';
