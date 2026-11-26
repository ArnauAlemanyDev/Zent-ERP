/**
 * Procedimientos y funciones almacenadas para SQL Server (T-SQL).
 *
 * Cambios respecto a MySQL:
 *  - PROCEDURE con SELECT directo → igual en SQL Server
 *  - FUNCTION escalar → CREATE FUNCTION ... RETURNS tipo
 *  - DATE_SUB(d, INTERVAL n DAY) → DATEADD(DAY, -n, d)
 *  - DATE_FORMAT(d, '%Y-%m-01')  → DATEFROMPARTS(YEAR(d), MONTH(d), 1)
 *  - TIMESTAMPDIFF(SECOND, a, b) → DATEDIFF(SECOND, a, b)
 *  - TRUNCATE TABLE (en procedimiento) → TRUNCATE TABLE (idéntico)
 *  - ANALYZE TABLE → UPDATE STATISTICS
 *  - information_schema.PROCESSLIST → sys.dm_exec_requests
 *  - CALL proc() → EXEC proc  (en init.sql y otros scripts)
 *  - Cursor de tablas: SELECT TABLE_NAME FROM information_schema.TABLES
 *    → SELECT name FROM sys.tables
 *  - SELECT '...' AS mensaje → PRINT '...'
 *  - CRYPT_GEN_RANDOM(32) → equivalente a gen_random_bytes(32)
 *  - CONVERT(VARCHAR, bytes, 2) → convierte bytes a hex
 *
 * @file 08_funciones.sql
 */

-- ============================================================
-- INFORME DE VENTAS
-- ============================================================

