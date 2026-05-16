-- Tabla: Tutorias
CREATE TABLE IF NOT EXISTS Tutorias (
    idtutoria INTEGER PRIMARY KEY AUTOINCREMENT,
    idtutor INTEGER NOT NULL,
    materia TEXT NOT NULL,
    tema_especifico TEXT,
    fecha_hora DATETIME,
    estado TEXT DEFAULT 'Disponible',
    FOREIGN KEY (idtutor) REFERENCES Tutores(idTutores)
);

-- Inserción de datos semilla para Tutorias
INSERT INTO Tutores (idalumnos, materias) VALUES (1, 'Teoría de la Educación,Psicología Educativa');
INSERT INTO Tutores (idalumnos, materias) VALUES (2, 'Historia de la Educación,Estadística Educativa');

INSERT INTO Tutorias (idtutor, materia, tema_especifico, fecha_hora, estado) VALUES
(1, 'Teoría de la Educación', 'Introducción a la pedagogía', '2023-11-01 10:00:00', 'Disponible'),
(1, 'Psicología Educativa', 'Conductismo y Cognitivismo', '2023-11-05 16:00:00', 'Disponible'),
(2, 'Historia de la Educación', 'Educación en la antigua Grecia', '2023-11-10 12:00:00', 'Disponible'),
(2, 'Estadística Educativa', 'Distribución Normal y T de Student', '2023-11-12 14:00:00', 'Disponible');
