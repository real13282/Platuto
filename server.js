const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'clave_secreta_para_jwt_cambiar_en_produccion';

// ─── Asegurar que existan las carpetas de archivos ───────────────────────────
const fotoPerfilTDir = path.join(__dirname, 'private', 'fotoPerfilT');
const fotoPerfilADir = path.join(__dirname, 'private', 'fotoPerfilA');
const cvDir = path.join(__dirname, 'private', 'cv');
if (!fs.existsSync(fotoPerfilTDir)) fs.mkdirSync(fotoPerfilTDir, { recursive: true });
if (!fs.existsSync(fotoPerfilADir)) fs.mkdirSync(fotoPerfilADir, { recursive: true });
if (!fs.existsSync(cvDir)) fs.mkdirSync(cvDir, { recursive: true });

// ─── Configuración de Multer para tutor maestro ──────────────────────────────
const storageTutorMaestro = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'foto') cb(null, fotoPerfilTDir);
        else if (file.fieldname === 'cv') cb(null, cvDir);
        else cb(new Error('Campo de archivo no reconocido'), null);
    },
    filename: (req, file, cb) => {
        const nocontrol = req.body.nocontrol || 'sin_control';
        const ext = path.extname(file.originalname);
        if (file.fieldname === 'foto') cb(null, `pf${nocontrol}${ext}`);
        else if (file.fieldname === 'cv') cb(null, `cv${nocontrol}.pdf`);
        else cb(new Error('Campo de archivo no reconocido'), null);
    }
});
const uploadTutorMaestro = multer({
    storage: storageTutorMaestro,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'foto' && !file.mimetype.startsWith('image/')) {
            return cb(new Error('La foto debe ser una imagen válida'));
        }
        if (file.fieldname === 'cv' && file.mimetype !== 'application/pdf') {
            return cb(new Error('El CV debe ser un archivo PDF'));
        }
        cb(null, true);
    }
});

const storageTutorAlumno = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'foto') cb(null, fotoPerfilTDir);
        else if (file.fieldname === 'cv') cb(null, cvDir);
        else cb(new Error('Campo de archivo no reconocido'), null);
    },
    filename: (req, file, cb) => {
        const nocontrol = req.body.nocontrol || 'sin_control';
        const ext = path.extname(file.originalname);
        if (file.fieldname === 'foto') cb(null, `pf${nocontrol}${ext}`);
        else if (file.fieldname === 'cv') cb(null, `cv${nocontrol}.pdf`);
        else cb(new Error('Campo de archivo no reconocido'), null);
    }
});
const uploadTutorAlumno = multer({
    storage: storageTutorAlumno,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'foto' && !file.mimetype.startsWith('image/')) return cb(new Error('La foto debe ser una imagen válida'));
        if (file.fieldname === 'cv' && file.mimetype !== 'application/pdf') return cb(new Error('El CV debe ser un archivo PDF'));
        cb(null, true);
    }
});

const storageAsesorado = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'foto') cb(null, fotoPerfilADir);
        else cb(new Error('Campo de archivo no reconocido'), null);
    },
    filename: (req, file, cb) => {
        const nocontrol = req.body.nocontrol || 'sin_control';
        const ext = path.extname(file.originalname);
        if (file.fieldname === 'foto') cb(null, `pf${nocontrol}${ext}`);
        else cb(new Error('Campo de archivo no reconocido'), null);
    }
});
const uploadAsesorado = multer({
    storage: storageAsesorado,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'foto' && !file.mimetype.startsWith('image/')) return cb(new Error('La foto debe ser una imagen válida'));
        cb(null, true);
    }
});

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

    // ── Migración incremental: agregar columnas nuevas si no existen ──────────
    // SQLite no modifica tablas existentes con CREATE TABLE IF NOT EXISTS,
    // por eso debemos hacer ALTER TABLE manualmente al arrancar.
    try {
        await knex.raw(`ALTER TABLE Maestro ADD COLUMN ultimoGrado_estudios TEXT`);
        console.log("✅ Columna ultimoGrado_estudios agregada a Maestro.");
    } catch (err) {
        if (!err.message.includes('duplicate column name')) {
            console.error("❌ Error migrando columna:", err.message);
        }
        // Si ya existe, ignorar el error silenciosamente
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

    // Configurar e insertar datos para Tutorías si la tabla no existe o está vacía (V3__tutorias.sql)
    const sqlTutoriasPath = path.join(__dirname, 'migrations', 'V3__tutorias.sql');
    if (fs.existsSync(sqlTutoriasPath)) {
        try {
            const hasTutoriasTable = await knex.schema.hasTable('Tutorias');
            if (!hasTutoriasTable) {
                const tutoriasContent = fs.readFileSync(sqlTutoriasPath, 'utf8');
                const tutoriasQueries = tutoriasContent.split(';').filter(q => q.trim() !== '');
                for (let q of tutoriasQueries) { await knex.raw(q); }
                console.log("✅ Tabla Tutorias y semilla cargada.");
            } else {
                const [{ total }] = await knex('Tutorias').count('* as total');
                if (total === 0) {
                     const tutoriasContent = fs.readFileSync(sqlTutoriasPath, 'utf8');
                     const tutoriasQueries = tutoriasContent.split(';').filter(q => q.trim() !== '');
                     // Saltarse el CREATE TABLE si ya existe (pero arriba ya se chequea)
                     for (let q of tutoriasQueries) { await knex.raw(q); }
                     console.log("✅ Tabla Tutorias ya existía, pero se insertó semilla.");
                }
            }
        } catch (err) {
            console.error("❌ Error Tutorias:", err.message);
        }
    }
}

