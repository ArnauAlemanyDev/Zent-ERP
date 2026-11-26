CREATE TABLE dbo.office (
    id int IDENTITY PRIMARY KEY,
    cliente nvarchar(200) NOT NULL DEFAULT '',
    version nvarchar(100),
    clave nvarchar(150) NOT NULL UNIQUE,
    fecha date,
    anotacion nvarchar(max),
    defectuosa bit NOT NULL DEFAULT 0
);
INSERT dbo.office(clave,version) VALUES ('DEMO-OFFICE-001','Office 2021 Pro Plus');
GO
CREATE TABLE dbo.windows10 (
    id int IDENTITY PRIMARY KEY,
    cliente nvarchar(200) NOT NULL DEFAULT '',
    version nvarchar(100),
    clave nvarchar(150) NOT NULL UNIQUE,
    fecha date,
    anotacion nvarchar(max),
    defectuosa bit NOT NULL DEFAULT 0
);
INSERT dbo.windows10(clave,version) VALUES ('DEMO-WINDOWS10-001','Windows 10 Pro');