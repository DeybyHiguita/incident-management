import { FormArray, FormControl } from '@angular/forms';

import {
  forbiddenWords,
  maxItems,
  noDuplicates,
  normalizeTag,
  notOnlyWhitespace,
} from './incident-validators';

/** Los validadores son funciones puras: se prueban sin TestBed ni DOM. */
describe('validadores de incidencias', () => {
  describe('notOnlyWhitespace', () => {
    it('acepta un texto con contenido real', () => {
      expect(notOnlyWhitespace(new FormControl('Servidor caído'))).toBeNull();
    });

    it('acepta un texto con espacios alrededor', () => {
      expect(notOnlyWhitespace(new FormControl('  Servidor caído  '))).toBeNull();
    });

    for (const value of [' ', '   ', '\t', '\n', ' \t \n ']) {
      it(`rechaza el valor formado solo por espacios ${JSON.stringify(value)}`, () => {
        expect(notOnlyWhitespace(new FormControl(value))).toEqual({ onlyWhitespace: true });
      });
    }

    it('no opina sobre el control vacío: de eso se ocupa required', () => {
      expect(notOnlyWhitespace(new FormControl(''))).toBeNull();
    });

    it('ignora los valores que no son texto', () => {
      expect(notOnlyWhitespace(new FormControl(42))).toBeNull();
      expect(notOnlyWhitespace(new FormControl(null))).toBeNull();
    });
  });

  describe('forbiddenWords', () => {
    const validator = forbiddenWords(['test', 'prueba']);

    it('acepta un texto sin palabras restringidas', () => {
      expect(validator(new FormControl('Caída del servidor de facturación'))).toBeNull();
    });

    it('rechaza el texto que contiene una palabra restringida', () => {
      expect(validator(new FormControl('Incidencia de test'))).toEqual({
        forbiddenWords: { found: ['test'] },
      });
    });

    it('no distingue mayúsculas', () => {
      expect(validator(new FormControl('TEST del sistema'))).not.toBeNull();
    });

    it('no distingue acentos', () => {
      expect(forbiddenWords(['prueba'])(new FormControl('Una prueba'))).not.toBeNull();
      expect(forbiddenWords(['revisión'])(new FormControl('Una revision'))).not.toBeNull();
    });

    it('informa de todas las palabras encontradas', () => {
      const result = validator(new FormControl('test y prueba'));

      expect(result?.['forbiddenWords'].found).toEqual(['test', 'prueba']);
    });

    it('compara por palabra completa, no por subcadena', () => {
      // "contestador" contiene "test", pero no es la palabra prohibida.
      expect(validator(new FormControl('Fallo en el contestador'))).toBeNull();
    });

    it('separa por signos de puntuación', () => {
      expect(validator(new FormControl('Error: test.'))).not.toBeNull();
    });

    it('no opina sobre el control vacío', () => {
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl('   '))).toBeNull();
    });
  });

  describe('maxItems', () => {
    const validator = maxItems(3);

    it('acepta una colección por debajo del tope', () => {
      expect(validator(array(['a', 'b']))).toBeNull();
    });

    it('acepta una colección justo en el tope', () => {
      expect(validator(array(['a', 'b', 'c']))).toBeNull();
    });

    it('rechaza una colección por encima del tope', () => {
      expect(validator(array(['a', 'b', 'c', 'd']))).toEqual({
        maxItems: { max: 3, actual: 4 },
      });
    });

    it('acepta una colección vacía', () => {
      expect(validator(array([]))).toBeNull();
    });
  });

  describe('noDuplicates', () => {
    it('acepta elementos distintos', () => {
      expect(noDuplicates(array(['red', 'servidor']))).toBeNull();
    });

    it('rechaza elementos repetidos', () => {
      expect(noDuplicates(array(['red', 'red']))).toEqual({ duplicates: { values: ['red'] } });
    });

    it('compara sin distinguir mayúsculas ni espacios sobrantes', () => {
      expect(noDuplicates(array(['Red', ' red ']))).not.toBeNull();
    });

    it('ignora los elementos aún vacíos', () => {
      // Una etiqueta recién añadida está vacía y no debe contar como repetida.
      expect(noDuplicates(array(['', '', 'red']))).toBeNull();
    });

    it('informa de todos los valores repetidos', () => {
      const result = noDuplicates(array(['a', 'a', 'b', 'b', 'c']));

      expect(result?.['duplicates'].values).toEqual(['a', 'b']);
    });

    it('acepta una colección vacía', () => {
      expect(noDuplicates(array([]))).toBeNull();
    });
  });

  describe('normalizeTag', () => {
    it('recorta, pasa a minúsculas y colapsa los espacios internos', () => {
      expect(normalizeTag('  Red   Interna  ')).toBe('red interna');
    });
  });

  function array(values: string[]): FormArray<FormControl<string>> {
    return new FormArray(values.map((value) => new FormControl(value, { nonNullable: true })));
  }
});
