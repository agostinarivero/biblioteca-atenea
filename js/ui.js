// Funciones compartidas por todas las páginas

// Opciones del menú para cada rol
const MENUS = {
    INVITADO: [
        { href: 'index.html', texto: 'Inicio' },
        { href: 'login.html', texto: 'Iniciar sesión' },
        { href: 'registro.html', texto: 'Registrarse' }
    ],
    USUARIO: [
        { href: 'catalogo.html', texto: 'Catálogo' },
        { href: 'mis-prestamos.html', texto: 'Mis préstamos' },
        { href: 'perfil.html', texto: 'Mi perfil' }
    ],
    ADMIN: [
        { href: 'admin-dashboard.html', texto: 'Dashboard' },
        { href: 'admin-libros.html', texto: 'Libros' },
        { href: 'admin-prestamos.html', texto: 'Préstamos' },
        { href: 'admin-usuarios.html', texto: 'Usuarios' }
    ]
};

// Arma el encabezado con el menú que corresponde al rol
function armarMenu() {
    const sesion = obtenerSesion();
    const rol = sesion ? sesion.role : 'INVITADO';
    const opciones = MENUS[rol] || MENUS.INVITADO;
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';

    const enlaces = opciones.map(op => {
        const clase = op.href === paginaActual ? 'activo' : '';
        return `<li><a class="${clase}" href="${op.href}">${op.texto}</a></li>`;
    }).join('');

    let usuario = '';
    if (sesion) {
        const tipo = rol === 'ADMIN' ? 'Administrador' : 'Socio';
        // si el nombre ya es el rol (por ejemplo "Administrador") no se repite
        let nombre = `${sesion.nombre} <small>(${tipo})</small>`;
        if (sesion.nombre === tipo) {
            nombre = sesion.nombre;
        }
        usuario = `
            <div class="usuario">
                <span>${nombre}</span>
                <button type="button" id="btn-salir" class="btn btn-chico btn-claro">Cerrar sesión</button>
            </div>`;
    }

    document.getElementById('encabezado').innerHTML = `
        <div class="contenedor barra-superior">
            <a class="logo" href="${sesion ? paginaInicio(rol) : 'index.html'}">Biblioteca Atenea</a>
            <button type="button" id="btn-menu" class="btn-menu">Menú</button>
            <nav id="menu" class="menu">
                <ul>${enlaces}</ul>
                ${usuario}
            </nav>
        </div>`;

    // En celulares el menú se abre y cierra con el botón
    document.getElementById('btn-menu').addEventListener('click', () => {
        document.getElementById('menu').classList.toggle('abierto');
    });

    if (sesion) {
        document.getElementById('btn-salir').addEventListener('click', () => {
            if (confirm('¿Querés cerrar la sesión?')) {
                cerrarSesion();
            }
        });
    }
}

// Muestra un aviso abajo de la pantalla durante unos segundos
let temporizadorMensaje;
function mostrarMensaje(texto, tipo) {
    const caja = document.getElementById('mensaje');
    caja.textContent = texto;
    caja.className = 'mensaje mensaje-' + (tipo || 'ok');
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => caja.classList.add('oculto'), 4000);
}

function emailValido(email) {
    const arroba = email.indexOf('@');
    const punto = email.lastIndexOf('.');
    return arroba > 0 && punto > arroba + 1 && punto < email.length - 2 && !email.includes(' ');
}

// ---- Fechas: se guardan como texto AAAA-MM-DD ----

function fechaATexto(fecha) {
    const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
    const dia = ('0' + fecha.getDate()).slice(-2);
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function textoAFecha(texto) {
    const partes = texto.split('-');
    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

function hoy() {
    return fechaATexto(new Date());
}

function sumarDias(texto, dias) {
    const fecha = textoAFecha(texto);
    fecha.setDate(fecha.getDate() + dias);
    return fechaATexto(fecha);
}

function diasEntre(desde, hasta) {
    return Math.round((textoAFecha(hasta) - textoAFecha(desde)) / 86400000);
}

// AAAA-MM-DD a DD/MM/AAAA
function formatearFecha(texto) {
    return texto ? texto.split('-').reverse().join('/') : '-';
}

// ---- Préstamos ----

// Un préstamo "En préstamo" con la fecha límite pasada se considera vencido
function estadoReal(prestamo) {
    if (prestamo.estado === 'En préstamo' && prestamo.fechaLimite < hoy()) {
        return 'Vencido';
    }
    return prestamo.estado;
}

// Activo = todavía no se devolvió
function esActivo(prestamo) {
    return estadoReal(prestamo) !== 'Devuelto';
}

function etiquetaEstado(estado) {
    return `<span class="estado ${CLASES_ESTADO[estado] || ''}">${estado}</span>`;
}

// ---- Utilidades de listas ----

// MockAPI no tiene JOIN: los datos relacionados se buscan en memoria por id
function buscarPorId(lista, id) {
    return lista.find(item => String(item.id) === String(id));
}

// Valores distintos de un campo, para cargar los filtros
function valoresUnicos(lista, campo) {
    return lista.map(item => item[campo])
        .filter((valor, i, todos) => valor && todos.indexOf(valor) === i)
        .sort();
}

function llenarSelect(select, valores, textoTodos) {
    select.innerHTML = `<option value="">${textoTodos}</option>` +
        valores.map(valor => `<option value="${valor}">${valor}</option>`).join('');
}

function contiene(valor, texto) {
    return String(valor || '').toLowerCase().includes(texto);
}

// Imagen de portada; si no tiene o no carga se muestra la imagen por defecto
function imgPortada(libro, clase) {
    const src = libro && libro.portada ? libro.portada : 'img/sin-portada.svg';
    const titulo = libro ? libro.titulo : 'libro eliminado';
    return `<img class="${clase || 'portada'}" src="${src}" alt="Portada de ${titulo}"
        onerror="this.onerror = null; this.src = 'img/sin-portada.svg';">`;
}
