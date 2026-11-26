/**
 * Tablas principales del esquema para SQL Server (T-SQL).
 *
 * Cambios respecto a la versión MySQL:
 *  - INT AUTO_INCREMENT     → INT IDENTITY(1,1)
 *  - BOOLEAN / TINYINT(1)   → BIT
 *  - TIMESTAMP / DATETIME   → DATETIME2
 *  - TEXT                   → NVARCHAR(MAX)
 *  - VARCHAR(n)             → NVARCHAR(n)
 *  - JSON                   → NVARCHAR(MAX)  (SQL Server usa NVARCHAR con ISJSON())
 *  - DEFAULT TRUE / FALSE   → DEFAULT 1 / DEFAULT 0
 *  - DEFAULT CURRENT_TIMESTAMP / NOW() → DEFAULT GETDATE()
 *  - ENGINE=InnoDB ...      → eliminado (no existe en SQL Server)
 *  - UNIQUE KEY nombre(...)  → CONSTRAINT nombre UNIQUE (...)
 *  - ON DELETE RESTRICT     → ON DELETE NO ACTION (comportamiento equivalente)
 *
 * Nota: Los PRIMARY KEY se nombran explícitamente (PK_tabla) para que
 *       los índices FULLTEXT puedan referenciarlos.
 *
 * @file 02_tablas_principales.sql
 * @depends 01_extensiones.sql
 */

-- ── sedes ──────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.sedes', 'U') IS NULL
BEGIN
    CREATE TABLE sedes (
        id            INT IDENTITY(1,1) CONSTRAINT PK_sedes PRIMARY KEY,
        nombre        NVARCHAR(100) NOT NULL,
        direccion     NVARCHAR(MAX),
        ciudad        NVARCHAR(100),
        provincia     NVARCHAR(100),
        telefono      NVARCHAR(50),
        email         NVARCHAR(100),
        activo        BIT           DEFAULT 1,
        observaciones NVARCHAR(MAX)
    );
END
GO

-- ── clientes ───────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.clientes', 'U') IS NULL
BEGIN
    CREATE TABLE clientes (
        id               INT IDENTITY(1,1) CONSTRAINT PK_clientes PRIMARY KEY,
        nombre           NVARCHAR(100) NOT NULL,
        apellidos        NVARCHAR(100) NOT NULL,
        tipo             NVARCHAR(20) NOT NULL DEFAULT 'particular' CHECK (tipo IN ('particular','empresa')),
        cif_nif          NVARCHAR(20),
        fecha_registro   DATETIME2     DEFAULT GETDATE(),
        activo           BIT           DEFAULT 1,
        observaciones    NVARCHAR(MAX)
    );
END
GO

-- ── clientes_telefonos ─────────────────────────────────────────────────────
IF OBJECT_ID('dbo.clientes_telefonos', 'U') IS NULL
BEGIN
    CREATE TABLE clientes_telefonos (
        id            INT IDENTITY(1,1) CONSTRAINT PK_clientes_telefonos PRIMARY KEY,
        cliente_id    INT           NOT NULL,
        telefono      NVARCHAR(50)  NOT NULL,
        tipo          NVARCHAR(20)  DEFAULT 'principal'
                      CONSTRAINT chk_cli_tel_tipo CHECK (tipo IN ('principal','movil','fijo','trabajo','otro')),
        es_preferido  BIT           DEFAULT 0,
        observaciones NVARCHAR(MAX),
        CONSTRAINT fk_cliTel_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        CONSTRAINT uq_cliente_telefono UNIQUE (cliente_id, telefono)
    );
END
GO

