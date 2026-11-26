// Catálogo del socio: buscador, filtros y solicitud de préstamo

const grilla = document.getElementById('grilla-libros');
const buscador = document.getElementById('buscador');
const filtroGenero = document.getElementById('filtro-genero');
const filtroAutor = document.getElementById('filtro-autor');
const soloDisponibles = document.getElementById('solo-disponibles');
const contador = document.getElementById('contador');
const modal = document.getElementById('modal');
const detalle = document.getElementById('detalle');
const errorModal = document.getElementById('error-modal');
const btnConfirmar = document.getElementById('btn-confirmar');

let sesion = null;
let libros = [];
let misPrestamos = [];
let libroElegido = null;

async function iniciar() {
    sesion = await proteger('USUARIO');
    if (!sesion) return;
    armarMenu();
    await cargarDatos();
}

async function cargarDatos() {
    grilla.innerHTML = '<p class="cargando">Cargando catálogo...</p>';
    try {
        libros = await listar(URL_LIBROS);
        const prestamos = await listar(URL_PRESTAMOS);
        misPrestamos = prestamos.filter(p => String(p.userId) === sesion.id);
        libros.sort((a, b) => a.titulo < b.titulo ? -1 : 1);

        llenarSelect(filtroGenero, valoresUnicos(libros, 'genero'), 'Todos los géneros');
        llenarSelect(filtroAutor, valoresUnicos(libros, 'autor'), 'Todos los autores');
        mostrarLibros();
    } catch (error) {
        grilla.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

// Devuelve el préstamo activo del socio para ese libro, si tiene uno
function prestamoActivo(idLibro) {
    return misPrestamos.find(p => String(p.bookId) === String(idLibro) && esActivo(p));
}

function botonLibro(libro) {
    if (prestamoActivo(libro.id)) {
        return '<button class="btn btn-bloque" disabled>Ya lo solicitaste</button>';
    }
    if (libro.disponible) {
        return `<button class="btn btn-bloque" data-id="${libro.id}">Solicitar préstamo</button>`;
    }
    return '<button class="btn btn-bloque" disabled>No disponible</button>';
}

function mostrarLibros() {
    const texto = buscador.value.trim().toLowerCase();
    const lista = libros.filter(libro =>
        (contiene(libro.titulo, texto) || contiene(libro.autor, texto) || contiene(libro.ISBN, texto)) &&
        (filtroGenero.value === '' || libro.genero === filtroGenero.value) &&
        (filtroAutor.value === '' || libro.autor === filtroAutor.value) &&
        (!soloDisponibles.checked || libro.disponible)
    );

    contador.textContent = `Mostrando ${lista.length} de ${libros.length} libros`;
    if (lista.length === 0) {
        grilla.innerHTML = '<p class="vacio">No se encontraron libros con esos filtros.</p>';
        return;
    }

    grilla.innerHTML = lista.map(libro => `
        <article class="card">
            ${imgPortada(libro)}
            <div class="card-cuerpo">
                <span class="disponibilidad ${libro.disponible ? 'si' : 'no'}">${libro.disponible ? 'Disponible' : 'Prestado'}</span>
                <h2>${libro.titulo}</h2>
                <p class="autor">${libro.autor}</p>
                <p class="dato">${libro.genero} | ISBN ${libro.ISBN}</p>
                ${botonLibro(libro)}
            </div>
        </article>`).join('');
}

function abrirModal(id) {
    libroElegido = buscarPorId(libros, id);
    if (!libroElegido) return;
    const fechaHoy = hoy();
    detalle.innerHTML = `
        ${imgPortada(libroElegido, 'portada-chica')}
        <div>
            <h3>${libroElegido.titulo}</h3>
            <p class="autor">${libroElegido.autor}</p>
            <p><strong>Solicitud:</strong> ${formatearFecha(fechaHoy)}</p>
            <p><strong>Plazo:</strong> ${DIAS_PRESTAMO} días</p>
            <p><strong>Devolver antes del:</strong> ${formatearFecha(sumarDias(fechaHoy, DIAS_PRESTAMO))}</p>
        </div>`;
    errorModal.textContent = '';
    modal.classList.remove('oculto');
}

function cerrarModal() {
    modal.classList.add('oculto');
    libroElegido = null;
}

// Controla las reglas del socio y la disponibilidad actual del libro antes de reservar
async function solicitarPrestamo() {
    const activos = misPrestamos.filter(esActivo);
    if (activos.some(p => estadoReal(p) === 'Vencido')) {
        throw new Error('Tenés préstamos vencidos. Devolvelos antes de pedir otro libro.');
    }
    if (activos.length >= MAX_PRESTAMOS) {
        throw new Error(`Ya tenés ${MAX_PRESTAMOS} préstamos activos, que es el máximo.`);
    }

    // Se consulta de nuevo al servidor por si otro socio lo pidió mientras tanto
    const libroActual = await obtener(URL_LIBROS, libroElegido.id);
    const prestamos = await listar(URL_PRESTAMOS);
    const ocupado = prestamos.some(p => String(p.bookId) === String(libroElegido.id) && esActivo(p));
    if (!libroActual.disponible || ocupado) {
        libroElegido.disponible = false;
        throw new Error('Lo sentimos, este libro ya no está disponible.');
    }

    const fechaHoy = hoy();
    const nuevo = await crear(URL_PRESTAMOS, {
        userId: sesion.id,
        bookId: String(libroElegido.id),
        fechaPrestamo: fechaHoy,
        fechaLimite: sumarDias(fechaHoy, DIAS_PRESTAMO),
        estado: 'Solicitado'
    });

    libroActual.disponible = false;
    await actualizar(URL_LIBROS, libroActual.id, libroActual);
    libroElegido.disponible = false;
    misPrestamos.push(nuevo);
    return nuevo;
}

btnConfirmar.addEventListener('click', async () => {
    btnConfirmar.disabled = true;
    errorModal.textContent = '';
    try {
        const prestamo = await solicitarPrestamo();
        mostrarMensaje(`Solicitaste "${libroElegido.titulo}". Fecha límite: ${formatearFecha(prestamo.fechaLimite)}.`);
        cerrarModal();
    } catch (error) {
        errorModal.textContent = error.message;
    }
    btnConfirmar.disabled = false;
    mostrarLibros();
});

// Un solo evento en la grilla para todos los botones de las cards
grilla.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-id]');
    if (boton) {
        abrirModal(boton.dataset.id);
    }
});

document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);
buscador.addEventListener('input', mostrarLibros);
filtroGenero.addEventListener('change', mostrarLibros);
filtroAutor.addEventListener('change', mostrarLibros);
soloDisponibles.addEventListener('change', mostrarLibros);

document.getElementById('btn-limpiar').addEventListener('click', () => {
    buscador.value = '';
    filtroGenero.value = '';
    filtroAutor.value = '';
    soloDisponibles.checked = false;
    mostrarLibros();
});

iniciar();
