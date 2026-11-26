// Perfil del socio: datos personales y cambio de contraseña

const formDatos = document.getElementById('form-datos');
const formPassword = document.getElementById('form-password');
const inputNombre = document.getElementById('nombre');
const inputEmail = document.getElementById('email');
const errorDatos = document.getElementById('error-datos');
const errorPassword = document.getElementById('error-password');

let sesion = null;

async function iniciar() {
    sesion = await proteger('USUARIO');
    if (!sesion) return;
    armarMenu();
    inputNombre.value = sesion.nombre;
    inputEmail.value = sesion.email;
}

formDatos.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nombre = inputNombre.value.trim();
    const email = inputEmail.value.trim().toLowerCase();
    errorDatos.textContent = '';

    if (nombre.length < 3) {
        errorDatos.textContent = 'Ingresá tu nombre y apellido.';
        return;
    }
    if (!emailValido(email)) {
        errorDatos.textContent = 'El email no tiene un formato válido.';
        return;
    }

    try {
        const existente = await buscarPorEmail(email);
        if (existente && String(existente.id) !== sesion.id) {
            throw new Error('Ese email ya lo usa otra cuenta.');
        }
        // Se trae el usuario completo para no perder la contraseña ni el rol
        const usuario = await obtener(URL_USUARIOS, sesion.id);
        usuario.nombre = nombre;
        usuario.email = email;
        const actualizado = await actualizar(URL_USUARIOS, sesion.id, usuario);
        sesion = guardarSesion(actualizado);
        armarMenu();
        mostrarMensaje('Datos actualizados.');
    } catch (error) {
        errorDatos.textContent = error.message;
    }
});

formPassword.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const actual = document.getElementById('actual').value;
    const nueva = document.getElementById('nueva').value;
    const confirmar = document.getElementById('confirmar').value;
    errorPassword.textContent = '';

    if (nueva.length < 6) {
        errorPassword.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
        return;
    }
    if (nueva !== confirmar) {
        errorPassword.textContent = 'Las contraseñas nuevas no coinciden.';
        return;
    }

    try {
        const usuario = await obtener(URL_USUARIOS, sesion.id);
        if (usuario.password !== actual) {
            throw new Error('La contraseña actual es incorrecta.');
        }
        usuario.password = nueva;
        await actualizar(URL_USUARIOS, sesion.id, usuario);
        formPassword.reset();
        mostrarMensaje('Contraseña actualizada.');
    } catch (error) {
        errorPassword.textContent = error.message;
    }
});

iniciar();