-- ── clientes_emails ────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.clientes_emails', 'U') IS NULL
BEGIN
    CREATE TABLE clientes_emails (
        id            INT IDENTITY(1,1) CONSTRAINT PK_clientes_emails PRIMARY KEY,
        cliente_id    INT           NOT NULL,
        email         NVARCHAR(100) NOT NULL,
        tipo          NVARCHAR(20)  DEFAULT 'principal'
                      CONSTRAINT chk_cli_email_tipo CHECK (tipo IN ('principal','trabajo','personal','facturacion','otro')),
        es_preferido  BIT           DEFAULT 0,
        observaciones NVARCHAR(MAX),
        CONSTRAINT fk_cliEmail_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        CONSTRAINT uq_cliente_email UNIQUE (cliente_id, email)
    );
END
GO

-- ── usuarios ───────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE usuarios (
        id              INT IDENTITY(1,1) CONSTRAINT PK_usuarios PRIMARY KEY,
        nombre          NVARCHAR(100) NOT NULL,
        email           NVARCHAR(100) NOT NULL CONSTRAINT uq_usuarios_email UNIQUE,
        password_hash   NVARCHAR(255) NOT NULL,
        rol             NVARCHAR(50)  DEFAULT 'tecnico'
                        CONSTRAINT chk_usuarios_rol CHECK (rol IN ('admin','tecnico','vendedor','soporte')),
        activo          BIT           DEFAULT 1,
        ultimo_acceso   DATETIME2     NULL,
        fecha_creacion  DATETIME2     DEFAULT GETDATE(),
        telefono        NVARCHAR(50),
        direccion       NVARCHAR(MAX)
    );
END
GO

-- ── dispositivos ───────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.dispositivos', 'U') IS NULL
BEGIN
    CREATE TABLE dispositivos (
        id                        INT IDENTITY(1,1) CONSTRAINT PK_dispositivos PRIMARY KEY,
        cliente_id                INT           NOT NULL,
        tipo_dispositivo          NVARCHAR(50)
                                  CONSTRAINT chk_disp_tipo CHECK (tipo_dispositivo IN
                                      ('pc','portatil','servidor','tablet','smartphone','impresora','otro')),
        marca                     NVARCHAR(100),
        modelo                    NVARCHAR(100),
        numero_serie              NVARCHAR(100),
        estado                    NVARCHAR(20)  DEFAULT 'activo'
                                  CONSTRAINT chk_disp_estado CHECK (estado IN ('activo','reparacion','baja','vendido')),
        fecha_ingreso             DATETIME2     DEFAULT GETDATE(),
        notas_internas            NVARCHAR(MAX),
        sede_id                   INT,
        estado_actual_reparacion  NVARCHAR(50)  DEFAULT 'pendiente'
                                  CONSTRAINT chk_disp_est_rep CHECK (estado_actual_reparacion IN
                                      ('pendiente','en_proceso','en_servicio_tecnico_externo',
                                       'recibido_servicio_tecnico','finalizado','entregado')),
        especificaciones          NVARCHAR(MAX) DEFAULT '{}',   -- JSON
        configuracion_red         NVARCHAR(MAX) DEFAULT '{}',   -- JSON
        CONSTRAINT fk_disp_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)  ON DELETE NO ACTION,
        CONSTRAINT fk_disp_sede    FOREIGN KEY (sede_id)    REFERENCES sedes(id)      ON DELETE SET NULL
    );
END
GO

-- ── historial_reparaciones ─────────────────────────────────────────────────
IF OBJECT_ID('dbo.historial_reparaciones', 'U') IS NULL
BEGIN
    CREATE TABLE historial_reparaciones (
        id                  INT IDENTITY(1,1) CONSTRAINT PK_historial_reparaciones PRIMARY KEY,
        dispositivo_id      INT              NOT NULL,
        tecnico_id          INT,
        fecha_entrada       DATETIME2        DEFAULT GETDATE(),
        fecha_salida        DATETIME2        NULL,
        problema_reportado  NVARCHAR(MAX),
        diagnostico         NVARCHAR(MAX),
        solucion            NVARCHAR(MAX),
        costo               DECIMAL(10,2),
        estado              NVARCHAR(20)     DEFAULT 'pendiente'
                            CONSTRAINT chk_hrep_estado CHECK (estado IN ('pendiente','en_progreso','completado','entregado')),
        CONSTRAINT fk_hrep_disp   FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE,
        CONSTRAINT fk_hrep_tecnico FOREIGN KEY (tecnico_id)    REFERENCES usuarios(id)     ON DELETE SET NULL
    );
