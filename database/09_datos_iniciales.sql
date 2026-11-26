/**
 * Datos iniciales del sistema para SQL Server (T-SQL).
 *
 * La sintaxis INSERT INTO ... SELECT ... es idéntica en SQL Server.
 * Sin cambios estructurales respecto a MySQL excepto valores BIT (1/0).
 *
 *
 * @file 09_datos_iniciales.sql
 */

-- ── Catálogo de permisos ──────────────────────────────────────────────────
INSERT INTO permisos (nombre_permiso, descripcion) VALUES
    (N'usuarios_leer',          N'Leer información de usuarios'),
    (N'usuarios_escribir',      N'Crear y modificar usuarios'),
    (N'usuarios_eliminar',      N'Eliminar usuarios'),
    (N'clientes_leer',          N'Leer información de clientes'),
    (N'clientes_escribir',      N'Crear y modificar clientes'),
    (N'dispositivos_leer',      N'Leer información de dispositivos'),
    (N'dispositivos_escribir',  N'Crear y modificar dispositivos'),
    (N'reparaciones_leer',      N'Ver historial de reparaciones'),
    (N'reparaciones_escribir',  N'Crear y modificar reparaciones'),
    (N'tickets_leer',           N'Ver tickets de soporte'),
    (N'tickets_escribir',       N'Crear y modificar tickets'),
    (N'facturas_leer',          N'Ver facturas'),
    (N'facturas_escribir',      N'Crear y modificar facturas'),
    (N'reportes_leer',          N'Ver reportes del sistema'),
    (N'configuracion_escribir', N'Modificar configuración del sistema'),
    (N'cotizaciones_leer',      N'Ver cotizaciones y presupuestos'),
    (N'cotizaciones_escribir',  N'Crear y modificar cotizaciones'),
    (N'garantias_leer',         N'Ver información de garantías'),
    (N'garantias_escribir',     N'Gestionar garantías'),
    (N'proveedores_leer',       N'Ver información de proveedores'),
    (N'proveedores_escribir',   N'Gestionar proveedores'),
    (N'respaldos_leer',         N'Ver configuración de respaldos'),
    (N'respaldos_escribir',     N'Configurar respaldos'),
    (N'sistema_configurar',     N'Configurar parámetros del sistema'),
    (N'auditoria_avanzada',     N'Acceso completo a auditoría'),
    (N'albaranes_leer',         N'Ver albaranes propios y asignados'),
    (N'albaranes_escribir',     N'Crear y modificar albaranes'),
    (N'albaranes_eliminar',     N'Eliminar o cancelar albaranes'),
    (N'albaranes_admin',        N'Acceso completo al módulo de albaranes');
GO

-- ── Permisos por rol: admin (todos) ──────────────────────────────────────
INSERT INTO roles_permisos (rol, permiso_id)
SELECT N'admin', id FROM permisos;
GO

-- ── Permisos por rol: técnico ─────────────────────────────────────────────
INSERT INTO roles_permisos (rol, permiso_id)
SELECT N'tecnico', id FROM permisos
WHERE nombre_permiso IN (
    N'clientes_leer',
    N'dispositivos_leer', N'dispositivos_escribir',
    N'reparaciones_leer', N'reparaciones_escribir',
    N'tickets_leer', N'tickets_escribir',
    N'cotizaciones_leer', N'cotizaciones_escribir',
    N'garantias_leer',
    N'albaranes_leer', N'albaranes_escribir'
);
GO

-- ── Permisos por rol: vendedor ────────────────────────────────────────────
INSERT INTO roles_permisos (rol, permiso_id)
SELECT N'vendedor', id FROM permisos
WHERE nombre_permiso IN (
    N'clientes_leer', N'clientes_escribir',
    N'dispositivos_leer',
    N'facturas_leer', N'facturas_escribir',
    N'cotizaciones_leer', N'cotizaciones_escribir',
    N'garantias_leer',
    N'proveedores_leer',
    N'albaranes_leer'
);
GO

-- ── Permisos por rol: soporte ─────────────────────────────────────────────
INSERT INTO roles_permisos (rol, permiso_id)
SELECT N'soporte', id FROM permisos
WHERE nombre_permiso IN (
    N'clientes_leer',
    N'dispositivos_leer',
    N'tickets_leer', N'tickets_escribir',
    N'albaranes_leer'
);
GO

-- ── Usuario administrador por defecto ─────────────────────────────────────

-- ── Sede principal por defecto ────────────────────────────────────────────
INSERT INTO sedes (nombre, ciudad, activo)
VALUES (N'Sede Principal', N'Sin especificar', 1);
GO

-- ── Configuración básica del sistema ──────────────────────────────────────
INSERT INTO configuracion_sistema (clave, valor, descripcion, categoria) VALUES
    (N'empresa_nombre',        N'Zent ERP', N'Nombre de la empresa',            N'general'),
    (N'empresa_telefono',      N'',        N'Teléfono principal',              N'general'),
    (N'empresa_email',         N'soporte@zent.example',       N'Email principal',                 N'general'),
    (N'empresa_direccion',     N'',                       N'Dirección de la empresa',         N'general'),
    (N'dias_garantia_defecto', N'365',                    N'Días de garantía por defecto',    N'garantias'),
    (N'alerta_stock_minimo',   N'true',                   N'Activar alertas de stock mínimo', N'inventario'),
    (N'backup_automatico',     N'true',                   N'Realizar backups automáticos',    N'sistema'),
    (N'intentos_login_max',    N'5',                      N'Máximo de intentos de login',     N'seguridad'),
    (N'sesion_duracion_horas', N'8',                      N'Duración de sesión en horas',     N'seguridad'),
    (N'iva_defecto',           N'21',                     N'Porcentaje de IVA por defecto',   N'facturacion');
GO
