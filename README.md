# Biblioteca Atenea - Sistema de alquiler y préstamo de libros

TPI Tema 8 - Programación III

Sistema web para una biblioteca: los socios exploran el catálogo, piden libros en préstamo y consultan fecha de devolución. El administrador gestiona libros, los préstamos y los usuarios, y tiene un dashboard con gráficos.

Los datos se guardan en MockAPI.

## Cómo usarlo

1. Abrir `index.html` en el navegador.
2. Usuarios de prueba:
   - Administrador: admin@biblioteca.com / admin123
   - Socio: maria@test.com / 123456
   - Socio: lucas@biblioteca.com / socio123

## MockAPI

Las URLs están en `js/config.js`. Recursos:

- `usuarios`: id, nombre, email, password, role
- `libros`: id, titulo, autor, genero, ISBN, disponible, portada
- `prestamos`: id, userId, bookId, fechaPrestamo, fechaLimite, estado

`prestamos` está en un segundo proyecto de MockAPI porque el plan gratuito no nos dejó crear los tres recursos en el mismo proyecto.

Como MockAPI no valida contraseñas ni tiene relaciones entre recursos, el login se compara en JavaScript y los préstamos se cruzan con libros y usuarios buscando por id en los arrays.

## Páginas

- `index.html`: inicio
- `login.html` y `registro.html`: inicio de sesión y registro de socios
- `catalogo.html`: catálogo con buscador y filtros por género y autor (socio)
- `mis-prestamos.html`: préstamos activos e historial (socio)
- `perfil.html`: datos personales y cambio de contraseña (socio)
- `admin-dashboard.html`: indicadores y gráficos (admin)
- `admin-libros.html`: alta, baja y modificación de libros (admin)
- `admin-prestamos.html`: cambio de estado de los préstamos (admin)
- `admin-usuarios.html`: alta de usuarios y cambio de contraseña (admin)

## Integrantes

- Agustín Jaluf
- Abril Haedo
- Agostina Rivero
