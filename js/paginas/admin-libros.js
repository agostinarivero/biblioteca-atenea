// ABM de libros

const tabla = document.getElementById('tabla-libros');
const form = document.getElementById('form-libro');
const tituloForm = document.getElementById('titulo-form');
const errorLibro = document.getElementById('error-libro');
const buscador = document.getElementById('buscador');
const filtroGenero = document.getElementById('filtro-genero');
const filtroDisponible = document.getElementById('filtro-disponible');

let libros = [];
let prestamos = [];
let idEditando = null;  // null = alta, con valor = edición

async function iniciar() {
    const sesion = await proteger('ADMIN');
    if (!sesion) return;
    armarMenu();
    await cargarDatos();
}

async function cargarDatos() {
    tabla.innerHTML = '<tr><td colspan="5">Cargando libros...</td></tr>';
    try {
        libros = await listar(URL_LIBROS);
        prestamos = await listar(URL_PRESTAMOS);
        mostrar();
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="5" class="error">${error.message}</td></tr>`;
    }
}

function tienePrestamoActivo(idLibro) {
    return prestamos.some(p => String(p.bookId) === String(idLibro) && esActivo(p));
}

// Saca guiones y espacios del ISBN
function limpiarISBN(isbn) {
    return String(isbn).split('-').join('').split(' ').join('');
}

function mostrar() {
    libros.sort((a, b) => a.titulo < b.titulo ? -1 : 1);
    const generoElegido = filtroGenero.value;
    llenarSelect(filtroGenero, valoresUnicos(libros, 'genero'), 'Todos los géneros');
    filtroGenero.value = generoElegido;

    const disponibles = libros.filter(l => l.disponible).length;
    document.getElementById('resumen').textContent =
        `${libros.length} libros: ${disponibles} disponibles y ${libros.length - disponibles} prestados.`;

    const texto = buscador.value.trim().toLowerCase();
    const lista = libros.filter(l =>
        (contiene(l.titulo, texto) || contiene(l.autor, texto) || contiene(l.ISBN, texto)) &&
        (filtroGenero.value === '' || l.genero === filtroGenero.value) &&
        (filtroDisponible.value === '' || (filtroDisponible.value === 'si') === Boolean(l.disponible))
    );

    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5">No hay libros que coincidan.</td></tr>';
        return;
    }
    tabla.innerHTML = lista.map(libro => `
        <tr>
            <td>
                <div class="celda-libro">
                    ${imgPortada(libro, 'portada-mini')}
                    <div><strong>${libro.titulo}</strong><br><small>${libro.autor}</small></div>
                </div>
            </td>
            <td>${libro.genero}</td>
            <td>${libro.ISBN}</td>
            <td><span class="disponibilidad ${libro.disponible ? 'si' : 'no'}">${libro.disponible ? 'Disponible' : 'Prestado'}</span></td>
            <td class="acciones">
                <button class="btn btn-chico btn-secundario" data-accion="editar" data-id="${libro.id}">Editar</button>
                <button class="btn btn-chico btn-peligro" data-accion="eliminar" data-id="${libro.id}">Eliminar</button>
            </td>
        </tr>`).join('');
}

function limpiarFormulario() {
    idEditando = null;
    form.reset();
    errorLibro.textContent = '';
    tituloForm.textContent = 'Nuevo libro';
}

function editarLibro(libro) {
    idEditando = libro.id;
    tituloForm.textContent = 'Editar libro';
    document.getElementById('titulo').value = libro.titulo;
    document.getElementById('autor').value = libro.autor;
    document.getElementById('genero').value = libro.genero;
    document.getElementById('isbn').value = libro.ISBN;
    document.getElementById('portada').value = libro.portada || '';
    document.getElementById('disponible').checked = Boolean(libro.disponible);
    errorLibro.textContent = '';
    document.getElementById('titulo').focus();
}

function validarLibro(datos) {
    if (!datos.titulo || !datos.autor || !datos.genero || !datos.ISBN) {
        return 'Completá título, autor, género e ISBN.';
    }
    if ((datos.ISBN.length !== 10 && datos.ISBN.length !== 13) || isNaN(Number(datos.ISBN))) {
        return 'El ISBN debe tener 10 o 13 números.';
    }
    if (libros.some(l => limpiarISBN(l.ISBN) === datos.ISBN && String(l.id) !== String(idEditando))) {
        return 'Ya existe un libro con ese ISBN.';
    }
    if (datos.portada !== '' && datos.portada.indexOf('http') !== 0) {
        return 'La URL de la portada debe empezar con http:// o https://';
    }
    // No se puede liberar un libro que todavía está prestado
    if (idEditando && datos.disponible && tienePrestamoActivo(idEditando)) {
        return 'El libro tiene un préstamo activo. Marcá el préstamo como Devuelto para liberarlo.';
    }
    return '';
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const datos = {
        titulo: document.getElementById('titulo').value.trim(),
        autor: document.getElementById('autor').value.trim(),
        genero: document.getElementById('genero').value.trim(),
        ISBN: limpiarISBN(document.getElementById('isbn').value.trim()),
        portada: document.getElementById('portada').value.trim(),
        disponible: document.getElementById('disponible').checked
    };

    const error = validarLibro(datos);
    errorLibro.textContent = error;
    if (error) return;

    try {
        if (idEditando) {
            const actualizado = await actualizar(URL_LIBROS, idEditando, datos);
            libros = libros.map(l => String(l.id) === String(idEditando) ? actualizado : l);
            mostrarMensaje('Libro actualizado.');
        } else {
            libros.push(await crear(URL_LIBROS, datos));
            mostrarMensaje('Libro agregado al inventario.');
        }
        limpiarFormulario();
        mostrar();
    } catch (err) {
        errorLibro.textContent = err.message;
    }
});

async function eliminarLibro(libro) {
    if (tienePrestamoActivo(libro.id)) {
        mostrarMensaje('No se puede eliminar: el libro tiene un préstamo activo.', 'error');
        return;
    }
    if (!confirm(`¿Eliminar "${libro.titulo}" del inventario?`)) return;
    try {
        await eliminar(URL_LIBROS, libro.id);
        libros = libros.filter(l => l !== libro);
        if (String(idEditando) === String(libro.id)) limpiarFormulario();
        mostrar();
        mostrarMensaje('Libro eliminado.');
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

tabla.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    const libro = buscarPorId(libros, boton.dataset.id);
    if (!libro) return;
    if (boton.dataset.accion === 'editar') editarLibro(libro);
    if (boton.dataset.accion === 'eliminar') eliminarLibro(libro);
});

document.getElementById('btn-cancelar').addEventListener('click', limpiarFormulario);
buscador.addEventListener('input', mostrar);
filtroGenero.addEventListener('change', mostrar);
filtroDisponible.addEventListener('change', mostrar);

iniciar();
