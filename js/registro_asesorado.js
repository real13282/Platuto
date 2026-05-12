let planesEstudio = {};

document.addEventListener('DOMContentLoaded', async () => {
    const carreraSelect = document.getElementById('carrera');
    const semestreSelect = document.getElementById('semestre');
    const materiaSelect = document.getElementById('materia_interes');
    const asesoradoForm = document.getElementById('asesoradoForm');

    // Make sure we are on the asesorado registration page
    if (!asesoradoForm || !carreraSelect || !semestreSelect || !materiaSelect) return;

    // Load planes de estudio
    try {
        const res = await fetch('/api/planes-estudio');
        const result = await res.json();
        if (!result.success) throw new Error('Error al obtener planes de estudio');
        planesEstudio = result.data;
    } catch (err) {
        console.error('Error cargando planes de estudio:', err);
        materiaSelect.innerHTML = '<option value="" disabled selected>Error al cargar materias</option>';
        return;
    }

    // Populate carreras
    const carreras = Object.keys(planesEstudio).sort();
    carreras.forEach(carrera => {
        const option = document.createElement('option');
        option.value = carrera;
        option.textContent = carrera;
        carreraSelect.appendChild(option);
    });

    let alumnoSemestre = null;
    let alumnoCarrera = null;

    // Prefill data
    const urlParams = new URLSearchParams(window.location.search);
    const nocontrol = urlParams.get('nocontrol');

    if (nocontrol) {
        try {
            const res = await fetch('/api/alumnos/' + encodeURIComponent(nocontrol));
            const result = await res.json();

            if (result.success && result.data) {
                const alumno = result.data;
                document.getElementById('nocontrol').value = alumno.nocontrol || nocontrol;
                document.getElementById('nombre').value = `${alumno.nombre} ${alumno.apellidopat} ${alumno.apellidomat || ''}`.trim();
                if (alumno.correo) document.getElementById('correo').value = alumno.correo;
                if (alumno.telefono) document.getElementById('telefono').value = alumno.telefono;

                alumnoSemestre = parseInt(alumno.semestre);
                alumnoCarrera = alumno.nombre_carrera;

                if (alumnoCarrera) {
                    Array.from(carreraSelect.options).forEach(opt => {
                        if (opt.value.toLowerCase() === alumnoCarrera.toLowerCase()) {
                            opt.selected = true;
                        }
                    });

                    // Populate semestres for this carrera
                    const semestresObj = planesEstudio[carreraSelect.value];
                    if (semestresObj) {
                        const numSemestres = Object.keys(semestresObj).length;
                        semestreSelect.innerHTML = '<option value="" disabled selected>Selecciona tu semestre...</option>';
                        for (let i = 1; i <= numSemestres; i++) {
                            const option = document.createElement('option');
                            option.value = i;
                            option.textContent = `${i}° Semestre`;
                            semestreSelect.appendChild(option);
                        }

                        // Select the student's semester
                        if (alumnoSemestre) {
                            Array.from(semestreSelect.options).forEach(opt => {
                                if (opt.value == alumnoSemestre) {
                                    opt.selected = true;
                                }
                            });
                            populateMaterias();
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error prefilling form:", err);
        }
    }

    function populateMaterias() {
        const carrera = carreraSelect.value;
        const semestresObj = planesEstudio[carrera];
        
        materiaSelect.innerHTML = '<option value="" disabled selected>Selecciona una materia...</option>';
        
        if (!semestresObj) return;

        let seenSubjects = new Set();
        
        // Show subjects up to their current semester
        const maxSemester = alumnoSemestre ? alumnoSemestre : parseInt(semestreSelect.value);

        for (let i = 1; i <= maxSemester; i++) {
            if (semestresObj[i]) {
                // To group them visually in the select box
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${i}° Semestre`;
                let added = false;

                const materiasDeSemestre = semestresObj[i].filter(m => {
                    if (seenSubjects.has(m)) return false;
                    seenSubjects.add(m);
                    return true;
                }).sort();

                materiasDeSemestre.forEach(materia => {
                    const option = document.createElement('option');
                    option.value = materia;
                    option.textContent = materia;
                    optgroup.appendChild(option);
                    added = true;
                });

                if (added) {
                    materiaSelect.appendChild(optgroup);
                }
            }
        }
    }

    asesoradoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nocontrolValue = document.getElementById('nocontrol').value;
        if (!nocontrolValue) {
            alert("No hay un número de control válido. Verifica tu acceso.");
            return;
        }

        const telefono = document.getElementById('telefono').value;
        if (!/^\d{10}$/.test(telefono)) {
            alert('El número de teléfono debe contener exactamente 10 dígitos numéricos.');
            return;
        }
        
        const materiaSeleccionada = materiaSelect.value;
        if (!materiaSeleccionada) {
            alert("Por favor, selecciona una materia de interés.");
            return;
        }

        const formData = new FormData();
        formData.append('nocontrol', nocontrolValue);
        formData.append('telefono', telefono);
        formData.append('materia_interes', materiaSeleccionada);
        // Note: the backend `/api/register/asesorado` only receives JSON with nocontrol currently.
        // We will send it as JSON so it matches the backend or FormData if the backend uses multer.
        // Wait, the backend uses `app.use(express.json());` and no multer for asesorado.
        // But the form has a `foto` input which is a file!
        // We will send JSON for now since the backend does not use multer for asesorado.
        
        // Actually, let's send JSON:
        const data = {
            nocontrol: nocontrolValue,
            telefono: telefono,
            materia_interes: materiaSeleccionada
        };

        try {
            const response = await fetch('/api/register/asesorado', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('¡Registro de asesorado completado exitosamente! Serás redirigido para iniciar sesión.');
                window.location.href = 'login.html';
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al registrar asesorado:', error);
            alert('Ocurrió un error al conectar con el servidor.');
        }
    });
});
