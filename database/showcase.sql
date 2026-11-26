-- Optional synthetic data, not a migration. Run via backend/scripts/seed-showcase.js.
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @lock int;
    EXEC @lock = sp_getapplock @Resource = 'zent_showcase_v1', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @lock < 0 THROW 51000, 'Could not acquire showcase lock.', 1;
    IF DB_NAME() <> 'zent_gestion' OR OBJECT_ID('dbo.zent_demo_version', 'U') IS NULL
        THROW 51001, 'Local Zent demo database required.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.zent_demo_version WHERE version = 1)
        THROW 51002, 'Unexpected demo schema version.', 1;
    IF EXISTS (SELECT 1 FROM clientes WHERE observaciones = N'ZENT_SHOWCASE_V1 - datos ficticios')
       OR EXISTS (SELECT 1 FROM tickets WHERE metadatos LIKE '%"showcase":"v1"%')
    BEGIN
        COMMIT TRANSACTION;
        SELECT 'Already present - no changes' AS result;
        RETURN;
    END;
    DECLARE @staff int = (SELECT id FROM usuarios WHERE email = 'equipo@zent.example' AND activo = 1 AND rol = 'admin');
    DECLARE @portal int = (SELECT p.cliente_id FROM portal_usuarios p JOIN clientes c ON c.id=p.cliente_id WHERE p.email='cliente@zent.example' AND p.activo=1 AND c.activo=1 AND c.nombre=N'Taller Horizonte');
    IF @staff IS NULL OR @portal IS NULL THROW 51003, 'Expected demo identities are unavailable.', 1;

    DECLARE @data TABLE (
      n int PRIMARY KEY, empresa nvarchar(100), tipo nvarchar(50), articulo nvarchar(20), modelo nvarchar(100),
      averia nvarchar(255), tarea nvarchar(255), estadoAlb nvarchar(40), estadoTicket nvarchar(20), prioridad nvarchar(20), coste decimal(10,2)
    );
    INSERT @data VALUES
      (1,N'Estudio Bruma (Demo)',N'portatil',N'portatil',N'Notebook 14',N'La batería se descarga rápidamente',N'Revisar política de copias de seguridad',N'en_diagnostico',N'abierto',N'alta',89),
      (2,N'Nexo Taller Creativo (Demo)',N'pc',N'pc_sobremesa',N'Workstation S',N'El equipo se reinicia bajo carga',N'Actualizar software de diseño',N'en_reparacion',N'en_progreso',N'media',145),
      (3,N'Archivo Lumen (Demo)',N'servidor',N'servidor',N'Server Mini',N'Unidad de almacenamiento degradada',N'Verificar restauración de archivos',N'esperando_piezas',N'en_progreso',N'urgente',310),
      (4,N'Oficina Alba (Demo)',N'impresora',N'impresora',N'Print 220',N'Atascos de papel intermitentes',N'Configurar impresión compartida',N'listo_para_recoger',N'cerrado',N'baja',65),
      (5,N'Punto Atlas (Demo)',N'tablet',N'tablet',N'Tab 10',N'El conector de carga no responde',N'Revisar acceso a la red inalámbrica',N'recibido',N'abierto',N'media',75),
      (6,N'Colectivo Prisma (Demo)',N'portatil',N'portatil',N'Notebook 15',N'El sistema tarda en iniciar',N'Configurar nuevo puesto de trabajo',N'entregado',N'cerrado',N'media',120);

    DECLARE @i int=1, @cliente int, @disp int, @empresa nvarchar(100), @tipo nvarchar(50), @articulo nvarchar(20), @modelo nvarchar(100), @averia nvarchar(255), @tarea nvarchar(255), @estadoAlb nvarchar(40), @estadoTicket nvarchar(20), @prioridad nvarchar(20), @coste decimal(10,2), @fecha datetime2;
    WHILE @i <= 6
    BEGIN
      SELECT @empresa=empresa,@tipo=tipo,@articulo=articulo,@modelo=modelo,@averia=averia,@tarea=tarea,@estadoAlb=estadoAlb,@estadoTicket=estadoTicket,@prioridad=prioridad,@coste=coste FROM @data WHERE n=@i;
      SET @fecha = DATEADD(day, -@i, GETDATE());
      INSERT clientes(nombre,apellidos,tipo,fecha_registro,observaciones)
        VALUES(@empresa,N'',N'empresa',DATEADD(day,-30-@i,GETDATE()),N'ZENT_SHOWCASE_V1 - datos ficticios');
      SET @cliente=CONVERT(int,SCOPE_IDENTITY());
      INSERT clientes_emails(cliente_id,email,tipo,es_preferido) VALUES(@cliente,CONCAT('showcase',@i,'@zent.example'),'trabajo',1);
      INSERT dispositivos(cliente_id,tipo_dispositivo,marca,modelo,numero_serie,estado,fecha_ingreso)
        VALUES(@cliente,@tipo,N'Demo',@modelo,CONCAT('ZENT-DEMO-',@i),CASE WHEN @estadoAlb='entregado' THEN 'activo' ELSE 'reparacion' END,@fecha);
      SET @disp=CONVERT(int,SCOPE_IDENTITY());
      -- Single-row inserts respect the existing albaran number/token trigger.
      INSERT albaranes(cliente_id,dispositivo_id,usuario_responsable_id,articulo,marca,modelo,descripcion_averia,estado,presupuesto_estimado,fecha_recepcion,fecha_entrega,fecha_creacion)
        VALUES(@cliente,@disp,@staff,@articulo,N'Demo',@modelo,@averia,@estadoAlb,@coste,@fecha,CASE WHEN @estadoAlb='entregado' THEN DATEADD(day,1,@fecha) ELSE NULL END,@fecha);
      INSERT tickets(cliente_id,dispositivo_id,tecnico_id,titulo,descripcion,estado,prioridad,metadatos,fecha_creacion,fecha_cierre)
        VALUES(@cliente,@disp,@staff,@tarea,N'Solicitud de soporte incluida en el conjunto ficticio de demostración.',@estadoTicket,@prioridad,N'{"origen":"interno","showcase":"v1"}',@fecha,CASE WHEN @estadoTicket='cerrado' THEN DATEADD(day,1,@fecha) ELSE NULL END);
      INSERT tickets(cliente_id,dispositivo_id,tecnico_id,titulo,descripcion,estado,prioridad,metadatos,fecha_creacion)
        VALUES(@cliente,@disp,@staff,@averia,N'Incidencia de ejemplo para seguimiento desde el ERP.',N'abierto',N'media',N'{"origen":"externo","showcase":"v1"}',DATEADD(hour,-@i,GETDATE()));
      IF @i <= 4
      BEGIN
        INSERT contratos(cliente_id,tipo_contrato,descripcion,fecha_inicio,fecha_fin,importe,periodicidad,estado,renovacion_automatica)
          VALUES(@cliente,CASE WHEN @i%2=0 THEN 'soporte' ELSE 'mantenimiento' END,N'Soporte y mantenimiento preventivo de equipos (demo)',DATEADD(day,-30,CAST(GETDATE() AS date)),DATEADD(day,30*@i,CAST(GETDATE() AS date)),@coste,N'mensual',N'activo',1);
        INSERT sesiones_remotas(tecnico_id,cliente_id,dispositivo_id,fecha_inicio,fecha_fin,duracion_segundos,descripcion,estado)
          VALUES(@staff,@cliente,@disp,DATEADD(minute,-45,@fecha),@fecha,2700,N'Revisión de configuración y mantenimiento remoto (demo)',N'finalizada');
      END;
      SET @i+=1;
    END;

    INSERT tickets(cliente_id,tecnico_id,titulo,descripcion,estado,prioridad,metadatos,fecha_creacion,fecha_cierre) VALUES
      (@portal,NULL,N'Configurar acceso a la impresora',N'Necesitamos añadir una impresora compartida al nuevo puesto.',N'abierto',N'media',N'{"origen":"externo","contacto":"cliente@zent.example","showcase":"v1"}',DATEADD(hour,-2,GETDATE()),NULL),
      (@portal,@staff,N'Conexión de red intermitente',N'La conexión se pierde durante las videollamadas.',N'en_progreso',N'alta',N'{"origen":"externo","contacto":"cliente@zent.example","showcase":"v1"}',DATEADD(day,-2,GETDATE()),NULL),
      (@portal,@staff,N'Revisión de copia de seguridad',N'Confirmar que la última copia de prueba puede restaurarse.',N'cerrado',N'baja',N'{"origen":"externo","contacto":"cliente@zent.example","showcase":"v1"}',DATEADD(day,-5,GETDATE()),DATEADD(day,-4,GETDATE()));
    COMMIT TRANSACTION;
    SELECT 'Showcase created' AS result, 6 AS clients, 6 AS devices, 15 AS tickets, 6 AS work_orders, 4 AS contracts, 4 AS remote_sessions;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
