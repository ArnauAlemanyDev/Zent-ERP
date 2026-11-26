/**
 * Configuración inicial para SQL Server.
 *
 * SQL Server no requiere extensiones externas. Las funcionalidades
 * equivalentes a pgcrypto están integradas en T-SQL:
 *
 *  gen_random_bytes(n)          → CRYPT_GEN_RANDOM(n)
 *  encode(bytes, 'hex')         → CONVERT(VARCHAR(MAX), bytes, 2)
 *  pgp_sym_encrypt(val, key)    → EncryptByPassPhrase(key, val)
 *  crypt(pass, gen_salt('bf'))  → HASHBYTES('SHA2_256', pass)  (no reversible)
 *
 * Requisitos mínimos: SQL Server 2016+ (JSON, SESSION_CONTEXT, DROP IF EXISTS).
 *
 * @file 01_extensiones.sql
 */

-- Activa el recuento de filas afectadas en cada operación (comportamiento estándar)
SET NOCOUNT ON;

-- Activa el modo ANSI para nulos y advertencias (recomendado para compatibilidad)
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_WARNINGS ON;
GO
