/**
 * Triggers para SQL Server (T-SQL).
 *
 * Diferencias clave respecto a MySQL:
 *  - SQL Server no tiene FOR EACH ROW; los triggers operan sobre conjuntos.
 *    Se usan las pseudo-tablas 'inserted' y 'deleted'.
 *  - BEFORE INSERT → INSTEAD OF INSERT
 *  - AFTER INSERT / UPDATE / DELETE → misma sintaxis
 *  - NEW.col  → inserted.col      (INSERT / UPDATE)
 *  - OLD.col  → deleted.col       (DELETE / UPDATE)
 *  - SIGNAL SQLSTATE '45000' ... → THROW 50000, '...', 1;
 *  - @current_user_id (variable de sesión MySQL)
 *    → CAST(SESSION_CONTEXT(N'current_user_id') AS INT)
 *    Establecer antes de cada operación: EXEC sp_set_session_context N'current_user_id', <id>;
 *  - LPAD(n, 4, '0') → RIGHT('0000' + CAST(n AS VARCHAR), 4)
 *  - LOWER(HEX(...)) → LOWER(CONVERT(VARCHAR(MAX), CRYPT_GEN_RANDOM(6), 2))
 *  - Un trigger puede cubrir INSERT OR UPDATE OR DELETE simultáneamente
 *    usando: CREATE TRIGGER ... ON ... AFTER INSERT, UPDATE, DELETE
 *  - No se necesita DELIMITER.
 *  - DROP TRIGGER IF EXISTS → IF OBJECT_ID('nombre','TR') IS NOT NULL DROP TRIGGER nombre
 *
 * @file 07_triggers.sql
 */

-- ============================================================
-- MÓDULO DE ALBARANES: generación de número y token
-- ============================================================

/**
 * INSTEAD OF INSERT sobre albaranes:
 * auto-rellena numero_albaran y token_publico si no se proporcionan,
 * luego realiza el INSERT real.
 * En SQL Server los triggers INSTEAD OF sustituyen al INSERT original,
 * por lo que debemos ejecutar el INSERT manualmente dentro del trigger.
 */
IF OBJECT_ID('tr_albaran_antes_insertar', 'TR') IS NOT NULL
    DROP TRIGGER tr_albaran_antes_insertar;
GO

CREATE TRIGGER tr_albaran_antes_insertar
ON albaranes
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @numero  NVARCHAR(20);
    DECLARE @token   NVARCHAR(12);
    DECLARE @anio    NVARCHAR(4)  = CAST(YEAR(GETDATE()) AS NVARCHAR);
    DECLARE @sig     INT;
    DECLARE @existe  INT;

    -- Generar número de albarán secuencial por año
    SELECT @sig = COALESCE(
        MAX(CAST(RIGHT(numero_albaran, 4) AS INT)), 0
    ) + 1
    FROM albaranes WITH (UPDLOCK, HOLDLOCK)
    WHERE numero_albaran LIKE 'ALB-' + @anio + '-%';

    SET @numero = 'ALB-' + @anio + '-' + RIGHT('0000' + CAST(@sig AS NVARCHAR), 4);

    -- Generar token público único de 12 caracteres hex
    SET @existe = 1;
    WHILE @existe > 0
    BEGIN
        SET @token = LOWER(LEFT(CONVERT(NVARCHAR(MAX), CRYPT_GEN_RANDOM(6), 2), 12));
        SELECT @existe = COUNT(*) FROM albaranes WHERE token_publico = @token;
    END;

    -- Insertar usando número y token generados si el INSERT no los proporcionó
    INSERT INTO albaranes (
        numero_albaran, token_publico,
        cliente_id, dispositivo_id, usuario_responsable_id,
        fecha_recepcion, fecha_entrega,
        articulo, marca, modelo, numero_serie,
        contrasena_dispositivo_hash, tipo_bloqueo, acepta_custodia_contrasena,
        estado_estetico, fotos_estado,
        descripcion_averia, notas_internas,
        presupuesto_estimado, firma_cliente, estado,
        fecha_creacion, fecha_actualizacion
    )
    SELECT
        COALESCE(NULLIF(i.numero_albaran, ''), @numero),
        COALESCE(NULLIF(i.token_publico,  ''), @token),
        i.cliente_id, i.dispositivo_id, i.usuario_responsable_id,
        COALESCE(i.fecha_recepcion, GETDATE()), i.fecha_entrega,
        i.articulo, i.marca, i.modelo, i.numero_serie,
        i.contrasena_dispositivo_hash, i.tipo_bloqueo,
        COALESCE(i.acepta_custodia_contrasena, 0),
        COALESCE(i.estado_estetico, '[]'), COALESCE(i.fotos_estado, '[]'),
        i.descripcion_averia, i.notas_internas,
        i.presupuesto_estimado, i.firma_cliente,
        COALESCE(i.estado, 'recibido'),
        COALESCE(i.fecha_creacion, GETDATE()), COALESCE(i.fecha_actualizacion, GETDATE())
    FROM inserted i;
