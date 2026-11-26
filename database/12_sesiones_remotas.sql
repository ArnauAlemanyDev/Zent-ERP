/**
 * Tabla de Sesiones Remotas - Registro de tiempo de trabajo remoto
 * Almacena información de conexiones remotas de técnicos para servicios
 * 
 * @file 12_sesiones_remotas.sql
 * @depends 02_tablas_principales.sql (usuarios, clientes, dispositivos)
 */

-- ── sesiones_remotas ──────────────────────────────────────────────────────
IF OBJECT_ID('dbo.sesiones_remotas', 'U') IS NULL
BEGIN
    CREATE TABLE sesiones_remotas (
        id                  INT IDENTITY(1,1) CONSTRAINT PK_sesiones_remotas PRIMARY KEY,
        tecnico_id          INT              NOT NULL,
        cliente_id          INT              NULL,
        dispositivo_id      INT              NULL,
        fecha_inicio        DATETIME2        DEFAULT GETDATE(),
        fecha_fin           DATETIME2        NULL,
        duracion_segundos   INT              NULL,
        descripcion         NVARCHAR(MAX),
        estado              NVARCHAR(20)     DEFAULT 'activa'
                            CONSTRAINT chk_sesiones_remotas_estado CHECK (estado IN ('activa','pausada','finalizada')),
        observaciones       NVARCHAR(MAX),
        fecha_creacion      DATETIME2        DEFAULT GETDATE(),
        CONSTRAINT fk_sesrem_tecnico   FOREIGN KEY (tecnico_id)    REFERENCES usuarios(id)     ON DELETE NO ACTION,
        CONSTRAINT fk_sesrem_cliente   FOREIGN KEY (cliente_id)    REFERENCES clientes(id)     ON DELETE SET NULL,
        CONSTRAINT fk_sesrem_dispositivo FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE SET NULL
    );
END
GO

-- ── Índices para optimización de consultas ────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.sesiones_remotas') AND name = 'IX_sesiones_remotas_tecnico_id')
BEGIN
    CREATE INDEX IX_sesiones_remotas_tecnico_id ON sesiones_remotas(tecnico_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.sesiones_remotas') AND name = 'IX_sesiones_remotas_cliente_id')
BEGIN
    CREATE INDEX IX_sesiones_remotas_cliente_id ON sesiones_remotas(cliente_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.sesiones_remotas') AND name = 'IX_sesiones_remotas_estado')
BEGIN
    CREATE INDEX IX_sesiones_remotas_estado ON sesiones_remotas(estado);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.sesiones_remotas') AND name = 'IX_sesiones_remotas_tecnico_fecha')
BEGIN
    CREATE INDEX IX_sesiones_remotas_tecnico_fecha ON sesiones_remotas(tecnico_id, fecha_inicio DESC);
END
GO

PRINT 'Tabla sesiones_remotas creada correctamente';
