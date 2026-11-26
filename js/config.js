// URLs de los recursos en MockAPI (prestamos está en un segundo proyecto)
const URL_USUARIOS = 'https://6b04878adb01cf46360755c6.mockapi.io/api/v1/usuarios';
const URL_LIBROS = 'https://6b04878adb01cf46360755c6.mockapi.io/api/v1/libros';
const URL_PRESTAMOS = 'https://6b04922fdb01cf46360764a4.mockapi.io/prestamos';

// Reglas del préstamo
const DIAS_PRESTAMO = 14;
const MAX_PRESTAMOS = 3;

// Estados posibles de un préstamo y la clase CSS de cada uno
const ESTADOS = ['Solicitado', 'En préstamo', 'Devuelto', 'Vencido'];
const CLASES_ESTADO = {
    'Solicitado': 'solicitado',
    'En préstamo': 'en-prestamo',
    'Devuelto': 'devuelto',
    'Vencido': 'vencido'
};
