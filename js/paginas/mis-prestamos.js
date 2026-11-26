// Préstamos del socio: activos, historial y cancelación de solicitudes

const lista = document.getElementById('lista-prestamos');
const resumen = document.getElementById('resumen');
const pestanas = document.querySelectorAll('.pestana');

let sesion = null;
let prestamos = [];
let libros = [];
let vista = 'activos';

// Qué préstamos muestra cada pestaña
const FILTROS = {
    activos: p => esActivo(p),
    historial: p => estadoReal(p) === 'Devuelto',
    todos: p => true
};

async function iniciar() {
    sesion = await proteger('USUARIO');
    if (!sesion) return;
    armarMenu();
    await cargarDatos();
}

async function cargarDatos() {
    lista.innerHTML = '<p class="cargando">Cargando tus préstamos...</p>';
    try {
        libros = await listar(URL_LIBROS);
        const todos = await listar(URL_PRESTAMOS);
        prestamos = todos
            .filter(p => String(p.userId) === sesion.id)
            .sort((a, b) => a.fechaPrestamo < b.fechaPrestamo ? 1 : -1);
        mostrar();
    } catch (error) {
        lista.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

function avisoDias(prestamo) {
    const estado = estadoReal(prestamo);
    if (estado === 'Devuelto') return '<p class="aviso ok">Devuelto</p>';
    if (estado === 'Solicitado') return '<p class="aviso">Esperando que la biblioteca confirme la entrega</p>';

    const dias = diasEntre(hoy(), prestamo.fechaLimite);
    if (dias < 0) return `<p class="aviso peligro">Vencido hace ${-dias} día(s)</p>`;
    if (dias === 0) return '<p class="aviso alerta">Vence hoy</p>';
    return `<p class="aviso ${dias <= 3 ? 'alerta' : 'ok'}">Faltan ${dias} día(s)</p>`;
}

function mostrarResumen() {
    const activos = prestamos.filter(FILTROS.activos);
    const vencidos = prestamos.filter(p => estadoReal(p) === 'Vencido');
    const enCurso = activos
        .filter(p => estadoReal(p) === 'En préstamo')
        .sort((a, b) => a.fechaLimite < b.fechaLimite ? -1 : 1);
    const proxima = enCurso.length > 0 ? formatearFecha(enCurso[0].fechaLimite) : '-';

    resumen.innerHTML = `
        <div class="indicador"><span class="numero">${activos.length}</span><span>Activos (máx. ${MAX_PRESTAMOS})</span></div>
        <div class="indicador"><span class="numero">${proxima}</span><span>Próxima devolución</span></div>
        <div class="indicador ${vencidos.length > 0 ? 'alerta' : ''}"><span class="numero">${vencidos.length}</span><span>Vencidos</span></div>
        <div class="indicador"><span class="numero">${prestamos.length}</span><span>Pedidos en total</span></div>`;
}

function mostrar() {
    mostrarResumen();

    // Cantidad en cada pestaña
    pestanas.forEach(pestana => {
        pestana.querySelector('span').textContent = prestamos.filter(FILTROS[pestana.dataset.vista]).length;
    });

    const visibles = prestamos.filter(FILTROS[vista]);
    if (visibles.length === 0) {
        lista.innerHTML = '<p class="vacio">No hay préstamos para mostrar.</p>';
        return;
    }

    lista.innerHTML = visibles.map(p => {
        const libro = buscarPorId(libros, p.bookId);
        const estado = estadoReal(p);
        return `
            <article class="tarjeta-prestamo borde-${CLASES_ESTADO[estado]}">
                ${imgPortada(libro, 'portada-mini')}
                <div>
                    <h3>${libro ? libro.titulo : 'Libro eliminado del catálogo'}</h3>
                    <p class="autor">${libro ? libro.autor : ''}</p>
                    ${etiquetaEstado(estado)}
                    <p><strong>Préstamo:</strong> ${formatearFecha(p.fechaPrestamo)}</p>
                    <p><strong>Fecha límite:</strong> ${formatearFecha(p.fechaLimite)}</p>
                    ${avisoDias(p)}
                    ${estado === 'Solicitado' ? `<button class="btn btn-chico btn-secundario" data-id="${p.id}">Cancelar solicitud</button>` : ''}
                </div>
            </article>`;
    }).join('');
}

async function cancelarSolicitud(id) {
    const prestamo = buscarPorId(prestamos, id);
    if (!prestamo || !confirm('¿Querés cancelar esta solicitud?')) return;
    try {
        await eliminar(URL_PRESTAMOS, prestamo.id);
        // El libro vuelve a quedar disponible
        const libro = buscarPorId(libros, prestamo.bookId);
        if (libro) {
            libro.disponible = true;
            await actualizar(URL_LIBROS, libro.id, libro);
        }
        prestamos = prestamos.filter(p => p !== prestamo);
        mostrarMensaje('Solicitud cancelada.');
        mostrar();
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

pestanas.forEach(pestana => {
    pestana.addEventListener('click', () => {
        vista = pestana.dataset.vista;
        pestanas.forEach(p => p.classList.remove('activa'));
        pestana.classList.add('activa');
        mostrar();
    });
});

lista.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-id]');
    if (boton) {
        cancelarSolicitud(boton.dataset.id);
    }
});

iniciar();
