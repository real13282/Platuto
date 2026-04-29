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
        }
    } catch (err) {
        console.error("Error al conectar con la API de planes de estudio:", err);
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
                    document.getElementById('nocontrol').value = alumno.nocontrol || nocontrol;
                    document.getElementById('nombre').value = `${alumno.nombre} ${alumno.apellidopat} ${alumno.apellidomat || ''}`.trim();
                    if (alumno.correo) document.getElementById('correo').value = alumno.correo;
                    if (alumno.telefono) document.getElementById('telefono').value = alumno.telefono;

                    // Match carrera
                    if (alumno.nombre_carrera) {
                        // DB normalization for 'Arquitectura' if needed, but API should have handled it
                        let targetCarrera = alumno.nombre_carrera;
                        if (targetCarrera.toLowerCase() === 'arquitectura') {
                            targetCarrera = 'Licenciatura en arquitectura';
                        }

                        Array.from(carreraSelect.options).forEach(opt => {
                            if (opt.value.toLowerCase() === targetCarrera.toLowerCase()) {
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
        if (!semestresObj) return;

        const semestresKeys = Object.keys(semestresObj).map(Number).sort((a, b) => a - b);
        const maxSemestre = semestresKeys.length > 0 ? Math.max(...semestresKeys) : 0;

        // Reset and populate Semestres
        semestreSelect.innerHTML = '<option value="" disabled selected>Selecciona tu semestre...</option>';
        // Using what's available in the object instead of assuming continuous 1..N
        semestresKeys.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = `${s}° Semestre`;
            semestreSelect.appendChild(option);
        });
        semestreSelect.disabled = false;

        // Reset Materias
        materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona tu semestre para ver materias disponibles...</p>';
    });

    // When Semestre changes
    semestreSelect.addEventListener('change', () => {
        const carrera = carreraSelect.value;
        const selectedSemestre = parseInt(semestreSelect.value);
        const semestresObj = planesEstudio[carrera];

        // Populate Materias grouped by semester
        materiasContainer.innerHTML = ''; // clear options
        let hasMaterias = false;
        let seenSubjects = new Set();

        const semestresKeys = Object.keys(semestresObj).map(Number).sort((a, b) => a - b);

        for (let i of semestresKeys) {
            if (i > selectedSemestre) break;

            if (semestresObj[i] && semestresObj[i].length > 0) {
                // Filter out already seen subjects to prevent duplicates across semesters
                const materiasDeSemestre = semestresObj[i].filter(m => {
                    if (seenSubjects.has(m)) return false;
                    seenSubjects.add(m);
                    return true;
                }).sort();

                if (materiasDeSemestre.length === 0) continue;
                
                hasMaterias = true;

                const semesterWrapper = document.createElement('div');
                semesterWrapper.className = 'mb-3';

                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'btn btn-light btn-block text-left font-weight-bold d-flex justify-content-between align-items-center shadow-sm';
                toggleBtn.style.backgroundColor = '#eaecf4';
                toggleBtn.style.color = '#5a5c69';
                toggleBtn.style.borderRadius = '0.5rem';
                
                const titleSpan = document.createElement('span');
                titleSpan.textContent = `${i}° Semestre`;
                
                // Expand only the currently selected semester to avoid overwhelming the user
                const isCurrent = (i === selectedSemestre);
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-chevron-down';
                icon.style.transition = 'transform 0.3s ease';
                icon.style.transform = isCurrent ? 'rotate(180deg)' : 'rotate(0deg)';
                
                toggleBtn.appendChild(titleSpan);
                toggleBtn.appendChild(icon);

                const ul = document.createElement('ul');
                ul.className = 'list-unstyled mt-2 pl-3 py-2';
                ul.style.display = isCurrent ? 'block' : 'none';
                ul.style.borderLeft = '3px solid #008B8B';

                toggleBtn.addEventListener('click', () => {
                    const isHidden = ul.style.display === 'none';
                    ul.style.display = isHidden ? 'block' : 'none';
                    icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                });

                materiasDeSemestre.forEach((materia, index) => {
                    const li = document.createElement('li');
                    li.className = 'custom-control custom-checkbox mb-2';

                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.className = 'custom-control-input subject-checkbox';
                    input.id = `materia_${i}_${index}`;
                    input.value = materia;
                    input.name = 'materias';

                    const label = document.createElement('label');
                    label.className = 'custom-control-label text-dark';
                    label.htmlFor = `materia_${i}_${index}`;
                    label.textContent = materia;

                    li.appendChild(input);
                    li.appendChild(label);
                    ul.appendChild(li);
                });

                semesterWrapper.appendChild(toggleBtn);
                semesterWrapper.appendChild(ul);
                materiasContainer.appendChild(semesterWrapper);
            }
        }

        if (!hasMaterias) {
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

        // Telephone Validation
        const telefono = document.getElementById('telefono').value;
        if (!/^\d{10}$/.test(telefono)) {
            alert('El número de teléfono debe contener exactamente 10 dígitos numéricos.');
            return;
        }

        // CV Validation
        const cvInput = document.getElementById('cv');
        const cvFile = cvInput.files[0];
        if (cvFile) {
            if (cvFile.type !== 'application/pdf') {
                alert('El archivo del CV debe ser en formato PDF.');
                return;
            }
            if (cvFile.size > 10 * 1024 * 1024) { // 10MB
                alert('El archivo del CV no debe exceder los 10 MB.');
                return;
            }
        }

        const formData = new FormData();
        const nocontrolVal = document.getElementById('nocontrol').value;
        formData.append('nocontrol', nocontrolVal);
        formData.append('nombre', document.getElementById('nombre').value);
        formData.append('correo', document.getElementById('correo').value);
        formData.append('telefono', document.getElementById('telefono').value);
        formData.append('carrera', document.getElementById('carrera').value);
        formData.append('semestre', document.getElementById('semestre').value);
        formData.append('materias', JSON.stringify(Array.from(selectedCheckboxes).map(cb => cb.value)));

        if (document.getElementById('foto').files[0]) {
            formData.append('foto', document.getElementById('foto').files[0]);
        }
        if (cvFile) {
            formData.append('cv', cvFile);
        }

        try {
            const response = await fetch('/api/register/tutor', {
                method: 'POST',
                body: formData
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
