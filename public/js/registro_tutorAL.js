// planesEstudio se carga dinámicamente desde la base de datos vía /api/planes-estudio
let planesEstudio = {};
let materiasSeleccionadas = new Map();

document.addEventListener('DOMContentLoaded', async () => {
    const carreraSelect = document.getElementById('carrera');
    const semestreSelect = document.getElementById('semestre');
    const materiasContainer = document.getElementById('materiasContainer');
    const tutorForm = document.getElementById('tutorForm');

    // ── 1. Cargar planes de estudio desde la base de datos ──────────────────
    try {
        if (carreraSelect) {
            carreraSelect.disabled = true;
            carreraSelect.innerHTML = '<option value="" disabled selected>Cargando carreras...</option>';
        }

        const res = await fetch('/api/planes-estudio');
        const result = await res.json();

        if (!result.success) throw new Error(result.message || 'Error al obtener planes de estudio');

        planesEstudio = result.data;
    } catch (err) {
        console.error('Error cargando planes de estudio:', err);
        if (carreraSelect) {
            carreraSelect.innerHTML = '<option value="" disabled selected>Error al cargar carreras</option>';
        }
        return; // Detener ejecución si no se pudo cargar
    }

    if (!carreraSelect || !semestreSelect || !materiasContainer || !tutorForm) {
        // No estamos en la página de registroAl_tutor.html, salimos para no crashear
        return;
    }

    // ── 2. Popular el select de carreras ────────────────────────────────────
    carreraSelect.innerHTML = '<option value="" disabled selected>Selecciona tu carrera...</option>';
    const carreras = Object.keys(planesEstudio).sort();
    carreras.forEach(carrera => {
        const option = document.createElement('option');
        option.value = carrera;
        option.textContent = carrera;
        carreraSelect.appendChild(option);
    });
    carreraSelect.disabled = false;

    // ── 3. Pre-rellenar datos si viene nocontrol en la URL ──────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const nocontrol = urlParams.get('nocontrol');
    const clave = urlParams.get('clave');
    let alumnoSemestre = null; // semestre real del alumno (se usará para limitar materias)

    if (nocontrol) {
        fetch('/api/alumnos/' + encodeURIComponent(nocontrol) + (clave ? '?clave=' + encodeURIComponent(clave) : ''))
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data) {
                    const alumno = result.data;
                    document.getElementById('nocontrol').value = alumno.nocontrol || nocontrol;
                    document.getElementById('nombre').value = `${alumno.nombre} ${alumno.apellidopat} ${alumno.apellidomat || ''}`.trim();
                    if (alumno.correo) document.getElementById('correo').value = alumno.correo;
                    if (alumno.telefono) document.getElementById('telefono').value = alumno.telefono;

                    // ── Regla de negocio: 1er semestre no puede ser tutor ────
                    if (parseInt(alumno.semestre) === 1) {
                        document.getElementById('tutorForm').style.display = 'none';
                        document.getElementById('alertaSemestre1').style.display = 'block';
                        return; // No continuar con el pre-relleno
                    }

                    // Guardar semestre real para limitar materias
                    alumnoSemestre = parseInt(alumno.semestre);

                    // Match carrera
                    if (alumno.nombre_carrera) {
                        Array.from(carreraSelect.options).forEach(opt => {
                            if (opt.value.toLowerCase() === alumno.nombre_carrera.toLowerCase()) {
                                opt.selected = true;
                            }
                        });
                        // Trigger change to populate semesters
                        carreraSelect.dispatchEvent(new Event('change'));

                        // Wait for semesters to be populated then select and lock the current semester
                        setTimeout(() => {
                            if (alumno.semestre) {
                                Array.from(semestreSelect.options).forEach(opt => {
                                    if (opt.value == alumno.semestre) {
                                        opt.selected = true;
                                    }
                                });
                                // Trigger change to populate materias (solo semestres anteriores)
                                semestreSelect.dispatchEvent(new Event('change'));
                            }
                        }, 100);
                    }
                }
            })
            .catch(err => console.error("Error prefilling form:", err));
    }

    // ── 4. Cuando cambia la Carrera ─────────────────────────────────────────
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

    // ── 5. Cuando cambia el Semestre ────────────────────────────────────────
    semestreSelect.addEventListener('change', () => {
        const carrera = carreraSelect.value;
        const selectedSemestre = parseInt(semestreSelect.value);
        const semestresObj = planesEstudio[carrera];

        // Populate Materias grouped by semester
        materiasContainer.innerHTML = ''; // clear options
        let hasMaterias = false;
        let seenSubjects = new Set();

        // ── Regla de negocio: solo mostrar semestres ANTERIORES al actual ───
        // El alumno no puede dar tutorías de las materias que está cursando ahora.
        const semestreMax = (alumnoSemestre !== null)
            ? alumnoSemestre - 1  // hasta el semestre previo al que cursa
            : selectedSemestre;   // fallback si no hay alumno prefijado

        for (let i = 1; i <= semestreMax; i++) {
            if (semestresObj[i] && semestresObj[i].length > 0) {
                // Filter out already seen subjects to prevent duplicates across semesters
                const materiasDeSemestre = semestresObj[i].filter(m => {
                    if (seenSubjects.has(m.clave)) return false;
                    seenSubjects.add(m.clave);
                    return true;
                }).sort((a, b) => a.nombre.localeCompare(b.nombre));

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

                materiasDeSemestre.forEach((materiaObj, index) => {
                    const li = document.createElement('li');
                    li.className = 'custom-control custom-checkbox mb-2';

                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.className = 'custom-control-input subject-checkbox';
                    input.id = `materia_${i}_${index}`;
                    input.value = materiaObj.clave;
                    input.name = 'materias';
                    input.checked = materiasSeleccionadas.has(materiaObj.clave);

                    input.addEventListener('change', function(e) {
                        if (this.checked) {
                            materiasSeleccionadas.set(materiaObj.clave, materiaObj.nombre);
                        } else {
                            materiasSeleccionadas.delete(materiaObj.clave);
                        }
                        renderSelectedMaterias();
                    });

                    const label = document.createElement('label');
                    label.className = 'custom-control-label text-dark';
                    label.htmlFor = `materia_${i}_${index}`;
                    label.textContent = materiaObj.nombre;

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

    function renderSelectedMaterias() {
        const container = document.getElementById('materiasSeleccionadasContainer');
        if (!container) return;

        container.innerHTML = '';

        if (materiasSeleccionadas.size === 0) {
            container.innerHTML = '<p class="text-muted w-100 text-center mt-3" id="noMateriasMsg">Aún no has seleccionado materias.</p>';
            return;
        }

        materiasSeleccionadas.forEach((nombre, clave) => {
            const tag = document.createElement('span');
            tag.className = 'badge d-flex align-items-center p-2 text-white';
            tag.style.backgroundColor = '#008B8B';
            tag.style.fontSize = '0.9rem';
            tag.style.borderRadius = '0.5rem';

            const text = document.createElement('span');
            text.textContent = nombre;
            text.className = 'mr-2';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'close text-white ml-2';
            btn.innerHTML = '&times;';
            btn.style.fontSize = '1.2rem';
            btn.style.lineHeight = '0.5';
            btn.style.outline = 'none';

            btn.onclick = () => {
                materiasSeleccionadas.delete(clave);
                renderSelectedMaterias();

                // Desmarcar checkbox si existe en el DOM
                const checkboxes = document.querySelectorAll('.subject-checkbox');
                checkboxes.forEach(cb => {
                    if (cb.value === clave) cb.checked = false;
                });
            };

            tag.appendChild(text);
            tag.appendChild(btn);
            container.appendChild(tag);
        });
    }

    // ── 6. Envío del formulario ─────────────────────────────────────────────
    tutorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic check if materias are selected
        if (materiasSeleccionadas.size === 0) {
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
        formData.append('nocontrol', nocontrol);
        if (clave) formData.append('clave', clave);
        formData.append('nombre', document.getElementById('nombre').value);
        formData.append('correo', document.getElementById('correo').value);
        formData.append('telefono', document.getElementById('telefono').value);
        formData.append('carrera', document.getElementById('carrera').value);
        formData.append('semestre', document.getElementById('semestre').value);
        formData.append('materias', JSON.stringify(Array.from(materiasSeleccionadas.keys())));

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
