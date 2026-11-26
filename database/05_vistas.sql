/**
 * Vistas y tablas auxiliares de dashboard para SQL Server (T-SQL).
 *
 * Incluye:
 *  - Tablas de dashboard (dashboard_metricas, ranking_tecnicos)
 *  - Vistas de negocio (inventario, alertas, etc.)
 *
 * @file 05_vistas.sql
 * @depends 02_tablas_principales.sql, 03_tablas_secundarias.sql, 11_albaranes.sql
 */

-- ============================================================
-- TABLAS DE DASHBOARD (materialized/snapshot)
-- ============================================================

-- ── dashboard_metricas ─────────────────────────────────────────────────────
IF OBJECT_ID('dbo.dashboard_metricas', 'U') IS NULL
BEGIN
    CREATE TABLE dashboard_metricas (
        id                     INT IDENTITY(1,1) PRIMARY KEY,
        total_clientes         INT           DEFAULT 0,
        total_dispositivos     INT           DEFAULT 0,
        albaranes_activos      INT           DEFAULT 0,
        listos_para_recoger    INT           DEFAULT 0,
        tickets_abiertos       INT           DEFAULT 0,
        componentes_stock_bajo INT           DEFAULT 0,
        presupuesto_mes_actual DECIMAL(12,2) DEFAULT 0,
        ultima_actualizacion   DATETIME2     DEFAULT GETDATE()
    );
END
GO

-- ── ranking_tecnicos ───────────────────────────────────────────────────────
IF OBJECT_ID('dbo.ranking_tecnicos', 'U') IS NULL
BEGIN
    CREATE TABLE ranking_tecnicos (
        id                        INT IDENTITY(1,1) PRIMARY KEY,
        tecnico_id                INT,
        tecnico_nombre            NVARCHAR(100),
        total_reparaciones        INT           DEFAULT 0,
        reparaciones_completadas  INT           DEFAULT 0,
        total_albaranes           INT           DEFAULT 0,
        albaranes_entregados      INT           DEFAULT 0,
        satisfaccion_media        DECIMAL(4,2),
        ultima_actualizacion      DATETIME2     DEFAULT GETDATE()
    );
END
GO

-- ============================================================
-- VISTAS DE NEGOCIO
-- ============================================================

-- ── vista_inventario_alertas ───────────────────────────────────────────────
-- Muestra componentes con estado de stock (SIN STOCK, STOCK BAJO, OK)
IF OBJECT_ID('dbo.vista_inventario_alertas', 'V') IS NOT NULL
    DROP VIEW dbo.vista_inventario_alertas;
GO

CREATE VIEW dbo.vista_inventario_alertas
AS
SELECT
    c.id,
    c.nombre,
    c.categoria,
    c.stock,
    c.stock_minimo,
    c.precio,
    c.precio_coste,
    c.activo,
    CASE
        WHEN c.stock = 0                THEN N'SIN STOCK'
        WHEN c.stock <= c.stock_minimo  THEN N'STOCK BAJO'
        ELSE N'OK'
    END AS estado_stock,
    p.nombre AS proveedor_nombre
FROM componentes c
LEFT JOIN proveedores p ON c.proveedor_id = p.id
WHERE c.activo = 1;
GO

-- ── vista_clientes_completa ────────────────────────────────────────────────
-- Une clientes con sus teléfonos y emails preferidos
IF OBJECT_ID('dbo.vista_clientes_completa', 'V') IS NOT NULL
    DROP VIEW dbo.vista_clientes_completa;
GO

CREATE VIEW dbo.vista_clientes_completa
AS
SELECT
    c.id,
    c.nombre,
    c.apellidos,
    c.cif_nif,
    c.fecha_registro,
    c.activo,
    tel.telefono     AS telefono_principal,
    em.email         AS email_principal,
    (SELECT COUNT(*) FROM dispositivos d WHERE d.cliente_id = c.id) AS total_dispositivos
FROM clientes c
LEFT JOIN (
    SELECT cliente_id, telefono
    FROM clientes_telefonos
    WHERE es_preferido = 1
) tel ON tel.cliente_id = c.id
LEFT JOIN (
    SELECT cliente_id, email
    FROM clientes_emails
    WHERE es_preferido = 1
) em ON em.cliente_id = c.id;
GO

-- ── vista_dispositivos_reparacion ──────────────────────────────────────────
-- Dispositivos actualmente en reparación con datos del cliente y técnico
IF OBJECT_ID('dbo.vista_dispositivos_reparacion', 'V') IS NOT NULL
    DROP VIEW dbo.vista_dispositivos_reparacion;
GO

