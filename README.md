# APEX Utils - Biblioteca de Utilidades para Oracle APEX

Esta biblioteca proporciona un conjunto completo de utilidades para trabajar con Interactive Grids y elementos de Oracle APEX, facilitando operaciones comunes como cálculos automáticos, manipulación de datos y navegación.

## 📋 Tabla de Contenidos

- [Instalación](#instalación)
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
// Configurar multiplicación automática
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
// Multiplicación simple
apexGridUtils.quick.multiplyColumns('mi_grid', 'CANTIDAD', 'PRECIO', 'TOTAL', 2);

// Precio con IVA
apexGridUtils.quick.priceWithTax('mi_grid', 'PRECIO_BASE', 'PRECIO_CON_IVA', 10, 2);

// Subtotal con descuento
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

#### Establecer Valores

```javascript
// Establecer valor en celda seleccionada
apexGridUtils.setSelectedCellValue('mi_grid', 'TOTAL', 150.50);

// Establecer valor en primera fila
apexGridUtils.setFirstCellValue('mi_grid', 'TOTAL', 150.50);

// Establecer valor numérico con decimales específicos
apexGridUtils.setSelectedNumericCellValue('mi_grid', 'TOTAL', 150.50, 2);

// Establecer valor con commit explícito (evita sobrescritura)
apexGridUtils.setSelectedNumericCellValueWithCommit('mi_grid', 'TOTAL', 150.50, 2);
```

#### Establecer Valores con Commit Explícito

Estas funciones realizan un commit explícito después de establecer el valor, lo que ayuda a evitar problemas de sobrescritura y asegura que los cambios se guarden correctamente en el modelo del grid.

##### setNumericCellValueWithCommit(gridStaticId, columnName, rowIndex, value, decimalPlaces, refresh)

Establece un valor numérico en una celda específica con commit explícito.

```javascript
// Establecer valor en fila específica con commit
apexGridUtils.setNumericCellValueWithCommit('mi_grid', 'TOTAL', 1, 150.50, 2, true);

// Establecer valor en fila seleccionada con commit
apexGridUtils.setSelectedNumericCellValueWithCommit('mi_grid', 'TOTAL', 150.50, 2);

// Establecer valor en primera fila con commit
apexGridUtils.setFirstNumericCellValueWithCommit('mi_grid', 'TOTAL', 150.50, 2);
```

**Parámetros:**
- `gridStaticId` (string): Static ID del Interactive Grid
- `columnName` (string): Nombre de la columna
- `rowIndex` (number): Índice de la fila (1 = primera fila, -1 = fila seleccionada)
- `value` (number): Valor numérico a establecer
- `decimalPlaces` (number): Número de decimales para formatear (default: null = sin formatear)
- `refresh` (boolean): Si debe refrescar la vista (default: true)

**Retorna:** `boolean` - true si se estableció correctamente

**Ventajas del Commit Explícito:**
- Evita problemas de sobrescritura de valores
- Asegura que los cambios se guarden en el modelo
- Útil cuando hay cálculos automáticos configurados
- Recomendado para operaciones críticas de datos

### Navegación en el Grid

```javascript
// Navegar a celda específica
apexGridUtils.gotoCell('mi_grid', 'TOTAL', 1); // Primera fila
apexGridUtils.gotoSelectedCell('mi_grid', 'TOTAL'); // Fila seleccionada
apexGridUtils.gotoFirstCell('mi_grid', 'TOTAL'); // Primera fila
```

### Cálculos y Sumas

```javascript
// Sumar columna y colocar en item
let sumaConfig = apexGridUtils.sumColumnToItem('mi_grid', 'TOTAL', 'P1_SUMA_TOTAL', 2, true);

// Suma rápida de columna TOTAL
apexGridUtils.sumTotalToItem('mi_grid', 'P1_SUMA_TOTAL', 2);

// Configurar listener para recalcular automáticamente
apexGridUtils.setupGridListener('mi_grid', function() {
    // Recalcular sumas cuando cambie el grid
    sumaConfig.calculateSum();
});
```

### Recálculos y Refrescos

```javascript
// Forzar recálculo de fórmula específica
apexGridUtils.forceRecalculate('mi_grid', {
    sourceColumns: ['CANTIDAD', 'PRECIO'],
    targetColumn: 'TOTAL',
    formula: function(values) {
        return values.CANTIDAD * values.PRECIO;
    },
    decimalPlaces: 2
});

// Refrescar grid y recalcular
apexGridUtils.refreshGridAndRecalculate('mi_grid', {
    sourceColumns: ['CANTIDAD', 'PRECIO'],
    targetColumn: 'TOTAL',
    formula: function(values) {
        return values.CANTIDAD * values.PRECIO;
    }
});

// Refrescar todos los cálculos automáticos
apexGridUtils.refreshAutoCalculation('mi_grid');
```

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
