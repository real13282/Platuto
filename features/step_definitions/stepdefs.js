const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const path = require('path');

const knex = require('knex')({
    client: 'sqlite3',
    connection: { filename: path.join(__dirname, '..', '..', 'dev.sqlite3') },
    useNullAsDefault: true
});

let testState = {
    responseBody: null,
    statusCode: null
};

Given('que el servidor está en ejecución', function () {
    // el servidor ya está ejecutándose localmente en el puerto 3000
});

Given('los usuarios de prueba están registrados en sus respectivos roles', async function () {
    // el alumno 12345678 y el maestro 99999999 estén dados de alta en Tutores/Asesorados

    const alumno = await knex('Alumnos').where({ nocontrol: '12345678' }).first();
    if (alumno) {
        const as = await knex('Asesorados').where({ idalumnos: alumno.idalumnos }).first();
        if (!as) await knex('Asesorados').insert({ idalumnos: alumno.idalumnos, url_foto_perfil: 'test', materias: 'test' });

        const tut = await knex('Tutores').where({ idalumnos: alumno.idalumnos }).first();
        if (!tut) await knex('Tutores').insert({ idalumnos: alumno.idalumnos, materias: 'test' });
    }

    const maestro = await knex('Maestro').where({ nocontrol: '99999999' }).first();
    if (maestro) {
        const tutM = await knex('Tutores').where({ idmaestro: maestro.idmaestro }).first();
        if (!tutM) await knex('Tutores').insert({ idmaestro: maestro.idmaestro, materias: 'test' });
    }
});

When('el usuario con número de control {string} intenta iniciar sesión como {string} con la clave {string}', async function (nocontrol, rol, clave) {
    const response = await fetch('http://127.0.0.1:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nocontrol, password: clave, role: rol })
    });

    testState.statusCode = response.status;
    testState.responseBody = await response.json();
});

Then('la respuesta debe ser exitosa: {word}', function (exitoStr) {
    const exitoEsperado = exitoStr === 'true';
    assert.strictEqual(testState.responseBody.success, exitoEsperado);
});

Then('debe ver el mensaje {string}', function (mensajeEsperado) {
    assert.strictEqual(testState.responseBody.message, mensajeEsperado);
});