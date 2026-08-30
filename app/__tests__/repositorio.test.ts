import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { limpiar, sembrar } from './almacen-falso.mjs';
import { RepositorioLocal } from '../src/lib/repositorio.ts';
import { puedoVerElCalendarioDe } from '../src/lib/grupos.ts';
import { sinLeer } from '../src/lib/encargos.ts';
import type { Evento } from '../src/lib/tipos.ts';

const HOY = '2026-09-02'; // miércoles

beforeEach(() => limpiar());

function nuevo() { return new RepositorioLocal(); }

// ------------------------------------------------------------------ personas

test('una cuenta nueva trae una persona y su familia', async () => {
  const r = nuevo();
  const personas = await r.personas();
  assert.equal(personas.length, 1);
  const grupos = await r.grupos();
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].tipo, 'familia');
  // Quien instala no es tutor de nadie por haber instalado.
  const [m] = await r.miembros();
  assert.equal(m.rol, 'miembro');
});

test('añadir a mamá la mete en la familia y le da su propia rutina', async () => {
  const r = nuevo();
  const mama = await r.anadirPersona('Mamá', 'tutor', '👩');
  assert.equal(mama.nombre, 'Mamá');

  const miembros = await r.miembros();
  assert.equal(miembros.length, 2);
  assert.equal(miembros.find((m) => m.persona_id === mama.id)?.rol, 'tutor');

  // La rutina de mamá existe y es suya, no la de la primera persona.
  await r.cambiarPersona(mama.id);
  const suya = await r.rutina();
  assert.ok(suya.length > 0);
  assert.ok(suya.every((b) => b.persona_id === mama.id));
});

test('un nombre en blanco no crea una persona sin nombre: avisa', async () => {
  const r = nuevo();
  await assert.rejects(() => r.anadirPersona('   ', 'tutor'), /nombre/i);
  assert.equal((await r.personas()).length, 1);
});

