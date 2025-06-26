# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-12-19

### ✨ Nuevas Funciones

#### Funciones de Refresco de Grid
- **`refreshGrid(gridStaticId, refreshRegion)`**: Nueva función para refrescar Interactive Grids de manera simple y eficiente
  - Refresca la vista del grid usando `grid.view$.trigger('refresh')`
  - Opcionalmente refresca la región completa usando `apex.region().refresh()`
  - Manejo robusto de errores con logs detallados
  - Parámetro `refreshRegion` por defecto en `true`

- **`refreshGridAndRecalculateSimple(gridStaticId, targetColumn, delay)`**: Función combinada para refrescar y recalcular
  - Combina el refresco del grid con recálculo automático de fórmulas
  - Permite especificar columna específica para recálculo
  - Delay configurable para asegurar sincronización
  - Ideal para operaciones post-modificación de datos

### 🔧 Mejoras

#### Manejo de Errores
- Mejor manejo de errores en funciones de refresco
- Logs detallados para debugging
- Fallbacks automáticos cuando los métodos de refresco fallan

#### Documentación
- Documentación completa de las nuevas funciones en README.md
- Ejemplos de uso prácticos
- Casos de uso específicos para diferentes escenarios

### 🐛 Correcciones

#### Problemas de Sincronización
- Resuelto problema de `gridStaticId is not defined` en operaciones de refresco
- Mejorada sincronización entre modificaciones de datos y refresco de vista
- Corrección en el manejo de referencias a variables no definidas

### 📚 Documentación

#### README.md Actualizado
- Nueva sección "Funciones de Refresco de Grid"
- Ejemplos de uso para `refreshGrid()` y `refreshGridAndRecalculateSimple()`
- Casos de uso específicos para diferentes escenarios
- Mejor organización de la documentación

### 🔄 Compatibilidad

- **Retrocompatible**: Todas las funciones existentes mantienen su API
- **Nuevas funciones**: Agregadas sin afectar funcionalidad existente
- **Configuración**: No requiere cambios en configuraciones existentes

## [1.1.0] - 2024-12-18

### ✨ Nuevas Funciones

#### Funciones de Seteo Robusto
- **`setNumericValueRobust()`**: Seteo de valores numéricos con manejo robusto de formato
- **`setNumericValueEuropean()`**: Seteo de valores con formato europeo (1.234,56)
- **`setSelectedNumericValueRobust()`**: Versión para fila seleccionada
- **`setFirstNumericValueRobust()`**: Versión para primera fila

#### Funciones de Debug
- **`debugGrid()`**: Sistema completo de debugging para Interactive Grids
- Monitoreo de cambios en tiempo real
- Simulación de cambios manuales
- Logs detallados de operaciones

### 🔧 Mejoras

#### Manejo de Formato Europeo
- Mejor soporte para formato europeo (puntos como separadores de miles)
- Normalización automática de formatos
- Preservación de decimales exactos

## [1.0.0] - 2024-12-17

### ✨ Funciones Iniciales

#### APEX Grid Utils
- **`setupAutoCalculation()`**: Configuración de cálculos automáticos
- **`getNumericCellValue()`**: Obtención de valores numéricos
- **`setCellValue()`**: Establecimiento de valores en celdas
- **`sumColumnToItem()`**: Suma de columnas a items
- **`gotoCell()`**: Navegación en grids

#### Utilidades Generales
- **`extraerDatosIG()`**: Extracción de datos de Interactive Grids
- **`habilitarEdicion()`**: Habilitación de modo edición
- **`apexUtils.getNumeric()`**: Obtención de valores numéricos de items

### 🔧 Características

- Soporte completo para Interactive Grids de APEX
- Manejo automático de formato europeo
- Cálculos automáticos con triggers
- Sistema de debounce para optimización
- API limpia y documentada

---

## Notas de Versión

### Convenciones de Versionado
- **MAJOR.MINOR.PATCH**: Siguiendo Semantic Versioning
- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas funcionalidades compatibles
- **PATCH**: Correcciones de bugs compatibles

### Contribuciones
Para contribuir al proyecto:
1. Crear una nueva rama para cada feature
2. Seguir las convenciones de código existentes
3. Actualizar la documentación según sea necesario
4. Probar en diferentes versiones de APEX

### Soporte
- Para reportar bugs: Revisar logs de consola del navegador
- Para nuevas funcionalidades: Crear issue en el repositorio
- Documentación completa disponible en README.md 