// Carga de datos de ejemplo en MockAPI

armarMenu();

const registro = document.getElementById('registro');
const btnCargar = document.getElementById('btn-cargar');

const LIBROS = [
    { titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', genero: 'Novela', ISBN: '9780307474728' },
    { titulo: 'Ficciones', autor: 'Jorge Luis Borges', genero: 'Cuentos', ISBN: '9788420633121' },
    { titulo: 'Rayuela', autor: 'Julio Cortázar', genero: 'Novela', ISBN: '9788437604572' },
    { titulo: 'El Aleph', autor: 'Jorge Luis Borges', genero: 'Cuentos', ISBN: '9788420633145' },
    { titulo: '1984', autor: 'George Orwell', genero: 'Ciencia ficción', ISBN: '9780451524935' },
    { titulo: 'Fahrenheit 451', autor: 'Ray Bradbury', genero: 'Ciencia ficción', ISBN: '9781451673319' },
    { titulo: 'El principito', autor: 'Antoine de Saint-Exupéry', genero: 'Infantil', ISBN: '9780156012195' },
    { titulo: 'Sapiens', autor: 'Yuval Noah Harari', genero: 'Ensayo', ISBN: '9780062316097' },
    { titulo: 'Orgullo y prejuicio', autor: 'Jane Austen', genero: 'Clásico', ISBN: '9780141439518' },
    { titulo: 'El nombre de la rosa', autor: 'Umberto Eco', genero: 'Misterio', ISBN: '9780156001311' },
    { titulo: 'Crónica de una muerte anunciada', autor: 'Gabriel García Márquez', genero: 'Novela', ISBN: '9781400034710' },
    { titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', genero: 'Clásico', ISBN: '9788420412146' }
];

// libro = posición en la lista de libros, dias = hace cuántos días se pidió
const PRESTAMOS = [
    { libro: 0, socio: 'socio', dias: 40, estado: 'Devuelto' },
    { libro: 4, socio: 'socio', dias: 5, estado: 'En préstamo' },
    { libro: 1, socio: 'lucas', dias: 20, estado: 'En préstamo' },
    { libro: 7, socio: 'lucas', dias: 0, estado: 'Solicitado' },
    { libro: 0, socio: 'lucas', dias: 15, estado: 'Devuelto' },
    { libro: 5, socio: 'socio', dias: 60, estado: 'Devuelto' },
    { libro: 4, socio: 'lucas', dias: 70, estado: 'Devuelto' },
    { libro: 9, socio: 'socio', dias: 30, estado: 'Devuelto' },
    { libro: 2, socio: 'lucas', dias: 50, estado: 'Devuelto' }
];

function anotar(texto) {
    registro.classList.remove('oculto');
    const li = document.createElement('li');
    li.textContent = texto;
    registro.appendChild(li);
}

// Pausa entre pedidos para no superar el límite de MockAPI
function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function crearUsuarioSiFalta(usuarios, datos) {
    const existente = usuarios.find(u => String(u.email).toLowerCase() === datos.email);
    if (existente) {
        anotar(`${datos.email} ya existe.`);
        return existente;
    }
    const nuevo = await crear(URL_USUARIOS, datos);
    anotar(`Usuario creado: ${datos.email}`);
    await esperar(150);
    return nuevo;
}

async function cargarDatos() {
    const usuarios = await listar(URL_USUARIOS);
    if (usuarios.some(u => u.role === 'ADMIN')) {
        anotar('Ya existe un administrador.');
    } else {
        await crearUsuarioSiFalta(usuarios, { nombre: 'Administrador', email: 'admin@biblioteca.com', password: 'admin123', role: 'ADMIN' });
    }
    const socios = {
        socio: await crearUsuarioSiFalta(usuarios, { nombre: 'María', email: 'maria@test.com', password: '123456', role: 'USUARIO' }),
        lucas: await crearUsuarioSiFalta(usuarios, { nombre: 'Lucas Pérez', email: 'lucas@biblioteca.com', password: 'socio123', role: 'USUARIO' })
    };

    let libros = await listar(URL_LIBROS);
    if (libros.length > 0) {
        anotar(`Ya hay ${libros.length} libros cargados.`);
    } else {
        for (let i = 0; i < LIBROS.length; i++) {
            const datos = LIBROS[i];
            datos.portada = `https://covers.openlibrary.org/b/isbn/${datos.ISBN}-L.jpg?default=false`;
            datos.disponible = true;
            libros.push(await crear(URL_LIBROS, datos));
            anotar(`Libro creado: ${datos.titulo}`);
            await esperar(150);
        }
    }

    const prestamos = await listar(URL_PRESTAMOS);
    if (prestamos.length > 0) {
        anotar(`Ya hay ${prestamos.length} préstamos cargados.`);
        return;
    }
    for (let i = 0; i < PRESTAMOS.length; i++) {
        const ejemplo = PRESTAMOS[i];
        const libro = libros[ejemplo.libro];
        if (!libro) continue;
        const fecha = sumarDias(hoy(), -ejemplo.dias);
        await crear(URL_PRESTAMOS, {
            userId: String(socios[ejemplo.socio].id),
            bookId: String(libro.id),
            fechaPrestamo: fecha,
            fechaLimite: sumarDias(fecha, DIAS_PRESTAMO),
            estado: ejemplo.estado
        });
        // Si el préstamo sigue activo, el libro queda no disponible
        if (ejemplo.estado !== 'Devuelto') {
            libro.disponible = false;
            await actualizar(URL_LIBROS, libro.id, libro);
        }
        anotar(`Préstamo creado: ${libro.titulo} (${ejemplo.estado})`);
        await esperar(150);
    }
}

btnCargar.addEventListener('click', async () => {
    registro.innerHTML = '';
    btnCargar.disabled = true;
    try {
        await cargarDatos();
        anotar('Listo. Ya se puede iniciar sesión.');
        mostrarMensaje('Datos de ejemplo cargados.');
    } catch (error) {
        anotar('Error: ' + error.message);
        mostrarMensaje(error.message, 'error');
    }
    btnCargar.disabled = false;
});