END;
GO

/**
 * AFTER UPDATE sobre albaranes:
 * - Actualiza fecha_actualizacion en cada modificación.
 * - Registra cambios de estado en albaranes_historial_estados.
 */
IF OBJECT_ID('tr_albaran_after_update', 'TR') IS NOT NULL
    DROP TRIGGER tr_albaran_after_update;
GO

CREATE TRIGGER tr_albaran_after_update
ON albaranes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Actualizar fecha_actualizacion
    UPDATE albaranes
    SET    fecha_actualizacion = GETDATE()
    WHERE  id IN (SELECT id FROM inserted);

    -- Registrar cambio de estado cuando realmente cambia
    INSERT INTO albaranes_historial_estados (albaran_id, estado_anterior, estado_nuevo, usuario_id)
    SELECT
        i.id,
        d.estado,
        i.estado,
        CAST(SESSION_CONTEXT(N'current_user_id') AS INT)
    FROM inserted i
    JOIN deleted  d ON i.id = d.id
    WHERE i.estado <> d.estado
       OR (d.estado IS NULL AND i.estado IS NOT NULL);
END;
GO

-- ============================================================
-- AUDITORÍA GENÉRICA
-- ============================================================
-- En SQL Server un único trigger AFTER INSERT, UPDATE, DELETE cubre los tres eventos.
-- Se detecta la operación comparando si inserted y deleted tienen filas.

