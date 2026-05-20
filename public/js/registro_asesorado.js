let planesEstudio = {};
let materiasSeleccionadas = new Map();

document.addEventListener('DOMContentLoaded', async () => {
    const carreraSelect = document.getElementById('carrera');
    const semestreSelect = document.getElementById('semestre');
    const materiasContainer = document.getElementById('materiasContainer');
    const asesoradoForm = document.getElementById('asesoradoForm');

    // Make sure we are on the asesorado registration page
    if (!asesoradoForm || !carreraSelect || !semestreSelect || !materiasContainer) return;

    // Load planes de estudio
    try {
        const res = await fetch('/api/planes-estudio');
        const result = await res.json();
        if (!result.success) throw new Error('Error al obtener planes de estudio');
        planesEstudio = result.data;
    } catch (err) {
        console.error('Error cargando planes de estudio:', err);
        materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Error al cargar materias</p>';
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
    const clave = urlParams.get('clave');

    if (nocontrol) {
        try {
            const res = await fetch('/api/alumnos/' + encodeURIComponent(nocontrol) + (clave ? '?clave=' + encodeURIComponent(clave) : ''));
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

    // Event listeners
    carreraSelect.addEventListener('change', () => {
        const carrera = carreraSelect.value;
        const semestresObj = planesEstudio[carrera];
        if (semestresObj) {
            const numSemestres = Object.keys(semestresObj).length;
            semestreSelect.innerHTML = '<option value="" disabled selected>Selecciona tu semestre...</option>';
            for (let i = 1; i <= numSemestres; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}° Semestre`;
                semestreSelect.appendChild(option);
            }
        }
        materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">Selecciona tu semestre para ver materias disponibles...</p>';
    });

    semestreSelect.addEventListener('change', populateMaterias);

    function populateMaterias() {
        const carrera = carreraSelect.value;
        const semestresObj = planesEstudio[carrera];
        
        materiasContainer.innerHTML = '';
        
        if (!semestresObj) {
            materiasContainer.innerHTML = '<p class="text-muted text-center mt-3">No hay materias disponibles.</p>';
            return;
        }

        let seenSubjects = new Set();
        let hasMaterias = false;
        
        // Show subjects up to their current semester
        const maxSemester = alumnoSemestre ? alumnoSemestre : parseInt(semestreSelect.value);

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
                
                const isCurrent = (i === parseInt(semestreSelect.value));
                
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
        
        if (materiasSeleccionadas.size === 0) {
            alert("Por favor, selecciona al menos una materia de interés.");
            return;
        }

        const formData = new FormData();
        formData.append('nocontrol', nocontrolValue);
        if (clave) formData.append('clave', clave);
        formData.append('telefono', telefono);
        formData.append('materia_interes', JSON.stringify(Array.from(materiasSeleccionadas.keys())));

        const fotoInput = document.getElementById('foto');
        if (fotoInput && fotoInput.files[0]) {
            formData.append('foto', fotoInput.files[0]);
        } else {
            alert('Por favor selecciona una foto de perfil.');
            return;
        }

        try {
            const response = await fetch('/api/register/asesorado', {
                method: 'POST',
                body: formData
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
