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
    url_foto_perfil TEXT,
    telefono TEXT,
    FOREIGN KEY (idalumnos) REFERENCES Alumnos(idalumnos)
);

--Tabla: Tutores
CREATE TABLE IF NOT EXISTS Tutores (
    idTutores INTEGER PRIMARY KEY AUTOINCREMENT,
    idmaestro INTEGER,
    idalumnos INTEGER,
    url_cv TEXT,
    url_foto_perfil TEXT,
    materias TEXT,
    telefono TEXT,
    FOREIGN KEY (idmaestro) REFERENCES Maestro(idmaestro),
    FOREIGN KEY (idalumnos) REFERENCES Alumnos(idalumnos)
);

-- Tabla: Licenciaturas
CREATE TABLE IF NOT EXISTS Licenciaturas (
    idlicenciaturas INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_carrera TEXT NOT NULL,
    periodo INTEGER,
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
    nombre TEXT NOT NULL,
    ultimoGrado_estudios TEXT,
    clave TEXT,
    fechanacimiento DATE,
    telefono TEXT,
    correo TEXT,
    sexo TEXT
);
CREATE TABLE IF NOT EXISTS Tutorias (
    idtutoria INTEGER PRIMARY KEY AUTOINCREMENT,
    idtutor INTEGER NOT NULL,
    idclases INTEGER NOT NULL,
    fecha_hora DATETIME,
    FOREIGN KEY (idtutor) REFERENCES Tutores(idTutores),
    FOREIGN KEY (idclases) REFERENCES Materias(idclases)
);

CREATE TABLE IF NOT EXISTS asesoria (
    idAsesoria INTEGER PRIMARY KEY AUTOINCREMENT,
    idtutoria INTEGER NOT NULL,
    idasesorados INTEGER NOT NULL,
    observacionAsesorado TEXT,
    observacionTutor TEXT,
    status INTEGER DEFAULT 0,
    FOREIGN KEY (idtutoria) REFERENCES Tutorias(idtutoria),
    FOREIGN KEY (idasesorados) REFERENCES Asesorados(idasesorados)
);