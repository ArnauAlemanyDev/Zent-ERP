/**
 * Tablas secundarias del esquema para SQL Server (T-SQL).
 *
 * Cambios adicionales respecto a la versión MySQL:
 *  - GENERATED ALWAYS AS (...) STORED → AS (...) PERSISTED
 *  - DEFAULT (CURRENT_DATE)           → DEFAULT CAST(GETDATE() AS DATE)
 *  - INTERVAL como tipo de columna    → NVARCHAR(50)  (sin equivalente nativo)
 *
 * @file 03_tablas_secundarias.sql
 * @depends 02_tablas_principales.sql
 */

-- ── proveedores ────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.proveedores', 'U') IS NULL
BEGIN
    CREATE TABLE proveedores (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        nombre           NVARCHAR(100) NOT NULL,
        cif_nif          NVARCHAR(20),
        telefono         NVARCHAR(50),
        email            NVARCHAR(100),
        direccion        NVARCHAR(MAX),
        persona_contacto NVARCHAR(100),
        activo           BIT           DEFAULT 1,
        observaciones    NVARCHAR(MAX),
        fecha_registro   DATETIME2     DEFAULT GETDATE()
    );
END
GO

-- ── componentes ────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.componentes', 'U') IS NULL
BEGIN
    CREATE TABLE componentes (
        id                        INT IDENTITY(1,1) PRIMARY KEY,
        nombre                    NVARCHAR(255) NOT NULL,
        descripcion               NVARCHAR(MAX),
        categoria                 NVARCHAR(50),
        codigo_barras             NVARCHAR(50),
        proveedor_id              INT,
        stock                     INT           DEFAULT 0,
        stock_minimo              INT           DEFAULT 5,
        ubicacion                 NVARCHAR(100),
        precio                    DECIMAL(10,2),
        precio_coste              DECIMAL(10,2),
        activo                    BIT           DEFAULT 1,
        especificaciones_tecnicas NVARCHAR(MAX) DEFAULT '{}',  -- JSON
        CONSTRAINT fk_comp_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
    );
END
GO

-- ── contratos ──────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.contratos', 'U') IS NULL
BEGIN
    CREATE TABLE contratos (
        id                    INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id            INT           NOT NULL,
        tipo_contrato         NVARCHAR(50)
                              CONSTRAINT chk_cont_tipo CHECK (tipo_contrato IN ('mantenimiento','soporte','licencia','servicio','otro')),
        subtipo               NVARCHAR(20)  DEFAULT 'contrato'
                              CONSTRAINT chk_cont_subtipo CHECK (subtipo IN ('contrato','servicio')),
        descripcion           NVARCHAR(MAX),
        fecha_inicio          DATE          NOT NULL,
        fecha_fin             DATE,
        importe               DECIMAL(12,2),
        periodicidad          NVARCHAR(20)
                              CONSTRAINT chk_cont_period CHECK (periodicidad IN ('mensual','trimestral','semestral','anual','puntual')),
        estado                NVARCHAR(20)  DEFAULT 'activo'
                              CONSTRAINT chk_cont_estado CHECK (estado IN ('activo','pendiente','vencido','cancelado')),
        renovacion_automatica BIT           DEFAULT 0,
        observaciones         NVARCHAR(MAX),
        fecha_creacion        DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT fk_cont_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE NO ACTION
    );
END
GO

