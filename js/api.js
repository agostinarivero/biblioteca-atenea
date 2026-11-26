// Funciones para consumir MockAPI con fetch

// Hace el fetch y transforma el error de red en un mensaje claro
async function conectar(url, opciones) {
    try {
        return await fetch(url, opciones);
    } catch (error) {
        throw new Error('No se pudo conectar con el servidor.');
    }
}

async function pedir(url, metodo, datos) {
    const opciones = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' }
    };
    if (datos) {
        opciones.body = JSON.stringify(datos);
    }
    const respuesta = await conectar(url, opciones);
    if (!respuesta.ok) {
        throw new Error(`Error del servidor (${respuesta.status}).`);
    }
    return await respuesta.json();
}

// Trae todos los registros de un recurso
async function listar(url) {
    const respuesta = await conectar(url);
    // MockAPI responde 404 cuando no hay datos
    if (respuesta.status === 404) {
        return [];
    }
    if (!respuesta.ok) {
        throw new Error(`Error del servidor (${respuesta.status}).`);
    }
    return await respuesta.json();
}

const obtener = (url, id) => pedir(`${url}/${id}`, 'GET');
const crear = (url, datos) => pedir(url, 'POST', datos);
const actualizar = (url, id, datos) => pedir(`${url}/${id}`, 'PUT', datos);
const eliminar = (url, id) => pedir(`${url}/${id}`, 'DELETE');
