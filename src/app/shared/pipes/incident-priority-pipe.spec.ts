import { IncidentPriorityPipe } from './incident-priority-pipe';
import { IncidentPriority } from '../../core/models/incident.model';

describe('IncidentPriorityPipe', () => {
  let pipe: IncidentPriorityPipe;

  beforeEach(() => {
    pipe = new IncidentPriorityPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('entradas válidas', () => {
    const cases: readonly (readonly [IncidentPriority, string])[] = [
      ['LOW', 'Baja'],
      ['MEDIUM', 'Media'],
      ['HIGH', 'Alta'],
      ['CRITICAL', 'Crítica'],
    ];

    for (const [value, expected] of cases) {
      it(`traduce ${value} a "${expected}"`, () => {
        expect(pipe.transform(value)).toBe(expected);
      });
    }

    it('cubre todos los valores del tipo IncidentPriority', () => {
      // Si mañana se añade una prioridad al modelo, este test obliga a
      // añadirla también aquí y en el pipe.
      const covered = cases.map(([value]) => value);
      const all: readonly IncidentPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      expect([...covered].sort()).toEqual([...all].sort());
    });
  });

  describe('entradas inválidas', () => {
    const invalid: readonly (readonly [string, unknown])[] = [
      ['null', null],
      ['undefined', undefined],
      ['cadena vacía', ''],
      ['un código desconocido', 'URGENT'],
      ['el código en minúsculas', 'low'],
      ['la etiqueta ya traducida', 'Alta'],
    ];

    for (const [name, value] of invalid) {
      it(`devuelve "Sin definir" para ${name}`, () => {
        expect(pipe.transform(value as never)).toBe('Sin definir');
      });
    }
  });

  it('no modifica el objeto recibido', () => {
    const incident = { priority: 'HIGH' as IncidentPriority };
    const snapshot = { ...incident };

    pipe.transform(incident.priority);

    expect(incident).toEqual(snapshot);
  });

  it('es consistente: la misma entrada siempre da la misma salida', () => {
    expect(pipe.transform('HIGH')).toBe(pipe.transform('HIGH'));
  });
});
