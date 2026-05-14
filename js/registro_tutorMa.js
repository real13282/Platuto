let planesEstudioLocal = {};
let materiasSeleccionadas = new Map();

document.addEventListener('DOMContentLoaded', async () => {
    const carreraSelect = document.getElementById('carreraSelect');
    const semestreSelect = document.getElementById('semestreSelect');
    const materiasContainer = document.getElementById('materiasContainer');
    const materiasSeleccionadasContainer = document.getElementById('materiasSeleccionadasContainer');
    const tutorForm = document.getElementById('tutorForm');

    if (!carreraSelect || !semestreSelect || !materiasContainer) return;

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
            }
        } catch (err) {
            console.error('Error al obtener datos del maestro:', err);
        }
    }

    // Handle Carrera selection change to populate Semestres
    carreraSelect.addEventListener('change', () => {
        const carrera = carreraSelect.value;
        const semestresObj = planesEstudioLocal[carrera];
        if (semestresObj) {
            const numSemestres = Object.keys(semestresObj).length;
            semestreSelect.innerHTML = '<option value="" disabled selected>Selecciona un semestre...</option>';
            for (let i = 1; i <= numSemestres; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}° Semestre`;
                semestreSelect.appendChild(option);
            }
        }
        materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona tu semestre para ver materias disponibles...</p>';
    });

    semestreSelect.addEventListener('change', updateMaterias);

    function updateMaterias() {
        const carrera = carreraSelect.value;
        const semestresObj = planesEstudioLocal[carrera];
        
        materiasContainer.innerHTML = '';
        
        if (!semestresObj) {
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">No hay materias disponibles.</p>';
            return;
        }

        let seenSubjects = new Set();
        let hasMaterias = false;
        
        const maxSemester = parseInt(semestreSelect.value);

        for (let i = 1; i <= maxSemester; i++) {
            if (semestresObj[i]) {
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
                
                const isCurrent = (i === maxSemester);
                
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
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">No hay materias disponibles.</p>';
        }
    }

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

    // Handle Form Submission
    tutorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedCarrera = carreraSelect.value;
        if (!selectedCarrera) {
            alert('Por favor, selecciona una licenciatura.');
            return;
        }

        const selectedSemestre = semestreSelect.value;
        if (!selectedSemestre) {
            alert('Por favor, selecciona un semestre.');
            return;
        }

        if (materiasSeleccionadas.size === 0) {
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
        formData.append('semestres', JSON.stringify([selectedSemestre]));
        formData.append('materias', JSON.stringify(Array.from(materiasSeleccionadas.keys())));

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
