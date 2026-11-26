// Registro de socios

const sesionActual = obtenerSesion();
if (sesionActual) {
    window.location.href = paginaInicio(sesionActual.role);
}

armarMenu();

const formRegistro = document.getElementById('form-registro');
const errorRegistro = document.getElementById('error-registro');

function validarRegistro(datos) {
    if (datos.nombre.length < 3) return 'Ingresá tu nombre y apellido.';
    if (!emailValido(datos.email)) return 'El email no tiene un formato válido.';
    if (datos.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (datos.password !== datos.confirmar) return 'Las contraseñas no coinciden.';
    return '';
}

formRegistro.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        password: document.getElementById('password').value,
        confirmar: document.getElementById('confirmar').value
    };

    const error = validarRegistro(datos);
    errorRegistro.textContent = error;
    if (error) return;

    const boton = formRegistro.querySelector('button');
    boton.disabled = true;
    try {
        if (await buscarPorEmail(datos.email)) {
            throw new Error('Ya existe una cuenta con ese email.');
        }
        // El registro público siempre crea socios, nunca administradores
        const nuevo = await crear(URL_USUARIOS, {
            nombre: datos.nombre,
            email: datos.email,
            password: datos.password,
            role: 'USUARIO'
        });
        guardarSesion(nuevo);
        window.location.href = 'catalogo.html';
    } catch (err) {
        errorRegistro.textContent = err.message;
        boton.disabled = false;
    }
});