test('cambiar de persona cambia el día, las rachas y las chispas', async () => {
  const r = nuevo();
  const [yo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');

  const mio = await r.dia(HOY);
  await r.marcarTarea(HOY, mio.tareas[0].id, 'hecha');
  assert.ok(await r.chispasTotales() > 0);

  await r.cambiarPersona(mama.id);
  assert.equal(await r.chispasTotales(), 0);
  const suyo = await r.dia(HOY);
  assert.ok(suyo.tareas.every((t) => t.estado === 'pendiente'));

  await r.cambiarPersona(yo.id);
  assert.ok(await r.chispasTotales() > 0);
});

test('cambiar a alguien que no está avisa en vez de dejar la app en blanco', async () => {
  const r = nuevo();
  await assert.rejects(() => r.cambiarPersona('fantasma'), /ya no está/i);
});

test('no se puede quitar a la única persona de la app', async () => {
  const r = nuevo();
  const [sola] = await r.personas();
  await assert.rejects(() => r.borrarPersona(sola.id), /única/i);
});

test('al quitar a alguien, quien la estaba usando pasa a otra', async () => {
  const r = nuevo();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.cambiarPersona(mama.id);
  await r.borrarPersona(mama.id);
  assert.equal((await r.personas()).length, 1);
  assert.notEqual((await r.persona()).id, mama.id);
});

test('guardar el nombre cambia solo a quien está usando la app', async () => {
  const r = nuevo();
  const [yo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.guardarPersona({ nombre: 'Leonora' });

  const personas = await r.personas();
  assert.equal(personas.find((p) => p.id === yo.id)?.nombre, 'Leonora');
  assert.equal(personas.find((p) => p.id === mama.id)?.nombre, 'Mamá');
});

// ------------------------------------------------------------------ lo mío

test('lo que sale del repositorio es una copia: cambiarlo fuera no toca nada', async () => {
  const r = nuevo();
  const antes = await r.actividades();
  antes[0].nombre = 'Cambiado por fuera';
  const despues = await r.actividades();
  assert.notEqual(despues[0].nombre, 'Cambiado por fuera');
});

test('dos lecturas del día no son el mismo objeto, para que React repinte', async () => {
  const r = nuevo();
  const a = await r.dia(HOY);
  const b = await r.dia(HOY);
  assert.notEqual(a, b);
  assert.notEqual(a.tareas, b.tareas);
});

// ------------------------------------------------------------------ grupos

test('el grupo de las amigas lo crea quien lo crea, y ella entra de miembro', async () => {
  const r = nuevo();
  const [yo] = await r.personas();
  const g = await r.crearGrupo('Las amigas', 'amigos');
  assert.equal(g.creado_por, yo.id);
  const m = (await r.miembros()).find((x) => x.grupo_id === g.id);
  assert.equal(m?.rol, 'miembro');
  assert.equal(m?.estado, 'activo');
});

test('un grupo sin nombre no se crea a medias: avisa', async () => {
  const r = nuevo();
  await assert.rejects(() => r.crearGrupo('  ', 'amigos'), /nombre/i);
  assert.equal((await r.grupos()).length, 1);
});

test('una invitación se queda esperando hasta que la contestan', async () => {
  const r = nuevo();
  const g = await r.crearGrupo('Las amigas', 'amigos');
  const emma = await r.anadirPersona('Emma', 'miembro', '🙋');
  await r.invitarAGrupo(g.id, emma.id, 'miembro');

  assert.equal(
    (await r.miembros()).find((m) => m.grupo_id === g.id && m.persona_id === emma.id)?.estado,
    'invitado',
  );

  await r.cambiarPersona(emma.id);
  await r.responderInvitacion(g.id, true);
  assert.equal(
    (await r.miembros()).find((m) => m.grupo_id === g.id && m.persona_id === emma.id)?.estado,
    'activo',
  );
});

test('no se invita dos veces a la misma persona', async () => {
  const r = nuevo();
  const g = await r.crearGrupo('Las amigas', 'amigos');
  const emma = await r.anadirPersona('Emma', 'miembro', '🙋');
  await r.invitarAGrupo(g.id, emma.id, 'miembro');
  await assert.rejects(() => r.invitarAGrupo(g.id, emma.id, 'miembro'), /ya está/i);
});

test('enseñar mi calendario se enciende y se apaga cuando yo quiera', async () => {
  const r = nuevo();
  const [yo] = await r.personas();
  const g = await r.crearGrupo('Las amigas', 'amigos');
  // Emma es amiga, no familia: entra solo al grupo de las amigas.
  const emma = await r.anadirPersona('Emma', 'miembro', '🙋', g.id);

  const grupos = await r.grupos();
  // Fuera de casa nadie enseña nada hasta que lo enciende.
  assert.equal(puedoVerElCalendarioDe(grupos, await r.miembros(), yo.id, emma.id), false);

  // Y lo enciende ella, en su propia pantalla: nadie lo enciende por ella.
  await r.cambiarPersona(emma.id);
  await r.verMiCalendario(g.id, true);
  assert.equal(puedoVerElCalendarioDe(grupos, await r.miembros(), yo.id, emma.id), true);

  await r.verMiCalendario(g.id, false);
  assert.equal(puedoVerElCalendarioDe(grupos, await r.miembros(), yo.id, emma.id), false);
});

test('en casa se comparte de entrada, y papá sigue viendo aunque ella lo apague', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const papa = await r.anadirPersona('Papá', 'tutor');
  const g = (await r.grupos()).find((x) => x.tipo === 'familia')!;

  // De fábrica, en casa todos se ven: es lo que pidió el papá de esta app.
  assert.equal(puedoVerElCalendarioDe(await r.grupos(), await r.miembros(), leo.id, papa.id), true);

  // Leonora apaga el suyo. Papá la sigue viendo, porque es su papá; y la app
  // se lo dice a ella en su pantalla en vez de mirarla a escondidas.
  await r.verMiCalendario(g.id, false);
  assert.equal(puedoVerElCalendarioDe(await r.grupos(), await r.miembros(), papa.id, leo.id), true);

  // Papá apaga el suyo: entonces ella deja de ver el de él.
  await r.cambiarPersona(papa.id);
  await r.verMiCalendario(g.id, false);
  assert.equal(puedoVerElCalendarioDe(await r.grupos(), await r.miembros(), leo.id, papa.id), false);
});

test('salir de un grupo lo saca de mis grupos', async () => {
  const r = nuevo();
  const g = await r.crearGrupo('Las amigas', 'amigos');
  await r.salirDelGrupo(g.id);
  const mio = (await r.miembros()).find((m) => m.grupo_id === g.id);
  assert.equal(mio?.estado, 'salio');
});

// ----------------------------------------------------------------- encargos

test('un encargo de mamá llega a la campanita y al día de la hija', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');

  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: 'Sacar la basura', nota: null,
    fecha: HOY, hora_sugerida: '17:30', tipo: 'tarea',
  });
  assert.equal(enc.de_persona_id, mama.id);
  assert.equal(enc.visto_en, null);

  await r.cambiarPersona(leo.id);
  assert.equal(sinLeer(await r.encargos(), leo.id), 1);
  const d = await r.dia(HOY);
  const t = d.tareas.find((x) => x.encargo_id === enc.id);
  assert.equal(t?.titulo, 'Sacar la basura');
  assert.equal(t?.hora_inicio, '17:30');
});

