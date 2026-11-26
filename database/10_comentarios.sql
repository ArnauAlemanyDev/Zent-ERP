/**
 * Documentación de tablas y columnas para SQL Server (T-SQL).
 *
 * SQL Server usa Extended Properties para añadir metadatos a objetos.
 * La función sp_addextendedproperty es el equivalente a COMMENT ON en PostgreSQL
 * y a ALTER TABLE ... COMMENT en MySQL.
 *
 * Los comentarios son visibles en:
 *  - SQL Server Management Studio (SSMS): propiedades del objeto
 *  - Consulta: SELECT * FROM sys.extended_properties
 *
 * @file 10_comentarios.sql
 */

-- ============================================================
-- HELPER: añade un comentario de tabla de forma segura
-- ============================================================
-- (elimina primero si ya existía, para permitir re-ejecución)

-- ── sedes ──────────────────────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('sedes') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'sedes';
EXEC sp_addextendedproperty 'MS_Description', 'Sedes o ubicaciones físicas de la empresa. Referenciada por dispositivos.',
    'SCHEMA', 'dbo', 'TABLE', 'sedes';
GO

-- ── clientes ───────────────────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('clientes') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'clientes';
EXEC sp_addextendedproperty 'MS_Description', 'Tabla principal de clientes. Teléfonos y emails en tablas separadas.',
    'SCHEMA', 'dbo', 'TABLE', 'clientes';
GO

-- ── dispositivos ───────────────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('dispositivos') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'dispositivos';
EXEC sp_addextendedproperty 'MS_Description', 'Dispositivos de los clientes. NVARCHAR(MAX) para especificaciones y configuración de red (JSON).',
    'SCHEMA', 'dbo', 'TABLE', 'dispositivos';
GO

-- ── usuarios ───────────────────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('usuarios') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'usuarios';
EXEC sp_addextendedproperty 'MS_Description', 'Usuarios del sistema: técnicos, administradores, vendedores, soporte.',
    'SCHEMA', 'dbo', 'TABLE', 'usuarios';
GO

-- ── albaranes ──────────────────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('albaranes') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'albaranes';
EXEC sp_addextendedproperty 'MS_Description', 'Documento de recepción de dispositivos. Datos desnormalizados para preservar estado histórico.',
    'SCHEMA', 'dbo', 'TABLE', 'albaranes';
GO

-- ── reparaciones_estados ───────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('reparaciones_estados') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'reparaciones_estados';
EXEC sp_addextendedproperty 'MS_Description', 'Log canónico e inmutable de transiciones de estado de reparación. Rellena el trigger tr_estado_reparacion.',
    'SCHEMA', 'dbo', 'TABLE', 'reparaciones_estados';
GO

-- ── pedidos_lineas ─────────────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('pedidos_lineas') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'pedidos_lineas';
EXEC sp_addextendedproperty 'MS_Description', 'Líneas de detalle de cada pedido. total_linea es columna calculada PERSISTED. Trigger tr_total_pedido actualiza pedidos.total.',
    'SCHEMA', 'dbo', 'TABLE', 'pedidos_lineas';
GO

-- ── servicios_cliente ──────────────────────────────────────────────────────
IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE major_id = OBJECT_ID('servicios_cliente') AND name = 'MS_Description' AND minor_id = 0)
    EXEC sp_dropextendedproperty  'MS_Description', 'SCHEMA', 'dbo', 'TABLE', 'servicios_cliente';
EXEC sp_addextendedproperty 'MS_Description', 'DEPRECADA. Datos migrados a contratos con subtipo = servicio. Conservada para compatibilidad.',
    'SCHEMA', 'dbo', 'TABLE', 'servicios_cliente';
GO

-- ============================================================
-- COMENTARIOS DE COLUMNAS SENSIBLES
-- ============================================================

-- recursos_red.contrasena_hash
IF EXISTS (SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('recursos_red')
      AND name = 'MS_Description'
      AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('recursos_red') AND name = 'contrasena_hash'))
    EXEC sp_dropextendedproperty 'MS_Description','SCHEMA','dbo','TABLE','recursos_red','COLUMN','contrasena_hash';