setupDatabase();



const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Middleware de Autenticación JWT ─────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    // Excluir de autenticación los endpoints de login y registro
    if (
        req.path.startsWith('/api/login') || 
        req.path.startsWith('/api/register') ||
        req.path.startsWith('/api/alumnos') ||
        req.path.startsWith('/api/maestro') ||
        req.path.startsWith('/api/planes-estudio') ||
        req.path.startsWith('/api/tutorias')
    ) {
        return next();
    }

    const token = req.cookies.token;
    if (!token) {
        // Si no hay token, redirigir a login
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Guardamos los datos del usuario en la petición
        next();
    } catch (err) {
        // Token inválido o expirado
        res.clearCookie('token');
        return res.redirect('/login.html');
    }
};

app.use(express.static(path.join(__dirname, 'public')));

// El middleware protegerá todas las rutas estáticas debajo (es decir, la carpeta private) y otras APIs si las hay.
app.use(authMiddleware);

app.use(express.static(path.join(__dirname, 'private')));

app.post('/api/login', async (req, res) => {
    try {
        const { nocontrol, password, role } = req.body;

        if (!nocontrol || !password || !role) {
            return res.status(400).json({ success: false, message: 'Faltan credenciales o el rol' });
        }

        const claveProcesada = String(password).substring(0, 8);

        let user = await knex('Alumnos')
            .where({ nocontrol: nocontrol, clave: claveProcesada })
            .first();

        let isMaestro = false;

        if (!user) {
            // Intentar buscar en Maestros
            user = await knex('Maestro')
                .where({ nocontrol: nocontrol, clave: claveProcesada })
                .first();
            if (user) isMaestro = true;
        }

        if (user) {
            if (role === 'asesorado') {
                if (isMaestro) {
                    return res.status(403).json({ success: false, message: 'Los maestros no pueden iniciar sesión como asesorados.' });
                }
                const asesorado = await knex('Asesorados')
                    .where({ idalumnos: user.idalumnos })
                    .first();
                if (!asesorado) {
                    return res.status(403).json({ success: false, message: 'El usuario no está registrado como asesorado. Por favor regístrate primero.' });
                }
            } else if (role === 'tutor') {
                let tutor;
                if (isMaestro) {
                    tutor = await knex('Tutores').where({ idmaestro: user.idmaestro }).first();
                } else {
                    tutor = await knex('Tutores').where({ idalumnos: user.idalumnos }).first();
                }

                if (!tutor) {
                    return res.status(403).json({ success: false, message: 'El usuario no está registrado como tutor. Por favor regístrate primero.' });
                }
            }

            const userId = isMaestro ? user.idmaestro : user.idalumnos;

            const token = jwt.sign(
                { id: userId, nocontrol: user.nocontrol, role: role, isMaestro: isMaestro },
                SECRET_KEY,
                { expiresIn: '2h' }
            );

            res.cookie('token', token, { httpOnly: true, secure: false });

            res.json({
                success: true,
                message: 'Login exitoso',
                data: {
                    id: userId,
                    nombre: user.nombre,
                    nocontrol: user.nocontrol,
                    role: role,
                    isMaestro: isMaestro
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

app.get('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login.html');
});

app.post('/api/register/asesorado', uploadAsesorado.single('foto'), async (req, res) => {
    try {
        const { nocontrol, telefono, materia_interes } = req.body;

        if (!nocontrol) {
            return res.status(400).json({ success: false, message: 'Falta el número de control' });
        }

        const alumno = await knex('Alumnos').where({ nocontrol: nocontrol }).first();

        if (!alumno) {
            return res.status(404).json({ success: false, message: 'El número de control no existe en nuestros registros' });
        }

        // Actualizar teléfono si fue proporcionado
        if (telefono) {
            await knex('Alumnos').where({ idalumnos: alumno.idalumnos }).update({ telefono });
        }

        const urlFoto = req.file ? `fotoPerfilA/${req.file.filename}` : null;

        let materiasStr = '';
        try {
            const arr = JSON.parse(materia_interes);
            materiasStr = Array.isArray(arr) ? arr.join(',') : materia_interes;
        } catch {
            materiasStr = materia_interes || '';
        }

        // Verificar si ya está como asesorado
        const asesorado = await knex('Asesorados').where({ idalumnos: alumno.idalumnos }).first();
        if (!asesorado) {
            await knex('Asesorados').insert({
                idalumnos: alumno.idalumnos,
                materias: materiasStr,
                url_foto_perfil: urlFoto
            });
        } else {
            // Si ya existe, lo actualizamos
            const updateData = {};
            if (materiasStr) updateData.materias = materiasStr;
            if (urlFoto) updateData.url_foto_perfil = urlFoto;

            await knex('Asesorados').where({ idalumnos: alumno.idalumnos }).update(updateData);
        }

        res.json({ success: true, message: 'Registro de asesorado exitoso', data: { nocontrol: alumno.nocontrol } });
    } catch (error) {
        console.error("Error en registro de asesorado:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.post('/api/register/tutor', uploadTutorAlumno.fields([{ name: 'foto', maxCount: 1 }, { name: 'cv', maxCount: 1 }]), async (req, res) => {
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

        // Rutas de archivos guardados por multer
        const urlFoto = req.files && req.files['foto'] ? `fotoPerfilT/${req.files['foto'][0].filename}` : null;
        const urlCv = req.files && req.files['cv'] ? `cv/${req.files['cv'][0].filename}` : null;

        // Registrar o actualizar en Tutores
        const tutor = await knex('Tutores').where({ idalumnos: alumno.idalumnos }).first();

        let materiasArr = [];
        try {
            materiasArr = JSON.parse(materias);
        } catch { materiasArr = Array.isArray(materias) ? materias : [materias]; }
        const materiasStr = materiasArr.join(',');

        let tutorId;
        if (tutor) {
            const updateData = { materias: materiasStr };
            if (urlFoto) updateData.url_foto_perfil = urlFoto;
            if (urlCv) updateData.url_cv = urlCv;

            await knex('Tutores')
                .where({ idalumnos: alumno.idalumnos })
                .update(updateData);
            tutorId = tutor.idTutores;
        } else {
            const [newId] = await knex('Tutores').insert({
                idalumnos: alumno.idalumnos,
                materias: materiasStr,
                url_foto_perfil: urlFoto,
                url_cv: urlCv
            });
            tutorId = newId;
        }

        if (tutorId) {
            for (const claveMateria of materiasArr) {
                const materiaRow = await knex('Materias').where({ clave: claveMateria }).first();
                if (materiaRow) {
                    const tutoriaExistente = await knex('Tutorias').where({ idtutor: tutorId, idclases: materiaRow.idclases }).first();
                    if (!tutoriaExistente) {
                        await knex('Tutorias').insert({
                            idtutor: tutorId,
                            idclases: materiaRow.idclases,
                            fecha_hora: new Date().toISOString(),
                            estado: 'Disponible'
                        });
                    }
                }
            }
        }

        res.json({ success: true, message: 'Registro de tutor exitoso' });
    } catch (error) {
        console.error("Error en registro de tutor:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

// ─── GET: Datos de maestro para prefill ──────────────────────────────────────
app.get('/api/maestro/:nocontrol', async (req, res) => {
    try {
        const { nocontrol } = req.params;
        const clave = req.query.clave;
        const maestro = await knex('Maestro')
            .where({ nocontrol: nocontrol })
            .select('nocontrol', 'nombre', 'apellidopat', 'apellidomat', 'correo', 'telefono', 'ultimoGrado_estudios', 'clave')
            .first();

        if (!maestro) {
            return res.status(404).json({ success: false, message: 'Maestro no encontrado en el sistema' });
        }

        if (clave && String(maestro.clave) !== String(clave)) {
            return res.status(401).json({ success: false, message: 'Clave incorrecta' });
        }

        const nombreCompleto = [maestro.apellidopat, maestro.apellidomat, maestro.nombre]
            .filter(Boolean).join(' ');

        res.json({
            success: true,
            data: {
                nocontrol: maestro.nocontrol,
                nombre: nombreCompleto,
                correo: maestro.correo,
                telefono: maestro.telefono,
                gradoEstudio: maestro.ultimoGrado_estudios
            }
        });
    } catch (error) {
        console.error("Error al buscar maestro:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

// ─── POST: Registro de Tutor Maestro ─────────────────────────────────────────
app.post('/api/register/tutor_maestro',
    uploadTutorMaestro.fields([{ name: 'foto', maxCount: 1 }, { name: 'cv', maxCount: 1 }]),
    async (req, res) => {
        try {
            const { nocontrol, telefono, grado_estudio, materias } = req.body;

            if (!nocontrol || !materias || materias.length === 0) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (nocontrol o materias)' });
            }

            // Buscar maestro
            const maestro = await knex('Maestro').where({ nocontrol }).first();
            if (!maestro) {
                return res.status(404).json({ success: false, message: 'El número de control no existe en nuestros registros' });
            }

            // Verificar si ya está registrado como tutor
            const tutorExistente = await knex('Tutores').where({ idmaestro: maestro.idmaestro }).first();
            if (tutorExistente) {
                return res.status(409).json({ success: false, message: 'Este maestro ya está registrado como tutor' });
            }

            // Rutas de archivos guardados por multer
            const urlFoto = req.files && req.files['foto']
                ? `fotoPerfilT/${req.files['foto'][0].filename}`
                : null;
            const urlCv = req.files && req.files['cv']
                ? `cv/${req.files['cv'][0].filename}`
                : null;

            // Parsear materias (viene como JSON string desde el frontend)
            let materiasArr = [];
            try {
                materiasArr = JSON.parse(materias);
            } catch { materiasArr = Array.isArray(materias) ? materias : [materias]; }
            const materiasStr = materiasArr.join(',');

            // Actualizar datos del maestro
            await knex('Maestro').where({ idmaestro: maestro.idmaestro }).update({
                telefono: telefono || maestro.telefono,
                ultimoGrado_estudios: grado_estudio || maestro.ultimoGrado_estudios
            });

            // Insertar en Tutores
            const [tutorId] = await knex('Tutores').insert({
                idmaestro: maestro.idmaestro,
                idalumnos: null,
                materias: materiasStr,
                url_foto_perfil: urlFoto,
                url_cv: urlCv
            });

            if (tutorId) {
                for (const claveMateria of materiasArr) {
                    const materiaRow = await knex('Materias').where({ clave: claveMateria }).first();
                    if (materiaRow) {
                        await knex('Tutorias').insert({
                            idtutor: tutorId,
                            idclases: materiaRow.idclases,
                            tema_especifico: 'Tutoría general',
                            fecha_hora: new Date().toISOString(),
                            estado: 'Disponible'
                        });
                    }
                }
            }

            res.json({ success: true, message: 'Registro de tutor maestro exitoso' });
        } catch (error) {
            console.error("Error en registro de tutor maestro:", error);
            res.status(500).json({ success: false, message: 'Error interno en el servidor' });
        }
    }
);

app.get('/api/alumnos/:nocontrol', async (req, res) => {
    try {
        const { nocontrol } = req.params;
        const clave = req.query.clave;
        const alumno = await knex('Alumnos')
            .leftJoin('Licenciaturas', 'Alumnos.idlicenciaturas', 'Licenciaturas.idlicenciaturas')
            .where({ nocontrol: nocontrol })
            .select('Alumnos.*', 'Licenciaturas.nombre_carrera')
            .first();

        if (alumno) {
            if (clave && String(alumno.clave) !== String(clave)) {
                return res.status(401).json({ success: false, message: 'Clave incorrecta' });
            }
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
            .select('Materias.materia', 'Materias.clave', 'Materias.semestre', 'Licenciaturas.nombre_carrera as carrera');

        const planesEstudio = {};

        materias.forEach(row => {
            // Unify case based on frontend expectations if necessary, 
            // but Licenciaturas table has exact string values we can use.
            const carrera = row.carrera.toLowerCase() === 'arquitectura' ? 'Licenciatura en arquitectura' : row.carrera;

            if (!planesEstudio[carrera]) {
                planesEstudio[carrera] = {};
            }
            if (!planesEstudio[carrera][row.semestre]) {
                planesEstudio[carrera][row.semestre] = [];
            }
            planesEstudio[carrera][row.semestre].push({ nombre: row.materia, clave: row.clave });
        });

        res.json({ success: true, data: planesEstudio });
    } catch (error) {
        console.error("Error al obtener planes de estudio:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.get('/api/tutorias', async (req, res) => {
    try {
        let tutoriasQuery = knex('Tutorias')
            .join('Tutores', 'Tutorias.idtutor', '=', 'Tutores.idTutores')
            .join('Materias', 'Tutorias.idclases', '=', 'Materias.idclases')
            .leftJoin('Maestro', 'Tutores.idmaestro', '=', 'Maestro.idmaestro')
            .leftJoin('Alumnos', 'Tutores.idalumnos', '=', 'Alumnos.idalumnos')
            .select(
                'Tutorias.idtutoria',
                'Materias.materia',
                'Materias.clave',
                'Tutorias.fecha_hora',
                'Tutorias.estado',
                'Tutores.idTutores as id_tutor',
                knex.raw("COALESCE(Maestro.nombre || ' ' || Maestro.apellidopat, Alumnos.nombre || ' ' || Alumnos.apellidopat) as tutor_nombre")
            );

        // Apply filtering if the user is logged in as asesorado
        const token = req.cookies.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                if (decoded.role === 'asesorado') {
                    const alumno = await knex('Alumnos').where({ idalumnos: decoded.id }).first();
                    if (alumno) {
                        tutoriasQuery = tutoriasQuery
                            .where('Materias.idlicenciaturas', alumno.idlicenciaturas)
                            .andWhere('Materias.semestre', alumno.semestre);
                    }
                }
            } catch (err) {}
        }

        const tutorias = await tutoriasQuery;
        res.json({ success: true, data: tutorias });
    } catch (error) {
        console.error("Error al obtener tutorías:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.get('/api/me', async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const isMaestro = req.user.isMaestro;

        let materiasInteresStr = '';
        let materiasSemestre = [];

        if (role === 'asesorado') {
            const asesorado = await knex('Asesorados').where({ idalumnos: userId }).first();
            if (asesorado) {
                materiasInteresStr = asesorado.materias;
            }
        } else if (role === 'tutor') {
            let tutor;
            if (isMaestro) {
                tutor = await knex('Tutores').where({ idmaestro: userId }).first();
            } else {
                tutor = await knex('Tutores').where({ idalumnos: userId }).first();
            }
            if (tutor) {
                materiasInteresStr = tutor.materias;
            }
        }

        if (!isMaestro) {
            const alumno = await knex('Alumnos').where({ idalumnos: userId }).first();
            if (alumno && alumno.idlicenciaturas && alumno.semestre) {
                const materias = await knex('Materias')
                    .where({ idlicenciaturas: alumno.idlicenciaturas, semestre: alumno.semestre })
                    .select('materia');
                materiasSemestre = materias.map(m => m.materia);
            }
        }

        let userInfo = {};
        if (isMaestro) {
            const maestroInfo = await knex('Maestro').where({ idmaestro: userId }).first();
            if (maestroInfo) {
                userInfo = { nombre: `${maestroInfo.nombre} ${maestroInfo.apellidopat}`, nocontrol: maestroInfo.nocontrol, correo: maestroInfo.correo };
            }
        } else {
            const alumnoInfo = await knex('Alumnos').where({ idalumnos: userId }).first();
            if (alumnoInfo) {
                userInfo = { nombre: `${alumnoInfo.nombre} ${alumnoInfo.apellidopat}`, nocontrol: alumnoInfo.nocontrol, correo: alumnoInfo.correo };
            }
        }

        res.json({
            success: true,
            data: {
                user: { ...userInfo, role, isMaestro },
                materias_interes: materiasInteresStr ? materiasInteresStr.split(',') : [],
                materias_semestre: materiasSemestre
            }
        });
    } catch (error) {
        console.error("Error al obtener perfil:", error);
        res.status(500).json({ success: false, message: 'Error interno en el servidor' });
    }
});

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado exitosamente en http://localhost:${PORT}`);
});
