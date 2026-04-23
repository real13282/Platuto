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

// Servir archivos estáticos del directorio actual
app.use(express.static(path.join(__dirname, '')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado exitosamente en http://localhost:${PORT}`);
});