test('un encargo que llega con el día ya armado entra igual, y no dos veces', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');

  // La hija abre su día ANTES de que llegue el recado.
  await r.dia(HOY);

  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: 'Sacar la basura', nota: null,
    fecha: HOY, hora_sugerida: '17:30', tipo: 'tarea',
  });

  await r.cambiarPersona(leo.id);
  const d = await r.dia(HOY);
  assert.equal(d.tareas.filter((t) => t.encargo_id === enc.id).length, 1);
  const otra = await r.dia(HOY);
  assert.equal(otra.tareas.filter((t) => t.encargo_id === enc.id).length, 1);
});

test('un recordatorio se lee en la campanita pero no ocupa hora en el día', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: 'Acuérdate del abrigo', nota: null,
    fecha: HOY, hora_sugerida: null, tipo: 'recordatorio',
  });
  await r.cambiarPersona(leo.id);
  assert.equal(sinLeer(await r.encargos(), leo.id), 1);
  const d = await r.dia(HOY);
  assert.equal(d.tareas.filter((t) => t.encargo_id === enc.id).length, 0);
});

test('marcar la tarea aquí se ve allá: quien la mandó ve que ya está', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: 'Sacar la basura', nota: null,
    fecha: HOY, hora_sugerida: '17:30', tipo: 'tarea',
  });

  await r.cambiarPersona(leo.id);
  const d = await r.dia(HOY);
  const t = d.tareas.find((x) => x.encargo_id === enc.id)!;
  await r.marcarTarea(HOY, t.id, 'hecha');

  const despues = (await r.encargos()).find((e) => e.id === enc.id);
  assert.equal(despues?.estado, 'hecho');
});

test('la campanita se calla cuando se abre el recado, no cuando se hace', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: 'Sacar la basura', nota: null,
    fecha: HOY, hora_sugerida: null, tipo: 'tarea',
  });
  await r.cambiarPersona(leo.id);
  assert.equal(sinLeer(await r.encargos(), leo.id), 1);
  await r.verEncargo(enc.id);
  assert.equal(sinLeer(await r.encargos(), leo.id), 0);
});

test('la respuesta de la hija queda guardada para que su mamá la vea', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: '¿Cómo te fue?', nota: null,
    fecha: HOY, hora_sugerida: null, tipo: 'consejo',
  });

  await r.cambiarPersona(leo.id);
  await r.responderEncargo(enc.id, '  Bien, saqué 9  ');

  await r.cambiarPersona(mama.id);
  const visto = (await r.encargos()).find((e) => e.id === enc.id);
  assert.equal(visto?.respuesta, 'Bien, saqué 9');
  assert.ok(visto?.respondido_en);
});

test('una respuesta en blanco no se manda: avisa', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: 'Algo', nota: null,
    fecha: HOY, hora_sugerida: null, tipo: 'consejo',
  });
  await assert.rejects(() => r.responderEncargo(enc.id, '   '), /respuesta/i);
});

test('un encargo sin título no se manda, y sin destinatario tampoco', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  await assert.rejects(() => r.mandarEncargo({
    para_persona_id: leo.id, titulo: '  ', nota: null,
    fecha: HOY, hora_sugerida: null, tipo: 'tarea',
  }), /escribe/i);
  await assert.rejects(() => r.mandarEncargo({
    para_persona_id: 'fantasma', titulo: 'Algo', nota: null,
    fecha: HOY, hora_sugerida: null, tipo: 'tarea',
  }), /a quién/i);
});

test('archivar un recado se lleva su tarea del día', async () => {
  const r = nuevo();
  const [leo] = await r.personas();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.cambiarPersona(mama.id);
  const enc = await r.mandarEncargo({
    para_persona_id: leo.id, titulo: 'Sacar la basura', nota: null,
    fecha: HOY, hora_sugerida: '17:30', tipo: 'tarea',
  });
  await r.cambiarPersona(leo.id);
  await r.dia(HOY);
  await r.archivarEncargo(enc.id);
  const d = await r.dia(HOY);
  assert.equal(d.tareas.filter((t) => t.encargo_id === enc.id).length, 0);
  assert.equal(sinLeer(await r.encargos(), leo.id), 0);
});

// ------------------------------------------------------------------ eventos

function evento(id: string, e: Partial<Evento> = {}): Evento {
  return {
    id, grupo_id: null, persona_id: null, tipo: 'feriado', titulo: id,
    descripcion: null, fecha_inicio: HOY, fecha_fin: HOY, todo_el_dia: true,
    hora_inicio: null, hora_fin: null, repeticion: 'ninguna',
    efecto: 'libra_el_dia', origen: 'manual', confianza: null, confirmado: true,
    ...e,
  };
}

