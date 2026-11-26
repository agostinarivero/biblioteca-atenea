// Inicio de sesión

// Si ya inició sesión no tiene que ver el login
const sesionActual = obtenerSesion();
if (sesionActual) {
    window.location.href = paginaInicio(sesionActual.role);
}

armarMenu();

const formLogin = document.getElementById('form-login');
const errorLogin = document.getElementById('error-login');

formLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    errorLogin.textContent = '';

    if (email === '' || password === '') {
        errorLogin.textContent = 'Completá el email y la contraseña.';
        return;
    }

    const boton = formLogin.querySelector('button');
    boton.disabled = true;
    try {
        const usuario = await buscarPorEmail(email);
        // MockAPI no valida contraseñas, la comparación se hace acá
        if (!usuario || usuario.password !== password) {
            errorLogin.textContent = 'Email o contraseña incorrectos.';
        } else {
            const sesion = guardarSesion(usuario);
            window.location.href = paginaInicio(sesion.role);
        }
    } catch (error) {
        errorLogin.textContent = error.message;
    }
    boton.disabled = false;
});