-- ── servicios_cliente (DEPRECADA) ──────────────────────────────────────────
IF OBJECT_ID('dbo.servicios_cliente', 'U') IS NULL
BEGIN
    CREATE TABLE servicios_cliente (
        id                    INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id            INT           NOT NULL,
        tipo_servicio         NVARCHAR(50)  NOT NULL
                              CONSTRAINT chk_sc_tipo CHECK (tipo_servicio IN ('licencia','dominio','email','mantenimiento','hosting','soporte','otro')),
        descripcion           NVARCHAR(MAX) NOT NULL,
        periodicidad          NVARCHAR(20)
                              CONSTRAINT chk_sc_period CHECK (periodicidad IN ('anual','mensual','perpetua','trimestral','semestral','puntual')),
        fecha_inicio          DATE          NOT NULL,
        fecha_fin             DATE,
        renovacion_automatica BIT           DEFAULT 0,
        estado                NVARCHAR(20)  DEFAULT 'activo'
                              CONSTRAINT chk_sc_estado CHECK (estado IN ('activo','pendiente','vencido','cancelado')),
        importe               DECIMAL(12,2),
        observaciones         NVARCHAR(MAX),
        CONSTRAINT fk_sc_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
END
GO

-- ── cotizaciones ───────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.cotizaciones', 'U') IS NULL
BEGIN
    CREATE TABLE cotizaciones (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id        INT           NOT NULL,
        fecha             DATETIME2     DEFAULT GETDATE(),
        estado            NVARCHAR(20)  DEFAULT 'pendiente'
                          CONSTRAINT chk_cot_estado CHECK (estado IN ('pendiente','aceptado','rechazado','facturado','cancelado')),
        subtotal          DECIMAL(12,2),
        total_iva         DECIMAL(12,2),
        total             DECIMAL(12,2),
        total_coste       DECIMAL(12,2),
        total_beneficio   DECIMAL(12,2),
        observaciones     NVARCHAR(MAX),
        numero_cotizacion NVARCHAR(50)  CONSTRAINT uq_cot_numero UNIQUE,
        usuario_id        INT,
        CONSTRAINT fk_cot_cliente  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        CONSTRAINT fk_cot_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
END
GO

-- ── cotizaciones_lineas ────────────────────────────────────────────────────
-- AS (...) PERSISTED es el equivalente a GENERATED ALWAYS AS (...) STORED en MySQL.
IF OBJECT_ID('dbo.cotizaciones_lineas', 'U') IS NULL
BEGIN
    CREATE TABLE cotizaciones_lineas (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        cotizacion_id     INT              NOT NULL,
        descripcion       NVARCHAR(MAX)    NOT NULL,
        cantidad          INT              DEFAULT 1,
        coste_unitario    DECIMAL(10,2)    NOT NULL,
        margen_porcentaje DECIMAL(5,2)     DEFAULT 0,
        precio_unitario   DECIMAL(10,2)    NOT NULL,
        tipo_iva          DECIMAL(5,2)     DEFAULT 21.00,
        total_linea       AS (CAST(cantidad AS DECIMAL(12,2)) * precio_unitario) PERSISTED,
        beneficio_linea   AS ((precio_unitario - coste_unitario) * CAST(cantidad AS DECIMAL(12,2))) PERSISTED,
        producto_id       INT,
        CONSTRAINT fk_cotlin_cot      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
        CONSTRAINT fk_cotlin_producto FOREIGN KEY (producto_id)   REFERENCES componentes(id)  ON DELETE SET NULL
    );
END
GO

-- ── direcciones ────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.direcciones', 'U') IS NULL
BEGIN
    CREATE TABLE direcciones (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id      INT,
        tipo_direccion  NVARCHAR(20)  CONSTRAINT chk_dir_tipo CHECK (tipo_direccion IN ('fiscal','envio','otro')),
        direccion       NVARCHAR(255),
        ciudad          NVARCHAR(100),
        provincia       NVARCHAR(100),
        codigo_postal   NVARCHAR(20),
        pais            NVARCHAR(100) DEFAULT N'España',
        CONSTRAINT fk_dir_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
END
GO

-- ── contactos_cliente ──────────────────────────────────────────────────────
IF OBJECT_ID('dbo.contactos_cliente', 'U') IS NULL
BEGIN
    CREATE TABLE contactos_cliente (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id       INT,
        nombre_contacto  NVARCHAR(100),
        cargo            NVARCHAR(100),
        telefono         NVARCHAR(50),
        email            NVARCHAR(100),
        CONSTRAINT fk_cc_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
END
GO

-- ── licencias ──────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.licencias', 'U') IS NULL
BEGIN
    CREATE TABLE licencias (
        id                  INT IDENTITY(1,1) PRIMARY KEY,
        tipo_licencia       NVARCHAR(50)  NOT NULL
                            CONSTRAINT chk_lic_tipo CHECK (tipo_licencia IN ('windows','office','antivirus','otro')),
        nombre_producto     NVARCHAR(100) NOT NULL,
        clave_licencia      NVARCHAR(255) NOT NULL,
        proveedor           NVARCHAR(100),
        numero_dispositivos INT           DEFAULT 1,
        fecha_adquisicion   DATE          DEFAULT CAST(GETDATE() AS DATE),
        fecha_expiracion    DATE,
        activo              BIT           DEFAULT 1,
        notas               NVARCHAR(MAX),
        servicio_cliente_id INT,
        CONSTRAINT fk_lic_sc FOREIGN KEY (servicio_cliente_id) REFERENCES servicios_cliente(id) ON DELETE SET NULL
    );
END
GO

-- ── garantias ──────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.garantias', 'U') IS NULL
BEGIN
    CREATE TABLE garantias (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id   INT           NOT NULL,
        numero_garantia  NVARCHAR(100),
        fecha_inicio     DATE          NOT NULL,
        fecha_fin        DATE          NOT NULL,
        proveedor        NVARCHAR(100),
        tipo_garantia    NVARCHAR(50)
                         CONSTRAINT chk_gar_tipo CHECK (tipo_garantia IN ('fabricante','tienda','extendida','otro')),
        activa           BIT           DEFAULT 1,
        observaciones    NVARCHAR(MAX),
        CONSTRAINT fk_gar_disp FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE
    );
END
GO

-- ── interfaces_red ─────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.interfaces_red', 'U') IS NULL
BEGIN
    CREATE TABLE interfaces_red (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id INT           NOT NULL,
        tipo_conexion  NVARCHAR(20)  CONSTRAINT chk_ir_tipo CHECK (tipo_conexion IN ('ethernet','wifi')),
        descripcion    NVARCHAR(100),
        usa_dhcp       BIT           DEFAULT 1,
        ip_fija        NVARCHAR(45),
        mascara        NVARCHAR(45),
        gateway        NVARCHAR(45),
        dns_primario   NVARCHAR(45),
        dns_secundario NVARCHAR(45),
        ipv6           NVARCHAR(45),
        vlan_id        INT,
        CONSTRAINT fk_ir_disp FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE
    );
END
GO

-- ── recursos_red ───────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.recursos_red', 'U') IS NULL
BEGIN
    CREATE TABLE recursos_red (
        id                     INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id             INT           NOT NULL,
        nombre                 NVARCHAR(100) NOT NULL,
        tipo_recurso           NVARCHAR(30)  NOT NULL
                               CONSTRAINT chk_rr_tipo CHECK (tipo_recurso IN
                                   ('impresora','servidor','nas','carpeta_compartida','unidad_red','disco_externo','otro')),
        ip                     NVARCHAR(45),
        url_acceso             NVARCHAR(MAX),
        ruta_red               NVARCHAR(MAX),
        usuario_acceso         NVARCHAR(100),
        contrasena_hash        NVARCHAR(255),
        observaciones          NVARCHAR(MAX),
        ultima_copia_seguridad DATETIME2     NULL,
        CONSTRAINT fk_rr_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
END
GO

-- ── conexiones_dispositivo_recurso ─────────────────────────────────────────
IF OBJECT_ID('dbo.conexiones_dispositivo_recurso', 'U') IS NULL
BEGIN
    CREATE TABLE conexiones_dispositivo_recurso (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id INT           NOT NULL,
        recurso_id     INT           NOT NULL,
        descripcion    NVARCHAR(MAX),
        activo         BIT           DEFAULT 1,
        CONSTRAINT fk_cdr_disp    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id)  ON DELETE CASCADE,
        CONSTRAINT fk_cdr_recurso FOREIGN KEY (recurso_id)     REFERENCES recursos_red(id)  ON DELETE NO ACTION
    );
END
GO

-- ── licencias_dispositivos ─────────────────────────────────────────────────
IF OBJECT_ID('dbo.licencias_dispositivos', 'U') IS NULL
BEGIN
    CREATE TABLE licencias_dispositivos (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        licencia_id      INT           NOT NULL,
        dispositivo_id   INT           NOT NULL,
        fecha_asignacion DATE          DEFAULT CAST(GETDATE() AS DATE),
        activo           BIT           DEFAULT 1,
        CONSTRAINT fk_licdisp_lic  FOREIGN KEY (licencia_id)    REFERENCES licencias(id)    ON DELETE CASCADE,
        CONSTRAINT fk_licdisp_disp FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE NO ACTION,
        CONSTRAINT uq_licencia_dispositivo UNIQUE (licencia_id, dispositivo_id)
    );
END
GO

-- ── estados_dispositivo ────────────────────────────────────────────────────
IF OBJECT_ID('dbo.estados_dispositivo', 'U') IS NULL
BEGIN
    CREATE TABLE estados_dispositivo (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id INT           NOT NULL,
        estado         NVARCHAR(20)
                       CONSTRAINT chk_ed_estado CHECK (estado IN ('pendiente','en_proceso','finalizado','entregado')),
        fecha          DATETIME2     DEFAULT GETDATE(),
        usuario_id     INT,
        comentario     NVARCHAR(MAX),
        CONSTRAINT fk_ed_disp    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE,
        CONSTRAINT fk_ed_usuario FOREIGN KEY (usuario_id)     REFERENCES usuarios(id)     ON DELETE SET NULL
    );
END
GO

-- ── software_instalado ─────────────────────────────────────────────────────
IF OBJECT_ID('dbo.software_instalado', 'U') IS NULL
BEGIN
    CREATE TABLE software_instalado (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id    INT           NOT NULL,
        nombre_software   NVARCHAR(100),
        licencia_id       INT,
        version           NVARCHAR(50),
        fecha_instalacion DATE,
        activo            BIT           DEFAULT 1,
        CONSTRAINT fk_sw_disp FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE,
        CONSTRAINT fk_sw_lic  FOREIGN KEY (licencia_id)    REFERENCES licencias(id)    ON DELETE SET NULL
    );
END
GO

-- ── adjuntos ───────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.adjuntos', 'U') IS NULL
BEGIN
    CREATE TABLE adjuntos (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        tipo_entidad    NVARCHAR(20)
                        CONSTRAINT chk_adj_tipo CHECK (tipo_entidad IN ('cliente','dispositivo','pedido','contrato','albaran')),
        entidad_id      INT           NOT NULL,
        nombre_archivo  NVARCHAR(255),
        tipo_mime       NVARCHAR(100),
        ruta_archivo    NVARCHAR(MAX) NOT NULL,
        fecha_subida    DATETIME2     DEFAULT GETDATE(),
        version         INT           DEFAULT 1,
        permiso_lectura NVARCHAR(50)  DEFAULT 'publico'
                        CONSTRAINT chk_adj_permiso CHECK (permiso_lectura IN ('publico','privado','tecnico','admin'))
    );
END
GO

-- ── log_acciones ───────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.log_acciones', 'U') IS NULL
BEGIN
    CREATE TABLE log_acciones (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT,
        accion     NVARCHAR(MAX) NOT NULL,
        modulo     NVARCHAR(50),
        fecha      DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
END
GO

-- ── cuentas_correo ─────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.cuentas_correo', 'U') IS NULL
BEGIN
    CREATE TABLE cuentas_correo (
        id                    INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id            INT           NOT NULL,
        dispositivo_id        INT,
        tipo_cuenta           NVARCHAR(20)  DEFAULT 'usuario'
                              CONSTRAINT chk_cc_tipo CHECK (tipo_cuenta IN ('empresa','usuario')),
        nombre_cuenta         NVARCHAR(100),
        protocolo             NVARCHAR(20)  NOT NULL
                              CONSTRAINT chk_cc_protocolo CHECK (protocolo IN ('imap','pop3','exchange','otro')),
        servidor_entrada      NVARCHAR(100),
        puerto_entrada        INT,
        servidor_salida       NVARCHAR(100),
        puerto_salida         INT,
        ssl                   BIT           DEFAULT 1,
        usuario_acceso        NVARCHAR(100),
        contrasena_hash       NVARCHAR(255),
        ruta_archivo_local    NVARCHAR(MAX),
        observaciones         NVARCHAR(MAX),
        activo                BIT           DEFAULT 1,
        fecha_creacion        DATETIME2     DEFAULT GETDATE(),
        ultima_sincronizacion DATETIME2     NULL,
        CONSTRAINT fk_cco_cliente FOREIGN KEY (cliente_id)     REFERENCES clientes(id)     ON DELETE CASCADE,
        CONSTRAINT fk_cco_disp    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE SET NULL
    );
END
GO

-- ── piezas_usadas_reparacion ───────────────────────────────────────────────
IF OBJECT_ID('dbo.piezas_usadas_reparacion', 'U') IS NULL
BEGIN
    CREATE TABLE piezas_usadas_reparacion (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        reparacion_id   INT           NOT NULL,
        componente_id   INT           NOT NULL,
        cantidad        INT           DEFAULT 1,
        precio_unitario DECIMAL(10,2),
        CONSTRAINT fk_pur_rep  FOREIGN KEY (reparacion_id) REFERENCES historial_reparaciones(id) ON DELETE CASCADE,
        CONSTRAINT fk_pur_comp FOREIGN KEY (componente_id) REFERENCES componentes(id)            ON DELETE NO ACTION
    );
END
GO

-- ── mantenimiento_preventivo ───────────────────────────────────────────────
IF OBJECT_ID('dbo.mantenimiento_preventivo', 'U') IS NULL
BEGIN
    CREATE TABLE mantenimiento_preventivo (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id   INT           NOT NULL,
        descripcion      NVARCHAR(MAX),
        fecha_programada DATE          NOT NULL,
        fecha_realizada  DATE,
        tecnico_id       INT,
        estado           NVARCHAR(20)
                         CONSTRAINT chk_mp_estado CHECK (estado IN ('pendiente','realizado','retrasado')),
        CONSTRAINT fk_mp_disp    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE,
        CONSTRAINT fk_mp_tecnico FOREIGN KEY (tecnico_id)     REFERENCES usuarios(id)     ON DELETE SET NULL
    );
END
GO

-- ── reparaciones_historial (DEPRECADA) ────────────────────────────────────
IF OBJECT_ID('dbo.reparaciones_historial', 'U') IS NULL
BEGIN
    CREATE TABLE reparaciones_historial (
        id                        INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id            INT           NOT NULL,
        tecnico_id                INT,
        estado                    NVARCHAR(50)
                                  CONSTRAINT chk_rh_estado CHECK (estado IN
                                      ('pendiente','en_proceso','en_servicio_tecnico_externo',
                                       'recibido_servicio_tecnico','finalizado','entregado')),
        descripcion               NVARCHAR(MAX),
        servicio_tecnico_externo  NVARCHAR(100),
        contacto_servicio_tecnico NVARCHAR(MAX),
        fecha                     DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT fk_rh_disp    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE,
        CONSTRAINT fk_rh_tecnico FOREIGN KEY (tecnico_id)     REFERENCES usuarios(id)     ON DELETE SET NULL
    );
END
GO

-- ── facturas ───────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.facturas', 'U') IS NULL
BEGIN
    CREATE TABLE facturas (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        contrato_id       INT,
        cliente_id        INT              NOT NULL,
        fecha_emision     DATE             NOT NULL,
        fecha_vencimiento DATE,
        importe_total     DECIMAL(12,2)    NOT NULL,
        estado            NVARCHAR(20)
                          CONSTRAINT chk_fac_estado CHECK (estado IN ('pendiente','pagado','vencido')),
        archivo_pdf       NVARCHAR(MAX),
        CONSTRAINT fk_fac_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL,
        CONSTRAINT fk_fac_cliente  FOREIGN KEY (cliente_id)  REFERENCES clientes(id)  ON DELETE NO ACTION
    );
END
GO

-- ── ventas ─────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.ventas', 'U') IS NULL
BEGIN
    CREATE TABLE ventas (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id     INT           NOT NULL,
        fecha          DATETIME2     DEFAULT GETDATE(),
        total          DECIMAL(12,2),
        estado         NVARCHAR(20)  DEFAULT 'pendiente'
                       CONSTRAINT chk_ventas_estado CHECK (estado IN ('pendiente','completada','cancelada','devuelta')),
        observaciones  NVARCHAR(MAX),
        usuario_id     INT,
        CONSTRAINT fk_ventas_cliente  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE NO ACTION,
        CONSTRAINT fk_ventas_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
END
GO

-- ── metricas ───────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.metricas', 'U') IS NULL
BEGIN
    CREATE TABLE metricas (
        id                   INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id       INT,
        reparacion_id        INT,
        satisfaccion_cliente INT
                             CONSTRAINT chk_met_sat CHECK (satisfaccion_cliente BETWEEN 1 AND 5),
        tiempo_resolucion    NVARCHAR(50),   -- Ej: '02:30:00'. SQL Server no tiene INTERVAL como tipo.
        fecha                DATETIME2       DEFAULT GETDATE(),
        observaciones        NVARCHAR(MAX),
        CONSTRAINT fk_met_disp FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id)           ON DELETE SET NULL,
        CONSTRAINT fk_met_rep  FOREIGN KEY (reparacion_id)  REFERENCES historial_reparaciones(id) ON DELETE NO ACTION
    );
END
GO

-- ── notificaciones ─────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.notificaciones', 'U') IS NULL
BEGIN
    CREATE TABLE notificaciones (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id     INT           NOT NULL,
        tipo           NVARCHAR(20)
                       CONSTRAINT chk_not_tipo CHECK (tipo IN ('info','advertencia','error','exito')),
        titulo         NVARCHAR(255) NOT NULL,
        mensaje        NVARCHAR(MAX),
        leida          BIT           DEFAULT 0,
        fecha_creacion DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT fk_not_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );
END
GO

-- ── configuracion_sistema ──────────────────────────────────────────────────
IF OBJECT_ID('dbo.configuracion_sistema', 'U') IS NULL
BEGIN
    CREATE TABLE configuracion_sistema (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        clave       NVARCHAR(100) NOT NULL CONSTRAINT uq_config_clave UNIQUE,
        valor       NVARCHAR(MAX),
        descripcion NVARCHAR(MAX),
        categoria   NVARCHAR(50)
    );
END
GO

-- ── intentos_login ─────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.intentos_login', 'U') IS NULL
BEGIN
    CREATE TABLE intentos_login (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        email         NVARCHAR(100),
        ip_origen     NVARCHAR(45),
        exitoso       BIT           DEFAULT 0,
        fecha_intento DATETIME2     DEFAULT GETDATE()
    );
END
GO

-- ── respaldos_programados ──────────────────────────────────────────────────
IF OBJECT_ID('dbo.respaldos_programados', 'U') IS NULL
BEGIN
    CREATE TABLE respaldos_programados (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id       INT,
        nombre_backup    NVARCHAR(255),
        tipo_backup      NVARCHAR(50)
                         CONSTRAINT chk_rb_tipo CHECK (tipo_backup IN ('completo','incremental','diferencial','manual')),
        frecuencia       NVARCHAR(50)
                         CONSTRAINT chk_rb_freq CHECK (frecuencia IN ('diario','semanal','mensual','manual')),
        ultimo_respaldo  DATETIME2     NULL,
        proximo_respaldo DATETIME2     NULL,
        estado           NVARCHAR(20)  DEFAULT 'activo'
                         CONSTRAINT chk_rb_estado CHECK (estado IN ('activo','inactivo','error')),
        observaciones    NVARCHAR(MAX),
        CONSTRAINT fk_rb_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
    );
END
GO

-- ── permisos ───────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.permisos', 'U') IS NULL
BEGIN
    CREATE TABLE permisos (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        nombre_permiso  NVARCHAR(100) NOT NULL CONSTRAINT uq_perm_nombre UNIQUE,
        descripcion     NVARCHAR(MAX)
    );
END
GO

-- ── roles_permisos ─────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.roles_permisos', 'U') IS NULL
BEGIN
    CREATE TABLE roles_permisos (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        rol        NVARCHAR(50)  NOT NULL
                   CONSTRAINT chk_rp_rol CHECK (rol IN ('admin','tecnico','vendedor','soporte')),
        permiso_id INT           NOT NULL,
        CONSTRAINT fk_rp_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE,
        CONSTRAINT uq_rol_permiso UNIQUE (rol, permiso_id)
    );
END
GO

-- ── pedidos_lineas ─────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.pedidos_lineas', 'U') IS NULL
BEGIN
    CREATE TABLE pedidos_lineas (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        pedido_id       INT              NOT NULL,
        componente_id   INT,
        descripcion     NVARCHAR(MAX)    NOT NULL,
        cantidad        INT              DEFAULT 1  CONSTRAINT chk_pl_cantidad CHECK (cantidad > 0),
        precio_unitario DECIMAL(10,2)    NOT NULL,
        tipo_iva        DECIMAL(5,2)     DEFAULT 21.00,
        total_linea     AS (CAST(cantidad AS DECIMAL(12,2)) * precio_unitario) PERSISTED,
        CONSTRAINT fk_pl_pedido FOREIGN KEY (pedido_id)     REFERENCES pedidos(id)     ON DELETE CASCADE,
        CONSTRAINT fk_pl_comp   FOREIGN KEY (componente_id) REFERENCES componentes(id) ON DELETE NO ACTION
    );
END
GO

-- ── reparaciones_estados ───────────────────────────────────────────────────
IF OBJECT_ID('dbo.reparaciones_estados', 'U') IS NULL
BEGIN
    CREATE TABLE reparaciones_estados (
        id                        INT IDENTITY(1,1) PRIMARY KEY,
        dispositivo_id            INT           NOT NULL,
        reparacion_id             INT,
        estado_anterior           NVARCHAR(50),
        estado_nuevo              NVARCHAR(50)  NOT NULL,
        tecnico_id                INT,
        fecha                     DATETIME2     DEFAULT GETDATE(),
        descripcion               NVARCHAR(MAX),
        servicio_tecnico_externo  NVARCHAR(100),
        contacto_servicio_tecnico NVARCHAR(MAX),
        CONSTRAINT fk_re_disp    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id)           ON DELETE CASCADE,
        CONSTRAINT fk_re_rep     FOREIGN KEY (reparacion_id)  REFERENCES historial_reparaciones(id) ON DELETE NO ACTION,
        CONSTRAINT fk_re_tecnico FOREIGN KEY (tecnico_id)     REFERENCES usuarios(id)               ON DELETE SET NULL
    );
END
GO