CREATE VIEW dbo.vista_dispositivos_reparacion
AS
SELECT
    d.id AS dispositivo_id,
    d.marca,
    d.modelo,
    d.numero_serie,
    d.estado_actual_reparacion,
    CONCAT(c.nombre, ' ', c.apellidos) AS cliente_nombre,
    c.id AS cliente_id,
    hr.id AS reparacion_id,
    hr.fecha_entrada,
    hr.problema_reportado,
    hr.tecnico_id,
    u.nombre AS tecnico_nombre
FROM dispositivos d
JOIN clientes c ON d.cliente_id = c.id
LEFT JOIN historial_reparaciones hr
    ON hr.dispositivo_id = d.id
    AND hr.estado IN ('pendiente','en_progreso')
LEFT JOIN usuarios u ON hr.tecnico_id = u.id
WHERE d.estado = 'reparacion';
GO

-- ── vista_albaranes_completa ───────────────────────────────────────────────
-- Albaranes con datos de cliente y técnico responsable
IF OBJECT_ID('dbo.vista_albaranes_completa', 'V') IS NOT NULL
    DROP VIEW dbo.vista_albaranes_completa;
GO

CREATE VIEW dbo.vista_albaranes_completa
AS
SELECT
    a.id,
    a.numero_albaran,
    a.token_publico,
    a.estado,
    a.articulo,
    a.marca,
    a.modelo,
    a.numero_serie,
    a.descripcion_averia,
    a.presupuesto_estimado,
    a.fecha_recepcion,
    a.fecha_entrega,
    a.fecha_creacion,
    a.fecha_actualizacion,
    CONCAT(c.nombre, ' ', c.apellidos) AS cliente_nombre,
    c.id AS cliente_id,
    u.nombre AS tecnico_nombre,
    u.id AS tecnico_id
FROM albaranes a
JOIN clientes c ON a.cliente_id = c.id
LEFT JOIN usuarios u ON a.usuario_responsable_id = u.id;
GO

-- ── vista_tickets_abiertos ─────────────────────────────────────────────────
IF OBJECT_ID('dbo.vista_tickets_abiertos', 'V') IS NOT NULL
    DROP VIEW dbo.vista_tickets_abiertos;
GO

CREATE VIEW dbo.vista_tickets_abiertos
AS
SELECT
    t.id,
    t.titulo,
    t.estado,
    t.prioridad,
    t.fecha_creacion,
    CONCAT(c.nombre, ' ', c.apellidos) AS cliente_nombre,
    u.nombre AS tecnico_nombre,
    d.marca + ' ' + d.modelo AS dispositivo
FROM tickets t
JOIN clientes c ON t.cliente_id = c.id
LEFT JOIN usuarios u ON t.tecnico_id = u.id
LEFT JOIN dispositivos d ON t.dispositivo_id = d.id
WHERE t.estado IN ('abierto','en_progreso');
GO

-- ── vista_garantias_activas ────────────────────────────────────────────────
IF OBJECT_ID('dbo.vista_garantias_activas', 'V') IS NOT NULL
    DROP VIEW dbo.vista_garantias_activas;
GO

CREATE VIEW dbo.vista_garantias_activas
AS
SELECT
    g.id,
    g.numero_garantia,
    g.fecha_inicio,
    g.fecha_fin,
    g.tipo_garantia,
    g.proveedor,
    d.marca,
    d.modelo,
    d.numero_serie,
    CONCAT(c.nombre, ' ', c.apellidos) AS cliente_nombre,
    CASE
        WHEN g.fecha_fin < CAST(GETDATE() AS DATE) THEN N'VENCIDA'
        WHEN g.fecha_fin <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE)) THEN N'PRÓXIMA A VENCER'
        ELSE N'VIGENTE'
    END AS estado_garantia
FROM garantias g
JOIN dispositivos d ON g.dispositivo_id = d.id
JOIN clientes c ON d.cliente_id = c.id
WHERE g.activa = 1;
GO

-- ── vista_contratos_activos ────────────────────────────────────────────────
IF OBJECT_ID('dbo.vista_contratos_activos', 'V') IS NOT NULL
    DROP VIEW dbo.vista_contratos_activos;
GO

CREATE VIEW dbo.vista_contratos_activos
AS
SELECT
    ct.id,
    ct.tipo_contrato,
    ct.subtipo,
    ct.descripcion,
    ct.fecha_inicio,
    ct.fecha_fin,
    ct.importe,
    ct.periodicidad,
    ct.estado,
    ct.renovacion_automatica,
    CONCAT(c.nombre, ' ', c.apellidos) AS cliente_nombre,
    c.id AS cliente_id
FROM contratos ct
JOIN clientes c ON ct.cliente_id = c.id
WHERE ct.estado = 'activo';
GO
