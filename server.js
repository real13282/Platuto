const express = require('express');
const path = require('path');
const fs = require('fs');

const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, 'dev.sqlite3')
    },
    useNullAsDefault: true
});

async function setupDatabase() {
    console.log("🔍 Verificando estado de la base de datos...");

    // Ejecutar Estructura (V1__init.sql)
    const sqlPath = path.join(__dirname, 'migrations', 'V1__init.sql');
    if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        const queries = sqlContent.split(';').filter(q => q.trim() !== '');
        for (let q of queries) {
            try { await knex.raw(q); } catch (err) {
                if (!err.message.includes('already exists')) console.error("❌ Error Estructura:", err.message);
            }
        }
        console.log("✅ Tablas verificadas/creadas.");
    }

    // Insertar Semilla si la tabla alumnos está vacía (V2__seed.sql)
    try {
        const [{ total }] = await knex('alumnos').count('* as total');
        if (total === 0) {
            const seedPath = path.join(__dirname, 'migrations', 'V2__seed.sql');
            if (fs.existsSync(seedPath)) {
                const seedContent = fs.readFileSync(seedPath, 'utf8');
                const seedQueries = seedContent.split(';').filter(q => q.trim() !== '');
                for (let q of seedQueries) { await knex.raw(q); }
                console.log("✅ Datos semilla cargados.");
            }
        }
    } catch (err) { console.error("❌ Error Semilla:", err.message); }
}

setupDatabase();



const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '')));

app.post('/api/login', async (req, res) => {
    try {
        const { nocontrol, password, role } = req.body;

        if (!nocontrol || !password || !role) {
            return res.status(400).json({ success: false, message: 'Faltan credenciales o el rol' });
        }

        const claveProcesada = String(password).substring(0, 8);

        const alumno = await knex('Alumnos')
            .where({ nocontrol: nocontrol, clave: claveProcesada })
            .first();

        if (alumno) {
            // Si el rol es tutor, verificamos si está en la tabla Tutores
            if (role === 'tutor') {
                const tutor = await knex('Tutores')
                    .where({ idalumnos: alumno.idalumnos })
                    .first();

                if (!tutor) {
                    return res.status(403).json({ success: false, message: 'El usuario no está registrado como tutor. Por favor regístrate.' });
                }
            }

            res.json({
                success: true,
                message: 'Login exitoso',
                data: {
                    id: alumno.idalumnos,
                    nombre: alumno.nombre,
                    nocontrol: alumno.nocontrol,
                    role: role
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Número de control o contraseña incorrectos' });
        }
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.post('/api/register/asesorado', async (req, res) => {
    try {
        const { nocontrol } = req.body;

        if (!nocontrol) {
            return res.status(400).json({ success: false, message: 'Falta el número de control' });
        }

        const alumno = await knex('Alumnos').where({ nocontrol: nocontrol }).first();

        if (!alumno) {
            return res.status(404).json({ success: false, message: 'El número de control no existe en nuestros registros' });
        }

        // Verificar si ya está como asesorado
        const asesorado = await knex('Asesorados').where({ idalumnos: alumno.idalumnos }).first();
        if (!asesorado) {
            await knex('Asesorados').insert({
                idalumnos: alumno.idalumnos,
                materias: ''
            });
        }

        res.json({ success: true, message: 'Registro de asesorado exitoso', data: { nocontrol: alumno.nocontrol } });
    } catch (error) {
        console.error("Error en registro de asesorado:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.post('/api/register/tutor', async (req, res) => {
    try {
        const { nocontrol, nombre, correo, telefono, carrera, semestre, materias } = req.body;

        if (!nocontrol || !materias || materias.length === 0) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
        }

        const alumno = await knex('Alumnos').where({ nocontrol: nocontrol }).first();

        if (!alumno) {
            return res.status(404).json({ success: false, message: 'El número de control no existe en nuestros registros' });
        }

        // Actualizar correo y teléfono en Alumnos si vienen en la petición
        await knex('Alumnos')
            .where({ idalumnos: alumno.idalumnos })
            .update({ correo: correo, telefono: telefono });

        // Registrar o actualizar en Tutores
        const tutor = await knex('Tutores').where({ idalumnos: alumno.idalumnos }).first();
        const materiasStr = materias.join(',');

        if (tutor) {
            await knex('Tutores')
                .where({ idalumnos: alumno.idalumnos })
                .update({ materias: materiasStr });
        } else {
            await knex('Tutores').insert({
                idalumnos: alumno.idalumnos,
                materias: materiasStr,
                url_cv: ''
            });
        }

        res.json({ success: true, message: 'Registro de tutor exitoso' });
    } catch (error) {
        console.error("Error en registro de tutor:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.get('/api/alumnos/:nocontrol', async (req, res) => {
    try {
        const { nocontrol } = req.params;
        const alumno = await knex('Alumnos')
            .leftJoin('Licenciaturas', 'Alumnos.idlicenciaturas', 'Licenciaturas.idlicenciaturas')
            .where({ nocontrol: nocontrol })
            .select('Alumnos.*', 'Licenciaturas.nombre_carrera')
            .first();

        if (alumno) {
            res.json({ success: true, data: alumno });
        } else {
            res.status(404).json({ success: false, message: 'Alumno no encontrado' });
        }
    } catch (error) {
        console.error("Error al buscar alumno:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.get('/api/planes-estudio', async (req, res) => {
    try {
        const materias = await knex('Materias')
            .join('Licenciaturas', 'Materias.idlicenciaturas', '=', 'Licenciaturas.idlicenciaturas')
            .select('Materias.materia', 'Materias.semestre', 'Licenciaturas.nombre_carrera as carrera');

        const planesEstudio = {};

        materias.forEach(row => {
            const carrera = row.carrera.toLowerCase() === 'arquitectura' ? 'Licenciatura en arquitectura' : row.carrera;

            if (!planesEstudio[carrera]) {
                planesEstudio[carrera] = {};
            }
            if (!planesEstudio[carrera][row.semestre]) {
                planesEstudio[carrera][row.semestre] = [];
            }
            planesEstudio[carrera][row.semestre].push(row.materia);
        });

        res.json({ success: true, data: planesEstudio });
    } catch (error) {
        console.error("Error al obtener planes de estudio:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado exitosamente en http://localhost:${PORT}`);
});
