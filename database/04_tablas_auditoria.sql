/**
 * Tablas de auditoría para SQL Server (T-SQL).
 *
 * @file 04_tablas_auditoria.sql
 * @depends 02_tablas_principales.sql
 */

-- ── auditoria ──────────────────────────────────────────────────────────────
-- En SQL Server el usuario activo de sesión se obtiene con:
--   CAST(SESSION_CONTEXT(N'current_user_id') AS INT)
-- Establecer con: EXEC sp_set_session_context N'current_user_id', <id>;
IF OBJECT_ID('dbo.auditoria', 'U') IS NULL
BEGIN
    CREATE TABLE auditoria (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        tabla             NVARCHAR(50)  NOT NULL,
        operacion         NVARCHAR(10)
                          CONSTRAINT chk_aud_op CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
        usuario_id        INT,
        fecha             DATETIME2     DEFAULT GETDATE(),
        datos_anteriores  NVARCHAR(MAX),  -- JSON
        datos_nuevos      NVARCHAR(MAX),  -- JSON
        ip_origen         NVARCHAR(45),
        CONSTRAINT fk_aud_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
END
GO

-- ── sesiones_usuario ───────────────────────────────────────────────────────
IF OBJECT_ID('dbo.sesiones_usuario', 'U') IS NULL
BEGIN
    CREATE TABLE sesiones_usuario (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id        INT           NOT NULL,
        token_sesion      NVARCHAR(255) NOT NULL CONSTRAINT uq_ses_token UNIQUE,
        fecha_inicio      DATETIME2     DEFAULT GETDATE(),
        fecha_expiracion  DATETIME2     NULL,
        ip_origen         NVARCHAR(45),
        activa            BIT           DEFAULT 1,
        CONSTRAINT fk_ses_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
END
GO