EXEC sp_addextendedproperty 'MS_Description',
    'Contraseña cifrada. NUNCA en texto plano. Usar EncryptByPassPhrase() si debe ser recuperable.',
    'SCHEMA','dbo','TABLE','recursos_red','COLUMN','contrasena_hash';
GO

-- usuarios.password_hash
IF EXISTS (SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('usuarios')
      AND name = 'MS_Description'
      AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'password_hash'))
    EXEC sp_dropextendedproperty 'MS_Description','SCHEMA','dbo','TABLE','usuarios','COLUMN','password_hash';
EXEC sp_addextendedproperty 'MS_Description',
    'Hash de contraseña con bcrypt o argon2. NUNCA en texto plano.',
    'SCHEMA','dbo','TABLE','usuarios','COLUMN','password_hash';
GO

-- albaranes.contrasena_dispositivo_hash
IF EXISTS (SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('albaranes')
      AND name = 'MS_Description'
      AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('albaranes') AND name = 'contrasena_dispositivo_hash'))
    EXEC sp_dropextendedproperty 'MS_Description','SCHEMA','dbo','TABLE','albaranes','COLUMN','contrasena_dispositivo_hash';
EXEC sp_addextendedproperty 'MS_Description',
    'Contraseña del dispositivo cifrada. Solo si acepta_custodia_contrasena = 1.',
    'SCHEMA','dbo','TABLE','albaranes','COLUMN','contrasena_dispositivo_hash';
GO

-- albaranes.numero_albaran
IF EXISTS (SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('albaranes')
      AND name = 'MS_Description'
      AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('albaranes') AND name = 'numero_albaran'))
    EXEC sp_dropextendedproperty 'MS_Description','SCHEMA','dbo','TABLE','albaranes','COLUMN','numero_albaran';
EXEC sp_addextendedproperty 'MS_Description',
    'Identificador legible. Formato ALB-YYYY-NNNN. Auto-generado por trigger INSTEAD OF INSERT, reinicia cada año.',
    'SCHEMA','dbo','TABLE','albaranes','COLUMN','numero_albaran';
GO

-- albaranes.token_publico
IF EXISTS (SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('albaranes')
      AND name = 'MS_Description'
      AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('albaranes') AND name = 'token_publico'))
    EXEC sp_dropextendedproperty 'MS_Description','SCHEMA','dbo','TABLE','albaranes','COLUMN','token_publico';
EXEC sp_addextendedproperty 'MS_Description',
    'Token de 12 caracteres hex para la URL del QR. Generado con CRYPT_GEN_RANDOM(). No predecible.',
    'SCHEMA','dbo','TABLE','albaranes','COLUMN','token_publico';
GO

-- dispositivos.especificaciones
IF EXISTS (SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('dispositivos')
      AND name = 'MS_Description'
      AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('dispositivos') AND name = 'especificaciones'))
    EXEC sp_dropextendedproperty 'MS_Description','SCHEMA','dbo','TABLE','dispositivos','COLUMN','especificaciones';
EXEC sp_addextendedproperty 'MS_Description',
    'Especificaciones técnicas en formato JSON: RAM, CPU, disco, GPU, etc.',
    'SCHEMA','dbo','TABLE','dispositivos','COLUMN','especificaciones';
GO

-- metricas.reparacion_id
IF EXISTS (SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('metricas')
      AND name = 'MS_Description'
      AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('metricas') AND name = 'reparacion_id'))
    EXEC sp_dropextendedproperty 'MS_Description','SCHEMA','dbo','TABLE','metricas','COLUMN','reparacion_id';
EXEC sp_addextendedproperty 'MS_Description',
    'Reparación concreta a la que corresponde esta valoración. Necesario cuando un dispositivo pasa varias veces por el taller.',
    'SCHEMA','dbo','TABLE','metricas','COLUMN','reparacion_id';
GO
