import { RelativeTimePipe } from './relative-time-pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  /** Instante fijo de referencia: las pruebas no dependen del reloj real. */
  const NOW = new Date('2026-08-05T12:00:00.000Z');

  beforeEach(() => {
    pipe = new RelativeTimePipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('entradas válidas', () => {
    const cases: readonly (readonly [string, string, string])[] = [
      ['menos de un minuto', '2026-08-05T11:59:30.000Z', 'hace unos segundos'],
      ['minutos', '2026-08-05T11:45:00.000Z', 'hace 15 minutos'],
      ['horas', '2026-08-05T09:00:00.000Z', 'hace 3 horas'],
      ['un día', '2026-08-04T12:00:00.000Z', 'ayer'],
      ['varios días', '2026-08-01T12:00:00.000Z', 'hace 4 días'],
      ['meses', '2026-06-05T12:00:00.000Z', 'hace 2 meses'],
      ['años', '2024-08-05T12:00:00.000Z', 'hace 2 años'],
    ];

    for (const [name, value, expected] of cases) {
      it(`describe ${name}: "${expected}"`, () => {
        expect(pipe.transform(value, NOW)).toBe(expected);
      });
    }

    it('acepta Date y number además de string', () => {
      const threeHoursAgo = new Date('2026-08-05T09:00:00.000Z');

      expect(pipe.transform(threeHoursAgo, NOW)).toBe('hace 3 horas');
      expect(pipe.transform(threeHoursAgo.getTime(), NOW)).toBe('hace 3 horas');
    });

    it('trunca hacia la unidad inferior en vez de redondear', () => {
      // 47 horas siguen siendo un día, no dos.
      expect(pipe.transform('2026-08-03T13:00:00.000Z', NOW)).toBe('ayer');
    });

    it('también expresa fechas futuras', () => {
      expect(pipe.transform('2026-08-06T12:00:00.000Z', NOW)).toBe('mañana');
    });

    it('es consistente: la misma entrada siempre da la misma salida', () => {
      const first = pipe.transform('2026-08-01T12:00:00.000Z', NOW);
      const second = pipe.transform('2026-08-01T12:00:00.000Z', NOW);

      expect(first).toBe(second);
    });
  });

  describe('entradas inválidas', () => {
    const invalid: readonly (readonly [string, unknown])[] = [
      ['null', null],
      ['undefined', undefined],
      ['cadena vacía', ''],
      ['texto sin formato de fecha', 'no es una fecha'],
      ['Date inválido', new Date('x')],
      ['NaN', NaN],
    ];

    for (const [name, value] of invalid) {
      it(`devuelve cadena vacía para ${name}`, () => {
        expect(pipe.transform(value as never, NOW)).toBe('');
      });
    }
  });

  it('no modifica el valor recibido', () => {
    const date = new Date('2026-08-01T12:00:00.000Z');
    const snapshot = date.getTime();

    pipe.transform(date, NOW);

    expect(date.getTime()).toBe(snapshot);
  });
});
