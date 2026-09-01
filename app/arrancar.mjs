/**
 * Un miércoles cualquiera, con colegio.
 *
 * Sin fijar la fecha, las pruebas pasaban el domingo y fallaban el lunes: el
 * día tiene otras tareas, y las que hablan del colegio comprueban lo contrario
 * de lo que toca. Una prueba que depende del día en que se corre no protege
 * nada.
 */
export const MIERCOLES = new Date('2026-09-02T15:00:00Z'); // 09:00 en Guatemala

/**
 * Pone el reloj del navegador en esa fecha y **lo deja andar**.
 *
 * Congelarlo del todo (`setFixedTime`) parece más limpio, pero deja las
 * animaciones a medias para siempre: Playwright espera a que un elemento esté
 * quieto y nunca lo está. Con `install` + `resume` la fecha es la que queremos
 * y el tiempo sigue corriendo.
 */
export async function fijarElDia(contexto, cuando = MIERCOLES) {
  await contexto.clock.install({ time: cuando });
  await contexto.clock.resume();
}

/**
 * El recorrido de bienvenida, para las pruebas que no lo están probando.
 *
 * Desde que existe el asistente, abrir la app con el navegador limpio lleva a
 * la bienvenida, no a Hoy. Las pruebas que solo querían mirar el día se
 * quedaban en la puerta y fallaban por eso, no por lo que probaban.
 */
export async function arrancar(p, { url = 'http://localhost:8123', nombre = 'Leonora' } = {}) {
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1700);
  await p.getByText('Empezar').click();
  await p.waitForTimeout(700);
  await p.getByLabel('Tu nombre').fill(nombre);
  for (let i = 0; i < 4; i++) {
    await p.getByRole('button', { name: 'Siguiente' }).click();
    await p.waitForTimeout(400);
  }
  await p.getByRole('button', { name: 'Armar mi semana' }).click();
  await p.waitForTimeout(900);
  await p.getByText('Me gusta, empezar').click();
  await p.waitForTimeout(1800);
}

/**
 * Contesta «¿Terminaste?» si sale.
 *
 * Marcar una tarea de estudio antes de su hora abre esa pregunta, y mientras
 * está abierta tapa la pantalla entera. No es un fallo: es lo que decide el
 * premio. Pero una prueba que marca tareas tiene que contestarla o se queda
 * esperando a un botón que está debajo.
 */
export async function contestarSiPregunta(p, respuesta = 'Lo terminé') {
  const boton = p.getByText(respuesta, { exact: true });
  if (await boton.count()) {
    await boton.click();
    await p.waitForTimeout(900);
  }
}

/**
 * Ir a otra pantalla por el menú.
 *
 * Desde que la navegación vive en el menú de las tres rayas, las pruebas ya no
 * pueden tocar un enlace al final de Hoy: no está. Esto abre el menú y toca lo
 * que se le diga, que es lo que hace una persona.
 */
export async function irA(p, nombre) {
  await p.getByRole('button', { name: 'Abrir el menú' }).first().click();
  await p.waitForTimeout(650);
  await p.getByRole('link', { name: nombre, exact: true }).click();
  await p.waitForTimeout(1400);
}
