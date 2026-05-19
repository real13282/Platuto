-- Tabla: Tutorias
CREATE TABLE IF NOT EXISTS Tutorias (
    idtutoria INTEGER PRIMARY KEY AUTOINCREMENT,
    idtutor INTEGER NOT NULL,
    idclases INTEGER NOT NULL,
    fecha_hora DATETIME,
    estado TEXT DEFAULT 'Disponible',
    FOREIGN KEY (idtutor) REFERENCES Tutores(idTutores),
    FOREIGN KEY (idclases) REFERENCES Materias(idclases)
);

-- Inserción de datos semilla para Tutorias
INSERT INTO Tutores (idalumnos, materias) VALUES (1, 'ADMIILA,CONTILA');
INSERT INTO Tutores (idalumnos, materias) VALUES (2, 'NOCIDERELA,INTRECONLA');

INSERT INTO Tutorias (idtutor, idclases, fecha_hora, estado) VALUES
(1, 1, '2026-11-01 10:00:00', 'Disponible'),
(1, 2, '2026-11-05 16:00:00', 'Disponible'),
(2, 3, '2026-11-10 12:00:00', 'Disponible'),
(2, 4, '2026-11-12 14:00:00', 'Disponible');