IF OBJECT_ID('informe_ventas', 'P') IS NOT NULL DROP PROCEDURE informe_ventas;
GO
CREATE PROCEDURE informe_ventas
    @fecha_inicio DATE,
    @fecha_fin    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        'cotizacion'                          AS tipo,
        c.id                                  AS id,
        c.fecha                               AS fecha,
        CONCAT(cl.nombre, ' ', cl.apellidos)  AS cliente,
        c.total                               AS total,
        c.estado                              AS estado
    FROM cotizaciones c
    JOIN clientes cl ON c.cliente_id = cl.id
    WHERE CAST(c.fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin

    UNION ALL

    SELECT
        'venta',
        v.id,
        v.fecha,
        CONCAT(cl.nombre, ' ', cl.apellidos),
        v.total,
        v.estado
    FROM ventas v
    JOIN clientes cl ON v.cliente_id = cl.id
    WHERE CAST(v.fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin;
END;
GO

-- ============================================================
-- GENERACIÓN DE TOKEN DE SESIÓN
-- ============================================================

-- NOTA: CRYPT_GEN_RANDOM() no se puede usar dentro de funciones escalares (UDF).
-- Se implementa como procedimiento almacenado en su lugar.
IF OBJECT_ID('generar_token_sesion', 'FN') IS NOT NULL DROP FUNCTION generar_token_sesion;
GO
IF OBJECT_ID('generar_token_sesion', 'P') IS NOT NULL DROP PROCEDURE generar_token_sesion;
GO
CREATE PROCEDURE generar_token_sesion
    @token NVARCHAR(64) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    -- CRYPT_GEN_RANDOM(32) genera 32 bytes aleatorios; CONVERT(..., 2) los convierte a hex
    SET @token = LOWER(CONVERT(NVARCHAR(64), CRYPT_GEN_RANDOM(32), 2));
END;
GO

-- ============================================================
-- REPORTE DE PRODUCTIVIDAD DE TÉCNICO
-- ============================================================

IF OBJECT_ID('reporte_productividad_tecnico', 'P') IS NOT NULL DROP PROCEDURE reporte_productividad_tecnico;
GO
CREATE PROCEDURE reporte_productividad_tecnico
    @tecnico_id_param INT,
    @fecha_inicio     DATE,
    @fecha_fin        DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.nombre                                                        AS nombre_tecnico,
        COUNT(hr.id)                                                    AS total_reparaciones,
        SUM(CASE WHEN hr.estado = 'completado' THEN 1 ELSE 0 END)       AS reparaciones_completadas,
        AVG(CASE WHEN hr.fecha_salida IS NOT NULL
                 THEN DATEDIFF(SECOND, hr.fecha_entrada, hr.fecha_salida)
                 END)                                                   AS tiempo_promedio_segundos,
        SUM(CASE WHEN t.estado = 'cerrado' THEN 1 ELSE 0 END)          AS tickets_resueltos,
        AVG(CAST(m.satisfaccion_cliente AS DECIMAL(4,2)))               AS satisfaccion_promedio
    FROM usuarios u
    LEFT JOIN historial_reparaciones hr
           ON u.id = hr.tecnico_id
          AND CAST(hr.fecha_entrada AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
    LEFT JOIN tickets t
           ON u.id = t.tecnico_id
          AND CAST(t.fecha_creacion AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
    LEFT JOIN metricas m ON m.dispositivo_id = hr.dispositivo_id
    WHERE u.id = @tecnico_id_param
    GROUP BY u.nombre;
END;
GO

-- ============================================================
-- LIMPIEZA DE DATOS ANTIGUOS
-- ============================================================

IF OBJECT_ID('limpiar_datos_antiguos', 'P') IS NOT NULL DROP PROCEDURE limpiar_datos_antiguos;
GO
CREATE PROCEDURE limpiar_datos_antiguos
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM sesiones_usuario
    WHERE fecha_expiracion < GETDATE()
       OR (fecha_inicio < DATEADD(DAY, -7, GETDATE()) AND activa = 0);

    DELETE FROM intentos_login
    WHERE fecha_intento < DATEADD(DAY, -30, GETDATE());

    DELETE FROM notificaciones
    WHERE leida = 1
      AND fecha_creacion < DATEADD(DAY, -90, GETDATE());

    DELETE FROM auditoria
    WHERE fecha < DATEADD(YEAR, -2, GETDATE());

    PRINT 'Limpieza de datos completada';
END;
GO

-- ============================================================
-- REGISTRO DE BACKUP PROGRAMADO
-- ============================================================

IF OBJECT_ID('realizar_backup_programado', 'P') IS NOT NULL DROP PROCEDURE realizar_backup_programado;
GO
CREATE PROCEDURE realizar_backup_programado
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @nombre NVARCHAR(255);
    SET @nombre = 'crm_backup_' + FORMAT(GETDATE(), 'yyyy_MM_dd_HH_mm_ss') + '.sql';

    INSERT INTO respaldos_programados
        (nombre_backup, tipo_backup, frecuencia, ultimo_respaldo, estado, observaciones)
    VALUES
        (@nombre, 'completo', 'manual', GETDATE(), 'activo', 'Backup programado automático');

    PRINT 'Backup registrado: ' + @nombre;
END;
GO

-- ============================================================
-- ANÁLISIS DE RENDIMIENTO DE TABLAS
-- ============================================================

IF OBJECT_ID('analisis_rendimiento_tablas', 'P') IS NOT NULL DROP PROCEDURE analisis_rendimiento_tablas;
GO
CREATE PROCEDURE analisis_rendimiento_tablas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.name + '.' + t.name                                           AS tabla,
        ROUND(SUM(a.total_pages) * 8.0 / 1024, 2)                      AS tamanio_mb,
        SUM(p.rows)                                                     AS filas_estimadas,
        SUM(a.used_pages)  * 8                                          AS kb_usados,
        SUM(a.total_pages) * 8                                          AS kb_totales
    FROM sys.tables t
    JOIN sys.schemas s         ON t.schema_id  = s.schema_id
    JOIN sys.indexes i         ON t.object_id  = i.object_id
    JOIN sys.partitions p      ON i.object_id  = p.object_id
                               AND i.index_id  = p.index_id
    JOIN sys.allocation_units a ON p.partition_id = a.container_id
    WHERE s.name = 'dbo'
    GROUP BY s.name, t.name
    ORDER BY SUM(a.total_pages) DESC;
END;
GO

-- ============================================================
-- MANTENIMIENTO COMPLETO DE LA BASE DE DATOS
-- ============================================================

IF OBJECT_ID('mantenimiento_base_datos', 'P') IS NOT NULL DROP PROCEDURE mantenimiento_base_datos;
GO
CREATE PROCEDURE mantenimiento_base_datos
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @tabla NVARCHAR(128);
    DECLARE @sql   NVARCHAR(500);

    -- 1. Limpieza de datos obsoletos
    EXEC limpiar_datos_antiguos;

    -- 2. UPDATE STATISTICS en todas las tablas del esquema
    DECLARE cur CURSOR FOR
        SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo');
    OPEN cur;
    FETCH NEXT FROM cur INTO @tabla;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'UPDATE STATISTICS [dbo].[' + @tabla + N']';
        EXEC sp_executesql @sql;
        PRINT 'UPDATE STATISTICS: ' + @tabla;
        FETCH NEXT FROM cur INTO @tabla;
    END;
    CLOSE cur;
    DEALLOCATE cur;

    -- 3. Refresco de dashboard_metricas
    TRUNCATE TABLE dashboard_metricas;
    INSERT INTO dashboard_metricas
        (total_clientes, total_dispositivos, albaranes_activos, listos_para_recoger,
         tickets_abiertos, componentes_stock_bajo, presupuesto_mes_actual, ultima_actualizacion)
    SELECT
        (SELECT COUNT(*) FROM clientes     WHERE activo = 1),
        (SELECT COUNT(*) FROM dispositivos WHERE estado = 'activo'),
        (SELECT COUNT(*) FROM albaranes    WHERE estado NOT IN ('entregado','cancelado')),
        (SELECT COUNT(*) FROM albaranes    WHERE estado = 'listo_para_recoger'),
        (SELECT COUNT(*) FROM tickets      WHERE estado IN ('abierto','en_progreso')),
        (SELECT COUNT(*) FROM componentes  WHERE stock <= stock_minimo AND activo = 1),
        (SELECT COALESCE(SUM(presupuesto_estimado), 0)
         FROM albaranes
         WHERE fecha_recepcion >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)),
        GETDATE();

    -- 4. Refresco de ranking_tecnicos
    TRUNCATE TABLE ranking_tecnicos;
    INSERT INTO ranking_tecnicos
        (tecnico_id, tecnico_nombre, total_reparaciones, reparaciones_completadas,
         total_albaranes, albaranes_entregados, satisfaccion_media, ultima_actualizacion)
    SELECT
        u.id,
        u.nombre,
        COUNT(DISTINCT hr.id),
        SUM(CASE WHEN hr.estado = 'completado' THEN 1 ELSE 0 END),
        COUNT(DISTINCT a.id),
        SUM(CASE WHEN a.estado  = 'entregado'  THEN 1 ELSE 0 END),
        AVG(CAST(m.satisfaccion_cliente AS DECIMAL(4,2))),
        GETDATE()
    FROM usuarios u
    LEFT JOIN historial_reparaciones hr ON u.id = hr.tecnico_id
    LEFT JOIN albaranes a               ON u.id = a.usuario_responsable_id
    LEFT JOIN metricas  m               ON m.dispositivo_id = hr.dispositivo_id
    WHERE u.activo = 1
    GROUP BY u.id, u.nombre;

    PRINT 'Mantenimiento completado';
END;
GO

-- ============================================================
-- DIAGNÓSTICO DE SALUD DE LA BASE DE DATOS
-- ============================================================

IF OBJECT_ID('estado_salud_base_datos', 'P') IS NOT NULL DROP PROCEDURE estado_salud_base_datos;
GO
CREATE PROCEDURE estado_salud_base_datos
AS
BEGIN
    SET NOCOUNT ON;

    -- Tamaño total
    SELECT
        'Almacenamiento'                              AS categoria,
        'Tamaño total BD'                             AS metrica,
        CAST(ROUND(SUM(size) * 8.0 / 1024, 2) AS NVARCHAR) + ' MB' AS valor,
        CASE WHEN SUM(size) * 8 * 1024 > 1073741824 THEN 'ADVERTENCIA' ELSE 'OK' END AS estado,
        'Considerar archivado si supera 1 GB'         AS recomendacion
    FROM sys.master_files
    WHERE database_id = DB_ID()

    UNION ALL

    -- Conexiones activas
    SELECT
        'Conexiones',
        'Conexiones activas',
        CAST(COUNT(*) AS NVARCHAR),
        CASE WHEN COUNT(*) > 10 THEN 'ADVERTENCIA' ELSE 'OK' END,
        'Optimizar consultas si hay muchas conexiones activas'
    FROM sys.dm_exec_requests
    WHERE status = 'running'

    UNION ALL

    -- Consultas lentas (> 5 segundos)
    SELECT
        'Rendimiento',
        'Queries > 5 seg',
        CAST(COUNT(*) AS NVARCHAR),
        CASE WHEN COUNT(*) > 0 THEN 'ADVERTENCIA' ELSE 'OK' END,
        'Revisar queries lentas y optimizar índices'
    FROM sys.dm_exec_requests
    WHERE status = 'running'
      AND total_elapsed_time > 5000;
END;
GO

-- ============================================================
-- GENERACIÓN DE ALERTAS DEL SISTEMA
-- ============================================================

IF OBJECT_ID('generar_alertas_sistema', 'P') IS NOT NULL DROP PROCEDURE generar_alertas_sistema;
GO
CREATE PROCEDURE generar_alertas_sistema
AS
BEGIN
    SET NOCOUNT ON;

    -- Alertas de stock bajo para administradores
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje)
    SELECT
        u.id,
        'advertencia',
        N'Alerta de Stock: ' + v.nombre,
        N'El componente ' + v.nombre + N' tiene stock ' +
        LOWER(v.estado_stock) + N'. Stock actual: ' + CAST(v.stock AS NVARCHAR)
    FROM vista_inventario_alertas v
    CROSS JOIN usuarios u
    WHERE v.estado_stock IN ('SIN STOCK','STOCK BAJO')
      AND u.rol = 'admin';

    -- Alertas de garantías próximas para admin y vendedores
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje)
    SELECT
        u.id,
        'info',
        N'Garantía próxima a vencer',
        N'La garantía del dispositivo ' + COALESCE(d.numero_serie, '') +
        N' del cliente ' + c.nombre +
        N' vence el ' + CONVERT(NVARCHAR, g.fecha_fin, 103)
    FROM garantias g
    JOIN dispositivos d ON g.dispositivo_id = d.id
    JOIN clientes c     ON d.cliente_id = c.id
    CROSS JOIN usuarios u
    WHERE g.activa = 1
      AND g.fecha_fin BETWEEN CAST(GETDATE() AS DATE)
                          AND DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
      AND u.rol IN ('admin','vendedor');

    PRINT 'Alertas del sistema generadas';
END;
GO

-- ============================================================
-- RECÁLCULO DEL TOTAL DE PEDIDOS (helper manual)
-- ============================================================

IF OBJECT_ID('recalcular_total_pedido', 'P') IS NOT NULL DROP PROCEDURE recalcular_total_pedido;
GO
CREATE PROCEDURE recalcular_total_pedido
    @p_pedido_id INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE pedidos
    SET total = (
        SELECT COALESCE(SUM(total_linea), 0)
        FROM   pedidos_lineas
        WHERE  pedido_id = @p_pedido_id
    )
    WHERE id = @p_pedido_id;
END;
GO
