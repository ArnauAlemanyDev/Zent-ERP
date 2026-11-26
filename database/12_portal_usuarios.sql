
-- Crear la tabla portal_usuarios si no existe
IF OBJECT_ID('dbo.portal_usuarios', 'U') IS NULL
BEGIN
    CREATE TABLE portal_usuarios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cliente_id INT NOT NULL,
        email NVARCHAR(100) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        activo BIT DEFAULT 1,
        fecha_registro DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT fk_portal_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
    );
END
GO