test('un feriado guardado hoy quita el colegio del día que ya estaba escrito', async () => {
  const r = nuevo();
  const manana = '2999-01-01'; // un día futuro, para no tocar lo ya vivido
  const antes = await r.dia(manana);
  const conColegio = antes.tareas.some((t) => t.tipo === 'estudio');

  await r.guardarEvento(evento('Feriado', { fecha_inicio: manana, fecha_fin: manana }));

  const despues = await r.dia(manana);
  assert.equal(conColegio && despues.tareas.some((t) => t.tipo === 'estudio'), false);
  assert.equal(despues.dia.tipo, 'feriado');
});

test('un feriado no rehace un día que ya pasó, para no borrar lo marcado', async () => {
  const r = nuevo();
  const ayer = '2020-01-02';
  const d = await r.dia(ayer);
  await r.marcarTarea(ayer, d.tareas[0].id, 'hecha');

  await r.guardarEvento(evento('Feriado viejo', { fecha_inicio: ayer, fecha_fin: ayer }));

  const despues = await r.dia(ayer);
  assert.equal(despues.tareas.find((t) => t.id === d.tareas[0].id)?.estado, 'hecha');
});

test('un evento sin nombre o que termina antes de empezar no se guarda', async () => {
  const r = nuevo();
  await assert.rejects(() => r.guardarEvento(evento('x', { titulo: '  ' })), /nombre/i);
  await assert.rejects(
    () => r.guardarEvento(evento('x', { fecha_inicio: '2026-09-05', fecha_fin: '2026-09-01' })),
    /antes de empezar/i,
  );
  assert.deepEqual(await r.eventos(), []);
});

test('borrar un feriado devuelve el colegio al día', async () => {
  const r = nuevo();
  const manana = '2999-01-04'; // lunes
  await r.guardarEvento(evento('Feriado', { fecha_inicio: manana, fecha_fin: manana }));
  assert.equal((await r.dia(manana)).dia.tipo, 'feriado');
  await r.borrarEvento('Feriado');
  assert.notEqual((await r.dia(manana)).dia.tipo, 'feriado');
});

// ----------------------------------------------------------------- guardado

test('lo guardado sobrevive a cerrar y abrir la app', async () => {
  const r = nuevo();
  const mama = await r.anadirPersona('Mamá', 'tutor');
  await r.guardarPersona({ nombre: 'Leonora' });

  const otro = nuevo(); // como si se hubiera cerrado y abierto
  const personas = await otro.personas();
  assert.deepEqual(personas.map((p) => p.nombre).sort(), ['Leonora', 'Mamá']);
  assert.equal((await otro.persona()).nombre, 'Leonora');
  assert.equal((await otro.miembros()).find((m) => m.persona_id === mama.id)?.rol, 'tutor');
});

test('lo guardado antes de la Fase 5 se convierte, no se pierde', async () => {
  sembrar('graceday.v1', JSON.stringify({
    persona: { id: 'local', nombre: 'Leonora', avatar_tipo: 'emoji',
      avatar_valor: '👧', zona_horaria: 'America/Guatemala' },
    ajustes: { persona_id: 'local', arranque_hecho: true, dias_ocupados: [1, 2, 3, 4, 5] },
    actividades: [], rutina: [], dias: {},
    rachas: { devocional: { via: 'devocional', racha_actual: 7, racha_mejor: 9,
      total_dias: 12, ultimo_dia: '2026-09-01', gracia_usada_mes: null } },
    logros_ganados: ['devocional-7'],
    chispas: 340,
  }));

  const r = nuevo();
  assert.equal((await r.persona()).nombre, 'Leonora');
  assert.equal(await r.chispasTotales(), 340);
  assert.deepEqual(await r.logrosGanados(), ['devocional-7']);
  assert.equal((await r.rachas()).find((x) => x.via === 'devocional')?.racha_actual, 7);
  assert.equal((await r.ajustes()).arranque_hecho, true);
  // Y ya tiene familia, aunque la versión vieja no la tuviera.
  assert.equal((await r.grupos())[0].tipo, 'familia');
});

test('un almacén ilegible no deja la app sin arrancar', async () => {
  sembrar('graceday.v2', '{esto no es json');
  const r = nuevo();
  assert.equal((await r.personas()).length, 1);
});

test('empezar de nuevo borra también lo de la versión vieja', async () => {
  sembrar('graceday.v1', JSON.stringify({ persona: { id: 'local', nombre: 'Vieja' } }));
  const r = nuevo();
  assert.equal((await r.persona()).nombre, 'Vieja');
  await r.empezarDeNuevo();
  assert.equal((await r.persona()).nombre, '');
});
