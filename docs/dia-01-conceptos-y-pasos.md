# Día 1 — Conceptos y paso a paso

> Documento de estudio del reto formativo de Angular 20. Complementa a
> [`../PLAN.md`](../PLAN.md), que lleva el seguimiento general del reto.

## 1. Conceptos del día

### Node.js y administración de paquetes

Node.js es el entorno de ejecución de JavaScript fuera del navegador que usa
Angular CLI para funcionar (compilar, servir, correr scripts). `npm` (Node
Package Manager) es el gestor de paquetes que viene con Node: instala las
dependencias del proyecto (`node_modules/`) según lo declarado en
`package.json` y resuelve versiones exactas en `package-lock.json`.

### Angular CLI

Herramienta de línea de comandos (`ng`) para crear, servir, construir,
generar código (componentes, servicios, etc.) y testear proyectos Angular
siguiendo convenciones estándar, sin configurar manualmente Webpack/esbuild.

### Estructura de un proyecto Angular

La organización de carpetas y archivos que genera `ng new`: el código de la
aplicación vive en `src/app/`, los assets estáticos en `public/`, el punto de
entrada es `src/main.ts`, y la configuración del workspace vive en la raíz
(`angular.json`, `package.json`, `tsconfig*.json`).

### Archivo `angular.json`

Configuración del *workspace* Angular: qué proyectos existen, cómo se
construyen (`build`), cómo se sirven (`serve`) y cómo se testean (`test`),
incluyendo opciones como estilos globales, presupuestos de tamaño de bundle
(`budgets`) y assets a copiar.

### Archivo `package.json`

Manifiesto del proyecto Node: nombre, versión, scripts (`start`, `build`,
`test`) y dependencias (`dependencies` para runtime, `devDependencies` para
herramientas de desarrollo como el CLI o TypeScript).

### Configuración de TypeScript

`tsconfig.json` (y sus variantes `tsconfig.app.json` / `tsconfig.spec.json`)
define cómo se compila TypeScript: versión de JS de salida (`target`),
verificación de tipos, y el **modo estricto** (`strict: true`), que obliga a
tipar explícitamente, prohíbe `null`/`undefined` implícitos, etc. Angular 20
lo activa por defecto al crear un proyecto nuevo.

### Ejecución en ambiente local

Levantar la aplicación en la máquina de desarrollo con `ng serve` (o
`npm start`), que compila el proyecto, lo sirve en `http://localhost:4200/` y
recarga automáticamente ante cambios en el código (*live reload*).

### Componentes standalone

Desde Angular 14+ (y por defecto en Angular 20), un componente puede declarar
sus propias dependencias (`imports: [...]`) sin necesitar un `NgModule`
contenedor. Simplifica la estructura y hace explícitas las dependencias de
cada componente.

### Control de versiones con Git

Sistema para registrar el historial de cambios del proyecto en *commits*,
permitiendo revertir, comparar y colaborar. `git init` crea el repositorio
local; `.gitignore` excluye archivos que no deben versionarse (dependencias,
builds, archivos del sistema).

## 2. Paso a paso — cómo lo hicimos

1. **Verificar versiones instaladas**

   ```bash
   node -v          # v22.22.1
   npm -v           # 10.9.4
   npx @angular/cli@20 version   # Angular CLI 20.3.32
   ```

2. **Crear el proyecto con routing y SCSS**

   ```bash
   npx @angular/cli@20 new incident-management \
     --routing --style=scss --ssr=false --skip-git --package-manager=npm
   ```

   Esto generó `incident-management/` con enrutamiento (`app.routes.ts`),
   estilos en SCSS (`app.scss`, `styles.scss`) y un componente raíz
   standalone (`app.ts`).

3. **Confirmar el modo estricto de TypeScript**

   Se revisó `tsconfig.json`: `strict: true` junto con
   `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`
   ya vienen habilitados por defecto en los proyectos nuevos de Angular 20,
   por lo que no fue necesario modificar nada.

4. **Ejecutar la aplicación localmente**

   ```bash
   cd incident-management
   npm start   # ejecuta "ng serve"
   ```

   Se comprobó que compiló sin errores y que el servidor quedó escuchando en
   `http://localhost:4200/`. Se validó la respuesta con:

   ```bash
   curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:4200/
   # HTTP 200
   ```

5. **Revisar la estructura generada**

   ```bash
   find . -maxdepth 3 -not -path "./node_modules*" -not -path "./.git*"
   ```

   Se confirmó la presencia de `src/app/app.ts` (componente standalone,
   `imports: [RouterOutlet]`, usa `signal()`), `app.routes.ts`,
   `app.config.ts`, y los archivos de configuración (`angular.json`,
   `package.json`, `tsconfig*.json`).

6. **Inicializar el repositorio Git**

   ```bash
   git init
   ```

   Ejecutado dentro de `incident-management/`, para que el repositorio quede
   acotado al proyecto (no a `RETOV2/` completo).

7. **Revisar y ajustar `.gitignore`**

   El `.gitignore` generado por el CLI ya excluye `node_modules/`, `dist/`,
   `.angular/cache`, y archivos de sistema (`.DS_Store`), cumpliendo la
   restricción de no subir artefactos generados ni información sensible.

8. **Reescribir `README.md`**

   Se reemplazó el README genérico del CLI por uno con:
   - Requisitos previos (versiones de Node/npm/Angular CLI).
   - Tabla de comandos principales (`npm install`, `npm start`,
     `ng generate component`, `npm run build`, `npm test`).
   - Estado del proyecto y enlace al plan general.

9. **Primer commit**

   ```bash
   git add -A
   git status   # verificación de qué se va a commitear, nada sensible
   git commit -m "Day 1: scaffold Angular 20 project with routing and SCSS"
   ```

10. **Actualizar el plan general**

    Se marcó el Día 1 como completado en `PLAN.md`, dejando evidencia de cada
    actividad (comandos ejecutados, verificación HTTP 200, commit realizado).

## 3. Resultado

- Proyecto Angular 20 funcional en `incident-management/`.
- Repositorio Git inicializado con un primer commit descriptivo.
- Documentación base (`README.md`) y seguimiento (`PLAN.md`) actualizados.