IF OBJECT_ID('tr_auditoria_usuarios', 'TR') IS NOT NULL DROP TRIGGER tr_auditoria_usuarios;
GO
CREATE TRIGGER tr_auditoria_usuarios
ON usuarios
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @op NVARCHAR(10);
    DECLARE @uid INT = CAST(SESSION_CONTEXT(N'current_user_id') AS INT);

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
        SET @op = 'UPDATE';
    ELSE IF EXISTS (SELECT 1 FROM inserted)
        SET @op = 'INSERT';
    ELSE
        SET @op = 'DELETE';

    INSERT INTO auditoria (tabla, operacion, usuario_id, datos_anteriores, datos_nuevos)
    SELECT
        'usuarios', @op, @uid,
        CASE WHEN @op IN ('UPDATE','DELETE')
             THEN (SELECT d.id, d.nombre, d.email, d.rol, d.activo FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
             END,
        CASE WHEN @op IN ('INSERT','UPDATE')
             THEN (SELECT i.id, i.nombre, i.email, i.rol, i.activo FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
             END
    FROM (SELECT TOP 1 1 x) _
    LEFT JOIN deleted  d ON 1=1
    LEFT JOIN inserted i ON 1=1;
END;
GO

IF OBJECT_ID('tr_auditoria_clientes', 'TR') IS NOT NULL DROP TRIGGER tr_auditoria_clientes;
GO
CREATE TRIGGER tr_auditoria_clientes
ON clientes
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @op NVARCHAR(10);
    DECLARE @uid INT = CAST(SESSION_CONTEXT(N'current_user_id') AS INT);

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
        SET @op = 'UPDATE';
    ELSE IF EXISTS (SELECT 1 FROM inserted) SET @op = 'INSERT';
    ELSE SET @op = 'DELETE';

    INSERT INTO auditoria (tabla, operacion, usuario_id, datos_anteriores, datos_nuevos)
    SELECT
        'clientes', @op, @uid,
        CASE WHEN @op IN ('UPDATE','DELETE')
             THEN (SELECT d.id, d.nombre, d.apellidos, d.cif_nif, d.activo
                   FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) END,
        CASE WHEN @op IN ('INSERT','UPDATE')
             THEN (SELECT i.id, i.nombre, i.apellidos, i.cif_nif, i.activo
                   FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) END
    FROM (SELECT TOP 1 1 x) _
    LEFT JOIN deleted  d ON 1=1
    LEFT JOIN inserted i ON 1=1;
END;
GO

IF OBJECT_ID('tr_auditoria_dispositivos', 'TR') IS NOT NULL DROP TRIGGER tr_auditoria_dispositivos;
GO
CREATE TRIGGER tr_auditoria_dispositivos
ON dispositivos
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @op NVARCHAR(10);
    DECLARE @uid INT = CAST(SESSION_CONTEXT(N'current_user_id') AS INT);

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
        SET @op = 'UPDATE';
    ELSE IF EXISTS (SELECT 1 FROM inserted) SET @op = 'INSERT';
    ELSE SET @op = 'DELETE';

    INSERT INTO auditoria (tabla, operacion, usuario_id, datos_anteriores, datos_nuevos)
    SELECT
        'dispositivos', @op, @uid,
        CASE WHEN @op IN ('UPDATE','DELETE')
             THEN (SELECT d.id, d.cliente_id, d.marca, d.modelo, d.numero_serie,
                          d.estado, d.estado_actual_reparacion
                   FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) END,
        CASE WHEN @op IN ('INSERT','UPDATE')
             THEN (SELECT i.id, i.cliente_id, i.marca, i.modelo, i.numero_serie,
                          i.estado, i.estado_actual_reparacion
                   FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) END
    FROM (SELECT TOP 1 1 x) _
    LEFT JOIN deleted  d ON 1=1
    LEFT JOIN inserted i ON 1=1;
END;
GO

IF OBJECT_ID('tr_auditoria_albaranes', 'TR') IS NOT NULL DROP TRIGGER tr_auditoria_albaranes;
GO
CREATE TRIGGER tr_auditoria_albaranes
ON albaranes
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @op NVARCHAR(10);
    DECLARE @uid INT = CAST(SESSION_CONTEXT(N'current_user_id') AS INT);

    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
        SET @op = 'UPDATE';
    ELSE IF EXISTS (SELECT 1 FROM inserted) SET @op = 'INSERT';
    ELSE SET @op = 'DELETE';

    INSERT INTO auditoria (tabla, operacion, usuario_id, datos_anteriores, datos_nuevos)
    SELECT
        'albaranes', @op, @uid,
        CASE WHEN @op IN ('UPDATE','DELETE')
             THEN (SELECT d.id, d.numero_albaran, d.cliente_id, d.estado, d.marca, d.modelo
                   FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) END,
        CASE WHEN @op IN ('INSERT','UPDATE')
             THEN (SELECT i.id, i.numero_albaran, i.cliente_id, i.estado, i.marca, i.modelo
                   FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) END
    FROM (SELECT TOP 1 1 x) _
    LEFT JOIN deleted  d ON 1=1
    LEFT JOIN inserted i ON 1=1;
END;
GO

-- ============================================================
-- VALIDACIÓN POLIMÓRFICA DE ADJUNTOS
-- ============================================================

IF OBJECT_ID('tr_validar_adjunto', 'TR') IS NOT NULL DROP TRIGGER tr_validar_adjunto;
GO
CREATE TRIGGER tr_validar_adjunto
ON adjuntos
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM inserted i
        WHERE
            (i.tipo_entidad = 'cliente'     AND NOT EXISTS (SELECT 1 FROM clientes     WHERE id = i.entidad_id))
         OR (i.tipo_entidad = 'dispositivo' AND NOT EXISTS (SELECT 1 FROM dispositivos WHERE id = i.entidad_id))
         OR (i.tipo_entidad = 'pedido'      AND NOT EXISTS (SELECT 1 FROM pedidos      WHERE id = i.entidad_id))
         OR (i.tipo_entidad = 'contrato'    AND NOT EXISTS (SELECT 1 FROM contratos    WHERE id = i.entidad_id))
         OR (i.tipo_entidad = 'albaran'     AND NOT EXISTS (SELECT 1 FROM albaranes    WHERE id = i.entidad_id))
         OR i.tipo_entidad NOT IN ('cliente','dispositivo','pedido','contrato','albaran')
    )
    BEGIN
        THROW 50000, 'adjuntos: entidad_id no existe en la tabla del tipo_entidad indicado.', 1;
    END;
END;
GO

-- ============================================================
-- LOG CANÓNICO DE ESTADOS DE REPARACIÓN
-- ============================================================

IF OBJECT_ID('tr_estado_reparacion', 'TR') IS NOT NULL DROP TRIGGER tr_estado_reparacion;
GO
CREATE TRIGGER tr_estado_reparacion
ON dispositivos
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO reparaciones_estados (dispositivo_id, estado_anterior, estado_nuevo, tecnico_id)
    SELECT
        i.id,
        d.estado_actual_reparacion,
        i.estado_actual_reparacion,
        CAST(SESSION_CONTEXT(N'current_user_id') AS INT)
    FROM inserted i
    JOIN deleted  d ON i.id = d.id
    WHERE i.estado_actual_reparacion <> d.estado_actual_reparacion
       OR (d.estado_actual_reparacion IS NULL AND i.estado_actual_reparacion IS NOT NULL);
END;
GO

-- ============================================================
-- RECÁLCULO AUTOMÁTICO DEL TOTAL DE PEDIDOS
-- ============================================================

IF OBJECT_ID('tr_total_pedido', 'TR') IS NOT NULL DROP TRIGGER tr_total_pedido;
GO
CREATE TRIGGER tr_total_pedido
ON pedidos_lineas
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Recalcular para los pedidos afectados (unión de inserted y deleted)
    UPDATE p
    SET    p.total = COALESCE((
               SELECT SUM(pl.total_linea)
               FROM   pedidos_lineas pl
               WHERE  pl.pedido_id = p.id
           ), 0)
    FROM pedidos p
    WHERE p.id IN (
        SELECT pedido_id FROM inserted
        UNION
        SELECT pedido_id FROM deleted
    );
END;
GO
