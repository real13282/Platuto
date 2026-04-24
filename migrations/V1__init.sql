CREATE TABLE IF NOT EXISTS Alumnos (
    idalumnos INTEGER PRIMARY KEY AUTOINCREMENT,
    apellidopat TEXT NOT NULL,
    apellidomat TEXT,
    nombre TEXT NOT NULL,
    calle TEXT,
    colonia TEXT,
    telefono TEXT,
    correo TEXT,
    
    -- Datos del Tutor
    tutorapellidopat TEXT,
    tutorapellidomat TEXT,
    tutornombre TEXT,
    tutortelefono TEXT,
    tutortelefonoa TEXT, -- Teléfono adicional o de emergencia
    tutorcorreo TEXT,
    
    -- Datos Académicos y Personales
    semestre INTEGER,
    nocontrol TEXT UNIQUE,
    clave TEXT,
    idlicenciaturas INTEGER,
    sexo TEXT,
    tipo TEXT, -- Por ejemplo: Regular, Irregular, etc.
    curp TEXT UNIQUE,
    
    -- Relación con la tabla Licenciaturas
    FOREIGN KEY (idlicenciaturas) REFERENCES Licenciaturas(idlicenciaturas)
);

--Tabla: Asesorados
CREATE TABLE IF NOT EXISTS Asesorados (
    idasesorados INTEGER PRIMARY KEY AUTOINCREMENT,
    idalumnos INTEGER,
    materias TEXT,
    FOREIGN KEY (idalumnos) REFERENCES Alumnos(idalumnos)
);

--Tabla: Tutores
CREATE TABLE IF NOT EXISTS Tutores (
    idTutores INTEGER PRIMARY KEY AUTOINCREMENT,
    idlicenciaturas INTEGER,
    idmaestro INTEGER,
    url_cv TEXT,
    materias TEXT,
    FOREIGN KEY (idlicenciaturas) REFERENCES Licenciaturas(idlicenciaturas),
    FOREIGN KEY (idmaestro) REFERENCES Maestro(idmaestro)
);


-- Tabla: Licenciaturas
CREATE TABLE IF NOT EXISTS Licenciaturas (
    idlicenciaturas INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_carrera TEXT NOT NULL,
    periodo TEXT,
    especialidad TEXT
);

-- Tabla: Materias
CREATE TABLE IF NOT EXISTS Materias (
    idclases INTEGER PRIMARY KEY AUTOINCREMENT,
    materia TEXT NOT NULL,
    idlicenciaturas INTEGER,
    semestre INTEGER,
    grupo TEXT,
    turno TEXT,
    clave TEXT UNIQUE,
    FOREIGN KEY (idlicenciaturas) REFERENCES Licenciaturas(idlicenciaturas)
);

-- Tabla: Maestro
CREATE TABLE IF NOT EXISTS Maestro (
    idmaestro INTEGER PRIMARY KEY AUTOINCREMENT,
    fechacaptura DATE DEFAULT CURRENT_DATE,
    nocontrol TEXT UNIQUE,
    apellidopat TEXT NOT NULL,
    apellidomat TEXT,
    telefono TEXT,
    correo TEXT,
    clave TEXT,
    nombre TEXT NOT NULL,
    fechanacimiento DATE,
    sexo TEXT
);