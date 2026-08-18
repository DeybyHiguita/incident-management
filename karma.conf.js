// Configuración de Karma.
//
// El builder de Angular trae una por defecto que no se puede afinar; este
// archivo existe para configurar el **reporte de cobertura**: qué formatos
// genera y, sobre todo, los umbrales mínimos que hacen fallar la ejecución.
//
// Sin umbrales, la cobertura es solo un número que nadie mira. Con ellos,
// bajar de lo acordado rompe la build.

module.exports = function (config) {
  config.set({
    basePath: '',
    // El builder de Angular añade su propio framework y plugin: aquí solo
    // se declara lo que no aporta él.
    frameworks: ['jasmine'],
    client: {
      jasmine: {
        // Orden aleatorio: si dos pruebas se estorban entre sí, se nota
        // aquí y no meses después.
        random: true,
      },
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/incident-management'),
      subdir: '.',
      reporters: [
        { type: 'html' }, // navegable, para investigar un archivo concreto
        { type: 'text-summary' }, // resumen en la terminal
        { type: 'json-summary' }, // legible por herramientas
        { type: 'lcovonly' }, // formato estándar para CI
      ],
      check: {
        global: {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
