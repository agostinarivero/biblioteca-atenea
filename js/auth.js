// Sesión del usuario guardada en localStorage (sin la contraseña)

function guardarSesion(usuario) {
    const sesion = {
        id: String(usuario.id),
        nombre: usuario.nombre,
        email: usuario.email,
        role: usuario.role
    };
    localStorage.setItem('sesion', JSON.stringify(sesion));
    return sesion;
}

function obtenerSesion() {
    const dato = localStorage.getItem('sesion');
    if (!dato) {
        return null;
    }
    return JSON.parse(dato);
}

function cerrarSesion() {
    localStorage.removeItem('sesion');
    window.location.href = 'login.html';
}

function paginaInicio(role) {
    return role === 'ADMIN' ? 'admin-dashboard.html' : 'catalogo.html';
}

async function buscarPorEmail(email) {
    const usuarios = await listar(URL_USUARIOS);
    return usuarios.find(u => String(u.email).toLowerCase() === email.toLowerCase());
}

// Protege una página: exige sesión y el rol indicado.
// El rol se vuelve a pedir a la API para que no alcance con editar el localStorage.
async function proteger(rolPermitido) {
    const sesion = obtenerSesion();
    if (!sesion) {
        window.location.href = 'login.html';
        return null;
    }
    try {
        const usuario = await obtener(URL_USUARIOS, sesion.id);
        if (usuario.role !== rolPermitido) {
            window.location.href = paginaInicio(usuario.role);
            return null;
        }
        document.getElementById('contenido').classList.remove('oculto');
        return guardarSesion(usuario);
    } catch (error) {
        // El usuario ya no existe o no hay conexión
        localStorage.removeItem('sesion');
        window.location.href = 'login.html';
        return null;
    }
}
