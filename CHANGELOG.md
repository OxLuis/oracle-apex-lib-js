# Changelog

**APEX Utils - Biblioteca de Utilidades para Oracle APEX**  
**Autor:** Luis Talavera  
**Versión Actual:** 1.2.0  
**Fecha:** 2024-12-19

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-12-19

### 🚨 MEJORA CRÍTICA - Funciones de Seteo de Valores

#### Problema Resuelto
- **Problema crítico**: Los valores seteados programáticamente no se mantenían al interactuar con la grilla
- **Causa raíz**: Métodos incorrectos de acceso al modelo y manejo de registros
- **Solución**: Reescritura completa basada en código que funciona en producción

#### Funciones Completamente Reescritas
- **`setCellValue()`**: ✅ Versión mejorada con acceso directo al modelo
- **`setSelectedCellValue()`**: ✅ Versión mejorada para fila seleccionada
- **`setFirstCellValue()`**: ✅ Versión mejorada para primera fila
- **`getCellValue()`**: ✅ Versión mejorada para obtener valores
- **`getSelectedCellValue()`**: ✅ Versión mejorada para fila seleccionada
- **`getFirstCellValue()`**: ✅ Versión mejorada para primera fila
- **`gotoCell()`**: ✅ Versión mejorada para navegación
- **`gotoFirstCell()`**: ✅ Versión mejorada para primera celda
- **`gotoSelectedCell()`**: ✅ Versión mejorada para celda seleccionada

#### Cambios Técnicos Principales
1. **Método de acceso al modelo**:
   - ❌ Antes: `apex.region(gridStaticId).call("getViews").grid.model`
   - ✅ Ahora: `apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").model`

2. **Obtención de registros**:
   - ❌ Antes: `grid.getSelectedRecords()` con formato complejo
   - ✅ Ahora: `model.getSelectedRecords()` directo

3. **SetValue simplificado**:
   - ❌ Antes: Métodos complejos de dirty state y estabilización
   - ✅ Ahora: `model.setValue(record, column, value)` directo

#### Compatibilidad
- **✅ Retrocompatible**: API de funciones se mantiene igual
- **✅ Migración automática**: Código existente funciona sin cambios
- **✅ Mejor rendimiento**: Eliminación de métodos innecesarios

#### Convenciones Importantes Documentadas
- **Formato Europeo Obligatorio**: Todas las funciones usan formato europeo (1.234,56)
- **Sistema de Índices 1-basado**: Fila 1 = primera fila, no 0-basado
- **Documentación Actualizada**: Todos los ejemplos usan formato europeo correcto

### ✨ Nuevas Funciones

#### Funciones de Refresco de Grid
- **`refreshGrid(gridStaticId, refreshRegion)`**: Nueva función para refrescar Interactive Grids de manera simple y eficiente
  - Refresca la vista del grid usando `grid.view$.trigger('refresh')`
  - Opcionalmente refresca la región completa usando `apex.region().refresh()`
  - Manejo robusto de errores con logs detallados
  - Parámetro `refreshRegion` por defecto en `true`

- **`refreshGridAndRecalculateSimple(gridStaticId, targetColumn, delay)`**: Función combinada para refrescar y recalcular
  - Combina refresco del grid con recálculo automático de fórmulas
  - Permite especificar columna específica para recálculo
  - Delay configurable para asegurar sincronización
  - Ideal para operaciones post-modificación de datos

#### Funciones de Confirmación de Cambios
- **`commitGridChanges(gridStaticId, commitAll, forceDirty)`**: Confirma cambios en el modelo sin refrescar la vista
  - Evita borrado de datos al refrescar
  - Opción para forzar estado "dirty" de registros
  - Confirmación selectiva (todos los registros o solo seleccionado)
  - Manejo robusto de errores con logs detallados

- **`refreshGridViewOnly(gridStaticId, commitChanges)`**: Refresca solo la vista del grid
  - No recarga datos del servidor
  - Opción para confirmar cambios antes de refrescar
  - Métodos alternativos de refresco para compatibilidad

- **`refreshGridSafe(gridStaticId, commitChanges, refreshRegion)`**: Refresco seguro que evita pérdida de datos
  - Confirma cambios antes de refrescar
  - Refresca solo la vista por defecto
  - Opción para refrescar región completa con delay

#### Funciones con Estado Dirty (⭐ NUEVO)
- **`forceRecordDirty(gridStaticId, rowIndex)`**: Fuerza el estado "dirty" de un registro
  - Soluciona el problema de confirmación automática
  - Múltiples métodos para marcar registros como modificados
  - Compatible con diferentes versiones de APEX
  - Logs detallados para debugging

- **`setCellValueWithDirty(gridStaticId, columnName, rowIndex, value, refresh, forceDirty)`**: Setea valores con estado dirty automático
  - Combina seteo de valores con forzado de estado dirty
  - Opción para controlar refresco de vista
  - Verificación automática de estado dirty
  - Ideal para cambios programáticos que requieren confirmación

- **`setSelectedCellValueWithDirty(gridStaticId, columnName, value, refresh, forceDirty)`**: Helper para fila seleccionada
- **`setFirstCellValueWithDirty(gridStaticId, columnName, value, refresh, forceDirty)`**: Helper para primera fila

### 🔧 Mejoras

#### Solución al Problema de Confirmación Automática
- **Problema identificado**: Los cambios programáticos no se confirman automáticamente porque APEX no marca los registros como "dirty"
- **Solución implementada**: Funciones que fuerzan el estado dirty antes de confirmar cambios
- **Compatibilidad**: Múltiples métodos para diferentes versiones de APEX
- **Documentación**: Guías completas para migrar código existente

#### Mejoras en commitGridChanges
- Nuevo parámetro `forceDirty` para forzar estado dirty
- Múltiples métodos de verificación de estado modificado
- Mejor manejo de errores y logging
- Compatibilidad con registros individuales y masivos

### 🐛 Correcciones

- **Corrección de error**: `gridStaticId is not defined` en funciones de refresco
- **Mejora de estabilidad**: Manejo robusto de errores en todas las funciones de grid
- **Optimización**: Reducción de timeouts innecesarios en operaciones de grid

### 📚 Documentación

- **Nueva sección**: "🆕 Mejoras en Funciones de Seteo de Valores" en README
- **Guía de migración**: Cómo actualizar código existente para usar nuevas funciones
- **Casos de uso**: Ejemplos prácticos para diferentes escenarios
- **Solución de problemas**: Guía para el problema de confirmación automática
- **Documentación técnica**: Explicación detallada de cambios en métodos de acceso

### 🔄 Compatibilidad

- **Retrocompatible**: Todas las funciones existentes mantienen su API
- **Nuevas funciones**: Agregadas sin afectar funcionalidad existente
- **Configuración**: No requiere cambios en configuraciones existentes
- **Migración automática**: Código existente funciona mejor sin cambios

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