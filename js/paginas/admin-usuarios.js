// Administración de usuarios: alta, cambio de contraseña y baja

const tabla = document.getElementById('tabla-usuarios');
const formUsuario = document.getElementById('form-usuario');
const formPassword = document.getElementById('form-password');
const panelPassword = document.getElementById('panel-password');
const errorUsuario = document.getElementById('error-usuario');
const errorPassword = document.getElementById('error-password');
const buscador = document.getElementById('buscador');
const filtroRol = document.getElementById('filtro-rol');

let sesion = null;
let usuarios = [];
let prestamos = [];
let usuarioElegido = null;

async function iniciar() {
    sesion = await proteger('ADMIN');
    if (!sesion) return;
    armarMenu();
    await cargarDatos();
}

async function cargarDatos() {
    tabla.innerHTML = '<tr><td colspan="4">Cargando usuarios...</td></tr>';
    try {
        usuarios = await listar(URL_USUARIOS);
        prestamos = await listar(URL_PRESTAMOS);
        mostrar();
    } catch (error) {
        tabla.innerHTML = `<tr><td colspan="4" class="error">${error.message}</td></tr>`;
    }
}

function prestamosActivos(idUsuario) {
    return prestamos.filter(p => String(p.userId) === String(idUsuario) && esActivo(p)).length;
}

function mostrar() {
    const socios = usuarios.filter(u => u.role === 'USUARIO').length;
    document.getElementById('resumen').textContent =
        `${usuarios.length} usuarios: ${socios} socios y ${usuarios.length - socios} administradores.`;

    const texto = buscador.value.trim().toLowerCase();
    const lista = usuarios
        .filter(u => (contiene(u.nombre, texto) || contiene(u.email, texto)) &&
            (filtroRol.value === '' || u.role === filtroRol.value))
        .sort((a, b) => a.nombre < b.nombre ? -1 : 1);

    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4">No hay usuarios que coincidan.</td></tr>';
        return;
    }
    tabla.innerHTML = lista.map(u => {
        const esYo = String(u.id) === sesion.id;
        // No se permite que el admin se elimine a sí mismo
        const botonEliminar = esYo ? '' :
            `<button class="btn btn-chico btn-peligro" data-accion="eliminar" data-id="${u.id}">Eliminar</button>`;
        return `
            <tr>
                <td><strong>${u.nombre}</strong>${esYo ? ' (vos)' : ''}<br><small>${u.email}</small></td>
                <td><span class="rol ${u.role === 'ADMIN' ? 'rol-admin' : ''}">${u.role}</span></td>
                <td>${prestamosActivos(u.id)}</td>
                <td class="acciones">
                    <button class="btn btn-chico btn-secundario" data-accion="password" data-id="${u.id}">Cambiar contraseña</button>
                    ${botonEliminar}
                </td>
            </tr>`;
    }).join('');
}

formUsuario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        password: document.getElementById('password').value,
        role: document.getElementById('role').value
    };

    let error = '';
    if (datos.nombre.length < 3) error = 'Ingresá el nombre y apellido.';
    else if (!emailValido(datos.email)) error = 'El email no tiene un formato válido.';
    else if (datos.password.length < 6) error = 'La contraseña debe tener al menos 6 caracteres.';
    else if (usuarios.some(u => String(u.email).toLowerCase() === datos.email)) error = 'Ya existe un usuario con ese email.';
    errorUsuario.textContent = error;
    if (error) return;

    try {
        usuarios.push(await crear(URL_USUARIOS, datos));
        formUsuario.reset();
        mostrar();
        mostrarMensaje(`Usuario ${datos.email} creado.`);
    } catch (err) {
        errorUsuario.textContent = err.message;
    }
});

function abrirCambioPassword(usuario) {
    usuarioElegido = usuario;
    formPassword.reset();
    errorPassword.textContent = '';
    document.getElementById('usuario-elegido').textContent = `${usuario.nombre} (${usuario.email})`;
    panelPassword.classList.remove('oculto');
    document.getElementById('nueva').focus();
}

function cerrarCambioPassword() {
    usuarioElegido = null;
    panelPassword.classList.add('oculto');
}

formPassword.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nueva = document.getElementById('nueva').value;
    const confirmar = document.getElementById('confirmar').value;

    if (nueva.length < 6) {
        errorPassword.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        return;
    }
    if (nueva !== confirmar) {
        errorPassword.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    try {
        usuarioElegido.password = nueva;
        await actualizar(URL_USUARIOS, usuarioElegido.id, usuarioElegido);
        mostrarMensaje(`Contraseña de ${usuarioElegido.nombre} actualizada.`);
        cerrarCambioPassword();
    } catch (error) {
        errorPassword.textContent = error.message;
    }
});

async function eliminarUsuario(usuario) {
    if (prestamosActivos(usuario.id) > 0) {
        mostrarMensaje('No se puede eliminar: el usuario tiene préstamos activos.', 'error');
        return;
    }
    if (!confirm(`¿Eliminar la cuenta de ${usuario.nombre}?`)) return;
    try {
        await eliminar(URL_USUARIOS, usuario.id);
        usuarios = usuarios.filter(u => u !== usuario);
        if (usuarioElegido === usuario) cerrarCambioPassword();
        mostrar();
        mostrarMensaje('Usuario eliminado.');
    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

tabla.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    const usuario = buscarPorId(usuarios, boton.dataset.id);
    if (!usuario) return;
    if (boton.dataset.accion === 'password') abrirCambioPassword(usuario);
    if (boton.dataset.accion === 'eliminar') eliminarUsuario(usuario);
});

document.getElementById('btn-cancelar').addEventListener('click', cerrarCambioPassword);
buscador.addEventListener('input', mostrar);
filtroRol.addEventListener('change', mostrar);

iniciar();
