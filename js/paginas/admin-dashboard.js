// Dashboard del administrador: indicadores y gráficos de préstamos

const indicadores = document.getElementById('indicadores');
const periodo = document.getElementById('periodo');

let prestamos = [];
let libros = [];
let usuarios = [];

async function iniciar() {
    const sesion = await proteger('ADMIN');
    if (!sesion) return;
    armarMenu();
    await cargarDatos();
}

async function cargarDatos() {
    indicadores.innerHTML = '<p class="cargando">Cargando datos...</p>';
    try {
        prestamos = await listar(URL_PRESTAMOS);
        libros = await listar(URL_LIBROS);
        usuarios = await listar(URL_USUARIOS);
        mostrar();
    } catch (error) {
        indicadores.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

// Préstamos que entran en el período elegido
function prestamosDelPeriodo() {
    const dias = Number(periodo.value);
    if (dias === 0) return prestamos;
    const desde = sumarDias(hoy(), -dias);
    return prestamos.filter(p => p.fechaPrestamo >= desde);
}

// Cuenta cuántas veces aparece cada nombre y lo devuelve ordenado de mayor a menor
function contar(lista, obtenerNombre) {
    const conteo = {};
    lista.forEach(p => {
        const nombre = obtenerNombre(p);
        conteo[nombre] = (conteo[nombre] || 0) + 1;
    });
    const resultado = [];
    for (const nombre in conteo) {
        resultado.push({ nombre: nombre, cantidad: conteo[nombre] });
    }
    return resultado.sort((a, b) => b.cantidad - a.cantidad);
}

function mostrarIndicadores(lista) {
    const disponibles = libros.filter(l => l.disponible).length;
    const pendientes = lista.filter(p => estadoReal(p) === 'Solicitado').length;
    const enPrestamo = lista.filter(p => estadoReal(p) === 'En préstamo').length;
    const vencidos = lista.filter(p => estadoReal(p) === 'Vencido').length;
    const socios = usuarios.filter(u => u.role === 'USUARIO').length;

    indicadores.innerHTML = `
        <div class="indicador"><span class="numero">${libros.length}</span><span>Libros (${disponibles} disponibles)</span></div>
        <div class="indicador"><span class="numero">${lista.length}</span><span>Préstamos en el período</span></div>
        <div class="indicador"><span class="numero">${pendientes}</span><span>Solicitudes por confirmar</span></div>
        <div class="indicador"><span class="numero">${enPrestamo}</span><span>Libros prestados</span></div>
        <div class="indicador ${vencidos > 0 ? 'alerta' : ''}"><span class="numero">${vencidos}</span><span>Vencidos</span></div>
        <div class="indicador"><span class="numero">${socios}</span><span>Socios</span></div>`;
}

// Los tres gráficos están hechos con divs: el tamaño de cada parte se calcula en JS

const SIN_DATOS = '<p class="vacio">No hay préstamos en este período.</p>';

function mayorCantidad(datos) {
    let maximo = 0;
    datos.forEach(d => {
        if (d.cantidad > maximo) maximo = d.cantidad;
    });
    return maximo;
}

function sumarCantidades(datos) {
    let total = 0;
    datos.forEach(d => total += d.cantidad);
    return total;
}

// 1) Columnas verticales: el alto es proporcional a la cantidad.
// Cada columna lleva a la gestión de préstamos filtrada por ese estado.
function dibujarColumnas(idContenedor, datos, total) {
    const contenedor = document.getElementById(idContenedor);
    const maximo = mayorCantidad(datos);
    if (maximo === 0) {
        contenedor.innerHTML = SIN_DATOS;
        return;
    }
    contenedor.innerHTML = datos.map(d => {
        // como máximo 85% del alto, para que entre el número arriba de la columna
        const alto = Math.round(d.cantidad / maximo * 85);
        const porcentaje = Math.round(d.cantidad / total * 100);
        return `
            <a class="columna-item" href="admin-prestamos.html?estado=${d.nombre}">
                <span class="columna-fondo">
                    <span class="columna-valor">${d.cantidad}</span>
                    <span class="columna ${d.clase}" style="height: ${alto}%"></span>
                </span>
                <span class="columna-nombre">${d.nombre}<small>${porcentaje}%</small></span>
            </a>`;
    }).join('');
}

// 2) Barra apilada: cada segmento ocupa el porcentaje que representa del total
function dibujarApilada(idContenedor, datos) {
    const contenedor = document.getElementById(idContenedor);
    const total = sumarCantidades(datos);
    if (total === 0) {
        contenedor.innerHTML = SIN_DATOS;
        return;
    }
    const segmentos = datos.map((d, i) => {
        const ancho = d.cantidad / total * 100;
        return `<span class="color-${i + 1}" style="width: ${ancho}%" title="${d.nombre}"></span>`;
    }).join('');
    const leyenda = datos.map((d, i) => {
        const porcentaje = Math.round(d.cantidad / total * 100);
        return `<li><span class="punto color-${i + 1}"></span>${d.nombre}: ${d.cantidad} (${porcentaje}%)</li>`;
    }).join('');
    contenedor.innerHTML = `<div class="apilada">${segmentos}</div><ul class="leyenda">${leyenda}</ul>`;
}

// 3) Ranking: posición, nombre y barra horizontal comparada con el primero
function dibujarRanking(idContenedor, datos) {
    const contenedor = document.getElementById(idContenedor);
    const maximo = mayorCantidad(datos);
    if (maximo === 0) {
        contenedor.innerHTML = SIN_DATOS;
        return;
    }
    contenedor.innerHTML = datos.map((d, i) => {
        const ancho = Math.round(d.cantidad / maximo * 100);
        return `
            <div class="ranking-fila">
                <span class="ranking-pos color-${i + 1}">${i + 1}</span>
                <span class="barra-nombre">${d.nombre}</span>
                <span class="barra-fondo"><span class="barra color-${i + 1}" style="width: ${ancho}%"></span></span>
                <span class="barra-valor">${d.cantidad}</span>
            </div>`;
    }).join('');
}

function mostrarGraficos(lista) {
    const datosEstados = ESTADOS.map(estado => {
        const cantidad = lista.filter(p => estadoReal(p) === estado).length;
        return { nombre: estado, cantidad: cantidad, clase: CLASES_ESTADO[estado] };
    });
    dibujarColumnas('grafico-estados', datosEstados, lista.length);

    // Cruce préstamo -> libro para saber el género y el título
    const generos = contar(lista, p => {
        const libro = buscarPorId(libros, p.bookId);
        return libro ? libro.genero : 'Sin dato';
    });
    dibujarApilada('grafico-generos', generos.slice(0, 6));

    const masPedidos = contar(lista, p => {
        const libro = buscarPorId(libros, p.bookId);
        return libro ? libro.titulo : 'Libro eliminado';
    });
    dibujarRanking('grafico-libros', masPedidos.slice(0, 5));
}

function mostrarUltimos() {
    const tabla = document.getElementById('tabla-ultimos');
    const ultimos = prestamos
        .slice()
        .sort((a, b) => a.fechaPrestamo < b.fechaPrestamo ? 1 : -1)
        .slice(0, 5);

    if (ultimos.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4">Todavía no hay préstamos.</td></tr>';
        return;
    }
    tabla.innerHTML = ultimos.map(p => {
        const socio = buscarPorId(usuarios, p.userId);
        const libro = buscarPorId(libros, p.bookId);
        return `
            <tr>
                <td>${socio ? socio.nombre : '-'}</td>
                <td>${libro ? libro.titulo : '-'}</td>
                <td>${formatearFecha(p.fechaPrestamo)}</td>
                <td>${etiquetaEstado(estadoReal(p))}</td>
            </tr>`;
    }).join('');
}

function mostrar() {
    const lista = prestamosDelPeriodo();
    mostrarIndicadores(lista);
    mostrarGraficos(lista);
    mostrarUltimos();
}

periodo.addEventListener('change', mostrar);

iniciar();
