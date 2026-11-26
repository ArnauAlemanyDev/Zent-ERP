/**
 * Índices de optimización para SQL Server (T-SQL).
 *
 * Cada índice se crea solo si no existe previamente.
 * Los índices FULLTEXT requieren un catálogo previo y PK con nombre explícito.
 *
 * @file 06_indices.sql
 */

-- NOTA: Los índices FULLTEXT están deshabilitados porque
-- Full-Text Search no está instalado en este servidor.
-- Si lo instalas en el futuro, descomenta las secciones FT.
PRINT 'Cargando índices (sin FULLTEXT)...';
GO

-- ============================================================
-- CUENTAS DE CORREO
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_correos_cliente' AND object_id = OBJECT_ID('cuentas_correo'))
    CREATE INDEX idx_correos_cliente ON cuentas_correo (cliente_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_correos_dispositivo' AND object_id = OBJECT_ID('cuentas_correo'))
    CREATE INDEX idx_correos_dispositivo ON cuentas_correo (dispositivo_id);
GO

-- ============================================================
-- RECURSOS DE RED
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_recursos_por_cliente' AND object_id = OBJECT_ID('recursos_red'))
    CREATE INDEX idx_recursos_por_cliente ON recursos_red (cliente_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_conexiones_por_dispositivo' AND object_id = OBJECT_ID('conexiones_dispositivo_recurso'))
    CREATE INDEX idx_conexiones_por_dispositivo ON conexiones_dispositivo_recurso (dispositivo_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_interfaces_por_dispositivo' AND object_id = OBJECT_ID('interfaces_red'))
    CREATE INDEX idx_interfaces_por_dispositivo ON interfaces_red (dispositivo_id);
GO

-- ============================================================
-- LICENCIAS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_licencias_dispositivos' AND object_id = OBJECT_ID('licencias_dispositivos'))
    CREATE INDEX idx_licencias_dispositivos ON licencias_dispositivos (licencia_id, dispositivo_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_licencias_expiracion' AND object_id = OBJECT_ID('licencias'))
    CREATE INDEX idx_licencias_expiracion ON licencias (fecha_expiracion);
-- Índice filtrado: licencias activas (sin funciones dinámicas en WHERE)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_licencias_activas' AND object_id = OBJECT_ID('licencias'))
    CREATE INDEX idx_licencias_activas ON licencias (fecha_expiracion) WHERE activo = 1;
GO

-- ============================================================
-- GARANTÍAS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_garantias_dispositivo_activas' AND object_id = OBJECT_ID('garantias'))
    CREATE INDEX idx_garantias_dispositivo_activas ON garantias (dispositivo_id) WHERE activa = 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_garantias_vencimiento' AND object_id = OBJECT_ID('garantias'))
    CREATE INDEX idx_garantias_vencimiento ON garantias (fecha_fin) WHERE activa = 1;
GO

-- ============================================================
-- TICKETS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tickets_estado' AND object_id = OBJECT_ID('tickets'))
    CREATE INDEX idx_tickets_estado ON tickets (estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tickets_prioridad' AND object_id = OBJECT_ID('tickets'))
    CREATE INDEX idx_tickets_prioridad ON tickets (prioridad);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tickets_tecnico' AND object_id = OBJECT_ID('tickets'))
    CREATE INDEX idx_tickets_tecnico ON tickets (tecnico_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tickets_tecnico_estado_prioridad' AND object_id = OBJECT_ID('tickets'))
    CREATE INDEX idx_tickets_tecnico_estado_prioridad ON tickets (tecnico_id, estado, prioridad);
GO

-- ============================================================
-- DISPOSITIVOS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_dispositivos_cliente' AND object_id = OBJECT_ID('dispositivos'))
    CREATE INDEX idx_dispositivos_cliente ON dispositivos (cliente_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_dispositivos_estado' AND object_id = OBJECT_ID('dispositivos'))
    CREATE INDEX idx_dispositivos_estado ON dispositivos (estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_dispositivos_estado_reparacion' AND object_id = OBJECT_ID('dispositivos'))
    CREATE INDEX idx_dispositivos_estado_reparacion ON dispositivos (estado_actual_reparacion);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_dispositivos_cliente_estado' AND object_id = OBJECT_ID('dispositivos'))
    CREATE INDEX idx_dispositivos_cliente_estado ON dispositivos (cliente_id, estado, estado_actual_reparacion);
GO

-- FULLTEXT sobre dispositivos (deshabilitado — Full-Text Search no instalado)
PRINT 'Índices de dispositivos creados.';
GO

-- ============================================================
-- HISTORIAL REPARACIONES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_historial_reparaciones_dispositivo' AND object_id = OBJECT_ID('historial_reparaciones'))
    CREATE INDEX idx_historial_reparaciones_dispositivo ON historial_reparaciones (dispositivo_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_historial_reparaciones_tecnico' AND object_id = OBJECT_ID('historial_reparaciones'))
    CREATE INDEX idx_historial_reparaciones_tecnico ON historial_reparaciones (tecnico_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_historial_reparaciones_fecha' AND object_id = OBJECT_ID('historial_reparaciones'))
    CREATE INDEX idx_historial_reparaciones_fecha ON historial_reparaciones (fecha_entrada);
GO

-- ============================================================
-- REPARACIONES HISTORIAL
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reparaciones_historial_dispositivo' AND object_id = OBJECT_ID('reparaciones_historial'))
    CREATE INDEX idx_reparaciones_historial_dispositivo ON reparaciones_historial (dispositivo_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reparaciones_historial_estado' AND object_id = OBJECT_ID('reparaciones_historial'))
    CREATE INDEX idx_reparaciones_historial_estado ON reparaciones_historial (estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reparaciones_historial_fecha' AND object_id = OBJECT_ID('reparaciones_historial'))
    CREATE INDEX idx_reparaciones_historial_fecha ON reparaciones_historial (fecha);
GO

-- ============================================================
-- REPARACIONES ESTADOS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reparaciones_estados_dispositivo' AND object_id = OBJECT_ID('reparaciones_estados'))
    CREATE INDEX idx_reparaciones_estados_dispositivo ON reparaciones_estados (dispositivo_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reparaciones_estados_reparacion' AND object_id = OBJECT_ID('reparaciones_estados'))
    CREATE INDEX idx_reparaciones_estados_reparacion ON reparaciones_estados (reparacion_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reparaciones_estados_fecha' AND object_id = OBJECT_ID('reparaciones_estados'))
    CREATE INDEX idx_reparaciones_estados_fecha ON reparaciones_estados (fecha);
GO

-- ============================================================
-- FACTURAS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_facturas_estado' AND object_id = OBJECT_ID('facturas'))
    CREATE INDEX idx_facturas_estado ON facturas (estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_facturas_vencimiento' AND object_id = OBJECT_ID('facturas'))
    CREATE INDEX idx_facturas_vencimiento ON facturas (fecha_vencimiento);
GO

-- ============================================================
-- MANTENIMIENTO
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_mantenimiento_fecha' AND object_id = OBJECT_ID('mantenimiento_preventivo'))
    CREATE INDEX idx_mantenimiento_fecha ON mantenimiento_preventivo (fecha_programada);
GO

-- ============================================================
-- CITAS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_citas_fecha' AND object_id = OBJECT_ID('citas'))
    CREATE INDEX idx_citas_fecha ON citas (fecha_cita);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_citas_tecnico' AND object_id = OBJECT_ID('citas'))
    CREATE INDEX idx_citas_tecnico ON citas (tecnico_id);
GO

-- ============================================================
-- COMPONENTES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_componentes_stock_bajo' AND object_id = OBJECT_ID('componentes'))
    CREATE INDEX idx_componentes_stock_bajo ON componentes (stock) WHERE stock <= 5;
GO

-- ============================================================
-- AUDITORÍA
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_auditoria_fecha' AND object_id = OBJECT_ID('auditoria'))
    CREATE INDEX idx_auditoria_fecha ON auditoria (fecha);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_auditoria_usuario' AND object_id = OBJECT_ID('auditoria'))
    CREATE INDEX idx_auditoria_usuario ON auditoria (usuario_id);
GO

-- ============================================================
-- SESIONES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_sesiones_activas' AND object_id = OBJECT_ID('sesiones_usuario'))
    CREATE INDEX idx_sesiones_activas ON sesiones_usuario (usuario_id) WHERE activa = 1;
GO

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notificaciones_usuario_no_leidas' AND object_id = OBJECT_ID('notificaciones'))
    CREATE INDEX idx_notificaciones_usuario_no_leidas ON notificaciones (usuario_id) WHERE leida = 0;
GO

-- ============================================================
-- COTIZACIONES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cotizaciones_cliente' AND object_id = OBJECT_ID('cotizaciones'))
    CREATE INDEX idx_cotizaciones_cliente ON cotizaciones (cliente_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cotizaciones_estado' AND object_id = OBJECT_ID('cotizaciones'))
    CREATE INDEX idx_cotizaciones_estado ON cotizaciones (estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cotizaciones_fecha' AND object_id = OBJECT_ID('cotizaciones'))
    CREATE INDEX idx_cotizaciones_fecha ON cotizaciones (fecha);
GO

-- ============================================================
-- RESPALDOS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_respaldos_proximo' AND object_id = OBJECT_ID('respaldos_programados'))
    CREATE INDEX idx_respaldos_proximo ON respaldos_programados (proximo_respaldo) WHERE estado = 'activo';
GO

-- ============================================================
-- INTENTOS LOGIN
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_intentos_login_email_tiempo' AND object_id = OBJECT_ID('intentos_login'))
    CREATE INDEX idx_intentos_login_email_tiempo ON intentos_login (email, fecha_intento);
GO

-- ============================================================
-- CONFIGURACIÓN
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_configuracion_categoria' AND object_id = OBJECT_ID('configuracion_sistema'))
    CREATE INDEX idx_configuracion_categoria ON configuracion_sistema (categoria);
GO

-- CLIENTES FULLTEXT (deshabilitado — Full-Text Search no instalado)
PRINT 'Índices de clientes creados.';
GO

-- ============================================================
-- CONTRATOS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_contratos_subtipo' AND object_id = OBJECT_ID('contratos'))
    CREATE INDEX idx_contratos_subtipo ON contratos (subtipo);
GO

-- ============================================================
-- ADJUNTOS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_adjuntos_entidad' AND object_id = OBJECT_ID('adjuntos'))
    CREATE INDEX idx_adjuntos_entidad ON adjuntos (tipo_entidad, entidad_id);
GO

-- ============================================================
-- PEDIDOS LÍNEAS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pedidos_lineas_pedido' AND object_id = OBJECT_ID('pedidos_lineas'))
    CREATE INDEX idx_pedidos_lineas_pedido ON pedidos_lineas (pedido_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pedidos_lineas_componente' AND object_id = OBJECT_ID('pedidos_lineas'))
    CREATE INDEX idx_pedidos_lineas_componente ON pedidos_lineas (componente_id);
GO

-- ============================================================
-- MÉTRICAS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_metricas_reparacion' AND object_id = OBJECT_ID('metricas'))
    CREATE INDEX idx_metricas_reparacion ON metricas (reparacion_id);
GO

-- ============================================================
-- ALBARANES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_albaranes_cliente' AND object_id = OBJECT_ID('albaranes'))
    CREATE INDEX idx_albaranes_cliente ON albaranes (cliente_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_albaranes_estado' AND object_id = OBJECT_ID('albaranes'))
    CREATE INDEX idx_albaranes_estado ON albaranes (estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_albaranes_responsable' AND object_id = OBJECT_ID('albaranes'))
    CREATE INDEX idx_albaranes_responsable ON albaranes (usuario_responsable_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_albaranes_fecha' AND object_id = OBJECT_ID('albaranes'))
    CREATE INDEX idx_albaranes_fecha ON albaranes (fecha_recepcion DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_albaranes_historial' AND object_id = OBJECT_ID('albaranes_historial_estados'))
    CREATE INDEX idx_albaranes_historial ON albaranes_historial_estados (albaran_id);
GO
