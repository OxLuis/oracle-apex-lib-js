# APEX Utils - Biblioteca de Utilidades para Oracle APEX

**Autor:** Luis Talavera  
**Versión:** 1.2.0  
**Fecha:** 2024-12-19  
**Licencia:** MIT

Esta biblioteca proporciona un conjunto completo de utilidades para trabajar con Interactive Grids y elementos de Oracle APEX, facilitando operaciones comunes como cálculos automáticos, manipulación de datos y navegación.

## 🚀 Características Principales

- **Cálculos Automáticos**: Configuración fácil de fórmulas en Interactive Grids
- **Formato Europeo**: Manejo robusto de números con formato europeo (1.234,56)
- **Refresco Seguro**: Funciones que evitan borrar datos al refrescar
- **Extracción Avanzada**: Extracción de datos con transformaciones y filtros
- **Navegación Programática**: Control total sobre la navegación en grids
- **API Limpia**: Funciones bien documentadas y fáciles de usar
- **Optimización**: Sistema de debounce para mejor rendimiento

## 📋 Tabla de Contenidos

- [Instalación](#instalación)
- [🆕 Mejoras en Funciones de Seteo de Valores](#-mejoras-en-funciones-de-seteo-de-valores)
- [Funciones Principales](#funciones-principales)
- [APEX Grid Utils](#apex-grid-utils)
- [Inserción de Datos](#inserción-de-datos)
- [Utilidades Generales](#utilidades-generales)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Casos de Aplicación](#casos-de-aplicación)

## 🚀 Instalación

1. Incluir el archivo `apexUtils.js` en tu aplicación APEX
2. El módulo se inicializa automáticamente al cargar la página
3. Todas las funciones están disponibles globalmente

## 🆕 Mejoras en Funciones de Seteo de Valores

### Problema Resuelto

Las funciones de seteo de valores han sido completamente reescritas en la versión 1.2.0 basándose en código que funciona correctamente en producción. El problema anterior era que los valores se establecían pero no se mantenían al interactuar con la grilla.

### ⚠️ Convenciones Importantes

#### Formato Europeo (Obligatorio)
**Todas las funciones de esta biblioteca utilizan formato europeo por defecto:**
- **Separador de miles**: Punto (`.`)
- **Separador decimal**: Coma (`,`)
- **Ejemplo**: `1.234,56` (mil doscientos treinta y cuatro con cincuenta y seis centavos)

```javascript
// ✅ Formato correcto (europeo)
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 1.234,56);

// ❌ Formato incorrecto (americano)
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 1234.56);
```

#### Sistema de Índices de Filas
**El sistema de índices es 1-basado (no 0-basado):**
- **Fila 1**: Primera fila visible en el grid
- **Fila 2**: Segunda fila visible en el grid
- **Fila -1**: Fila seleccionada actualmente

```javascript
// ✅ Índices correctos
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 150.50);  // Primera fila
apexGridUtils.setCellValue('mi_grid', 'COSTO', 2, 200.75);  // Segunda fila
apexGridUtils.setCellValue('mi_grid', 'COSTO', -1, 175.25); // Fila seleccionada

// ❌ Índices incorrectos (0-basado)
apexGridUtils.setCellValue('mi_grid', 'COSTO', 0, 150.50);  // No funciona
```

### Cambios Principales

1. **Método de acceso al modelo mejorado**: 
   - Antes: `apex.region(gridStaticId).call("getViews").grid.model`
   - Ahora: `apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").model`

2. **Obtención de registros mejorada**:
   - Uso directo de `getSelectedRecords()` del modelo actual
   - Iteración más eficiente con `model.forEach()`

3. **SetValue directo y confiable**:
   - Eliminación de métodos complejos de dirty state
   - Uso directo de `model.setValue(record, column, value)`

### Funciones Mejoradas

```javascript
// ✅ Setear valor en celda específica (formato europeo, índice 1-basado)
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 1.234,56);  // Primera fila
apexGridUtils.setCellValue('mi_grid', 'COSTO', 2, 2.500,00);  // Segunda fila

// ✅ Setear valor en fila seleccionada
apexGridUtils.setSelectedCellValue('mi_grid', 'COSTO', 1.750,25);

// ✅ Setear valor en primera fila
apexGridUtils.setFirstCellValue('mi_grid', 'COSTO', 1.000,00);

// ✅ Obtener valor de celda específica
let valor = apexGridUtils.getCellValue('mi_grid', 'COSTO', 1);  // Primera fila

// ✅ Navegar a celda específica
apexGridUtils.gotoCell('mi_grid', 'COSTO', 1);  // Primera fila
```

### Ejemplo de Uso Completo

```javascript
// Configurar cálculo automático
apexGridUtils.setupAutoCalculation('DetallesP', {
    sourceColumns: ['CANTIDAD', 'COSTO'],
    targetColumn: 'TOTAL',
    formula: function(values) {
        return values.CANTIDAD * values.COSTO;
    },
    decimalPlaces: 3
});

// Setear valores que se mantienen correctamente (formato europeo)
apexGridUtils.setCellValue('DetallesP', 'CANTIDAD', 1, 10);        // Primera fila
apexGridUtils.setCellValue('DetallesP', 'COSTO', 1, 15,500);       // Primera fila
apexGridUtils.setCellValue('DetallesP', 'CANTIDAD', 2, 5);         // Segunda fila
apexGridUtils.setCellValue('DetallesP', 'COSTO', 2, 25,750);       // Segunda fila

// El cálculo automático se ejecutará y el valor se mantendrá
```

### Solución de Problemas

Si los valores no se mantienen al interactuar con la grilla, usar las funciones mejoradas:

```javascript
// ✅ Usar estas funciones (versión mejorada)
apexGridUtils.setCellValue('grid_id', 'COSTO', 1, 1.500,50);  // Primera fila
apexGridUtils.setSelectedCellValue('grid_id', 'COSTO', 1.750,25);

// ❌ Evitar funciones antiguas que pueden no funcionar
// apexGridUtils.setCellValueWithDirty()
// apexGridUtils.setCellValueWithStabilization()
```

## 🔧 Funciones Principales

### habilitarEdicion(regionId)

Habilita el modo de edición en un Interactive Grid.

```javascript
// Habilitar edición en un grid específico
habilitarEdicion('mi_grid_region');
```

**Parámetros:**
- `regionId` (string): ID de la región del Interactive Grid

**Retorna:** `boolean` - true si se habilitó correctamente

### extraerDatosIG(configuracion)

Extrae datos de un Interactive Grid con configuración avanzada.

```javascript
// Configuración básica
extraerDatosIG({
    regionId: 'mi_grid',
    campos: [
        { nombre: 'ID', alias: 'identificador' },
        { nombre: 'NOMBRE', alias: 'nombre_completo' },
        { nombre: 'ACTIVO', alias: 'estado', obligatorio: false }
    ],
    campoDestino: 'P1_DATOS_EXTRAIDOS',
    formatoSalida: 'array' // 'array' o 'json'
});

// Con transformación de datos
extraerDatosIG({
    regionId: 'mi_grid',
    campos: [
        { 
            nombre: 'FECHA', 
            alias: 'fecha_formateada',
            transformacion: function(valor) {
                return new Date(valor).toLocaleDateString();
            }
        }
    ],
    campoDestino: 'P1_FECHAS'
});
```

**Parámetros:**
- `configuracion.regionId` (string): ID de la región del grid
- `configuracion.campos` (array): Array de objetos con configuración de campos
- `configuracion.campoDestino` (string): ID del item donde guardar los datos
- `configuracion.formatoSalida` (string): 'array' o 'json' (opcional)
- `configuracion.callback` (function): Función a ejecutar después de la extracción (opcional)

### extraerDatos(regionId, campos, campoDestino)

Versión simplificada de extraerDatosIG.

```javascript
// Extracción simple
extraerDatos('mi_grid', ['ID', 'NOMBRE', 'EMAIL'], 'P1_DATOS');
```

## 🎯 APEX Grid Utils

### Configuración de Cálculos Automáticos

#### setupAutoCalculation(gridStaticId, config)

Configura cálculos automáticos en Interactive Grids.

```javascript
// Configurar multiplicación automática (formato europeo)
apexGridUtils.setupAutoCalculation('mi_grid', {
    sourceColumns: ['CANTIDAD', 'PRECIO'],
    targetColumn: 'TOTAL',
    formula: function(values) {
        return values.CANTIDAD * values.PRECIO;
    },
    decimalPlaces: 2,
    autoTrigger: true,
    triggerOnLoad: true
});
```

**Parámetros:**
- `gridStaticId` (string): Static ID del Interactive Grid
- `config.sourceColumns` (array): Columnas que disparan el cálculo
- `config.targetColumn` (string): Columna donde se guarda el resultado
- `config.formula` (function): Función que realiza el cálculo
- `config.decimalPlaces` (number): Número de decimales (default: 2)
- `config.autoTrigger` (boolean): Si debe configurar eventos automáticos (default: true)
- `config.triggerOnLoad` (boolean): Si debe ejecutar al cargar (default: false)

#### Configuraciones Rápidas

```javascript
// Multiplicación simple (formato europeo)
apexGridUtils.quick.multiplyColumns('mi_grid', 'CANTIDAD', 'PRECIO', 'TOTAL', 2);

// Precio con IVA (formato europeo)
apexGridUtils.quick.priceWithTax('mi_grid', 'PRECIO_BASE', 'PRECIO_CON_IVA', 10, 2);

// Subtotal con descuento (formato europeo)
apexGridUtils.quick.subtotalWithDiscount('mi_grid', 'CANTIDAD', 'PRECIO', 'DESCUENTO', 'SUBTOTAL', 2);
```

### Manipulación de Celdas

#### Obtener Valores

```javascript
// Obtener valor de celda seleccionada
let valor = apexGridUtils.getSelectedCellValue('mi_grid', 'TOTAL');

// Obtener valor de primera fila
let primerValor = apexGridUtils.getFirstCellValue('mi_grid', 'TOTAL');

// Obtener valor de fila específica (índice 1 = primera fila)
let valorFila = apexGridUtils.getCellValue('mi_grid', 'TOTAL', 1);

// Obtener todos los campos de la fila seleccionada como objeto
let filaCompleta = apexGridUtils.getCurrentRow('mi_grid', ['TOTAL', 'CANTIDAD', 'PRECIO']);

// Obtener valores numéricos (con normalización de formato europeo)
let valorNumerico = apexGridUtils.getSelectedNumericCellValue('mi_grid', 'TOTAL');
let valorConDecimales = apexGridUtils.getSelectedNumericCellValueWithDecimals('mi_grid', 'TOTAL', 2);
let valorEntero = apexGridUtils.getSelectedIntegerCellValue('mi_grid', 'TOTAL');
```

#### Obtener Valores Numéricos

Estas funciones obtienen valores numéricos de celdas del Interactive Grid, preservando el formato original de los datos y proporcionando valores por defecto si la conversión falla.

##### getNumericCellValue(gridStaticId, columnName, rowIndex, defaultValue)

Obtiene el valor numérico de una celda específica, preservando el formato original de los datos.

```javascript
// Obtener valor numérico de fila específica
let valor = apexGridUtils.getNumericCellValue('mi_grid', 'TOTAL', 1, 0); // grid, columna, fila1, valorPorDefecto

// Obtener valor numérico de fila seleccionada
let valorSeleccionado = apexGridUtils.getSelectedNumericCellValue('mi_grid', 'TOTAL', 0); // grid, columna, valorPorDefecto

// Obtener valor numérico de primera fila
let primerValor = apexGridUtils.getFirstNumericCellValue('mi_grid', 'TOTAL', 0); // grid, columna, valorPorDefecto

// Obtener valor con decimales específicos
let valorConDecimales = apexGridUtils.getNumericCellValueWithDecimals('mi_grid', 'TOTAL', 1, 2, 0); // grid, columna, fila1, 2decimales, valorPorDefecto

// Obtener valor entero
let valorEntero = apexGridUtils.getIntegerCellValue('mi_grid', 'TOTAL', 1, 0); // grid, columna, fila1, valorPorDefecto
```

#### Obtener Fila Completa

##### getCurrentRow(gridStaticId, columns)

Obtiene todos los campos especificados de la fila que tiene el foco actual en el Interactive Grid, devolviendo un objeto con los valores accesibles por nombre de columna.

```javascript
// Obtener campos específicos de la fila seleccionada
let fila = apexGridUtils.getCurrentRow('mi_grid', ['TOTAL', 'CANTIDAD', 'PRECIO']);
console.log(fila.TOTAL);     // Acceder al valor de TOTAL
console.log(fila.CANTIDAD);  // Acceder al valor de CANTIDAD
console.log(fila.PRECIO);    // Acceder al valor de PRECIO

// Obtener un solo campo
let fila = apexGridUtils.getCurrentRow('mi_grid', ['TOTAL']);
console.log(fila.TOTAL);     // Acceder al valor de TOTAL

// Ejemplo práctico
let fila = apexGridUtils.getCurrentRow('IDAutorizacionCanje', ['TOTAL_VALOR', 'TOT_COMPROBANTE', 'COD_ANIMAL']);
console.log('Total Valor:', fila.TOTAL_VALOR);
console.log('Total Comprobante:', fila.TOT_COMPROBANTE);
console.log('Código Animal:', fila.COD_ANIMAL);
```

**Parámetros:**
- `gridStaticId` (string): Static ID del Interactive Grid
- `columns` (array): Array con los nombres de las columnas a obtener

**Retorna:** `object|null` - Objeto con los valores de las columnas especificadas, o null si no hay fila seleccionada

**Características:**
- Obtiene la fila que tiene el foco actual (no necesariamente la última seleccionada)
- Usa `document.activeElement` para detectar la fila activa
- Mapea automáticamente los nombres de columnas a sus índices
- Devuelve un objeto con propiedades accesibles por nombre de columna
- Requiere especificar las columnas que se desean obtener
- Funciona con cualquier Interactive Grid de APEX

**Parámetros:**
- `gridStaticId` (string): Static ID del Interactive Grid
- `columnName` (string): Nombre de la columna
- `rowIndex` (number): Índice de la fila (1 = primera fila, -1 = fila seleccionada, default: -1)
- `defaultValue` (number): Valor por defecto si no se puede convertir (default: 0)

**Retorna:** `number` - Valor numérico preservando formato original

##### Variantes Disponibles

```javascript
// Para fila seleccionada
apexGridUtils.getSelectedNumericCellValue('mi_grid', 'TOTAL', 0); // grid, columna, valorPorDefecto

// Para primera fila
apexGridUtils.getFirstNumericCellValue('mi_grid', 'TOTAL', 0); // grid, columna, valorPorDefecto

// Con decimales específicos
apexGridUtils.getNumericCellValueWithDecimals('mi_grid', 'TOTAL', 1, 2, 0); // grid, columna, fila1, 2decimales, valorPorDefecto
apexGridUtils.getSelectedNumericCellValueWithDecimals('mi_grid', 'TOTAL', 2, 0); // grid, columna, 2decimales, valorPorDefecto
apexGridUtils.getFirstNumericCellValueWithDecimals('mi_grid', 'TOTAL', 2, 0); // grid, columna, 2decimales, valorPorDefecto

// Valores enteros
apexGridUtils.getIntegerCellValue('mi_grid', 'TOTAL', 1, 0); // grid, columna, fila1, valorPorDefecto
apexGridUtils.getSelectedIntegerCellValue('mi_grid', 'TOTAL', 0); // grid, columna, valorPorDefecto
apexGridUtils.getFirstIntegerCellValue('mi_grid', 'TOTAL', 0); // grid, columna, valorPorDefecto
```

**Características:**
- Preserva el formato original de los datos (europeo o estándar)
- Convierte strings a números de forma segura
- Proporciona valor por defecto si la conversión falla
- Preserva decimales exactos cuando es posible
- Funciona con valores nulos, undefined o vacíos

**Ejemplo: Preservación de Formatos**

```javascript
// El grid contiene valores en diferentes formatos
// Fila 1: "1.234,56" (formato europeo)
// Fila 2: "1234.56" (formato estándar)
// Fila 3: "1234" (entero)
// Fila 4: "" (vacío)

let valor1 = apexGridUtils.getNumericCellValue('mi_grid', 'TOTAL', 1, 0); // grid, columna, fila1, valorPorDefecto → 1.234,56 (preserva formato)
let valor2 = apexGridUtils.getNumericCellValue('mi_grid', 'TOTAL', 2, 0); // grid, columna, fila2, valorPorDefecto → 1234.56 (preserva formato)
let valor3 = apexGridUtils.getNumericCellValue('mi_grid', 'TOTAL', 3, 0); // grid, columna, fila3, valorPorDefecto → 1234
let valor4 = apexGridUtils.getNumericCellValue('mi_grid', 'TOTAL', 4, 0); // grid, columna, fila4, valorPorDefecto → 0 (valor por defecto)

// Con decimales específicos
let valorFormateado = apexGridUtils.getNumericCellValueWithDecimals('mi_grid', 'TOTAL', 1, 2, 0); // grid, columna, fila1, 2decimales, valorPorDefecto → 1234.56

// Como entero
let valorEntero = apexGridUtils.getIntegerCellValue('mi_grid', 'TOTAL', 1, 0); // grid, columna, fila1, valorPorDefecto → 1235 (redondeado)
```

#### Setear Valores

```javascript
// Setear valor en celda específica (formato europeo, índice 1-basado)
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 1.234,56);  // Primera fila
apexGridUtils.setCellValue('mi_grid', 'COSTO', 2, 2.500,00);  // Segunda fila

// Setear valor en fila seleccionada
apexGridUtils.setSelectedCellValue('mi_grid', 'COSTO', 1.750,25);

// Setear valor en primera fila
apexGridUtils.setFirstCellValue('mi_grid', 'COSTO', 1.000,00);

// Setear valores numéricos con formato europeo
apexGridUtils.setSelectedNumericCellValue('mi_grid', 'COSTO', 1.500,50);
apexGridUtils.setFirstNumericCellValue('mi_grid', 'COSTO', 2.250,75);
```

#### Navegación

```javascript
// Navegar a celda específica (índice 1 = primera fila)
apexGridUtils.gotoCell('mi_grid', 'COSTO', 1);  // Primera fila
apexGridUtils.gotoCell('mi_grid', 'COSTO', 2);  // Segunda fila

// Navegar a primera celda de columna
apexGridUtils.gotoFirstCell('mi_grid', 'COSTO');

// Navegar a celda seleccionada
apexGridUtils.gotoSelectedCell('mi_grid', 'COSTO');
```

### Cálculos y Sumas

```javascript
// Sumar columna y colocar en item (formato europeo)
let sumaConfig = apexGridUtils.sumColumnToItem('mi_grid', 'TOTAL', 'P1_SUMA_TOTAL', 2, true);

// Suma rápida de columna TOTAL (formato europeo)
apexGridUtils.sumTotalToItem('mi_grid', 'P1_SUMA_TOTAL', 2);

// Configurar listener para recalcular automáticamente
apexGridUtils.setupGridListener('mi_grid', function() {
    // Recalcular sumas cuando cambie el grid
    sumaConfig.calculateSum();
}, ['set', 'add', 'delete', 'reset']);
```

### Recalculación Masiva de Filas

#### recalculateAllRows(gridStaticId, sourceColumnsOrConfig, targetColumn, formula, decimalPlaces, delay)

Recalcula y actualiza valores en una columna específica de **todas las filas** del Interactive Grid de forma síncrona. Esta función es especialmente útil para cálculos que dependen de valores globales o cuando necesitas recalcular toda una columna basada en una fórmula.

**Características principales:**
- ✅ **Procesamiento síncrono** - Ejecuta inmediatamente todas las operaciones
- ✅ **Detección automática** de registros marcados para eliminación
- ✅ **Manejo robusto de errores** - Continúa procesando aunque falle una fila
- ✅ **Soporte para delay** - Permite configurar un delay opcional
- ✅ **Dos formatos de uso** - Compatible con formato antiguo y nuevo objeto de configuración

#### Formato de Uso (Nuevo - Recomendado)

```javascript
// Recalcular porcentajes basados en un total global
apexGridUtils.recalculateAllRows('DetallesP', {
    sourceColumns: ['TOTAL'], 
    targetColumn: 'PORCENTAJE', 
    formula: function(values) {
        const totalGlobal = apexUtils.get('P916_TOTAL_PROD');
        if (totalGlobal <= 0) return 0;
        return (values.TOTAL / totalGlobal) * 100;
    },
    decimalPlaces: 3,
    delay: 50  // Delay opcional en milisegundos
});

// Recalcular precios con IVA
apexGridUtils.recalculateAllRows('Productos', {
    sourceColumns: ['PRECIO_BASE'], 
    targetColumn: 'PRECIO_CON_IVA', 
    formula: function(values) {
        return values.PRECIO_BASE * 1.21; // 21% IVA
    },
    decimalPlaces: 2
});

// Recalcular totales con descuento
apexGridUtils.recalculateAllRows('Detalles', {
    sourceColumns: ['SUBTOTAL', 'DESCUENTO'], 
    targetColumn: 'TOTAL_FINAL', 
    formula: function(values) {
        return values.SUBTOTAL * (1 - values.DESCUENTO / 100);
    },
    decimalPlaces: 2
});
```

#### Formato de Uso (Antiguo - Compatibilidad)

```javascript
// Formato antiguo para compatibilidad
apexGridUtils.recalculateAllRows(
    'DetallesP',                    // gridStaticId
    ['TOTAL'],                      // sourceColumns
    'PORCENTAJE',                   // targetColumn
    function(values) {              // formula
        const totalGlobal = apexUtils.get('P916_TOTAL_PROD');
        return totalGlobal > 0 ? (values.TOTAL / totalGlobal) * 100 : 0;
    },
    3,                              // decimalPlaces
    50                              // delay (opcional)
);
```

#### Parámetros

**Formato Nuevo (Objeto de configuración):**
- `gridStaticId` (string): Static ID del Interactive Grid
- `config.sourceColumns` (array): Array de nombres de columnas fuente
- `config.targetColumn` (string): Columna donde se guardará el resultado
- `config.formula` (function): Función que recibe `(values, record, index)` y retorna el valor a calcular
- `config.decimalPlaces` (number): Número de decimales para redondear (default: 2)
- `config.delay` (number): Delay en milisegundos (default: 50, aunque no se use en procesamiento síncrono)

**Formato Antiguo:**
- `gridStaticId` (string): Static ID del Interactive Grid
- `sourceColumns` (array): Array de nombres de columnas fuente
- `targetColumn` (string): Columna donde se guardará el resultado
- `formula` (function): Función que recibe `(values, record, index)` y retorna el valor a calcular
- `decimalPlaces` (number): Número de decimales para redondear (default: 2)
- `delay` (number): Delay en milisegundos (default: 50)

#### Ejemplos Prácticos

**1. Cálculo de Porcentajes**
```javascript
function recalcularPorcentajes() {
    apexGridUtils.recalculateAllRows('DetallesP', {
        sourceColumns: ['TOTAL'], 
        targetColumn: 'PORCENTAJE', 
        formula: function(values) {
            const totalGlobal = apexUtils.get('P916_TOTAL_PROD');
            if (totalGlobal <= 0) {
                console.warn('apexGridUtils: Total global es 0 o negativo');
                return 0;
            }
            const porcentaje = (values.TOTAL / totalGlobal) * 100;
            console.log('Porcentaje calculado:', porcentaje);
            return porcentaje;
        },
        decimalPlaces: 3
    });
}
```

**2. Aplicación de Descuentos**
```javascript
function aplicarDescuentoGlobal(porcentajeDescuento) {
    apexGridUtils.recalculateAllRows('Productos', {
        sourceColumns: ['PRECIO_ORIGINAL'], 
        targetColumn: 'PRECIO_FINAL', 
        formula: function(values) {
            return values.PRECIO_ORIGINAL * (1 - porcentajeDescuento / 100);
        },
        decimalPlaces: 2
    });
}

// Usar: aplicarDescuentoGlobal(15); // 15% de descuento
```

**3. Cálculo de Totales con Impuestos**
```javascript
function recalcularConImpuestos() {
    apexGridUtils.recalculateAllRows('Factura', {
        sourceColumns: ['SUBTOTAL', 'IVA_PORCENTAJE'], 
        targetColumn: 'TOTAL_CON_IVA', 
        formula: function(values) {
            return values.SUBTOTAL * (1 + values.IVA_PORCENTAJE / 100);
        },
        decimalPlaces: 2
    });
}
```

**4. Normalización de Datos**
```javascript
function normalizarPrecios() {
    apexGridUtils.recalculateAllRows('Productos', {
        sourceColumns: ['PRECIO_ACTUAL'], 
        targetColumn: 'PRECIO_NORMALIZADO', 
        formula: function(values) {
            // Redondear a múltiplos de 0.50
            return Math.round(values.PRECIO_ACTUAL * 2) / 2;
        },
        decimalPlaces: 2
    });
}
```

#### Características Avanzadas

**Detección Automática de Registros Eliminados:**
```javascript
// La función automáticamente detecta y salta registros marcados para eliminación
// No necesitas hacer nada especial, simplemente funciona

apexGridUtils.recalculateAllRows('mi_grid', {
    sourceColumns: ['VALOR'], 
    targetColumn: 'CALCULADO', 
    formula: function(values) {
        return values.VALOR * 2;
    }
});
// Los registros marcados para eliminación se saltan automáticamente
```

**Manejo de Errores Robusto:**
```javascript
// Si una fila falla, la función continúa con las siguientes
apexGridUtils.recalculateAllRows('mi_grid', {
    sourceColumns: ['A', 'B'], 
    targetColumn: 'RESULTADO', 
    formula: function(values) {
        // Si hay división por cero, la función maneja el error
        return values.A / values.B;
    }
});
```

**Logging Detallado:**
```javascript
// La función proporciona logs informativos
apexGridUtils.recalculateAllRows('mi_grid', {
    sourceColumns: ['TOTAL'], 
    targetColumn: 'PORCENTAJE', 
    formula: function(values) {
        return values.TOTAL * 0.1;
    }
});

// Logs que verás en la consola:
// 🔄 apexGridUtils: Recalculando todas las filas en mi_grid -> PORCENTAJE (delay: 50ms)
// ⏭️ apexGridUtils: Saltando registro 123 - marcado para eliminación
// ✅ apexGridUtils: Recalculación completada - 5 filas procesadas, 1 filas saltadas
```

#### Casos de Uso Comunes

1. **Recálculo de Porcentajes** cuando cambia un total global
2. **Aplicación de Descuentos** masivos a productos
3. **Cálculo de Impuestos** en facturas
4. **Normalización de Datos** en lotes
5. **Recálculo de Totales** cuando cambian fórmulas de negocio
6. **Aplicación de Tarifas** o comisiones

#### Ventajas sobre Otras Soluciones

- ✅ **Más rápido** que iterar fila por fila manualmente
- ✅ **Más seguro** que modificar el modelo directamente
- ✅ **Más robusto** con detección automática de errores
- ✅ **Más flexible** con fórmulas personalizadas
- ✅ **Mejor logging** para debugging
- ✅ **Compatible** con registros marcados para eliminación

## 🎯 Sistema de Re-enfoque Automático de Celdas

### Descripción

El sistema de re-enfoque automático permite que cuando el usuario cambie entre ventanas o aplicaciones y regrese al navegador, el foco se restaure automáticamente en la última celda del Interactive Grid que tenía seleccionada. Esto mejora significativamente la experiencia del usuario al trabajar con múltiples ventanas.

### Características

- ✅ **Captura automática**: Detecta cuando el usuario hace foco en una celda del Interactive Grid
- ✅ **Restauración inteligente**: Restaura el foco cuando vuelves a la ventana del navegador
- ✅ **Manejo de errores**: Gestiona casos donde la celda ya no existe o no es válida
- ✅ **Inicialización automática**: Se activa automáticamente al cargar el módulo
- ✅ **Control manual**: Permite habilitar/deshabilitar el sistema según necesidades

### Funciones Disponibles

#### initializeFocusRestoration(enable)

Inicializa o configura el sistema de re-enfoque automático.

```javascript
// Habilitar el sistema (por defecto)
apexGridUtils.initializeFocusRestoration(true);

// Deshabilitar el sistema
apexGridUtils.initializeFocusRestoration(false);
```

**Parámetros:**
- `enable` (boolean): Si debe habilitar el sistema (default: true)

**Retorna:** `boolean` - true si se configuró correctamente

#### enableFocusRestoration()

Habilita el sistema de re-enfoque automático.

```javascript
// Habilitar el sistema
apexGridUtils.enableFocusRestoration();
```

**Retorna:** `boolean` - true si se habilitó correctamente

#### disableFocusRestoration()

Deshabilitar el sistema de re-enfoque automático.

```javascript
// Deshabilitar el sistema
apexGridUtils.disableFocusRestoration();
```

**Retorna:** `boolean` - true si se deshabilitó correctamente

#### getLastFocusedCell()

Obtiene la última celda que tuvo el foco.

```javascript
// Obtener la última celda enfocada
const lastCell = apexGridUtils.getLastFocusedCell();

if (lastCell) {
    console.log('Última celda enfocada:', lastCell);
    console.log('Contenido:', lastCell.textContent);
}
```

**Retorna:** `HTMLElement|null` - Elemento de la celda o null si no hay

#### setLastFocusedCell(cellElement)

Establece manualmente la última celda enfocada.

```javascript
// Establecer manualmente una celda específica
const cellElement = document.querySelector('.a-GV-cell[data-column="COSTO"]');
apexGridUtils.setLastFocusedCell(cellElement);
```

**Parámetros:**
- `cellElement` (HTMLElement): Elemento de la celda del Interactive Grid

**Retorna:** `boolean` - true si se estableció correctamente

#### restoreFocus(delay)

Restaura el foco manualmente en la última celda enfocada.

```javascript
// Restaurar foco con delay por defecto (50ms)
apexGridUtils.restoreFocus();

// Restaurar foco con delay personalizado
apexGridUtils.restoreFocus(100);
```

**Parámetros:**
- `delay` (number): Delay en milisegundos antes de restaurar (default: 50)

**Retorna:** `boolean` - true si se restauró correctamente

#### clearLastFocusedCell()

Limpia la referencia de la última celda enfocada.

```javascript
// Limpiar referencia de última celda
apexGridUtils.clearLastFocusedCell();
```

#### getFocusRestorationStatus()

Obtiene el estado completo del sistema de re-enfoque.

```javascript
// Obtener estado del sistema
const status = apexGridUtils.getFocusRestorationStatus();

console.log('Sistema habilitado:', status.enabled);
console.log('Hay celda enfocada:', status.hasLastFocusedCell);
console.log('Información de celda:', status.cellInfo);
```

**Retorna:** `object` - Objeto con el estado del sistema
```javascript
{
    enabled: true,
    lastFocusedCell: HTMLElement,
    hasLastFocusedCell: true,
    cellInfo: {
        tagName: 'TD',
        className: 'a-GV-cell a-GV-cell--editable',
        id: 'cell_123',
        textContent: '1.234,56'
    }
}
```

### Uso Automático

El sistema se inicializa automáticamente cuando se carga el módulo `apexGridUtils`. No necesitas hacer nada adicional:

1. **El usuario hace foco** en una celda del Interactive Grid
2. **Cambia a otra ventana** o aplicación
3. **Vuelve a la ventana** del navegador
4. **El foco se restaura automáticamente** en la última celda

### Ejemplos de Uso

#### Ejemplo Básico

```javascript
// El sistema funciona automáticamente, pero puedes verificar su estado
const status = apexGridUtils.getFocusRestorationStatus();
console.log('Sistema de re-enfoque:', status.enabled ? 'Habilitado' : 'Deshabilitado');
```

#### Ejemplo con Control Manual

```javascript
// Deshabilitar temporalmente el sistema
apexGridUtils.disableFocusRestoration();

// Realizar operaciones que no quieres que interfieran con el foco
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 1.500,50);

// Rehabilitar el sistema
apexGridUtils.enableFocusRestoration();
```

#### Ejemplo con Restauración Manual

```javascript
// Después de una operación programática, restaurar foco manualmente
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 1.500,50);
apexGridUtils.restoreFocus(100); // Restaurar con 100ms de delay
```

#### Ejemplo con Debug

```javascript
// Verificar qué celda tiene el foco actualmente
const lastCell = apexGridUtils.getLastFocusedCell();
if (lastCell) {
    console.log('Celda actual:', {
        contenido: lastCell.textContent,
        columna: lastCell.getAttribute('data-column'),
        fila: lastCell.getAttribute('data-row')
    });
}
```

### Casos de Uso Comunes

#### 1. Trabajo con Múltiples Ventanas

```javascript
// El usuario está editando una celda en el grid
// Cambia a Excel para copiar un valor
// Vuelve al navegador → El foco se restaura automáticamente
```

#### 2. Integración con Otras Aplicaciones

```javascript
// El usuario está en una celda del grid
// Abre una calculadora externa
// Regresa al navegador → Continúa editando donde se quedó
```

#### 3. Control Programático

```javascript
// Deshabilitar temporalmente durante operaciones masivas
apexGridUtils.disableFocusRestoration();

// Realizar múltiples cambios
for (let i = 1; i <= 10; i++) {
    apexGridUtils.setCellValue('mi_grid', 'COSTO', i, i * 100);
}

// Rehabilitar y restaurar foco
apexGridUtils.enableFocusRestoration();
apexGridUtils.restoreFocus();
```

### Configuración Avanzada

#### Personalizar el Delay de Restauración

```javascript
// Restaurar foco con delay personalizado para casos especiales
apexGridUtils.restoreFocus(200); // 200ms de delay
```

#### Verificar Estado del Sistema

```javascript
// Verificar si el sistema está funcionando correctamente
const status = apexGridUtils.getFocusRestorationStatus();

if (!status.enabled) {
    console.warn('Sistema de re-enfoque deshabilitado');
    apexGridUtils.enableFocusRestoration();
}

if (!status.hasLastFocusedCell) {
    console.log('No hay celda enfocada registrada');
}
```

### Solución de Problemas

#### El foco no se restaura

```javascript
// Verificar si el sistema está habilitado
const status = apexGridUtils.getFocusRestorationStatus();
console.log('Estado del sistema:', status);

// Rehabilitar si es necesario
if (!status.enabled) {
    apexGridUtils.enableFocusRestoration();
}
```

#### Restauración manual cuando falla la automática

```javascript
// Si la restauración automática falla, usar restauración manual
apexGridUtils.restoreFocus(100);
```

#### Limpiar referencia corrupta

```javascript
// Si hay problemas con la celda almacenada
apexGridUtils.clearLastFocusedCell();
apexGridUtils.enableFocusRestoration();
```

### Notas Técnicas

- **Namespaces únicos**: Los eventos usan `.apexGridUtils` para evitar conflictos
- **Limpieza automática**: Se remueven eventos anteriores antes de agregar nuevos
- **Manejo de errores**: Captura y maneja errores de foco inválido automáticamente
- **Delay configurable**: 50ms por defecto para evitar conflictos con otros eventos
- **Inicialización automática**: Se activa automáticamente al cargar el módulo

### Compatibilidad

- ✅ **APEX 18.1+**: Compatible con todas las versiones modernas
- ✅ **Interactive Grids**: Funciona con todos los tipos de Interactive Grids
- ✅ **Múltiples Grids**: Funciona simultáneamente con múltiples grids en la misma página
- ✅ **Navegadores**: Compatible con Chrome, Firefox, Safari, Edge

## 🔧 Utilidades Generales

### apexUtils.getNumeric(itemName, defaultValue)

Obtiene el valor numérico de un item de APEX, manejando automáticamente el formato europeo.

```javascript
// Obtener valor numérico
let total = apexUtils.getNumeric('P1_TOTAL', 0);

// Versión abreviada
let total = apexUtils.get('P1_TOTAL', 0);

// Obtener múltiples valores
let [costo1, costo2] = apexUtils.getMultipleNumeric(['P1_COSTO1', 'P1_COSTO2'], 0);
```

**Características:**
- Maneja formato europeo (1.234,56 → 1234.56)
- Convierte automáticamente strings a números
- Proporciona valor por defecto si la conversión falla

### apexUtils.get(itemName, defaultValue)

Alias abreviado de `apexUtils.getNumeric`. Obtiene el valor numérico de un item de APEX de forma más concisa.

```javascript
// Obtener valor numérico (forma abreviada)
let total = apexUtils.get('P1_TOTAL', 0);

// Obtener valor con valor por defecto personalizado
let precio = apexUtils.get('P1_PRECIO', 100);

// Obtener valor sin valor por defecto (usa 0)
let cantidad = apexUtils.get('P1_CANTIDAD');
```

**Parámetros:**
- `itemName` (string): Nombre del item de APEX
- `defaultValue` (number): Valor por defecto si no se puede convertir (default: 0)

**Retorna:** `number` - Valor numérico convertido

**Características:**
- Alias de `apexUtils.getNumeric` para mayor concisión
- Maneja formato europeo automáticamente
- Convierte strings a números de forma segura
- Proporciona valor por defecto si la conversión falla
- Ideal para uso frecuente donde se necesita obtener valores numéricos rápidamente

### apexUtils.getMultipleNumeric(itemNames, defaultValue)

Obtiene múltiples valores numéricos de items de APEX en una sola llamada.

```javascript
// Obtener múltiples valores
let [costo1, costo2, costo3] = apexUtils.getMultipleNumeric(['P1_COSTO1', 'P1_COSTO2', 'P1_COSTO3'], 0);

// Obtener valores con valor por defecto personalizado
let [precio, cantidad, descuento] = apexUtils.getMultipleNumeric(['P1_PRECIO', 'P1_CANTIDAD', 'P1_DESCUENTO'], 100);

// Usar destructuring para mayor claridad
let valores = apexUtils.getMultipleNumeric(['P1_TOTAL', 'P1_SUBTOTAL'], 0);
let total = valores[0];
let subtotal = valores[1];
```

**Parámetros:**
- `itemNames` (array): Array de nombres de items de APEX
- `defaultValue` (number): Valor por defecto para todos los items (default: 0)

**Retorna:** `array` - Array de valores numéricos en el mismo orden que los items proporcionados

**Características:**
- Obtiene múltiples valores en una sola operación
- Mantiene el orden de los items en el array de entrada
- Aplica el mismo valor por defecto a todos los items
- Útil para obtener varios valores relacionados de una vez

## 📝 Ejemplos de Uso Completos

### Ejemplo 1: Factura con Cálculos Automáticos

```javascript
// Configurar cálculos automáticos para factura
apexGridUtils.setupAutoCalculation('factura_grid', {
    sourceColumns: ['CANTIDAD', 'PRECIO_UNITARIO'],
    targetColumn: 'SUBTOTAL',
    formula: function(values) {
        return values.CANTIDAD * values.PRECIO_UNITARIO;
    },
    decimalPlaces: 2,
    autoTrigger: true
});

// Configurar descuento
apexGridUtils.setupAutoCalculation('factura_grid', {
    sourceColumns: ['SUBTOTAL', 'PORCENTAJE_DESCUENTO'],
    targetColumn: 'DESCUENTO',
    formula: function(values) {
        return values.SUBTOTAL * (values.PORCENTAJE_DESCUENTO / 100);
    },
    decimalPlaces: 2,
    autoTrigger: true
});

// Configurar total final
apexGridUtils.setupAutoCalculation('factura_grid', {
    sourceColumns: ['SUBTOTAL', 'DESCUENTO'],
    targetColumn: 'TOTAL',
    formula: function(values) {
        return values.SUBTOTAL - values.DESCUENTO;
    },
    decimalPlaces: 2,
    autoTrigger: true
});

// Sumar totales automáticamente
apexGridUtils.sumColumnToItem('factura_grid', 'TOTAL', 'P1_TOTAL_FACTURA', 2, true);
```

### Ejemplo 2: Inventario con Validaciones

```javascript
// Extraer datos con validaciones
extraerDatosIG({
    regionId: 'inventario_grid',
    campos: [
        { 
            nombre: 'CODIGO', 
            alias: 'codigo_producto',
            obligatorio: true 
        },
        { 
            nombre: 'STOCK', 
            alias: 'stock_actual',
            condicion: function(valor) {
                return valor >= 0; // Solo stock positivo
            }
        },
        { 
            nombre: 'PRECIO', 
            alias: 'precio_formateado',
            transformacion: function(valor) {
                return new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                }).format(valor);
            }
        }
    ],
    campoDestino: 'P1_DATOS_INVENTARIO',
    formatoSalida: 'array',
    callback: function(datos) {
        console.log('Datos extraídos:', datos);
        // Procesar datos adicionales
    }
});
```

### Ejemplo 3: Formulario Dinámico

```javascript
// Configurar navegación automática
function navegarSiguienteCampo() {
    let campos = ['CODIGO', 'NOMBRE', 'DESCRIPCION', 'PRECIO'];
    let campoActual = 'CODIGO'; // Campo actual
    
    let indiceActual = campos.indexOf(campoActual);
    let siguienteCampo = campos[indiceActual + 1];
    
    if (siguienteCampo) {
        apexGridUtils.gotoSelectedCell('mi_grid', siguienteCampo);
    }
}

// Configurar validación en tiempo real
apexGridUtils.setupGridListener('mi_grid', function() {
    let precio = apexGridUtils.getSelectedNumericCellValue('mi_grid', 'PRECIO');
    let stock = apexGridUtils.getSelectedNumericCellValue('mi_grid', 'STOCK');
    
    if (precio < 0) {
        apex.message.alert('El precio no puede ser negativo');
    }
    
    if (stock < 0) {
        apex.message.alert('El stock no puede ser negativo');
    }
});
```

### Ejemplo 4: Carga Masiva de Datos

```javascript
// Cargar datos desde un archivo JSON o respuesta de API
let datosProductos = [
    { codigo: 'P001', descripcion: 'Laptop HP', precio: 1200, stock: 10 },
    { codigo: 'P002', descripcion: 'Mouse Inalámbrico', precio: 25, stock: 50 },
    { codigo: 'P003', descripcion: 'Teclado Mecánico', precio: 150, stock: 15 },
    { codigo: 'P004', descripcion: 'Monitor 24"', precio: 300, stock: 8 }
];

// Configuración avanzada con mapeo y validaciones
apexGridUtils.setearDatosIG({
    regionId: 'productos_grid',
    datos: datosProductos,
    mapeo: {
        'CODIGO': 'codigo',
        'NOMBRE': 'descripcion',
        'PRECIO': 'precio',
        'STOCK': 'stock'
    },
    transformacion: function(registro, indice) {
        // Agregar campos calculados
        registro.valor_total = registro.precio * registro.stock;
        registro.fecha_carga = new Date().toISOString();
        registro.usuario_carga = 'SISTEMA';
        return registro;
    },
    filtro: function(registro, indice) {
        // Solo cargar productos con stock > 0 y precio > 0
        return registro.stock > 0 && registro.precio > 0;
    },
    limpiarAntes: true,
    refrescar: true,
    modoEdicion: true,
    callback: function(resultado) {
        console.log(`Carga completada: ${resultado.procesados} productos cargados`);
        
        if (resultado.errores > 0) {
            apex.message.alert(`Se encontraron ${resultado.errores} errores durante la carga`);
        } else {
            apex.message.showPageSuccess('Productos cargados exitosamente');
        }
        
        // Configurar cálculos automáticos después de la carga
        apexGridUtils.setupCantidadPorCosto('productos_grid', 'STOCK', 'PRECIO', 'VALOR_TOTAL', 2);
    }
});

// Cargar datos desde un campo de página (útil para datos de procesos APEX)
function cargarDesdeProceso() {
    // Ejecutar proceso APEX que retorna JSON
    apex.server.process('OBTENER_PRODUCTOS', {
        pageItems: '#P1_CATEGORIA',
        success: function(data) {
            // Guardar datos en campo oculto
            apex.item('P1_DATOS_TEMPORALES').setValue(JSON.stringify(data));
            
            // Cargar en grid
            apexGridUtils.setearDatos('productos_grid', 'P1_DATOS_TEMPORALES');
        }
    });
}

// Carga incremental (sin limpiar datos existentes)
function agregarProductos() {
    let nuevosProductos = [
        { codigo: 'P005', descripcion: 'Auriculares', precio: 80, stock: 20 }
    ];
    
    apexGridUtils.setearDatosDirectos('productos_grid', nuevosProductos, false, true, true);
}
```

## 🎯 Casos de Aplicación

### 1. Gestión de Inventarios
- Cálculo automático de valores totales
- Validación de stock mínimo
- Actualización de precios con IVA

### 2. Facturación
- Cálculo automático de subtotales
- Aplicación de descuentos
- Cálculo de impuestos

### 3. Planificación de Proyectos
- Cálculo de horas totales
- Presupuestos automáticos
- Seguimiento de recursos

### 4. Gestión de Ventas
- Cálculo de comisiones
- Análisis de rendimiento
- Reportes automáticos

## 🔍 Funciones de Utilidad

### Normalización de Números

```javascript
// Normalizar formato europeo a estándar
let numero = apexGridUtils.normalizeNumber('1.234,56'); // Retorna 1234.56
```

### Verificación de Estado

```javascript
// Verificar si el módulo está inicializado
if (apexGridUtils.isInitialized()) {
    console.log('Módulo listo para usar');
}
```

## ⚠️ Consideraciones Importantes

1. **Static ID**: Asegúrate de que los Interactive Grids tengan un Static ID configurado
2. **Nombres de Columnas**: Los nombres de columnas deben coincidir exactamente con los definidos en el grid
3. **Formato de Números**: La biblioteca maneja automáticamente el formato europeo (1.234,56)
4. **Eventos**: Los cálculos automáticos se ejecutan cuando cambian las columnas fuente
5. **Rendimiento**: Para grids grandes, considera usar `autoTrigger: false` y ejecutar cálculos manualmente

## 🐛 Solución de Problemas

### Error: "Grid no encontrado"
- Verifica que el Static ID del grid sea correcto
- Asegúrate de que el grid esté completamente cargado antes de ejecutar las funciones

### Error: "Columna no encontrada"
- Verifica que el nombre de la columna coincida exactamente
- Los nombres de columnas son sensibles a mayúsculas/minúsculas

### Cálculos no se ejecutan automáticamente
- Verifica que `autoTrigger: true` esté configurado
- Asegúrate de que las columnas fuente estén incluidas en `sourceColumns`

### Valores no se actualizan correctamente
- Usa `setNumericCellValueWithCommit` para evitar sobrescrituras
- Verifica que el grid esté en modo de edición
- Considera usar `refreshGridAndRecalculate` después de cambios masivos

## 📞 Soporte

Para reportar problemas o solicitar nuevas funcionalidades, revisa los logs de la consola del navegador para obtener información detallada sobre errores y el estado de las operaciones.

### Configuraciones Específicas

#### setupCantidadPorCosto

Configuración rápida para el caso más común: CANTIDAD × COSTO = TOTAL

```javascript
// Configuración automática con valores por defecto
apexGridUtils.setupCantidadPorCosto('mi_grid');

// Configuración personalizada
apexGridUtils.setupCantidadPorCosto('mi_grid', 'QTY', 'PRICE', 'SUBTOTAL', 2);
```

#### ensureAutoCalculation

Verifica y configura cálculos automáticos si no existen

```javascript
// Verificar si existe configuración para TOTAL
apexGridUtils.ensureAutoCalculation('mi_grid', 'TOTAL');
```

### Gestión de Configuraciones

```javascript
// Obtener configuración específica
let config = apexGridUtils.getAutoCalculationConfig('mi_grid', 'TOTAL');

// Obtener todas las configuraciones del grid
let todasConfigs = apexGridUtils.getAutoCalculationConfig('mi_grid');

// Limpiar configuración específica
apexGridUtils.clearAutoCalculationConfig('mi_grid', 'TOTAL');

// Limpiar todas las configuraciones del grid
apexGridUtils.clearAutoCalculationConfig('mi_grid');

// Obtener todas las configuraciones almacenadas
let todas = apexGridUtils.getAllAutoCalculationConfigs();
```

### Inserción de Datos

#### setearDatosIG(configuracion)

Inserta datos en un Interactive Grid con configuración avanzada.

```javascript
// Configuración básica con datos directos
apexGridUtils.setearDatosIG({
    regionId: 'mi_grid',
    datos: [
        { id: 1, nombre: 'Producto A', precio: 100 },
        { id: 2, nombre: 'Producto B', precio: 200 }
    ],
    limpiarAntes: true,
    refrescar: true,
    modoEdicion: true
});

// Configuración con mapeo de campos
apexGridUtils.setearDatosIG({
    regionId: 'mi_grid',
    datos: [
        { codigo: 'A001', descripcion: 'Producto A', valor: 100 },
        { codigo: 'A002', descripcion: 'Producto B', valor: 200 }
    ],
    mapeo: {
        'ID': 'codigo',
        'NOMBRE': 'descripcion',
        'PRECIO': 'valor'
    },
    transformacion: function(registro, indice) {
        // Agregar fecha de creación
        registro.fecha_creacion = new Date().toISOString();
        return registro;
    },
    filtro: function(registro, indice) {
        // Solo insertar productos con valor > 50
        return registro.valor > 50;
    },
    callback: function(resultado) {
        console.log('Datos insertados:', resultado.procesados);
    }
});

// Configuración con datos desde campo de página
apexGridUtils.setearDatosIG({
    regionId: 'mi_grid',
    campoOrigen: 'P1_DATOS_JSON',
    limpiarAntes: true,
    refrescar: true
});
```

**Parámetros:**
- `configuracion.regionId` (string): ID de la región del Interactive Grid
- `configuracion.datos` (array|object): Datos a insertar (opcional si se usa campoOrigen)
- `configuracion.campoOrigen` (string): Campo de la página que contiene los datos JSON (opcional si se usa datos)
- `configuracion.mapeo` (object): Mapeo personalizado de campos {campoDestino: campoOrigen}
- `configuracion.transformacion` (function): Función para transformar cada registro antes de insertar
- `configuracion.filtro` (function): Función para filtrar registros antes de insertar
- `configuracion.limpiarAntes` (boolean): Si debe limpiar datos existentes (default: true)
- `configuracion.refrescar` (boolean): Si debe refrescar la grilla (default: true)
- `configuracion.modoEdicion` (boolean): Si debe habilitar modo edición (default: true)
- `configuracion.callback` (function): Función a ejecutar después de setear datos

**Retorna:** `object` - Objeto con resultado de la operación
```javascript
{
    success: true,
    procesados: 5,
    errores: 0,
    total: 5
}
```

#### setearDatosDirectos(regionId, datos, limpiar, refrescar, modoEdicion)

Versión simplificada para insertar datos directamente.

```javascript
// Insertar datos simples
let datos = [
    { ID: 1, NOMBRE: 'Producto A', PRECIO: 100 },
    { ID: 2, NOMBRE: 'Producto B', PRECIO: 200 }
];

apexGridUtils.setearDatosDirectos('mi_grid', datos);

// Insertar sin limpiar datos existentes
apexGridUtils.setearDatosDirectos('mi_grid', datos, false, true, true);
```

**Parámetros:**
- `regionId` (string): ID de la región del Interactive Grid
- `datos` (array|object): Datos a insertar
- `limpiar` (boolean): Si debe limpiar datos existentes (default: true)
- `refrescar` (boolean): Si debe refrescar la grilla (default: true)
- `modoEdicion` (boolean): Si debe habilitar modo edición (default: true)

#### setearDatos(regionId, campoOrigen, limpiar, refrescar, modoEdicion)

Inserta datos desde un campo de la página que contiene JSON.

```javascript
// Insertar desde campo P1_DATOS_JSON
apexGridUtils.setearDatos('mi_grid', 'P1_DATOS_JSON');

// Insertar sin limpiar y sin refrescar
apexGridUtils.setearDatos('mi_grid', 'P1_DATOS_JSON', false, false, true);
```

**Parámetros:**
- `regionId` (string): ID de la región del Interactive Grid
- `campoOrigen` (string): Campo de la página que contiene los datos JSON
- `limpiar` (boolean): Si debe limpiar datos existentes (default: true)
- `refrescar` (boolean): Si debe refrescar la grilla (default: true)
- `modoEdicion` (boolean): Si debe habilitar modo edición (default: true)

#### refreshGridSafe(gridStaticId, commitChanges, refreshRegion)

Refresca el grid de manera segura, confirmando cambios antes de refrescar para evitar pérdida de datos.

```javascript
// Refrescar de manera segura (confirma cambios + refresca región)
apexGridUtils.refreshGridSafe('mi_grid', true, true);

// Refrescar de manera segura solo vista (confirma cambios + solo vista)
apexGridUtils.refreshGridSafe('mi_grid', true, false);

// Refrescar sin confirmar cambios (equivalente a clearChanges)
apexGridUtils.refreshGridSafe('mi_grid', false, true);

// Refrescar sin confirmar cambios, solo vista
apexGridUtils.refreshGridSafe('mi_grid', false, false);
```

**Parámetros:**
- `gridStaticId` (string): Static ID del Interactive Grid
- `commitChanges` (boolean): Si debe confirmar cambios antes de refrescar (default: true)
- `refreshRegion` (boolean): Si debe refrescar también la región completa (default: false)

**Retorna:** `boolean` - true si se refrescó correctamente

**Casos de Uso:**

```javascript
// Equivalente a tu código: clearChanges() + region().refresh()
apexGridUtils.refreshGridSafe('DetallesP', false, true);
//                                    ↑        ↑
//                              NO confirma  Refresca región

// Refrescar preservando cambios (más seguro)
apexGridUtils.refreshGridSafe('DetallesP', true, true);
//                                    ↑        ↑
//                              Confirma     Refresca región

// Refrescar solo vista preservando cambios
apexGridUtils.refreshGridSafe('DetallesP', true, false);
//                                    ↑        ↑
//                              Confirma     Solo vista
```

#### refreshGridViewOnly(gridStaticId, commitChanges)

Refresca solo la vista del grid sin recargar datos del servidor, confirmando cambios si es necesario.

```javascript
// Refrescar solo vista confirmando cambios
apexGridUtils.refreshGridViewOnly('mi_grid', true);

// Refrescar solo vista sin confirmar cambios
apexGridUtils.refreshGridViewOnly('mi_grid', false);
```

**Parámetros:**
- `gridStaticId` (string): Static ID del Interactive Grid
- `commitChanges` (boolean): Si debe confirmar cambios antes de refrescar (default: true)

**Retorna:** `boolean` - true si se refrescó correctamente

**Casos de Uso:**

```javascript
// Actualización visual rápida (preserva cambios)
apexGridUtils.refreshGridViewOnly('DetallesP', true);

// Actualización visual rápida (descarta cambios)
apexGridUtils.refreshGridViewOnly('DetallesP', false);

// Después de cambios programáticos
apexGridUtils.setCellValue('DetallesP', 'COSTO', 1, 1.500,50, false);
apexGridUtils.refreshGridViewOnly('DetallesP', true); // Solo actualizar vista
```

### Comparación de Funciones de Refresh

| Función | Confirma Cambios | Refresca Región | Velocidad | Uso Recomendado |
|---------|------------------|-----------------|-----------|-----------------|
| `refreshGrid()` | ❌ No | ✅ Opcional | ⚡ Rápido | Refresh simple |
| `refreshGridSafe()` | ✅ Opcional | ✅ Opcional | 🐌 Medio | Refresh seguro |
| `refreshGridViewOnly()` | ✅ Opcional | ❌ No | ⚡ Muy rápido | Solo vista |
| `refreshGridAndRecalculateSimple()` | ❌ No | ✅ Sí | 🐌 Lento | Refresh + recálculo |

**Guía de Selección:**

```javascript
// 🚀 Para actualizaciones visuales rápidas
apexGridUtils.refreshGridViewOnly('DetallesP', true);

// 🛡️ Para refresh seguro preservando cambios
apexGridUtils.refreshGridSafe('DetallesP', true, true);

// 🔄 Para refresh simple (equivalente a tu código)
apexGridUtils.refreshGrid('DetallesP', true);

// 📊 Para refresh con recálculo automático
apexGridUtils.refreshGridAndRecalculateSimple('DetallesP', 'TOTAL', 100);
```

### Funciones de Confirmación de Cambios

```

### setItemOnRowSelect(gridStaticId, columnName, itemName)

Escucha la **selección de fila** en un Interactive Grid y setea el valor de una columna en un item de página. Útil cuando solo necesitas actualizar el item al seleccionar una fila (modo solo visualización).

```javascript
// Al seleccionar una fila, se setea el valor de la columna COD_ANIMAL en el item P1100_COD_ANIMAL_AUX
apexGridUtils.setItemOnRowSelect('IG_ANIMALES', 'COD_ANIMAL', 'P1100_COD_ANIMAL_AUX');
```

**Parámetros:**
- `gridStaticId` (string): Static ID del IG
- `columnName` (string): Nombre de la columna a extraer
- `itemName` (string): Nombre del item de página donde setear el valor

**Retorna:** `boolean` - true si se configuró correctamente

---

### setItemOnRowOrCellChange(gridStaticId, columnName, itemName)

Escucha tanto la **selección de fila** como los **cambios en una columna específica** (por edición, proceso server-side, etc) y setea el valor en un item de página. Es la opción recomendada para grids editables o cuando los valores pueden cambiar automáticamente.

```javascript
// Al seleccionar una fila o cambiar el valor de la columna COD_ANIMAL, se setea el item
apexGridUtils.setItemOnRowOrCellChange('IG_ANIMALES', 'COD_ANIMAL', 'P1100_COD_ANIMAL_AUX');
```

**Parámetros:**
- `gridStaticId` (string): Static ID del IG
- `columnName` (string): Nombre de la columna a extraer
- `itemName` (string): Nombre del item de página donde setear el valor

**Retorna:** `boolean` - true si se configuró correctamente

---

#### ¿Cuál usar?
- **Solo visualización:** Usa `setItemOnRowSelect`.
- **Edición o cambios automáticos:** Usa `setItemOnRowOrCellChange` (recomendado para la mayoría de los casos).

#### Ejemplo práctico
```javascript
// Solo necesitas una de las dos, según tu caso:
apexGridUtils.setItemOnRowOrCellChange('IG_ANIMALES', 'COD_ANIMAL', 'P1100_COD_ANIMAL_AUX');
// o
apexGridUtils.setItemOnRowSelect('IG_ANIMALES', 'COD_ANIMAL', 'P1100_COD_ANIMAL_AUX');
```