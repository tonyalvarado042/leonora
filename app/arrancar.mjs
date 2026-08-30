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
    await p.getByText('Siguiente').click();
    await p.waitForTimeout(400);
  }
  await p.getByText('Armar mi semana').click();
  await p.waitForTimeout(900);
  await p.getByText('Me gusta, empezar').click();
  await p.waitForTimeout(1800);
}
