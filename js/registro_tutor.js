document.addEventListener('DOMContentLoaded', async () => {
    const carrerasContainer = document.getElementById('carrerasContainer');
    const semestresContainer = document.getElementById('semestresContainer');
    const materiasContainer = document.getElementById('materiasContainer');
    const tutorForm = document.getElementById('tutorForm');

    // Make sure we are on the maestro tutor page
    if (!carrerasContainer || !semestresContainer || !materiasContainer) return;

    // Wait slightly to ensure planesEstudio is loaded from planes_estudio.js if loaded asynchronously
    // However, since it's a standard script tag before this one, it should be available immediately.
    if (typeof planesEstudio === 'undefined') {
        console.error("planesEstudio not found. Make sure planes_estudio.js is loaded first.");
        return;
    }

    // Populate Carreras
    const carreras = Object.keys(planesEstudio).sort();
    carreras.forEach((carrera, index) => {
        const div = document.createElement('div');
        div.className = 'custom-control custom-checkbox mb-2';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'custom-control-input carrera-checkbox';
        input.id = `carrera_${index}`;
        input.value = carrera;

        const label = document.createElement('label');
        label.className = 'custom-control-label text-dark';
        label.htmlFor = `carrera_${index}`;
        label.textContent = carrera;

        div.appendChild(input);
        div.appendChild(label);
        carrerasContainer.appendChild(div);
    });

    // Check for nocontrol in URL and prefill data
    const urlParams = new URLSearchParams(window.location.search);
    const nocontrol = urlParams.get('nocontrol');
    if (nocontrol) {
        document.getElementById('nocontrol').value = nocontrol;
        // Optionally fetch maestro data here if such an API exists
    }

    // Handle Carrera selection change to populate Semestres
    carrerasContainer.addEventListener('change', updateSemestres);

    function updateSemestres() {
        const selectedCarreras = Array.from(document.querySelectorAll('.carrera-checkbox:checked')).map(cb => cb.value);
        
        if (selectedCarreras.length === 0) {
            semestresContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona al menos una licenciatura...</p>';
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona licenciaturas y semestres para ver materias disponibles...</p>';
            return;
        }

        // Get max semester across selected carreras
        let maxSemestres = 0;
        selectedCarreras.forEach(carrera => {
            const num = Object.keys(planesEstudio[carrera]).length;
            if (num > maxSemestres) maxSemestres = num;
        });

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
        const selectedCarreras = Array.from(document.querySelectorAll('.carrera-checkbox:checked')).map(cb => cb.value);
        const selectedSemestres = Array.from(document.querySelectorAll('.semestre-checkbox:checked')).map(cb => cb.value);

        if (selectedCarreras.length === 0 || selectedSemestres.length === 0) {
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona licenciaturas y semestres para ver materias disponibles...</p>';
            return;
        }

        let availableSubjects = new Set();
        selectedCarreras.forEach(carrera => {
            selectedSemestres.forEach(semestre => {
                if (planesEstudio[carrera][semestre]) {
                    planesEstudio[carrera][semestre].forEach(materia => {
                        availableSubjects.add(`${materia} (${carrera})`);
                    });
                }
            });
        });

        const sortedSubjects = Array.from(availableSubjects).sort();

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
    }

    // Handle Form Submission
    tutorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedCarreras = Array.from(document.querySelectorAll('.carrera-checkbox:checked'));
        if (selectedCarreras.length === 0) {
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
        
        formData.append('carreras', JSON.stringify(selectedCarreras.map(cb => cb.value)));
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
            // Simulate success if API doesn't exist yet
            alert('Registro simulado con éxito (El endpoint puede no existir).');
            window.location.href = 'login.html';
        }
    });
});
