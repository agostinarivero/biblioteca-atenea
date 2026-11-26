// Gestión de préstamos: cambio de estado y disponibilidad de los libros

const tabla = document.getElementById('tabla-prestamos');
const buscador = document.getElementById('buscador');
const filtroEstado = document.getElementById('filtro-estado');
const orden = document.getElementById('orden');

let prestamos = [];
let libros = [];
let usuarios = [];

// Desde el dashboard se puede llegar filtrado: admin-prestamos.html?estado=Vencido
const parametros = new URLSearchParams(window.location.search);
if (ESTADOS.includes(parametros.get('estado'))) {
    filtroEstado.value = parametros.get('estado');
}

async function iniciar() {
    const sesion = await proteger('ADMIN');
    if (!sesion) return;
    armarMenu();
    await cargarDatos();
}

async function cargarDatos() {
    tabla.innerHTML = '<tr><td colspan="7">Cargando préstamos...</td></tr>';
    try {
        prestamos = await listar(URL_PRESTAMOS);
        usuarios = await listar(URL_USUARIOS);
        libros = await listar(URL_LIBROS);
        await marcarVencidos();
        mostrar();
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="7" class="error">${error.message}</td></tr>`;
    }
}

// Guarda como "Vencido" los préstamos cuya fecha límite ya pasó
async function marcarVencidos() {
    const vencidos = prestamos.filter(p => p.estado === 'En préstamo' && estadoReal(p) === 'Vencido');
    for (let i = 0; i < vencidos.length; i++) {
        vencidos[i].estado = 'Vencido';
        await actualizar(URL_PRESTAMOS, vencidos[i].id, vencidos[i]);
    }
    if (vencidos.length > 0) {
        mostrarMensaje(`Se marcaron ${vencidos.length} préstamo(s) como vencidos.`, 'alerta');
    }
}

function mostrar() {
    document.getElementById('resumen').textContent = ESTADOS
        .map(estado => `${estado}: ${prestamos.filter(p => p.estado === estado).length}`)
        .join(' | ');

    const texto = buscador.value.trim().toLowerCase();
    const lista = prestamos.filter(p => {
        const socio = buscarPorId(usuarios, p.userId);
        const libro = buscarPorId(libros, p.bookId);
        const coincide = texto === '' ||
            (socio && (contiene(socio.nombre, texto) || contiene(socio.email, texto))) ||
            (libro && contiene(libro.titulo, texto));
        return coincide && (filtroEstado.value === '' || p.estado === filtroEstado.value);
    });

    if (orden.value === 'limite') {
        lista.sort((a, b) => a.fechaLimite < b.fechaLimite ? -1 : 1);
    } else {
        lista.sort((a, b) => a.fechaPrestamo < b.fechaPrestamo ? 1 : -1);
    }

    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="7">No hay préstamos para mostrar.</td></tr>';
        return;
    }

    tabla.innerHTML = lista.map(p => {
        const socio = buscarPorId(usuarios, p.userId);
        const libro = buscarPorId(libros, p.bookId);
        const opciones = ESTADOS.map(estado =>
            `<option value="${estado}" ${estado === p.estado ? 'selected' : ''}>${estado}</option>`).join('');
        return `
            <tr>
                <td>${socio ? socio.nombre : 'Usuario eliminado'}<br><small>${socio ? socio.email : ''}</small></td>
                <td>${libro ? libro.titulo : 'Libro eliminado'}</td>
                <td>${formatearFecha(p.fechaPrestamo)}</td>
                <td>${formatearFecha(p.fechaLimite)}</td>
                <td>${etiquetaEstado(p.estado)}</td>
                <td class="acciones">
                    <select data-id="${p.id}">${opciones}</select>
                    <button class="btn btn-chico" data-accion="guardar" data-id="${p.id}">Guardar</button>
                </td>
                <td><button class="btn btn-chico btn-peligro" data-accion="eliminar" data-id="${p.id}">Eliminar</button></td>
            </tr>`;
    }).join('');
}

async function cambiarDisponibilidad(idLibro, disponible) {
    const libro = buscarPorId(libros, idLibro);
    if (!libro) return;
    libro.disponible = disponible;
    await actualizar(URL_LIBROS, libro.id, libro);
}

async function cambiarEstado(prestamo, nuevoEstado) {
    if (nuevoEstado === prestamo.estado) {
        mostrarMensaje('El préstamo ya tiene ese estado.', 'alerta');
        return;
    }
    const eraActivo = prestamo.estado !== 'Devuelto';
    const seraActivo = nuevoEstado !== 'Devuelto';

    // Para reactivar un préstamo devuelto el libro no puede estar prestado a otro socio
    if (!eraActivo && seraActivo) {
        const ocupado = prestamos.some(p => p !== prestamo &&
            String(p.bookId) === String(prestamo.bookId) && p.estado !== 'Devuelto');
        if (ocupado) {
            throw new Error('Ese libro ya tiene otro préstamo activo.');
        }
    }

    // Al entregar el libro, el plazo empieza a contar desde hoy
    if (prestamo.estado === 'Solicitado' && nuevoEstado === 'En préstamo') {
        prestamo.fechaPrestamo = hoy();
        prestamo.fechaLimite = sumarDias(prestamo.fechaPrestamo, DIAS_PRESTAMO);
    }

    prestamo.estado = nuevoEstado;
    await actualizar(URL_PRESTAMOS, prestamo.id, prestamo);

    // Devuelto libera el libro; reactivar lo vuelve a ocupar
    if (eraActivo !== seraActivo) {
        await cambiarDisponibilidad(prestamo.bookId, !seraActivo);
    }
    mostrarMensaje(`Préstamo actualizado a "${nuevoEstado}".`);
}

async function eliminarPrestamo(prestamo) {
    if (!confirm('¿Eliminar este préstamo?')) return;
    await eliminar(URL_PRESTAMOS, prestamo.id);
    prestamos = prestamos.filter(p => p !== prestamo);
    // Si estaba activo, el libro vuelve a quedar disponible
    if (prestamo.estado !== 'Devuelto') {
        await cambiarDisponibilidad(prestamo.bookId, true);
    }
    mostrarMensaje('Préstamo eliminado.');
}

tabla.addEventListener('click', async (evento) => {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    const prestamo = buscarPorId(prestamos, boton.dataset.id);
    if (!prestamo) return;

    boton.disabled = true;
    try {
        if (boton.dataset.accion === 'guardar') {
            const nuevoEstado = tabla.querySelector(`select[data-id="${prestamo.id}"]`).value;
            await cambiarEstado(prestamo, nuevoEstado);
        } else {
            await eliminarPrestamo(prestamo);
        }
        mostrar();
    } catch (error) {
        mostrarMensaje(error.message, 'error');
        // Se recargan los datos para no quedar con información distinta a la del servidor
        await cargarDatos();
    }
});

buscador.addEventListener('input', mostrar);
filtroEstado.addEventListener('change', mostrar);
orden.addEventListener('change', mostrar);

iniciar();
