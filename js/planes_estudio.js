let planesEstudio = {};

document.addEventListener('DOMContentLoaded', async () => {
    const carreraSelect = document.getElementById('carrera');
    const semestreSelect = document.getElementById('semestre');
    const materiasContainer = document.getElementById('materiasContainer');
    const tutorForm = document.getElementById('tutorForm');

    try {
        const response = await fetch('/api/planes-estudio');
        const result = await response.json();
        if (result.success) {
            planesEstudio = result.data;
        } else {
            console.error("Error al cargar planes de estudio:", result.message);
            return;
        }
    } catch (err) {
        console.error("Error al obtener planes de estudio del servidor:", err);
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

    // Check for nocontrol in URL and prefill data
    const urlParams = new URLSearchParams(window.location.search);
    const nocontrol = urlParams.get('nocontrol');
    if (nocontrol) {
        fetch('/api/alumnos/' + encodeURIComponent(nocontrol))
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data) {
                    const alumno = result.data;
                    document.getElementById('nombre').value = `${alumno.nombre} ${alumno.apellidopat} ${alumno.apellidomat || ''}`.trim();
                    if (alumno.correo) document.getElementById('correo').value = alumno.correo;
                    if (alumno.telefono) document.getElementById('telefono').value = alumno.telefono;

                    // Match carrera
                    if (alumno.nombre_carrera) {
                        Array.from(carreraSelect.options).forEach(opt => {
                            // Simple match since db might have different case
                            if (opt.value.toLowerCase() === alumno.nombre_carrera.toLowerCase()) {
                                opt.selected = true;
                            }
                        });
                        // Trigger change to populate semesters
                        carreraSelect.dispatchEvent(new Event('change'));

                        // Wait for semesters to be populated
                        setTimeout(() => {
                            if (alumno.semestre) {
                                Array.from(semestreSelect.options).forEach(opt => {
                                    if (opt.value == alumno.semestre) {
                                        opt.selected = true;
                                    }
                                });
                                // Trigger change to populate materias
                                semestreSelect.dispatchEvent(new Event('change'));
                            }
                        }, 100);
                    }
                }
            })
            .catch(err => console.error("Error prefilling form:", err));
    }

    // When Carrera changes
    carreraSelect.addEventListener('change', () => {
        const carrera = carreraSelect.value;
        const semestresObj = planesEstudio[carrera];
        const numSemestres = Object.keys(semestresObj).length;

        // Reset and populate Semestres
        semestreSelect.innerHTML = '<option value="" disabled selected>Selecciona tu semestre...</option>';
        for (let i = 1; i <= numSemestres; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}° Semestre`;
            semestreSelect.appendChild(option);
        }
        semestreSelect.disabled = false;

        // Reset Materias
        materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona tu semestre para ver materias disponibles...</p>';
    });

    // When Semestre changes
    semestreSelect.addEventListener('change', () => {
        const carrera = carreraSelect.value;
        const selectedSemestre = parseInt(semestreSelect.value);
        const semestresObj = planesEstudio[carrera];

        // Gather all subjects up to the selected semester
        let availableSubjects = [];
        for (let i = 1; i <= selectedSemestre; i++) {
            if (semestresObj[i]) {
                // Add unique subjects to the array (removing potential duplicates from specializations)
                semestresObj[i].forEach(materia => {
                    if (!availableSubjects.includes(materia)) {
                        availableSubjects.push(materia);
                    }
                });
            }
        }

        // Sort alphabetically
        availableSubjects.sort();

        // Populate Materias
        materiasContainer.innerHTML = ''; // clear options
        if (availableSubjects.length > 0) {
            availableSubjects.forEach((materia, index) => {
                const div = document.createElement('div');
                div.className = 'custom-control custom-checkbox mb-2';
                
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'custom-control-input subject-checkbox';
                input.id = `materia_${index}`;
                input.value = materia;
                input.name = 'materias';
                
                const label = document.createElement('label');
                label.className = 'custom-control-label text-dark';
                label.htmlFor = `materia_${index}`;
                label.textContent = materia;
                
                div.appendChild(input);
                div.appendChild(label);
                materiasContainer.appendChild(div);
            });
        } else {
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">No hay materias disponibles para este semestre.</p>';
        }
    });

    // Handle Form Submission
    tutorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Basic check if materias are selected
        const selectedCheckboxes = document.querySelectorAll('.subject-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Por favor, selecciona al menos una materia para impartir tutoría.');
            return;
        }

        const materias = Array.from(selectedCheckboxes).map(cb => cb.value);
        const urlParams = new URLSearchParams(window.location.search);
        const nocontrol = urlParams.get('nocontrol');

        if (!nocontrol) {
            alert('Error: No se proporcionó el número de control.');
            return;
        }

        const nombre = document.getElementById('nombre').value;
        const correo = document.getElementById('correo').value;
        const telefono = document.getElementById('telefono').value;
        const carrera = document.getElementById('carrera').value;
        const semestre = document.getElementById('semestre').value;

        try {
            const response = await fetch('/api/register/tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nocontrol,
                    nombre,
                    correo,
                    telefono,
                    carrera,
                    semestre,
                    materias
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('¡Registro de tutor completado exitosamente! Serás redirigido para iniciar sesión.');
                window.location.href = 'login.html';
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al registrar tutor:', error);
            alert('Ocurrió un error al conectar con el servidor.');
        }
    });
});
