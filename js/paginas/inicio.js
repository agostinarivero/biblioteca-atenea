// Página de inicio pública: muestra algunos libros del catálogo

async function iniciar() {
    armarMenu();

    // Si ya hay sesión, el botón lleva directo al panel del usuario
    const sesion = obtenerSesion();
    if (sesion) {
        document.getElementById('acciones').innerHTML =
            `<a class="btn btn-acento" href="${paginaInicio(sesion.role)}">Ir a mi panel</a>`;
    }

    const destacados = document.getElementById('destacados');
    destacados.innerHTML = '<p class="cargando">Cargando libros...</p>';
    try {
        const libros = await listar(URL_LIBROS);
        if (libros.length === 0) {
            destacados.innerHTML = '<p class="vacio">Todavía no hay libros cargados.</p>';
            return;
        }
        destacados.innerHTML = libros.slice(0, 4).map(libro => `
            <article class="card">
                ${imgPortada(libro)}
                <div class="card-cuerpo">
                    <h3>${libro.titulo}</h3>
                    <p class="autor">${libro.autor}</p>
                    <p class="dato">${libro.genero}</p>
                </div>
            </article>`).join('');
    } catch (error) {
        destacados.innerHTML = `<p class="error">${error.message}</p>`;
    }
}

iniciar();