END
GO

-- ── citas ──────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.citas', 'U') IS NULL
BEGIN
    CREATE TABLE citas (
        id          INT IDENTITY(1,1) CONSTRAINT PK_citas PRIMARY KEY,
        cliente_id  INT           NOT NULL,
        tecnico_id  INT,
        fecha_cita  DATETIME2     NOT NULL,
        tipo_cita   NVARCHAR(30)
                    CONSTRAINT chk_citas_tipo CHECK (tipo_cita IN ('reparacion','mantenimiento','instalacion','consultoria')),
        estado      NVARCHAR(20)  DEFAULT 'programada'
                    CONSTRAINT chk_citas_estado CHECK (estado IN ('programada','confirmada','completada','cancelada')),
        descripcion NVARCHAR(MAX),
        notas       NVARCHAR(MAX),
        CONSTRAINT fk_citas_cliente  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        CONSTRAINT fk_citas_tecnico  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
END
GO

-- ── pedidos ────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.pedidos', 'U') IS NULL
BEGIN
    CREATE TABLE pedidos (
        id             INT IDENTITY(1,1) CONSTRAINT PK_pedidos PRIMARY KEY,
        cliente_id     INT           NOT NULL,
        fecha_pedido   DATETIME2     DEFAULT GETDATE(),
        estado         NVARCHAR(20)  DEFAULT 'pendiente'
                       CONSTRAINT chk_pedidos_estado CHECK (estado IN ('pendiente','procesando','enviado','entregado','cancelado')),
        total          DECIMAL(12,2),
        observaciones  NVARCHAR(MAX),
        CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
END
GO

-- ── tickets ────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.tickets', 'U') IS NULL
BEGIN
    CREATE TABLE tickets (
        id              INT IDENTITY(1,1) CONSTRAINT PK_tickets PRIMARY KEY,
        cliente_id      INT           NOT NULL,
        dispositivo_id  INT,
        tecnico_id      INT,
        estado          NVARCHAR(20)
                        DEFAULT 'abierto' CONSTRAINT chk_tickets_estado    CHECK (estado    IN ('abierto','en_progreso','cerrado','cancelado')),
        prioridad       NVARCHAR(20)
                        CONSTRAINT chk_tickets_prioridad CHECK (prioridad IN ('baja','media','alta','urgente')),
        titulo          NVARCHAR(255),
        descripcion     NVARCHAR(MAX),
        metadatos       NVARCHAR(MAX) DEFAULT '{}',   -- JSON
        fecha_creacion  DATETIME2     DEFAULT GETDATE(),
        fecha_cierre    DATETIME2     NULL,
        CONSTRAINT fk_tickets_cliente  FOREIGN KEY (cliente_id)     REFERENCES clientes(id)     ON DELETE CASCADE,
        CONSTRAINT fk_tickets_disp     FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE SET NULL,
        CONSTRAINT fk_tickets_tecnico  FOREIGN KEY (tecnico_id)     REFERENCES usuarios(id)     ON DELETE SET NULL
    );
END
GO

-- ── tickets_historial ──────────────────────────────────────────────────────
IF OBJECT_ID('dbo.tickets_historial', 'U') IS NULL
BEGIN
    CREATE TABLE tickets_historial (
        id          INT IDENTITY(1,1) CONSTRAINT PK_tickets_historial PRIMARY KEY,
        ticket_id   INT           NOT NULL,
        usuario_id  INT           NOT NULL,
        accion      NVARCHAR(MAX),
        fecha       DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT fk_thist_ticket   FOREIGN KEY (ticket_id)  REFERENCES tickets(id)  ON DELETE CASCADE,
        CONSTRAINT fk_thist_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE NO ACTION
    );
END
GO
