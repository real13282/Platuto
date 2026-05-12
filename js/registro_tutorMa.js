document.addEventListener('DOMContentLoaded', async () => {
    const carreraSelect = document.getElementById('carreraSelect');
    const semestresContainer = document.getElementById('semestresContainer');
    const materiasContainer = document.getElementById('materiasContainer');
    const materiasSeleccionadasContainer = document.getElementById('materiasSeleccionadasContainer');
    const noMateriasMsg = document.getElementById('noMateriasMsg');
    const tutorForm = document.getElementById('tutorForm');

    // Make sure we are on the maestro tutor page
    if (!carreraSelect || !semestresContainer || !materiasContainer) return;

    let planesEstudioLocal = {};
    try {
        const res = await fetch('/api/planes-estudio');
        const result = await res.json();
        if (result.success) {
            planesEstudioLocal = result.data;
        } else {
            console.error('Error fetching planesEstudio');
            return;
        }
    } catch (err) {
        console.error(err);
        return;
    }

    // Populate Carreras
    const carreras = Object.keys(planesEstudioLocal).sort();
    carreras.forEach((carrera) => {
        const option = document.createElement('option');
        option.value = carrera;
        option.textContent = carrera;
        carreraSelect.appendChild(option);
    });

    // Prefill de datos del maestro desde la URL y el API
    const urlParams = new URLSearchParams(window.location.search);
    const nocontrol = urlParams.get('nocontrol');
    if (nocontrol) {
        document.getElementById('nocontrol').value = nocontrol;
        try {
            const resp = await fetch(`/api/maestro/${encodeURIComponent(nocontrol)}`);
            const result = await resp.json();
            if (result.success && result.data) {
                const d = result.data;
                document.getElementById('nombre').value  = d.nombre      || '';
                document.getElementById('correo').value  = d.correo      || '';
                document.getElementById('telefono').value = d.telefono   || '';
                document.getElementById('gradoEstudio').value = d.gradoEstudio || '';
            } else {
                alert('Maestro no encontrado. Verifica tu número de control.');
                window.location.href = 'index.html';
            }
        } catch (err) {
            console.error('Error al obtener datos del maestro:', err);
        }
    }

    // Handle Carrera selection change to populate Semestres
    carreraSelect.addEventListener('change', updateSemestres);

    function updateSemestres() {
        const selectedCarrera = carreraSelect.value;
        
        if (!selectedCarrera) {
            semestresContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona al menos una licenciatura...</p>';
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona licenciaturas y semestres para ver materias disponibles...</p>';
            return;
        }

        const maxSemestres = Object.keys(planesEstudioLocal[selectedCarrera]).length;

        // Remember previously selected semestres
        const previouslySelected = Array.from(document.querySelectorAll('.semestre-checkbox:checked')).map(cb => cb.value);

        semestresContainer.innerHTML = '';
        for (let i = 1; i <= maxSemestres; i++) {
            const div = document.createElement('div');
            div.className = 'custom-control custom-checkbox mb-2';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'custom-control-input semestre-checkbox';
            input.id = `semestre_${i}`;
            input.value = i;
            if (previouslySelected.includes(i.toString())) {
                input.checked = true;
            }

            const label = document.createElement('label');
            label.className = 'custom-control-label text-dark';
            label.htmlFor = `semestre_${i}`;
            label.textContent = `${i}° Semestre`;

            div.appendChild(input);
            div.appendChild(label);
            semestresContainer.appendChild(div);
        }

        updateMaterias();
        
        // Add event listeners to new checkboxes
        document.querySelectorAll('.semestre-checkbox').forEach(cb => {
            cb.addEventListener('change', updateMaterias);
        });
    }

    function updateMaterias() {
        const selectedCarrera = carreraSelect.value;
        const selectedSemestres = Array.from(document.querySelectorAll('.semestre-checkbox:checked')).map(cb => cb.value);

        if (!selectedCarrera || selectedSemestres.length === 0) {
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona licenciaturas y semestres para ver materias disponibles...</p>';
            return;
        }

        let availableSubjects = new Set();
        selectedSemestres.forEach(semestre => {
            if (planesEstudioLocal[selectedCarrera][semestre]) {
                planesEstudioLocal[selectedCarrera][semestre].forEach(materia => {
                    availableSubjects.add(`${materia} (${selectedCarrera})`);
                });
            }
        });

        const sortedSubjects = Array.from(availableSubjects).sort();
        
        // Preserve selected materias
        const currentlySelectedMaterias = Array.from(document.querySelectorAll('.subject-checkbox:checked')).map(cb => cb.value);

        materiasContainer.innerHTML = '';
        if (sortedSubjects.length > 0) {
            sortedSubjects.forEach((materia, index) => {
                const div = document.createElement('div');
                div.className = 'custom-control custom-checkbox mb-2';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'custom-control-input subject-checkbox';
                input.id = `materia_${index}`;
                input.value = materia;
                if (currentlySelectedMaterias.includes(materia)) {
                    input.checked = true;
                }

                input.addEventListener('change', renderMateriasSeleccionadas);

                const label = document.createElement('label');
                label.className = 'custom-control-label text-dark';
                label.htmlFor = `materia_${index}`;
                label.textContent = materia;

                div.appendChild(input);
                div.appendChild(label);
                materiasContainer.appendChild(div);
            });
        } else {
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">No hay materias disponibles para estas selecciones.</p>';
        }
        renderMateriasSeleccionadas();
    }
    
    function renderMateriasSeleccionadas() {
        if (!materiasSeleccionadasContainer) return;
        const selectedMaterias = Array.from(document.querySelectorAll('.subject-checkbox:checked')).map(cb => cb.value);
        materiasSeleccionadasContainer.innerHTML = '';
        if (selectedMaterias.length > 0) {
            selectedMaterias.forEach(mat => {
                const badge = document.createElement('span');
                badge.className = 'badge badge-primary p-2 mr-1 mb-1';
                badge.textContent = mat;
                materiasSeleccionadasContainer.appendChild(badge);
            });
        } else {
            materiasSeleccionadasContainer.innerHTML = '<p class="text-muted w-100 text-center mt-3" id="noMateriasMsg">Aún no has seleccionado materias.</p>';
        }
    }

    // Handle Form Submission
    tutorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedCarrera = carreraSelect.value;
        if (!selectedCarrera) {
            alert('Por favor, selecciona al menos una licenciatura.');
            return;
        }

        const selectedSemestres = Array.from(document.querySelectorAll('.semestre-checkbox:checked'));
        if (selectedSemestres.length === 0) {
            alert('Por favor, selecciona al menos un semestre.');
            return;
        }

        const selectedMaterias = document.querySelectorAll('.subject-checkbox:checked');
        if (selectedMaterias.length === 0) {
            alert('Por favor, selecciona al menos una materia para impartir tutoría.');
            return;
        }

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
        formData.append('nocontrol', document.getElementById('nocontrol').value);
        formData.append('nombre', document.getElementById('nombre').value);
        formData.append('correo', document.getElementById('correo').value);
        formData.append('telefono', document.getElementById('telefono').value);
        formData.append('grado_estudio', document.getElementById('gradoEstudio').value);
        
        formData.append('carreras', JSON.stringify([selectedCarrera]));
        formData.append('semestres', JSON.stringify(selectedSemestres.map(cb => cb.value)));
        formData.append('materias', JSON.stringify(Array.from(selectedMaterias).map(cb => cb.value)));

        if (document.getElementById('foto').files[0]) {
            formData.append('foto', document.getElementById('foto').files[0]);
        }
        if (cvFile) {
            formData.append('cv', cvFile);
        }

        try {
            const response = await fetch('/api/register/tutor_maestro', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('¡Registro de maestro completado exitosamente! Serás redirigido para iniciar sesión.');
                window.location.href = 'login.html';
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al registrar tutor maestro:', error);
            alert('Error de conexión o el endpoint de registro no respondió.');
        }
    });
});
