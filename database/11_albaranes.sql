/**
 * Módulo de albaranes para SQL Server (T-SQL).
 *
 * Cambios respecto a la versión MySQL:
 *  - AUTO_INCREMENT        → IDENTITY(1,1)
 *  - JSON                  → NVARCHAR(MAX)
 *  - BIT en lugar de BOOLEAN
 *  - ON UPDATE CURRENT_TIMESTAMP → gestionado por trigger (ver 07_triggers.sql)
 *
 * @file 11_albaranes.sql
 * @depends 02_tablas_principales.sql
 */

-- ── albaranes ──────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.albaranes', 'U') IS NULL
BEGIN
    CREATE TABLE albaranes (
        id                          INT IDENTITY(1,1) PRIMARY KEY,

        -- Identificadores públicos (auto-generados por trigger INSTEAD OF INSERT)
        numero_albaran              NVARCHAR(20)  NOT NULL CONSTRAINT uq_alb_numero  UNIQUE,
        token_publico               NVARCHAR(12)  NOT NULL CONSTRAINT uq_alb_token   UNIQUE,

        -- Referencias
        cliente_id                  INT           NOT NULL,
        dispositivo_id              INT,
        usuario_responsable_id      INT           NOT NULL,

        -- Fechas
        fecha_recepcion             DATETIME2     DEFAULT GETDATE(),
        fecha_entrega               DATETIME2     NULL,

        -- Datos del dispositivo (desnormalizados para integridad histórica)
        articulo                    NVARCHAR(20)  NOT NULL
                                    CONSTRAINT chk_alb_articulo CHECK (articulo IN
                                        ('portatil','pc_sobremesa','smartphone','tablet',
                                         'impresora','servidor','otro')),
        marca                       NVARCHAR(100) NOT NULL,
        modelo                      NVARCHAR(100) NOT NULL,
        numero_serie                NVARCHAR(100),
        contrasena_dispositivo_hash NVARCHAR(255),
        tipo_bloqueo                NVARCHAR(20)
                                    CONSTRAINT chk_alb_bloqueo CHECK (tipo_bloqueo IN
                                        ('pin','patron','huella','facial','sin_bloqueo','otro')),
        acepta_custodia_contrasena  BIT           DEFAULT 0,

        -- Estado estético: array almacenado como JSON
        estado_estetico             NVARCHAR(MAX) DEFAULT '[]',   -- JSON array
        fotos_estado                NVARCHAR(MAX) DEFAULT '[]',   -- JSON array de rutas/URLs

        -- Descripción y notas
        descripcion_averia          NVARCHAR(MAX) NOT NULL,
        notas_internas              NVARCHAR(MAX),

        -- Económico
        presupuesto_estimado        DECIMAL(10,2),

        -- Firma
        firma_cliente               NVARCHAR(MAX),

        -- Estado del albarán
        estado                      NVARCHAR(40)  DEFAULT 'recibido'
                                    CONSTRAINT chk_alb_estado CHECK (estado IN
                                        ('recibido','en_diagnostico','en_reparacion',
                                         'esperando_piezas','esperando_confirmacion_cliente',
                                         'listo_para_recoger','entregado','cancelado')),

        -- Metadatos de auditoría
        fecha_creacion              DATETIME2     DEFAULT GETDATE(),
        fecha_actualizacion         DATETIME2     DEFAULT GETDATE(),   -- Actualizada por trigger

        CONSTRAINT fk_alb_cliente  FOREIGN KEY (cliente_id)             REFERENCES clientes(id)     ON DELETE NO ACTION,
        CONSTRAINT fk_alb_disp     FOREIGN KEY (dispositivo_id)         REFERENCES dispositivos(id) ON DELETE SET NULL,
        CONSTRAINT fk_alb_usuario  FOREIGN KEY (usuario_responsable_id) REFERENCES usuarios(id)     ON DELETE NO ACTION
    );
END
GO

-- ── albaranes_historial_estados ────────────────────────────────────────────
IF OBJECT_ID('dbo.albaranes_historial_estados', 'U') IS NULL
BEGIN
    CREATE TABLE albaranes_historial_estados (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        albaran_id      INT           NOT NULL,
        estado_anterior NVARCHAR(40),
        estado_nuevo    NVARCHAR(40)  NOT NULL,
        usuario_id      INT,
        fecha           DATETIME2     DEFAULT GETDATE(),
        comentario      NVARCHAR(MAX),
        CONSTRAINT fk_ahe_albaran  FOREIGN KEY (albaran_id) REFERENCES albaranes(id) ON DELETE CASCADE,
        CONSTRAINT fk_ahe_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)  ON DELETE SET NULL
    );
END
GO
