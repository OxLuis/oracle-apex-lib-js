/**
 * APEX Utils - Biblioteca de Utilidades para Oracle APEX
 * =====================================================
 * 
 * Autor: Luis Talavera
 * Versión: 1.2.0
 * Fecha: 2024-12-19
 * 
 * Descripción:
 * Esta biblioteca proporciona un conjunto completo de utilidades para trabajar 
 * con Interactive Grids y elementos de Oracle APEX, facilitando operaciones 
 * comunes como cálculos automáticos, manipulación de datos, navegación y 
 * gestión de formularios dinámicos.
 * 
 * Características Principales:
 * - Cálculos automáticos en Interactive Grids
 * - Manejo robusto de formato europeo (1.234,56)
 * - Funciones de refresco seguras (sin borrar datos)
 * - Extracción y inserción de datos avanzada
 * - Navegación programática en grids
 * - Sistema de debounce para optimización
 * - API limpia y bien documentada
 * 
 * Uso:
 * 1. Incluir este archivo en tu aplicación APEX
 * 2. El módulo se inicializa automáticamente
 * 3. Usar las funciones globales disponibles
 * 
 * Ejemplo básico:
 * ```javascript
 * // Configurar cálculo automático
 * apexGridUtils.setupAutoCalculation('mi_grid', {
 *     sourceColumns: ['CANTIDAD', 'PRECIO'],
 *     targetColumn: 'TOTAL',
 *     formula: function(values) {
 *         return values.CANTIDAD * values.PRECIO;
 *     }
 * });
 * 
 * // Obtener valor numérico
 * let total = apexUtils.get('P1_TOTAL', 0);
 * ```
 * 
 * Documentación completa: README.md
 * Changelog: CHANGELOG.md
 * 
 * Licencia: MIT
 * 
 * =====================================================
 */

function habilitarEdicion(regionId) {
    try {
        var region = apex.region(regionId);
        if (!region) {
            console.error("Región no encontrada: " + regionId);
            return false;
        }
        
        var grid = region.call("getViews").grid;
        if (!grid) {
            console.error("Grid no encontrado en la región: " + regionId);
            return false;
        }
        
        grid.model.setOption("editable", true);
        grid.setEditMode(true);
        

        if (typeof modoEdicion === 'function') {
            modoEdicion(regionId);
        }
        
        return true;
    } catch (error) {
        console.error("Error al habilitar edición:", error);
        return false;
    }
}


function extraerDatosIG(configuracion) {
    console.log('Ejecutando extracción de datos del IG:', configuracion.regionId);
    
    try {
        // Validar parámetros obligatorios
        if (!configuracion.regionId) {
            throw new Error('regionId es obligatorio');
        }
        if (!configuracion.campos || !Array.isArray(configuracion.campos)) {
            throw new Error('campos debe ser un array');
        }
        if (!configuracion.campoDestino) {
            throw new Error('campoDestino es obligatorio');
        }
        
        // Obtener el Interactive Grid
        var ig$ = apex.region(configuracion.regionId).widget().interactiveGrid("getViews", "grid");
        var model = ig$.model;
        var data = [];
        
        // Función auxiliar para normalizar nombres de campos (mayúsculas a formato correcto)
        function normalizarCampo(campo) {
            return campo.toUpperCase();
        }
        
        // Función auxiliar para obtener valor real (maneja poplovs)
        function obtenerValorReal(valorObj) {
            return valorObj?.v !== undefined ? valorObj.v : valorObj;
        }
        
        // Recorrer todos los registros del modelo
        model.forEach(function(record) {
            var registro = {};
            var incluirRegistro = true;
            
            configuracion.campos.forEach(function(configCampo) {
                var nombreCampo = configCampo.nombre;
                var aliasCampo = configCampo.alias || nombreCampo.toLowerCase();
                var obligatorio = configCampo.obligatorio !== false; // Por defecto true
                var condicion = configCampo.condicion || null;
                
                var campoNormalizado = normalizarCampo(nombreCampo);
                
                var valorBruto = model.getValue(record, campoNormalizado);
                var valorFinal = obtenerValorReal(valorBruto);
                
                
                if (configCampo.transformacion && typeof configCampo.transformacion === 'function') {
                    valorFinal = configCampo.transformacion(valorFinal);
                }
                
                // Verifica si la condición si existe
                if (condicion && typeof condicion === 'function') {
                    if (!condicion(valorFinal)) {
                        incluirRegistro = false;
                        return;
                    }
                }
                
                if (obligatorio && (valorFinal === null || valorFinal === undefined || valorFinal === '')) {
                    incluirRegistro = false;
                    return;
                }
                
                registro[aliasCampo] = valorFinal;
            });
            
            if (incluirRegistro) {
                data.push(registro);
            }
        });
        
    
        var valorDestino = configuracion.formatoSalida === 'array' ? data : JSON.stringify(data);
        apex.item(configuracion.campoDestino).setValue(valorDestino);
        
        console.log('Datos extraídos:', data);
        console.log('Total registros:', data.length);
        
        
        if (configuracion.callback && typeof configuracion.callback === 'function') {
            configuracion.callback(data);
        }
        
        return {
            success: true,
            data: data,
            count: data.length
        }; 

        /* return data; */
        
    } catch (error) {
        console.error('Error al extraer datos del IG:', error);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}



function extraerDatos(regionId, campos, campoDestino) {
    var configuracion = {
        regionId: regionId,
        campoDestino: campoDestino,
        campos: campos.map(function(campo) {
            if (typeof campo === 'string') {
                return {
                    nombre: campo,
                    alias: campo.toLowerCase()
                };
            }
            return campo;
        })
    };
    
    return extraerDatosIG(configuracion);
}

// =============================================================================
// APEX GRID UTILITIES - API LIMPIA Y CLARA
// =============================================================================

window.apexGridUtils = (function() {
    'use strict';

    // Almacén de configuraciones de cálculos automáticos
    const autoCalculationConfigs = new Map();

    /**
     * Generar ID único para una configuración
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} targetColumn - Columna destino
     * @returns {string} - ID único de la configuración
     */
    function generateConfigId(gridStaticId, targetColumn) {
        return `${gridStaticId}_${targetColumn}`;
    }

    /**
     * Normaliza números con formato europeo/latino (1.234,56) a formato estándar (1234.56)
     * @param {string|number} value - Valor a normalizar
     * @returns {number} - Número normalizado
     */
    function normalizeNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        
        // Convertir a string si es número
        let strValue = String(value).trim();
        
        // Si ya es un número válido, retornarlo
        if (!isNaN(parseFloat(strValue)) && strValue.indexOf(',') === -1 && strValue.indexOf('.') === -1) {
            return parseFloat(strValue);
        }
        
        // Detectar formato europeo/latino (1.234,56)
        if (strValue.includes('.') && strValue.includes(',')) {
            // Si hay punto y coma, asumir formato europeo: punto=miles, coma=decimal
            strValue = strValue.replace(/\./g, '').replace(',', '.');
        }
        // Detectar formato con solo coma como decimal (1,56)
        else if (strValue.includes(',') && !strValue.includes('.')) {
            // Si solo hay coma, verificar si es decimal
            const parts = strValue.split(',');
            if (parts.length === 2 && parts[1].length <= 3) {
                // Probablemente es decimal (1,56)
                strValue = strValue.replace(',', '.');
            } else {
                // Probablemente es separador de miles (1,234)
                strValue = strValue.replace(/,/g, '');
            }
        }
        
        const result = parseFloat(strValue);
        return isNaN(result) ? 0 : result;
    }

    /**
     * Formatea un número al formato europeo/latino (1234.56 -> 1.234,56)
     * @param {number} value - Valor numérico a formatear
     * @param {number} decimalPlaces - Número de decimales (default: 2)
     * @param {boolean} useThousandsSeparator - Si debe usar separador de miles (default: true)
     * @returns {string} - Número formateado en formato europeo
     */
    function formatToEuropean(value, decimalPlaces = 2, useThousandsSeparator = true) {
        if (value === null || value === undefined || isNaN(value)) {
            return '0';
        }
        
        // Convertir a número
        const numValue = parseFloat(value);
        
        // Formatear con decimales
        const formatted = numValue.toFixed(decimalPlaces);
        
        if (!useThousandsSeparator) {
            // Solo cambiar punto por coma para decimales
            return formatted.replace('.', ',');
        }
        
        // Separar parte entera y decimal
        const parts = formatted.split('.');
        const integerPart = parts[0];
        const decimalPart = parts[1] || '';
        
        // Agregar separadores de miles a la parte entera
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        // Combinar con coma decimal
        if (decimalPart) {
            return `${formattedInteger},${decimalPart}`;
        } else {
            return formattedInteger;
        }
    }

    /**
     * Convierte un valor al formato europeo para mostrar en la interfaz
     * @param {number|string} value - Valor a convertir
     * @param {number} decimalPlaces - Número de decimales (default: 2)
     * @returns {string} - Valor en formato europeo
     */
    function toEuropeanFormat(value, decimalPlaces = 2) {
        const normalized = normalizeNumber(value);
        return formatToEuropean(normalized, decimalPlaces, true);
    }

    /**
     * Configuración de cálculo automático para Interactive Grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {object} config - Configuración del cálculo
     * @param {array} config.sourceColumns - Columnas que disparan el cálculo
     * @param {string} config.targetColumn - Columna donde se guarda el resultado
     * @param {function} config.formula - Función que realiza el cálculo
     * @param {number} config.decimalPlaces - Número de decimales (default: 2)
     * @param {boolean} config.autoTrigger - Si debe configurar eventos automáticos (default: true)
     * @returns {string} - ID único de la configuración creada
     */
    function setupAutoCalculation(gridStaticId, config) {
        try {
            // Validar parámetros requeridos
            if (!gridStaticId || !config.sourceColumns || !config.targetColumn || !config.formula) {
                console.error('apexGridUtils: Faltan parámetros requeridos');
                return null;
            }

            // Configuración por defecto
            const settings = {
                decimalPlaces: 2,
                autoTrigger: true,
                triggerOnLoad: false,
                ...config
            };

            // Generar ID único para esta configuración
            const configId = generateConfigId(gridStaticId, config.targetColumn);

            // Almacenar la configuración para uso posterior
            autoCalculationConfigs.set(configId, {
                gridStaticId: gridStaticId,
                configId: configId,
                ...settings
            });

            // Función para ejecutar el cálculo
            const executeCalculation = function() {
                return calculateFormula(gridStaticId, settings);
            };

            // Configurar eventos automáticos si está habilitado
            if (settings.autoTrigger) {
                setupTriggerEvents(gridStaticId, settings.sourceColumns, executeCalculation);
            }

            // Ejecutar cálculo inicial si está configurado
            if (settings.triggerOnLoad) {
                setTimeout(executeCalculation, 100);
            }

            console.log(`apexGridUtils: Configurado cálculo automático para ${gridStaticId} -> ${config.targetColumn} (ID: ${configId})`);
            return configId;

        } catch (error) {
            console.error('apexGridUtils setupAutoCalculation error:', error);
            return null;
        }
    }

    /**
     * Ejecuta un cálculo específico en el registro activo
     */
    function calculateFormula(gridStaticId, settings) {
        try {
            // Obtener el grid y registro activo
            const gridData = getActiveGridRecord(gridStaticId);
            if (!gridData.success) {
                return 0;
            }

            const { model, record } = gridData;

            // Obtener valores de las columnas fuente y normalizarlos
            const values = {};
            settings.sourceColumns.forEach(column => {
                const rawValue = model.getValue(record, column);
                values[column] = normalizeNumber(rawValue);
                ////console.log(`apexGridUtils: Columna ${column} - Valor original: "${rawValue}", Normalizado: ${values[column]}`);
            });

            // Ejecutar la fórmula
            let result = settings.formula(values);
            
            // Formatear resultado con los decimales especificados
            const decimalPlaces = settings.decimalPlaces || 2;
            result = parseFloat(result.toFixed(decimalPlaces));
            
            ////console.log(`apexGridUtils: Resultado calculado: ${result} (con ${decimalPlaces} decimales)`);

            // Actualizar columna destino
            // Importante: Guardar el valor como número, no como string
            model.setValue(record, settings.targetColumn, result);
            
            // Forzar actualización del grid para que se aplique el formato correcto
            try {
                const ig$ = gridData.gridView;
                if (ig$ && ig$.refreshView) {
                    ig$.refreshView();
                }
                
                // Alternativa: Forzar actualización de la celda específica
                if (ig$ && ig$.getView) {
                    const view = ig$.getView();
                    if (view && view.refresh) {
                        view.refresh();
                    }
                }
            } catch (e) {
                // Si no se puede refrescar, continuar
                console.log('apexGridUtils: No se pudo refrescar la vista del grid');
            }
            
            // Verificar que el valor se guardó correctamente
            setTimeout(() => {
                const savedValue = model.getValue(record, settings.targetColumn);
                //console.log(`apexGridUtils: Valor guardado en el modelo: ${savedValue} (tipo: ${typeof savedValue})`);
            }, 100);

            return result;

        } catch (error) {
            console.error('apexGridUtils calculateFormula error:', error);
            return 0;
        }
    }

    /**
     * Configurar eventos para disparar cálculos automáticamente
     */
    function setupTriggerEvents(gridStaticId, sourceColumns, callback) {
        try {
            const ig$ = apex.region(gridStaticId).widget().interactiveGrid("getViews", "grid");
            const model = ig$.model;

            // Configurar listener para cambios en el modelo
            model.subscribe({
                onChange: function(type, change) {
                    if (type === 'set' && sourceColumns.includes(change.field)) {
                        setTimeout(callback, 50);
                    }
                }
            });

        } catch (error) {
            console.error('apexGridUtils setupTriggerEvents error:', error);
        }
    }

    /**
     * Obtener el registro activo del grid
     */
    function getActiveGridRecord(gridStaticId) {
        try {
            const region = apex.region(gridStaticId);
            if (!region.widget) {
                return { success: false, error: 'Grid no encontrado' };
            }

            const ig$ = region.widget().interactiveGrid("getViews", "grid");
            const model = ig$.model;
            
            // En versiones más antiguas, obtener el registro activo puede ser diferente
            // Intentar diferentes métodos según la versión
            let record = null;
            
            // Método 1: Intentar obtener registro seleccionado
            try {
                const selectedRecords = ig$.getSelectedRecords();
                if (selectedRecords && selectedRecords.length > 0) {
                    record = selectedRecords[0];
                }
            } catch (e) {
                // Ignorar error y probar siguiente método
            }
            
            // Método 2: Intentar obtener registro activo
            if (!record) {
                try {
                    const activeRecordId = ig$.getActiveRecordId ? ig$.getActiveRecordId() : null;
                    if (activeRecordId) {
                        record = model.getRecord(activeRecordId);
                    }
                } catch (e) {
                    // Ignorar error y probar siguiente método
                }
            }
            
            // Método 3: Obtener el primer registro si no hay activo
            if (!record) {
                try {
                    // Usar model.forEach para obtener el primer registro
                    let firstRecord = null;
                    model.forEach(function(rec) {
                        if (!firstRecord) {
                            firstRecord = rec;
                        }
                    });
                    record = firstRecord;
                } catch (e) {
                    // Ignorar error
                }
            }
            
            if (!record) {
                return { success: false, error: 'No hay registro disponible' };
            }
            
            return { success: true, model, record, gridView: ig$ };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Ejecutar cálculo manual
     * @param {string} gridStaticId - Static ID del grid
     * @param {object} config - Configuración del cálculo
     */
    function calculate(gridStaticId, config) {
        const settings = {
            decimalPlaces: 2,
            ...config
        };
        
        return calculateFormula(gridStaticId, settings);
    }

    /**
     * Obtener valor de una columna del registro activo
     */
    function getColumnValue(gridStaticId, columnName) {
        const gridData = getActiveGridRecord(gridStaticId);
        if (!gridData.success) {
            return null;
        }

        return gridData.model.getValue(gridData.record, columnName);
    }

    /**
     * Establecer valor en una columna del registro activo
     */
    function setColumnValue(gridStaticId, columnName, value) {
        const gridData = getActiveGridRecord(gridStaticId);
        if (!gridData.success) {
            return false;
        }

        gridData.model.setValue(gridData.record, columnName, value);
        return true;
    }

    /**
     * Fórmulas predefinidas comunes
     */
    const presetFormulas = {
        // Cantidad por costo
        multiply: (values, col1, col2) => values[col1] * values[col2],
        
        // Precio con IVA
        addTax: (values, priceCol, taxPercent = 10) => values[priceCol] * (1 + taxPercent / 100),
        
        // Subtotal con descuento
        subtotalWithDiscount: (values, qtyCol, priceCol, discountCol) => {
            const subtotal = values[qtyCol] * values[priceCol];
            return subtotal * (1 - values[discountCol] / 100);
        },
        
        // Suma de columnas
        sum: (values, ...columns) => columns.reduce((total, col) => total + values[col], 0),
        
        // Promedio de columnas
        average: (values, ...columns) => {
            const sum = columns.reduce((total, col) => total + values[col], 0);
            return sum / columns.length;
        }
    };

    /**
     * Configuraciones rápidas para casos comunes
     */
    const quickSetups = {
        /**
         * Configurar multiplicación simple (cantidad × precio = total)
         */
        multiplyColumns: function(gridStaticId, col1, col2, targetCol, decimalPlaces = 2) {
            return setupAutoCalculation(gridStaticId, {
                sourceColumns: [col1, col2],
                targetColumn: targetCol,
                formula: function(values) {
                    return values[col1] * values[col2];
                },
                decimalPlaces: decimalPlaces
            });
        },

        /**
         * Configurar precio con IVA
         */
        priceWithTax: function(gridStaticId, priceCol, targetCol, taxPercent = 10, decimalPlaces = 2) {
            return setupAutoCalculation(gridStaticId, {
                sourceColumns: [priceCol],
                targetColumn: targetCol,
                formula: function(values) {
                    return values[priceCol] * (1 + taxPercent / 100);
                },
                decimalPlaces: decimalPlaces
            });
        },

        /**
         * Configurar subtotal con descuento
         */
        subtotalWithDiscount: function(gridStaticId, qtyCol, priceCol, discountCol, targetCol, decimalPlaces = 2) {
            return setupAutoCalculation(gridStaticId, {
                sourceColumns: [qtyCol, priceCol, discountCol],
                targetColumn: targetCol,
                formula: function(values) {
                    const subtotal = values[qtyCol] * values[priceCol];
                    return subtotal * (1 - values[discountCol] / 100);
                },
                decimalPlaces: decimalPlaces
            });
        }
    };

    /**
     * Verificar y corregir formato de números en el grid
     * @param {string} gridStaticId - Static ID del grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} decimalPlaces - Número de decimales esperados
     */
    function ensureDecimalFormat(gridStaticId, columnName, decimalPlaces = 2) {
        try {
            const gridData = getActiveGridRecord(gridStaticId);
            if (!gridData.success) {
                return false;
            }

            const { model, record } = gridData;
            const currentValue = model.getValue(record, columnName);
            
            // Si el valor es un número, asegurar que tenga los decimales correctos
            if (typeof currentValue === 'number') {
                const formattedValue = parseFloat(currentValue.toFixed(decimalPlaces));
                model.setValue(record, columnName, formattedValue);
                
                //console.log(`apexGridUtils: Formato corregido para ${columnName}: ${currentValue} -> ${formattedValue}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('apexGridUtils ensureDecimalFormat error:', error);
            return false;
        }
    }

    /**
     * Sumar todos los valores de una columna del Interactive Grid y colocarlos en un item
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna a sumar
     * @param {string} targetItem - ID del item donde colocar el total
     * @param {number} decimalPlaces - Número de decimales para el resultado (default: 2)
     * @param {boolean} autoUpdate - Si debe actualizarse automáticamente cuando cambie el grid (default: true)
     * @returns {object} - Objeto con la suma calculada y la función calculateSum para uso externo
     */
    function sumColumnToItem(gridStaticId, columnName, targetItem, decimalPlaces = 2, autoUpdate = true) {
        try {
            const ig$ = apex.region(gridStaticId).widget().interactiveGrid("getViews", "grid");
            const model = ig$.model;
            
            // Función para calcular la suma
            const calculateSum = function() {
                try {
                    let total = 0;
                    let validRecords = 0;
                    
                    // Usar model.forEach en lugar de model.getRecords()
                    model.forEach(function(record) {
                        const value = model.getValue(record, columnName);
                        if (value !== null && value !== undefined && value !== '') {
                            const normalizedValue = normalizeNumber(value);
                            total += normalizedValue;
                            validRecords++;
                        }
                    });
                    
                    // Formatear resultado
                    const formattedTotal = parseFloat(total.toFixed(decimalPlaces));
                    
                    // Colocar en el item
                    apex.item(targetItem).setValue(formattedTotal);
                    
                    //console.log(`apexGridUtils: Suma de ${columnName}: ${validRecords} registros = ${formattedTotal}`);
                    
                    return formattedTotal;
                    
                } catch (error) {
                    console.error('apexGridUtils: Error al calcular suma:', error);
                    return 0;
                }
            };
            
            // Calcular suma inicial
            const initialSum = calculateSum();
            
            // Configurar actualización automática si está habilitada
            if (autoUpdate) {
                // Suscribirse a cambios en el modelo
                model.subscribe({
                    onChange: function(type, change) {
                        if (type === 'set' && change.field === columnName) {
                            // Pequeño delay para asegurar que el cambio se haya aplicado
                            setTimeout(calculateSum, 50);
                        }
                    }
                });
                
                // También escuchar cambios en la estructura del grid (nuevas filas, eliminaciones)
                model.subscribe({
                    onChange: function(type) {
                        if (type === 'add' || type === 'delete' || type === 'reset') {
                            setTimeout(calculateSum, 100);
                        }
                    }
                });
                
                //console.log(`apexGridUtils: Configurada actualización automática para suma de ${columnName} -> ${targetItem}`);
            }
            
            // Retornar objeto con la suma y la función para uso externo
            return {
                sum: initialSum,
                calculateSum: calculateSum,
                gridStaticId: gridStaticId,
                columnName: columnName,
                targetItem: targetItem
            };
            
        } catch (error) {
            console.error('apexGridUtils sumColumnToItem error:', error);
            return {
                sum: 0,
                calculateSum: function() { return 0; },
                gridStaticId: gridStaticId,
                columnName: columnName,
                targetItem: targetItem
            };
        }
    }

    /**
     * Función rápida para sumar columna TOTAL a un item específico
     * @param {string} gridStaticId - Static ID del grid
     * @param {string} targetItem - ID del item donde colocar el total
     * @param {number} decimalPlaces - Número de decimales (default: 2)
     */
    function sumTotalToItem(gridStaticId, targetItem, decimalPlaces = 2) {
        return sumColumnToItem(gridStaticId, 'TOTAL', targetItem, decimalPlaces, true);
    }

    /**
     * Configurar listener externo para recalcular suma cuando cambie el grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {function} callback - Función a ejecutar cuando cambie el grid
     * @param {array} eventTypes - Tipos de eventos a escuchar (default: ['set', 'add', 'delete', 'reset'])
     */
    function setupGridListener(gridStaticId, callback, eventTypes = ['set', 'add', 'delete', 'reset']) {
        try {
            const ig$ = apex.region(gridStaticId).widget().interactiveGrid("getViews", "grid");
            const model = ig$.model;
            
            model.subscribe({
                onChange: function(type, change) {
                    if (eventTypes.includes(type)) {
                        // Pequeño delay para asegurar que el cambio se haya aplicado
                        setTimeout(callback, 50);
                    }
                }
            });
            
            //console.log(`apexGridUtils: Configurado listener externo para ${gridStaticId} con eventos: ${eventTypes.join(', ')}`);
            return true;
            
        } catch (error) {
            console.error('apexGridUtils setupGridListener error:', error);
            return false;
        }
    }

    /**
     * Navegar a una celda específica en el Interactive Grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna a la que navegar
     * @param {number} rowIndex - Índice de la fila (0 = primera fila, -1 = fila seleccionada)
     * @param {boolean} focus - Si debe hacer focus en la celda (default: true)
     */
    function gotoCell(gridStaticId, columnName, rowIndex = -1, focus = true) {
        try {
            // Usar el mismo método que funciona en el código del usuario
            const grid = apex.region(gridStaticId).call("getViews").grid;
            
            let targetRow = null;
            
            // Si rowIndex es -1, usar la fila seleccionada
            if (rowIndex === -1) {
                const array = grid.getSelectedRecords();
                if (array && array.length > 0) {
                    targetRow = array[0][1]; // Usar el mismo formato que funciona
                } else {
                    console.warn(`apexGridUtils: No hay fila seleccionada en ${gridStaticId}`);
                    return false;
                }
            } else {
                // Usar el índice específico
                const array = grid.getSelectedRecords();
                if (array && array.length > rowIndex) {
                    targetRow = array[rowIndex][1];
                } else {
                    console.warn(`apexGridUtils: Índice de fila ${rowIndex} fuera de rango en ${gridStaticId}`);
                    return false;
                }
            }
            
            if (targetRow) {
                // Navegar a la celda usando el mismo método que funciona
                grid.gotoCell(targetRow, columnName);
                
                // Hacer focus si está habilitado
                if (focus) {
                    setTimeout(() => {
                        try {
                            // Intentar hacer focus en la celda
                            const cellElement = grid.getCellElement ? grid.getCellElement(targetRow, columnName) : null;
                            if (cellElement && cellElement.length > 0) {
                                cellElement.focus();
                            }
                        } catch (e) {
                            // Si no se puede hacer focus, continuar
                        }
                    }, 100);
                }
                
                //console.log(`apexGridUtils: Navegado a celda ${columnName} en fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('apexGridUtils gotoCell error:', error);
            return false;
        }
    }

    /**
     * Navegar a la primera celda de una columna específica
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     */
    function gotoFirstCell(gridStaticId, columnName) {
        return gotoCell(gridStaticId, columnName, 0, true);
    }

    /**
     * Navegar a la celda de la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     */
    function gotoSelectedCell(gridStaticId, columnName) {
        return gotoCell(gridStaticId, columnName, -1, true);
    }

    /**
     * Setear un valor específico en una celda del Interactive Grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setCellValue(gridStaticId, columnName, rowIndex, value, refresh = true) {
        try {
            // Obtener el grid usando el método que funciona
            const grid = apex.region(gridStaticId).call("getViews").grid;
            
            let targetRow = null;
            
            // Si rowIndex es -1, usar la fila seleccionada
            if (rowIndex === -1) {
                const array = grid.getSelectedRecords();
                if (array && array.length > 0) {
                    targetRow = array[0][1];
                } else {
                    console.warn(`apexGridUtils: No hay fila seleccionada en ${gridStaticId}`);
                    return false;
                }
            } else {
                // Convertir rowIndex a índice interno (rowIndex - 1)
                const internalIndex = rowIndex - 1;
                
                // Obtener todas las filas del modelo, no solo las seleccionadas
                const allRecords = [];
                grid.model.forEach(function(record) {
                    allRecords.push(record);
                });
                
                if (allRecords.length > internalIndex && internalIndex >= 0) {
                    targetRow = allRecords[internalIndex];
                } else {
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId} (total filas: ${allRecords.length})`);
                    return false;
                }
            }
            
            if (targetRow) {
                // Establecer el valor en el modelo
                grid.model.setValue(targetRow, columnName, value);
                
                // Refrescar la vista si está habilitado - USAR MÉTODO CORRECTO
                if (refresh) {
                    try {
                        // Método correcto para Interactive Grids de APEX
                        grid.view$.trigger('refresh');
                        //console.log(`apexGridUtils: Vista refrescada usando grid.view$.trigger('refresh')`);
                    } catch (e) {
                        console.warn('apexGridUtils: No se pudo refrescar la vista:', e);
                    }
                }
                
                //console.log(`apexGridUtils: Valor ${value} establecido en ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('apexGridUtils setCellValue error:', error);
            return false;
        }
    }

    /**
     * Setear valor en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     */
    function setSelectedCellValue(gridStaticId, columnName, value, refresh = true) {
        return setCellValue(gridStaticId, columnName, -1, value, refresh);
    }

    /**
     * Setear valor en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     */
    function setFirstCellValue(gridStaticId, columnName, value, refresh = true) {
        return setCellValue(gridStaticId, columnName, 1, value, refresh);
    }

    /**
     * Obtener el valor de una celda específica del Interactive Grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @returns {any} - Valor de la celda o null si no se encuentra
     */
    function getCellValue(gridStaticId, columnName, rowIndex = -1) {
        try {
            // Obtener el grid usando el método que funciona
            const grid = apex.region(gridStaticId).call("getViews").grid;
            
            let targetRow = null;
            
            // Si rowIndex es -1, usar la fila seleccionada
            if (rowIndex === -1) {
                const array = grid.getSelectedRecords();
                if (array && array.length > 0) {
                    targetRow = array[0][1];
                } else {
                    console.warn(`apexGridUtils: No hay fila seleccionada en ${gridStaticId}`);
                    return null;
                }
            } else {
                // Convertir rowIndex a índice interno (rowIndex - 1)
                const internalIndex = rowIndex - 1;
                
                // Obtener todas las filas del modelo, no solo las seleccionadas
                const allRecords = [];
                grid.model.forEach(function(record) {
                    allRecords.push(record);
                });
                
                if (allRecords.length > internalIndex && internalIndex >= 0) {
                    targetRow = allRecords[internalIndex];
                } else {
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId} (total filas: ${allRecords.length})`);
                    return null;
                }
            }
            
            if (targetRow) {
                const rawValue = grid.model.getValue(targetRow, columnName);
                
                // Convertir a número si es posible, preservando decimales exactos
                let finalValue = rawValue;
                if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
                    // Si ya es un número, usarlo tal como está
                    if (typeof rawValue === 'number') {
                        finalValue = rawValue;
                    } else {
                        // Si es string, intentar convertir preservando decimales
                        const strValue = String(rawValue).trim();
                        
                        // Verificar si es un número válido (incluyendo decimales)
                        if (/^-?\d*\.?\d+$/.test(strValue)) {
                            // Usar Number() en lugar de parseFloat() para mayor precisión
                            const numericValue = Number(strValue);
                            if (!isNaN(numericValue)) {
                                finalValue = numericValue;
                            }
                        }
                    }
                }
                
                //console.log(`apexGridUtils: Valor obtenido de ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}: ${finalValue} (tipo: ${typeof finalValue})`);
                return finalValue;
            }
            
            return null;
            
        } catch (error) {
            console.error('apexGridUtils getCellValue error:', error);
            return null;
        }
    }

    /**
     * Obtener valor de la celda seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @returns {any} - Valor de la celda o null si no se encuentra
     */
    function getSelectedCellValue(gridStaticId, columnName) {
        return getCellValue(gridStaticId, columnName, -1);
    }

    /**
     * Obtener valor de la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @returns {any} - Valor de la celda o null si no se encuentra
     */
    function getFirstCellValue(gridStaticId, columnName) {
        return getCellValue(gridStaticId, columnName, 1);
    }

    /**
     * Obtener valor numérico de una celda específica (con normalización de formato europeo)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor numérico normalizado
     */
    function getNumericCellValue(gridStaticId, columnName, rowIndex = -1, defaultValue = 0) {
        try {
            const rawValue = getCellValue(gridStaticId, columnName, rowIndex);
            
            if (rawValue === null || rawValue === undefined || rawValue === '') {
                return defaultValue;
            }
            
            // Si ya es un número, retornarlo directamente
            if (typeof rawValue === 'number') {
                //console.log(`apexGridUtils: Valor numérico directo de ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}: ${rawValue}`);
                return rawValue;
            }
            
            // Usar la función normalizeNumber existente para manejar formato europeo
            const normalizedValue = normalizeNumber(rawValue);
            
            //console.log(`apexGridUtils: Valor numérico normalizado de ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}: ${normalizedValue}`);
            return normalizedValue;
            
        } catch (error) {
            console.error('apexGridUtils getNumericCellValue error:', error);
            return defaultValue;
        }
    }

    /**
     * Obtener valor numérico de la celda seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor numérico normalizado
     */
    function getSelectedNumericCellValue(gridStaticId, columnName, defaultValue = 0) {
        return getNumericCellValue(gridStaticId, columnName, -1, defaultValue);
    }

    /**
     * Obtener valor numérico de la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor numérico normalizado
     */
    function getFirstNumericCellValue(gridStaticId, columnName, defaultValue = 0) {
        return getNumericCellValue(gridStaticId, columnName, 1, defaultValue);
    }

    /**
     * Obtener valor numérico con decimales específicos
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} decimalPlaces - Número de decimales (default: 2)
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor numérico con decimales especificados
     */
    function getNumericCellValueWithDecimals(gridStaticId, columnName, rowIndex = -1, decimalPlaces = 2, defaultValue = 0) {
        try {
            const rawValue = getNumericCellValue(gridStaticId, columnName, rowIndex, defaultValue);
            
            if (rawValue === defaultValue && rawValue !== 0) {
                return defaultValue;
            }
            
            // Aplicar formato de decimales
            const formattedValue = parseFloat(rawValue.toFixed(decimalPlaces));
            
            //console.log(`apexGridUtils: Valor con ${decimalPlaces} decimales de ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}: ${formattedValue}`);
            return formattedValue;
            
        } catch (error) {
            console.error('apexGridUtils getNumericCellValueWithDecimals error:', error);
            return defaultValue;
        }
    }

    /**
     * Obtener valor entero (sin decimales)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor entero
     */
    function getIntegerCellValue(gridStaticId, columnName, rowIndex = -1, defaultValue = 0) {
        try {
            const rawValue = getNumericCellValue(gridStaticId, columnName, rowIndex, defaultValue);
            
            if (rawValue === defaultValue && rawValue !== 0) {
                return defaultValue;
            }
            
            // Convertir a entero
            const integerValue = Math.round(rawValue);
            
            //console.log(`apexGridUtils: Valor entero de ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}: ${integerValue}`);
            return integerValue;
            
        } catch (error) {
            console.error('apexGridUtils getIntegerCellValue error:', error);
            return defaultValue;
        }
    }

    /**
     * Obtener valor entero de la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor entero
     */
    function getSelectedIntegerCellValue(gridStaticId, columnName, defaultValue = 0) {
        return getIntegerCellValue(gridStaticId, columnName, -1, defaultValue);
    }

    /**
     * Obtener valor entero de la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor entero
     */
    function getFirstIntegerCellValue(gridStaticId, columnName, defaultValue = 0) {
        return getIntegerCellValue(gridStaticId, columnName, 1, defaultValue);
    }

    /**
     * Obtener valor con decimales específicos de la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} decimalPlaces - Número de decimales (default: 2)
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor con decimales especificados
     */
    function getSelectedNumericCellValueWithDecimals(gridStaticId, columnName, decimalPlaces = 2, defaultValue = 0) {
        return getNumericCellValueWithDecimals(gridStaticId, columnName, -1, decimalPlaces, defaultValue);
    }

    /**
     * Obtener valor con decimales específicos de la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} decimalPlaces - Número de decimales (default: 2)
     * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
     * @returns {number} - Valor con decimales especificados
     */
    function getFirstNumericCellValueWithDecimals(gridStaticId, columnName, decimalPlaces = 2, defaultValue = 0) {
        return getNumericCellValueWithDecimals(gridStaticId, columnName, 1, decimalPlaces, defaultValue);
    }

    /**
     * Setear valor numérico con control de decimales
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setNumericCellValue(gridStaticId, columnName, rowIndex, value, decimalPlaces = null, refresh = true) {
        try {
            let finalValue = value;
            
            // Formatear decimales si se especifica
            if (decimalPlaces !== null && typeof value === 'number') {
                finalValue = parseFloat(value.toFixed(decimalPlaces));
            }
            
            // Usar la función setCellValue existente
            const result = setCellValue(gridStaticId, columnName, rowIndex, finalValue, refresh);
            
            if (result) {
                //console.log(`apexGridUtils: Valor numérico ${finalValue} establecido en ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}${decimalPlaces !== null ? ` (con ${decimalPlaces} decimales)` : ''}`);
            }
            
            return result;
            
        } catch (error) {
            console.error('apexGridUtils setNumericCellValue error:', error);
            return false;
        }
    }

    /**
     * Setear valor numérico en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setSelectedNumericCellValue(gridStaticId, columnName, value, decimalPlaces = null, refresh = true) {
        return setNumericCellValue(gridStaticId, columnName, -1, value, decimalPlaces, refresh);
    }

    /**
     * Setear valor numérico en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setFirstNumericCellValue(gridStaticId, columnName, value, decimalPlaces = null, refresh = true) {
        return setNumericCellValue(gridStaticId, columnName, 1, value, decimalPlaces, refresh);
    }

    /**
     * Setear valor entero (sin decimales)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setIntegerCellValue(gridStaticId, columnName, rowIndex, value, refresh = true) {
        const integerValue = Math.round(value);
        return setCellValue(gridStaticId, columnName, rowIndex, integerValue, refresh);
    }

    /**
     * Setear valor entero en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setSelectedIntegerCellValue(gridStaticId, columnName, value, refresh = true) {
        return setIntegerCellValue(gridStaticId, columnName, -1, value, refresh);
    }

    /**
     * Setear valor entero en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setFirstIntegerCellValue(gridStaticId, columnName, value, refresh = true) {
        return setIntegerCellValue(gridStaticId, columnName, 1, value, refresh);
    }

    /**
     * Setear valor y recalcular automáticamente
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna a modificar
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} value - Valor a establecer
     * @param {object} recalculoConfig - Configuración para el recálculo automático
     * @param {array} recalculoConfig.sourceColumns - Columnas que disparan el recálculo
     * @param {string} recalculoConfig.targetColumn - Columna donde se guarda el resultado
     * @param {function} recalculoConfig.formula - Función que realiza el cálculo
     * @param {number} recalculoConfig.decimalPlaces - Número de decimales (default: 2)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setValueAndRecalculate(gridStaticId, columnName, rowIndex, value, recalculoConfig, refresh = true) {
        try {
            console.log(`apexGridUtils: Estableciendo valor ${value} en ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}`);
            
            // Establecer el valor
            const result = setNumericCellValue(gridStaticId, columnName, rowIndex, value, null, refresh);
            
            if (result && recalculoConfig) {
                // Esperar un poco para que el valor se guarde
                setTimeout(function() {
                    console.log(`apexGridUtils: Ejecutando recálculo automático...`);
                    
                    // Ejecutar el recálculo
                    const recalculatedValue = calculateFormula(gridStaticId, recalculoConfig);
                    
                    console.log(`apexGridUtils: Recálculo completado. Nuevo valor en ${recalculoConfig.targetColumn}: ${recalculatedValue}`);
                }, 50);
            }
            
            return result;
            
        } catch (error) {
            console.error('apexGridUtils setValueAndRecalculate error:', error);
            return false;
        }
    }

    /**
     * Setear valor en fila seleccionada y recalcular automáticamente
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {object} recalculoConfig - Configuración para el recálculo automático
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     */
    function setSelectedValueAndRecalculate(gridStaticId, columnName, value, recalculoConfig, refresh = true) {
        return setValueAndRecalculate(gridStaticId, columnName, -1, value, recalculoConfig, refresh);
    }

    /**
     * Setear valor en primera fila y recalcular automáticamente
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {object} recalculoConfig - Configuración para el recálculo automático
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     */
    function setFirstValueAndRecalculate(gridStaticId, columnName, value, recalculoConfig, refresh = true) {
        return setValueAndRecalculate(gridStaticId, columnName, 1, value, recalculoConfig, refresh);
    }

    /**
     * Forzar recálculo de una fórmula específica
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {object} config - Configuración del cálculo
     * @param {array} config.sourceColumns - Columnas fuente
     * @param {string} config.targetColumn - Columna destino
     * @param {function} config.formula - Función de cálculo
     * @param {number} config.decimalPlaces - Número de decimales (default: 2)
     * @returns {number} - Resultado del cálculo
     */
    function forceRecalculate(gridStaticId, config) {
        try {
            console.log(`apexGridUtils: Forzando recálculo en ${gridStaticId}...`);
            
            const result = calculateFormula(gridStaticId, config);
            
            console.log(`apexGridUtils: Recálculo forzado completado. Resultado: ${result}`);
            return result;
            
        } catch (error) {
            console.error('apexGridUtils forceRecalculate error:', error);
            return 0;
        }
    }

    /**
     * Refrescar grid y recalcular
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {object} recalculoConfig - Configuración opcional para recálculo
     * @returns {boolean} - true si se refrescó correctamente
     */
    function refreshGridAndRecalculate(gridStaticId, recalculoConfig = null) {
        try {
            const grid = apex.region(gridStaticId).call("getViews").grid;
            
            // Refrescar la vista del grid
            try {
                // Método correcto para Interactive Grids de APEX
                grid.view$.trigger('refresh');
                console.log(`apexGridUtils: Grid ${gridStaticId} refrescado`);
            } catch (e) {
                console.warn(`apexGridUtils: No se pudo refrescar grid ${gridStaticId}:`, e);
            }
            
            // Ejecutar recálculo si se especifica
            if (recalculoConfig) {
                setTimeout(function() {
                    forceRecalculate(gridStaticId, recalculoConfig);
                }, 100);
            }
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils refreshGridAndRecalculate error:', error);
            return false;
        }
    }

    /**
     * Refrescar todos los cálculos automáticos configurados en un grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} targetColumn - Columna específica a refrescar (opcional, si no se especifica refresca todas)
     * @param {number} delay - Delay en milisegundos antes de ejecutar (default: 50)
     * @returns {boolean} - true si se refrescó correctamente
     */
    function refreshAutoCalculation(gridStaticId, targetColumn = null, delay = 50) {
        try {
            // Verificación de seguridad
            if (typeof autoCalculationConfigs === 'undefined') {
                console.error('apexGridUtils: autoCalculationConfigs no está definido. El módulo no se ha inicializado correctamente.');
                return false;
            }
            
            console.log(`apexGridUtils: Refrescando cálculos automáticos para ${gridStaticId}${targetColumn ? ` -> ${targetColumn}` : ''}`);
            console.log(`apexGridUtils: Total configuraciones almacenadas: ${autoCalculationConfigs.size}`);
            
            let configsToRefresh = [];
            
            if (targetColumn) {
                // Refrescar configuración específica
                const configId = generateConfigId(gridStaticId, targetColumn);
                const config = autoCalculationConfigs.get(configId);
                if (config) {
                    configsToRefresh.push(config);
                    console.log(`apexGridUtils: Configuración encontrada para ${configId}:`, config);
                } else {
                    console.warn(`apexGridUtils: No se encontró configuración para ${gridStaticId} -> ${targetColumn} (ID: ${configId})`);
                    return false;
                }
            } else {
                // Refrescar todas las configuraciones del grid
                autoCalculationConfigs.forEach((config, configId) => {
                    if (config.gridStaticId === gridStaticId) {
                        configsToRefresh.push(config);
                        console.log(`apexGridUtils: Configuración encontrada: ${configId}`, config);
                    }
                });
                
                if (configsToRefresh.length === 0) {
                    console.warn(`apexGridUtils: No se encontraron configuraciones para ${gridStaticId}`);
                    console.log(`apexGridUtils: Configuraciones disponibles:`, Array.from(autoCalculationConfigs.keys()));
                    return false;
                }
            }
            
            console.log(`apexGridUtils: ${configsToRefresh.length} configuraciones a refrescar`);
            
            // Ejecutar el recálculo con delay
            setTimeout(function() {
                try {
                    let totalResults = 0;
                    
                    // Ejecutar cada configuración
                    configsToRefresh.forEach(config => {
                        try {
                            console.log(`apexGridUtils: Ejecutando recálculo para configuración:`, config);
                            
                            // Verificar que el grid existe antes de recalcular
                            const gridData = getActiveGridRecord(gridStaticId);
                            if (!gridData.success) {
                                console.error(`apexGridUtils: No se pudo obtener registro activo para ${gridStaticId}:`, gridData.error);
                                return;
                            }
                            
                            // Verificar que las columnas fuente existen y tienen valores
                            const { model, record } = gridData;
                            const sourceValues = {};
                            let hasValidValues = true;
                            
                            config.sourceColumns.forEach(column => {
                                const rawValue = model.getValue(record, column);
                                const normalizedValue = normalizeNumber(rawValue);
                                sourceValues[column] = normalizedValue;
                                
                                console.log(`apexGridUtils: Columna fuente ${column}: valor original="${rawValue}", normalizado=${normalizedValue}`);
                                
                                if (normalizedValue === 0 && rawValue !== 0) {
                                    console.warn(`apexGridUtils: Columna ${column} tiene valor 0, verificar si es correcto`);
                                }
                            });
                            
                            if (!hasValidValues) {
                                console.warn(`apexGridUtils: Algunas columnas fuente no tienen valores válidos`);
                            }
                            
                            const result = forceRecalculate(gridStaticId, config);
                            totalResults += result;
                            console.log(`apexGridUtils: Recálculo completado para ${config.targetColumn}, resultado: ${result}`);
                            
                        } catch (error) {
                            console.error(`apexGridUtils: Error durante el recálculo de ${config.targetColumn}:`, error);
                        }
                    });
                    
                    // Refrescar la vista del grid para asegurar que los cambios se muestren
                    try {
                        const grid = apex.region(gridStaticId).call("getViews").grid;
                        // Método correcto para Interactive Grids de APEX
                        grid.view$.trigger('refresh');
                        console.log(`apexGridUtils: Grid ${gridStaticId} refrescado después del recálculo`);
                    } catch (e) {
                        console.warn(`apexGridUtils: No se pudo refrescar grid ${gridStaticId}:`, e);
                    }
                    
                    console.log(`apexGridUtils: Recálculo completado para ${gridStaticId}, ${configsToRefresh.length} configuraciones procesadas, total: ${totalResults}`);
                    
                } catch (error) {
                    console.error(`apexGridUtils: Error durante el recálculo de ${gridStaticId}:`, error);
                }
            }, delay);
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils refreshAutoCalculation error:', error);
            return false;
        }
    }

    /**
     * Obtener la configuración almacenada de un grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} targetColumn - Columna específica (opcional)
     * @returns {object|null} - Configuración almacenada o null si no existe
     */
    function getAutoCalculationConfig(gridStaticId, targetColumn = null) {
        try {
            // Verificación de seguridad
            if (typeof autoCalculationConfigs === 'undefined') {
                console.error('apexGridUtils: autoCalculationConfigs no está definido. El módulo no se ha inicializado correctamente.');
                return null;
            }
            
            if (targetColumn) {
                const configId = generateConfigId(gridStaticId, targetColumn);
                return autoCalculationConfigs.get(configId) || null;
            } else {
                // Retornar todas las configuraciones del grid
                const configs = [];
                autoCalculationConfigs.forEach((config, configId) => {
                    if (config.gridStaticId === gridStaticId) {
                        configs.push(config);
                    }
                });
                return configs.length > 0 ? configs : null;
            }
        } catch (error) {
            console.error('apexGridUtils getAutoCalculationConfig error:', error);
            return null;
        }
    }

    /**
     * Limpiar la configuración almacenada de un grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} targetColumn - Columna específica a limpiar (opcional, si no se especifica limpia todas)
     * @returns {boolean} - true si se limpió correctamente
     */
    function clearAutoCalculationConfig(gridStaticId, targetColumn = null) {
        try {
            // Verificación de seguridad
            if (typeof autoCalculationConfigs === 'undefined') {
                console.error('apexGridUtils: autoCalculationConfigs no está definido. El módulo no se ha inicializado correctamente.');
                return false;
            }
            
            let deleted = false;
            
            if (targetColumn) {
                // Limpiar configuración específica
                const configId = generateConfigId(gridStaticId, targetColumn);
                deleted = autoCalculationConfigs.delete(configId);
                if (deleted) {
                    console.log(`apexGridUtils: Configuración limpiada para ${gridStaticId} -> ${targetColumn}`);
                } else {
                    console.warn(`apexGridUtils: No se encontró configuración para limpiar en ${gridStaticId} -> ${targetColumn}`);
                }
            } else {
                // Limpiar todas las configuraciones del grid
                const configsToDelete = [];
                autoCalculationConfigs.forEach((config, configId) => {
                    if (config.gridStaticId === gridStaticId) {
                        configsToDelete.push(configId);
                    }
                });
                
                configsToDelete.forEach(configId => {
                    autoCalculationConfigs.delete(configId);
                    deleted = true;
                });
                
                if (deleted) {
                    console.log(`apexGridUtils: ${configsToDelete.length} configuraciones limpiadas para ${gridStaticId}`);
                } else {
                    console.warn(`apexGridUtils: No se encontraron configuraciones para limpiar en ${gridStaticId}`);
                }
            }
            
            return deleted;
        } catch (error) {
            console.error('apexGridUtils clearAutoCalculationConfig error:', error);
            return false;
        }
    }

    /**
     * Obtener todas las configuraciones almacenadas
     * @param {string} gridStaticId - Static ID del Interactive Grid (opcional, si no se especifica retorna todas)
     * @returns {object} - Objeto con todas las configuraciones
     */
    function getAllAutoCalculationConfigs(gridStaticId = null) {
        try {
            // Verificación de seguridad
            if (typeof autoCalculationConfigs === 'undefined') {
                console.error('apexGridUtils: autoCalculationConfigs no está definido. El módulo no se ha inicializado correctamente.');
                return {};
            }
            
            const configs = {};
            autoCalculationConfigs.forEach((config, configId) => {
                if (!gridStaticId || config.gridStaticId === gridStaticId) {
                    configs[configId] = config;
                }
            });
            return configs;
        } catch (error) {
            console.error('apexGridUtils getAllAutoCalculationConfigs error:', error);
            return {};
        }
    }

    /**
     * Verificar si el módulo está inicializado correctamente
     * @returns {boolean} - true si el módulo está listo para usar
     */
    function isInitialized() {
        return typeof autoCalculationConfigs !== 'undefined' && autoCalculationConfigs instanceof Map;
    }

    /**
     * Inicializar el módulo (llamado automáticamente)
     */
    function initialize() {
        try {
            if (!isInitialized()) {
                console.error('apexGridUtils: Error al inicializar el módulo');
                return false;
            }
            console.log('apexGridUtils: Módulo inicializado correctamente');
            return true;
        } catch (error) {
            console.error('apexGridUtils: Error durante la inicialización:', error);
            return false;
        }
    }

    // API pública
    return {
        setupAutoCalculation: setupAutoCalculation,
        calculate: calculate,
        getColumnValue: getColumnValue,
        setColumnValue: setColumnValue,
        presetFormulas: presetFormulas,
        quick: quickSetups,
        normalizeNumber: normalizeNumber,
        formatToEuropean: formatToEuropean,
        toEuropeanFormat: toEuropeanFormat,
        ensureDecimalFormat: ensureDecimalFormat,
        sumColumnToItem: sumColumnToItem,
        sumTotalToItem: sumTotalToItem,
        gotoCell: gotoCell,
        gotoFirstCell: gotoFirstCell,
        gotoSelectedCell: gotoSelectedCell,
        setCellValue: setCellValue,
        setSelectedCellValue: setSelectedCellValue,
        setFirstCellValue: setFirstCellValue,
        getCellValue: getCellValue,
        getSelectedCellValue: getSelectedCellValue,
        getFirstCellValue: getFirstCellValue,
        getNumericCellValue: getNumericCellValue,
        getSelectedNumericCellValue: getSelectedNumericCellValue,
        getFirstNumericCellValue: getFirstNumericCellValue,
        getNumericCellValueWithDecimals: getNumericCellValueWithDecimals,
        getIntegerCellValue: getIntegerCellValue,
        getSelectedIntegerCellValue: getSelectedIntegerCellValue,
        getFirstIntegerCellValue: getFirstIntegerCellValue,
        getSelectedNumericCellValueWithDecimals: getSelectedNumericCellValueWithDecimals,
        getFirstNumericCellValueWithDecimals: getFirstNumericCellValueWithDecimals,
        setNumericCellValue: setNumericCellValue,
        setSelectedNumericCellValue: setSelectedNumericCellValue,
        setFirstNumericCellValue: setFirstNumericCellValue,
        setIntegerCellValue: setIntegerCellValue,
        setSelectedIntegerCellValue: setSelectedIntegerCellValue,
        setFirstIntegerCellValue: setFirstIntegerCellValue,
        setupGridListener: setupGridListener,
        setValueAndRecalculate: setValueAndRecalculate,
        setSelectedValueAndRecalculate: setSelectedValueAndRecalculate,
        setFirstValueAndRecalculate: setFirstValueAndRecalculate,
        forceRecalculate: forceRecalculate,
        refreshGridAndRecalculate: refreshGridAndRecalculate,
        refreshAutoCalculation: refreshAutoCalculation,
        getAutoCalculationConfig: getAutoCalculationConfig,
        clearAutoCalculationConfig: clearAutoCalculationConfig,
        getAllAutoCalculationConfigs: getAllAutoCalculationConfigs,
        setupCantidadPorCosto: setupCantidadPorCosto,
        ensureAutoCalculation: ensureAutoCalculation,
        isInitialized: isInitialized,
        initialize: initialize,
        setNumericCellValueWithCommit: setNumericCellValueWithCommit,
        setSelectedNumericCellValueWithCommit: setSelectedNumericCellValueWithCommit,
        setFirstNumericCellValueWithCommit: setFirstNumericCellValueWithCommit,
        setearDatosIG: setearDatosIG,
        setearDatosDirectos: setearDatosDirectos,
        setearDatos: setearDatos,
        setNumericValueRobust: setNumericValueRobust,
        setSelectedNumericValueRobust: setSelectedNumericValueRobust,
        setFirstNumericValueRobust: setFirstNumericValueRobust,
        setNumericValueEuropean: setNumericValueEuropean,
        setSelectedNumericValueEuropean: setSelectedNumericValueEuropean,
        setFirstNumericValueEuropean: setFirstNumericValueEuropean,
        debugGrid: debugGrid,
        refreshGrid: refreshGrid,
        refreshGridAndRecalculateSimple: refreshGridAndRecalculateSimple,
        commitGridChanges: commitGridChanges,
        refreshGridViewOnly: refreshGridViewOnly,
        refreshGridSafe: refreshGridSafe
    };

    // Inicializar el módulo automáticamente
    initialize();

})();

// =============================================================================
// APEX UTILS - UTILIDADES GENERALES PARA APEX
// =============================================================================
// Agregar al objeto apexUtils existente o crear uno nuevo
window.apexUtils = window.apexUtils || {};

// Almacén interno para los debounces
const debounceTimers = new Map();

/**
 * Ejecuta una función con debounce para evitar múltiples ejecuciones
 * @param {string} key - Clave única para identificar el debounce
 * @param {function} callback - Función a ejecutar
 * @param {number} delay - Delay en milisegundos (default: 300)
 * @param {boolean} immediate - Si debe ejecutar inmediatamente en la primera llamada (default: false)
 * @returns {boolean} - true si se programó la ejecución, false si se canceló
 */
apexUtils.debounce = function(key, callback, delay = 300, immediate = false) {
    try {
        // Limpiar timer existente
        if (debounceTimers.has(key)) {
            clearTimeout(debounceTimers.get(key));
        }
        
        // Si es inmediato y no hay timer activo, ejecutar ahora
        if (immediate && !debounceTimers.has(key)) {
            if (typeof callback === 'function') {
                callback();
            }
            return true;
        }
        
        // Programar nueva ejecución
        const timerId = setTimeout(() => {
            if (typeof callback === 'function') {
                callback();
            }
            debounceTimers.delete(key);
        }, delay);
        
        debounceTimers.set(key, timerId);
        return true;
        
    } catch (error) {
        console.error('apexUtils.debounce error:', error);
        return false;
    }
};

/**
 * Cancela un debounce específico
 * @param {string} key - Clave del debounce a cancelar
 * @returns {boolean} - true si se canceló, false si no existía
 */
apexUtils.cancelDebounce = function(key) {
    try {
        if (debounceTimers.has(key)) {
            clearTimeout(debounceTimers.get(key));
            debounceTimers.delete(key);
            return true;
        }
        return false;
    } catch (error) {
        console.error('apexUtils.cancelDebounce error:', error);
        return false;
    }
};

/**
 * Ejecuta una función solo si un valor ha cambiado
 * @param {string} key - Clave única para identificar el cambio
 * @param {any} newValue - Nuevo valor a comparar
 * @param {function} callback - Función a ejecutar si el valor cambió
 * @param {number} delay - Delay en milisegundos (default: 100)
 * @returns {boolean} - true si se ejecutó, false si no hubo cambio
 */
apexUtils.executeOnChange = function(key, newValue, callback, delay = 100) {
    try {
        const changeKey = `change_${key}`;
        const lastValue = window[`last_${key}`];
        
        // Convertir valores a string para comparación
        const newValueStr = String(newValue);
        const lastValueStr = lastValue ? String(lastValue) : null;
        
        // Si el valor realmente cambió
        if (newValueStr !== lastValueStr) {
            // Actualizar el valor anterior
            window[`last_${key}`] = newValue;
            
            // Ejecutar con debounce
            return apexUtils.debounce(changeKey, () => {
                if (typeof callback === 'function') {
                    callback(newValue, lastValue);
                }
            }, delay);
        }
        
        return false;
        
    } catch (error) {
        console.error('apexUtils.executeOnChange error:', error);
        return false;
    }
};

/**
 * Limpia todos los debounces activos
 */
apexUtils.clearAllDebounces = function() {
    try {
        debounceTimers.forEach((timerId) => {
            clearTimeout(timerId);
        });
        debounceTimers.clear();
        console.log('apexUtils: Todos los debounces limpiados');
    } catch (error) {
        console.error('apexUtils.clearAllDebounces error:', error);
    }
};

/**
 * Obtiene el valor numérico de un item de APEX, manejando automáticamente
 * el formato europeo (puntos como separadores de miles, coma como decimal)
 * @param {string} itemName - Nombre del item (ej: 'P1216_TOTAL_U')
 * @param {number} defaultValue - Valor por defecto si no se puede convertir (default: 0)
 * @returns {number} - Valor numérico convertido
 */
apexUtils.getNumeric = function(itemName, defaultValue = 0) {
    try {
        let value = $v(itemName);
        
        // Si está vacío o es null/undefined
        if (!value || value.trim() === '') {
            return defaultValue;
        }
        
        // Convertir a string por si acaso
        value = value.toString().trim();
        
        // Manejar formato europeo: 4.943.007,876
        // Remover todos los puntos (separadores de miles) y reemplazar coma por punto
        let cleanValue = value.replace(/\./g, '').replace(',', '.');
        
        let result = parseFloat(cleanValue);
        
        // Verificar si la conversión fue exitosa
        if (isNaN(result)) {
            console.warn(`apexUtils.getNumeric: No se pudo convertir '${value}' a número. Usando valor por defecto: ${defaultValue}`);
            return defaultValue;
        }
        
        return result;
        
    } catch (error) {
        console.error(`apexUtils.getNumeric: Error al obtener valor de '${itemName}':`, error);
        return defaultValue;
    }
};

/**
 * Versión abreviada de getNumeric para uso más rápido
 */
apexUtils.get = function(itemName, defaultValue = 0) {
    return apexUtils.getNumeric(itemName, defaultValue);
};

/**
 * Obtiene múltiples valores numéricos de una vez
 * @param {string[]} itemNames - Array de nombres de items
 * @param {number} defaultValue - Valor por defecto para todos
 * @returns {number[]} - Array de valores numéricos
 */
apexUtils.getMultipleNumeric = function(itemNames, defaultValue = 0) {
    return itemNames.map(itemName => apexUtils.getNumeric(itemName, defaultValue));
};

// Ejemplo de uso:
// let valor = apexUtils.get('P1216_TOTAL_U');
// let [costo1, costo2] = apexUtils.getMultipleNumeric(['P1216_TOTAL_U', 'P1216_TOTAL_PROD']);

/**
 * Configurar cálculo automático para multiplicación (CANTIDAD × COSTO = TOTAL)
 * Función helper específica para el caso más común
 * @param {string} gridStaticId - Static ID del Interactive Grid
 * @param {string} cantidadColumn - Nombre de la columna cantidad (default: 'CANTIDAD')
 * @param {string} costoColumn - Nombre de la columna costo (default: 'COSTO')
 * @param {string} totalColumn - Nombre de la columna total (default: 'TOTAL')
 * @param {number} decimalPlaces - Número de decimales (default: 3)
 * @returns {string} - ID de la configuración creada
 */
function setupCantidadPorCosto(gridStaticId, cantidadColumn = 'CANTIDAD', costoColumn = 'COSTO', totalColumn = 'TOTAL', decimalPlaces = 3) {
    try {
        console.log(`apexGridUtils: Configurando cálculo automático ${cantidadColumn} × ${costoColumn} = ${totalColumn} para ${gridStaticId}`);
        
        const configId = setupAutoCalculation(gridStaticId, {
            sourceColumns: [cantidadColumn, costoColumn],
            targetColumn: totalColumn,
            formula: function(values) {
                const cantidad = values[cantidadColumn] || 0;
                const costo = values[costoColumn] || 0;
                const resultado = cantidad * costo;
                
                console.log(`apexGridUtils: Fórmula ejecutada: ${cantidad} × ${costo} = ${resultado}`);
                return resultado;
            },
            decimalPlaces: decimalPlaces,
            autoTrigger: true,
            triggerOnLoad: true
        });
        
        if (configId) {
            console.log(`apexGridUtils: Cálculo automático configurado exitosamente con ID: ${configId}`);
            
            // Ejecutar cálculo inicial después de un pequeño delay
            setTimeout(() => {
                console.log(`apexGridUtils: Ejecutando cálculo inicial para ${configId}`);
                refreshAutoCalculation(gridStaticId, totalColumn, 100);
            }, 200);
        } else {
            console.error(`apexGridUtils: Error al configurar cálculo automático para ${gridStaticId}`);
        }
        
        return configId;
        
    } catch (error) {
        console.error('apexGridUtils setupCantidadPorCosto error:', error);
        return null;
    }
}

/**
 * Verificar y configurar cálculos automáticos si no existen
 * @param {string} gridStaticId - Static ID del Interactive Grid
 * @param {string} targetColumn - Columna a verificar (default: 'TOTAL')
 * @returns {boolean} - true si la configuración existe o se creó exitosamente
 */
function ensureAutoCalculation(gridStaticId, targetColumn = 'TOTAL') {
    try {
        const config = getAutoCalculationConfig(gridStaticId, targetColumn);
        
        if (config) {
            console.log(`apexGridUtils: Configuración existente encontrada para ${gridStaticId} -> ${targetColumn}`);
            return true;
        } else {
            console.log(`apexGridUtils: No se encontró configuración para ${gridStaticId} -> ${targetColumn}, configurando automáticamente...`);
            
            // Configurar automáticamente el cálculo más común
            const configId = setupCantidadPorCosto(gridStaticId);
            return configId !== null;
        }
        
    } catch (error) {
        console.error('apexGridUtils ensureAutoCalculation error:', error);
        return false;
    }
}

/**
 * Setear valor numérico con commit explícito para evitar sobrescritura
 * @param {string} gridStaticId - Static ID del Interactive Grid
 * @param {string} columnName - Nombre de la columna
 * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
 * @param {number} value - Valor a establecer
 * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
 * @param {boolean} refresh - Si debe refrescar la vista (default: true)
 * @returns {boolean} - true si se estableció correctamente
 */
function setNumericCellValueWithCommit(gridStaticId, columnName, rowIndex, value, decimalPlaces = null, refresh = true) {
    try {
        // Obtener el grid usando el método que funciona
        const grid = apex.region(gridStaticId).call("getViews").grid;
        
        let targetRow = null;
        
        // Si rowIndex es -1, usar la fila seleccionada
        if (rowIndex === -1) {
            const array = grid.getSelectedRecords();
            if (array && array.length > 0) {
                targetRow = array[0][1];
            } else {
                console.warn(`apexGridUtils: No hay fila seleccionada en ${gridStaticId}`);
                return false;
            }
        } else {
            // Convertir rowIndex a índice interno (rowIndex - 1)
            const internalIndex = rowIndex - 1;
            
            // Obtener todas las filas del modelo, no solo las seleccionadas
            const allRecords = [];
            grid.model.forEach(function(record) {
                allRecords.push(record);
            });
            
            if (allRecords.length > internalIndex && internalIndex >= 0) {
                targetRow = allRecords[internalIndex];
            } else {
                console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId} (total filas: ${allRecords.length})`);
                return false;
            }
        }
        
        if (targetRow) {
            // Formatear valor si es necesario
            let finalValue = value;
            
            // Validar decimalPlaces antes de usar toFixed()
            if (decimalPlaces !== null && typeof value === 'number') {
                // Asegurar que decimalPlaces esté en el rango válido (0-100)
                let validDecimalPlaces = decimalPlaces;
                
                if (typeof validDecimalPlaces !== 'number' || isNaN(validDecimalPlaces)) {
                    validDecimalPlaces = 2; // Valor por defecto
                } else if (validDecimalPlaces < 0) {
                    validDecimalPlaces = 0; // Mínimo 0
                } else if (validDecimalPlaces > 100) {
                    validDecimalPlaces = 100; // Máximo 100
                }
                
                finalValue = parseFloat(value.toFixed(validDecimalPlaces));
            }
            
            // Establecer el valor en el modelo
            grid.model.setValue(targetRow, columnName, finalValue);
            
            // Forzar la actualización del modelo para confirmar el cambio
            try {
                // Usar el método correcto para Interactive Grids de APEX
                if (grid.model && grid.model.markDirty) {
                    grid.model.markDirty(targetRow);
                }
                
                // Alternativa: forzar actualización del registro
                if (grid.model && grid.model.updateRecord) {
                    grid.model.updateRecord(targetRow);
                }
            } catch (commitError) {
                console.warn('apexGridUtils: No se pudo confirmar el cambio del modelo:', commitError);
            }
            
            // Refrescar la vista si está habilitado
            if (refresh) {
                try {
                    // Método correcto para Interactive Grids de APEX
                    grid.view$.trigger('refresh');
                    //console.log(`apexGridUtils: Vista refrescada usando grid.view$.trigger('refresh')`);
                } catch (e) {
                    console.warn('apexGridUtils: No se pudo refrescar la vista:', e);
                }
            }
            
            //console.log(`apexGridUtils: Valor ${finalValue} establecido en ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex} con commit`);
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('apexGridUtils setNumericCellValueWithCommit error:', error);
        return false;
    }
}

/**
 * Setear valor numérico con commit en la fila seleccionada
 * @param {string} gridStaticId - Static ID del Interactive Grid
 * @param {string} columnName - Nombre de la columna
 * @param {number} value - Valor a establecer
 * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
 * @param {boolean} refresh - Si debe refrescar la vista (default: true)
 * @returns {boolean} - true si se estableció correctamente
 */
function setSelectedNumericCellValueWithCommit(gridStaticId, columnName, value, decimalPlaces = null, refresh = true) {
    return setNumericCellValueWithCommit(gridStaticId, columnName, -1, value, decimalPlaces, refresh);
}

/**
 * Setear valor numérico con commit en la primera fila
 * @param {string} gridStaticId - Static ID del Interactive Grid
 * @param {string} columnName - Nombre de la columna
 * @param {number} value - Valor a establecer
 * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
 * @param {boolean} refresh - Si debe refrescar la vista (default: true)
 * @returns {boolean} - true si se estableció correctamente
 */
function setFirstNumericCellValueWithCommit(gridStaticId, columnName, value, decimalPlaces = null, refresh = true) {
    return setNumericCellValueWithCommit(gridStaticId, columnName, 1, value, decimalPlaces, refresh);
}

    /**
     * Setear datos en un Interactive Grid con configuración avanzada
     * @param {object} configuracion - Configuración completa para setear datos
     * @param {string} configuracion.regionId - ID de la región del Interactive Grid
     * @param {array|object} configuracion.datos - Datos a insertar (opcional si se usa campoOrigen)
     * @param {string} configuracion.campoOrigen - Campo de la página que contiene los datos JSON (opcional si se usa datos)
     * @param {object} configuracion.mapeo - Mapeo personalizado de campos {campoDestino: campoOrigen}
     * @param {function} configuracion.transformacion - Función para transformar cada registro antes de insertar
     * @param {function} configuracion.filtro - Función para filtrar registros antes de insertar
     * @param {boolean} configuracion.limpiarAntes - Si debe limpiar datos existentes (default: true)
     * @param {boolean} configuracion.refrescar - Si debe refrescar la grilla (default: true)
     * @param {boolean} configuracion.modoEdicion - Si debe habilitar modo edición (default: true)
     * @param {function} configuracion.callback - Función a ejecutar después de setear datos
     * @returns {object} - Objeto con resultado de la operación
     */
    function setearDatosIG(configuracion) {
        console.log('apexGridUtils: Seteando datos en IG:', configuracion.regionId);
        
        try {
            // Validar parámetros obligatorios
            if (!configuracion.regionId) {
                throw new Error('regionId es obligatorio');
            }
            
            // Obtener el Interactive Grid
            var ig$ = apex.region(configuracion.regionId).widget().interactiveGrid("getViews", "grid");
            var model = ig$.model;
            
            // Habilitar modo edición si se especifica (por defecto true)
            if (configuracion.modoEdicion !== false) {
                try {
                    // Habilitar edición en el modelo
                    model.setOption("editable", true);
                    // Activar modo edición en la grilla
                    ig$.setEditMode(true);
                    console.log('apexGridUtils: Modo edición habilitado para:', configuracion.regionId);
                } catch (editError) {
                    console.warn('apexGridUtils: No se pudo habilitar modo edición:', editError);
                }
            }
            
            // Obtener datos de origen
            var datos = [];
            
            if (configuracion.datos) {
                // Datos pasados directamente
                datos = Array.isArray(configuracion.datos) ? configuracion.datos : [configuracion.datos];
            } else if (configuracion.campoOrigen) {
                // Datos desde un campo de la página
                var valorCampo = apex.item(configuracion.campoOrigen).getValue();
                if (valorCampo) {
                    try {
                        datos = JSON.parse(valorCampo);
                    } catch (e) {
                        throw new Error('Error al parsear JSON del campo: ' + configuracion.campoOrigen);
                    }
                }
            } else {
                throw new Error('Debe especificar datos o campoOrigen');
            }
            
            // Validar que datos sea un array
            if (!Array.isArray(datos)) {
                datos = [datos];
            }
            
            // Función auxiliar para normalizar nombres de campos
            function normalizarCampo(campo) {
                return campo.toUpperCase();
            }
            
            // Función auxiliar para mapear campos
            function mapearCampos(registro, mapeo) {
                var registroMapeado = {};
                
                if (mapeo && typeof mapeo === 'object') {
                    // Usar mapeo personalizado
                    Object.keys(mapeo).forEach(function(clave) {
                        var campoOrigen = mapeo[clave];
                        var campoDestino = normalizarCampo(clave);
                        
                        if (registro.hasOwnProperty(campoOrigen)) {
                            registroMapeado[campoDestino] = registro[campoOrigen];
                        }
                    });
                } else {
                    // Mapeo automático - convertir todas las claves a mayúsculas
                    Object.keys(registro).forEach(function(clave) {
                        var campoDestino = normalizarCampo(clave);
                        registroMapeado[campoDestino] = registro[clave];
                    });
                }
                
                return registroMapeado;
            }
            
            // Limpiar datos existentes si se especifica
            if (configuracion.limpiarAntes !== false) {
                model.clearData();
            }
            
            // Contador de registros procesados
            var registrosProcesados = 0;
            var registrosConErrores = 0;
            
            // Insertar cada registro
            datos.forEach(function(registro, indice) {
                try {
                    // Aplicar transformación personalizada si existe
                    if (configuracion.transformacion && typeof configuracion.transformacion === 'function') {
                        registro = configuracion.transformacion(registro, indice);
                    }
                    
                    // Filtrar registro si existe condición
                    if (configuracion.filtro && typeof configuracion.filtro === 'function') {
                        if (!configuracion.filtro(registro, indice)) {
                            return; // Saltar este registro
                        }
                    }
                    
                    // Mapear campos
                    var registroMapeado = mapearCampos(registro, configuracion.mapeo);
                    
                    // Insertar registro en el modelo
                    model.insertNewRecord(registroMapeado);
                    registrosProcesados++;
                    
                } catch (error) {
                    console.error('apexGridUtils: Error al procesar registro', indice, ':', error);
                    registrosConErrores++;
                }
            });
            
            console.log('apexGridUtils: Registros procesados:', registrosProcesados);
            if (registrosConErrores > 0) {
                console.warn('apexGridUtils: Registros con errores:', registrosConErrores);
            }
            
            // Refrescar la grilla si se especifica (por defecto true)
            if (configuracion.refrescar !== false) {
                try {
                    ig$.view$.grid('refresh');
                    console.log('apexGridUtils: Grilla refrescada correctamente');
                } catch (refreshError) {
                    console.warn('apexGridUtils: No se pudo refrescar la grilla:', refreshError);
                    // Intentar refresh de la región completa como alternativa
                    try {
                        apex.region(configuracion.regionId).refresh();
                    } catch (regionRefreshError) {
                        console.warn('apexGridUtils: No se pudo refrescar la región:', regionRefreshError);
                    }
                }
            }
            
            // Ejecutar callback si existe
            if (configuracion.callback && typeof configuracion.callback === 'function') {
                configuracion.callback({
                    procesados: registrosProcesados,
                    errores: registrosConErrores,
                    total: datos.length
                });
            }
            
            return {
                success: true,
                procesados: registrosProcesados,
                errores: registrosConErrores,
                total: datos.length
            };
            
        } catch (error) {
            console.error('apexGridUtils: Error al setear datos en IG:', error);
            return {
                success: false,
                error: error.message,
                procesados: 0,
                errores: 0,
                total: 0
            };
        }
    }

    /**
     * Setear datos directamente en un Interactive Grid
     * @param {string} regionId - ID de la región del Interactive Grid
     * @param {array|object} datos - Datos a insertar
     * @param {boolean} limpiar - Si debe limpiar datos existentes (default: true)
     * @param {boolean} refrescar - Si debe refrescar la grilla (default: true)
     * @param {boolean} modoEdicion - Si debe habilitar modo edición (default: true)
     * @returns {object} - Objeto con resultado de la operación
     */
    function setearDatosDirectos(regionId, datos, limpiar = true, refrescar = true, modoEdicion = true) {
        return setearDatosIG({
            regionId: regionId,
            datos: datos,
            limpiarAntes: limpiar,
            refrescar: refrescar,
            modoEdicion: modoEdicion
        });
    }

    /**
     * Setear datos desde un campo de la página en un Interactive Grid
     * @param {string} regionId - ID de la región del Interactive Grid
     * @param {string} campoOrigen - Campo de la página que contiene los datos JSON
     * @param {boolean} limpiar - Si debe limpiar datos existentes (default: true)
     * @param {boolean} refrescar - Si debe refrescar la grilla (default: true)
     * @param {boolean} modoEdicion - Si debe habilitar modo edición (default: true)
     * @returns {object} - Objeto con resultado de la operación
     */
    function setearDatos(regionId, campoOrigen, limpiar = true, refrescar = true, modoEdicion = true) {
        return setearDatosIG({
            regionId: regionId,
            campoOrigen: campoOrigen,
            limpiarAntes: limpiar,
            refrescar: refrescar,
            modoEdicion: modoEdicion
        });
    }

    /**
     * Debug completo para monitorear cambios en Interactive Grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna a monitorear (opcional)
     * @returns {object} - Objeto con funciones de control del debug
     */
    function debugGrid(gridStaticId, columnName = null) {
        try {
            console.log(`🔍 apexGridUtils: Iniciando debug completo para ${gridStaticId}${columnName ? ` -> ${columnName}` : ''}`);
            
            const grid = apex.region(gridStaticId).call("getViews").grid;
            const model = grid.model;
            
            // Almacén para valores anteriores
            const previousValues = new Map();
            const debugInfo = {
                gridStaticId: gridStaticId,
                columnName: columnName,
                startTime: new Date(),
                changes: [],
                errors: []
            };
            
            // Función para obtener valor actual
            function getCurrentValue(record, col) {
                try {
                    return model.getValue(record, col);
                } catch (e) {
                    return 'ERROR: ' + e.message;
                }
            }
            
            // Función para registrar cambio
            function logChange(type, record, column, oldValue, newValue, source = 'unknown') {
                const change = {
                    timestamp: new Date(),
                    type: type,
                    column: column,
                    oldValue: oldValue,
                    newValue: newValue,
                    source: source,
                    recordId: record ? record.id : 'unknown'
                };
                
                debugInfo.changes.push(change);
                
                console.log(`🔄 apexGridUtils DEBUG [${type}] ${column}: "${oldValue}" -> "${newValue}" (${source})`);
            }
            
            // Función para registrar error
            function logError(error, context) {
                const errorInfo = {
                    timestamp: new Date(),
                    error: error.message,
                    context: context,
                    stack: error.stack
                };
                
                debugInfo.errors.push(errorInfo);
                console.error(`❌ apexGridUtils DEBUG ERROR [${context}]:`, error);
            }
            
            // Suscribirse a cambios en el modelo
            const modelSubscription = model.subscribe({
                onChange: function(type, change) {
                    try {
                        console.log(`📊 apexGridUtils DEBUG: Modelo cambió - Tipo: ${type}, Campo: ${change.field}, Valor: ${change.value}`);
                        
                        if (columnName && change.field !== columnName) {
                            return; // Solo monitorear columna específica si se especifica
                        }
                        
                        // Obtener registro
                        let record = null;
                        if (change.record) {
                            record = change.record;
                        } else if (change.recordId) {
                            record = model.getRecord(change.recordId);
                        }
                        
                        if (record) {
                            const currentValue = getCurrentValue(record, change.field);
                            const previousValue = previousValues.get(`${record.id}_${change.field}`);
                            
                            if (previousValue !== currentValue) {
                                logChange('model', record, change.field, previousValue, currentValue, 'model_change');
                                previousValues.set(`${record.id}_${change.field}`, currentValue);
                            }
                        }
                        
                    } catch (error) {
                        logError(error, 'model_subscription');
                    }
                }
            });
            
            // Monitorear eventos de la vista
            const viewSubscription = grid.view$.on('change', function(event, data) {
                try {
                    console.log(`👁️ apexGridUtils DEBUG: Vista cambió - Evento: ${event}`, data);
                } catch (error) {
                    logError(error, 'view_subscription');
                }
            });
            
            // Función para obtener estado actual
            function getCurrentState() {
                try {
                    const state = {
                        timestamp: new Date(),
                        gridInfo: {
                            staticId: gridStaticId,
                            totalRecords: 0,
                            selectedRecords: 0
                        },
                        columnValues: {},
                        modelState: {}
                    };
                    
                    // Contar registros
                    let recordCount = 0;
                    model.forEach(function(record) {
                        recordCount++;
                        
                        if (columnName) {
                            const value = getCurrentValue(record, columnName);
                            state.columnValues[`record_${recordCount}`] = {
                                id: record.id,
                                value: value,
                                type: typeof value
                            };
                        }
                    });
                    
                    state.gridInfo.totalRecords = recordCount;
                    
                    // Información de registros seleccionados
                    try {
                        const selectedRecords = grid.getSelectedRecords();
                        state.gridInfo.selectedRecords = selectedRecords ? selectedRecords.length : 0;
                    } catch (e) {
                        state.gridInfo.selectedRecords = 'ERROR: ' + e.message;
                    }
                    
                    // Estado del modelo
                    try {
                        state.modelState.editable = model.getOption ? model.getOption('editable') : 'unknown';
                        state.modelState.dirty = model.isDirty ? model.isDirty() : 'unknown';
                    } catch (e) {
                        state.modelState.error = e.message;
                    }
                    
                    return state;
                    
                } catch (error) {
                    logError(error, 'get_current_state');
                    return null;
                }
            }
            
            // Función para simular cambio manual
            function simulateManualChange() {
                try {
                    console.log(`🎯 apexGridUtils DEBUG: Simulando cambio manual...`);
                    
                    const array = grid.getSelectedRecords();
                    if (array && array.length > 0) {
                        const targetRow = array[0][1];
                        const currentValue = getCurrentValue(targetRow, columnName || 'COSTO');
                        const newValue = parseFloat(currentValue || 0) + 0.01;
                        
                        console.log(`🎯 apexGridUtils DEBUG: Cambiando ${columnName || 'COSTO'} de ${currentValue} a ${newValue}`);
                        
                        model.setValue(targetRow, columnName || 'COSTO', newValue);
                        
                        // Forzar commit
                        if (model.commitRecord) {
                            model.commitRecord(targetRow);
                        }
                        
                        if (model.markDirty) {
                            model.markDirty(targetRow);
                        }
                        
                        console.log(`🎯 apexGridUtils DEBUG: Cambio manual simulado completado`);
                    } else {
                        console.warn(`🎯 apexGridUtils DEBUG: No hay registros seleccionados para simular cambio`);
                    }
                    
                } catch (error) {
                    logError(error, 'simulate_manual_change');
                }
            }
            
            // Función para detener debug
            function stopDebug() {
                try {
                    console.log(`🛑 apexGridUtils DEBUG: Deteniendo debug para ${gridStaticId}`);
                    
                    if (modelSubscription && modelSubscription.unsubscribe) {
                        modelSubscription.unsubscribe();
                    }
                    
                    if (viewSubscription && viewSubscription.off) {
                        viewSubscription.off('change');
                    }
                    
                    console.log(`📊 apexGridUtils DEBUG RESUMEN:`);
                    console.log(`   - Cambios registrados: ${debugInfo.changes.length}`);
                    console.log(`   - Errores registrados: ${debugInfo.errors.length}`);
                    console.log(`   - Tiempo de ejecución: ${new Date() - debugInfo.startTime}ms`);
                    
                    return debugInfo;
                    
                } catch (error) {
                    logError(error, 'stop_debug');
                    return debugInfo;
                }
            }
            
            // Función para obtener resumen
            function getSummary() {
                return {
                    ...debugInfo,
                    currentState: getCurrentState(),
                    runtime: new Date() - debugInfo.startTime
                };
            }
            
            // Inicializar valores anteriores
            model.forEach(function(record) {
                if (columnName) {
                    const value = getCurrentValue(record, columnName);
                    previousValues.set(`${record.id}_${columnName}`, value);
                }
            });
            
            console.log(`✅ apexGridUtils DEBUG: Debug iniciado para ${gridStaticId}`);
            console.log(`   - Monitoreando columna: ${columnName || 'TODAS'}`);
            console.log(`   - Registros iniciales: ${previousValues.size}`);
            
            // Retornar funciones de control
            return {
                getCurrentState: getCurrentState,
                simulateManualChange: simulateManualChange,
                stopDebug: stopDebug,
                getSummary: getSummary,
                debugInfo: debugInfo
            };
            
        } catch (error) {
            console.error('apexGridUtils debugGrid error:', error);
            return null;
        }
    }

    /**
     * Setear valor numérico con manejo robusto de formato y persistencia
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setNumericValueRobust(gridStaticId, columnName, rowIndex, value, decimalPlaces = null, refresh = true) {
        try {
            console.log(`🔧 apexGridUtils: Seteando valor robusto ${value} en ${columnName}, fila ${rowIndex}`);
            
            // Obtener el grid
            const grid = apex.region(gridStaticId).call("getViews").grid;
            const model = grid.model;
            
            let targetRow = null;
            
            // Obtener fila objetivo
            if (rowIndex === -1) {
                const array = grid.getSelectedRecords();
                if (array && array.length > 0) {
                    targetRow = array[0][1];
                } else {
                    console.warn(`apexGridUtils: No hay fila seleccionada en ${gridStaticId}`);
                    return false;
                }
            } else {
                const allRecords = [];
                model.forEach(function(record) {
                    allRecords.push(record);
                });
                
                if (allRecords.length >= rowIndex && rowIndex > 0) {
                    targetRow = allRecords[rowIndex - 1];
                } else {
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId} (total filas: ${allRecords.length})`);
                    return false;
                }
            }
            
            if (!targetRow) {
                console.error(`apexGridUtils: No se pudo obtener fila objetivo`);
                return false;
            }
            
            // Obtener valor actual para comparar
            const currentValue = model.getValue(targetRow, columnName);
            console.log(`📊 apexGridUtils: Valor actual en ${columnName}: ${currentValue} (tipo: ${typeof currentValue})`);
            
            // Formatear valor si es necesario - MANEJAR FORMATO EUROPEO
            let finalValue = value;
            if (decimalPlaces !== null && typeof value === 'number') {
                let validDecimalPlaces = decimalPlaces;
                
                if (typeof validDecimalPlaces !== 'number' || isNaN(validDecimalPlaces)) {
                    validDecimalPlaces = 2;
                } else if (validDecimalPlaces < 0) {
                    validDecimalPlaces = 0;
                } else if (validDecimalPlaces > 100) {
                    validDecimalPlaces = 100;
                }
                
                // Formatear como número con decimales exactos
                finalValue = parseFloat(value.toFixed(validDecimalPlaces));
            }
            
            console.log(`📊 apexGridUtils: Valor final a establecer: ${finalValue} (tipo: ${typeof finalValue})`);
            
            // Deshabilitar temporalmente los formateadores
            try {
                // Intentar deshabilitar formateadores si existen
                if (model.setOption) {
                    model.setOption('disableFormatting', true);
                }
            } catch (e) {
                console.warn('apexGridUtils: No se pudo deshabilitar formateadores:', e);
            }
            
            // Establecer el valor como número puro (sin formato)
            model.setValue(targetRow, columnName, finalValue);
            
            // Verificar que se estableció correctamente
            const verifyValue = model.getValue(targetRow, columnName);
            console.log(`📊 apexGridUtils: Valor después de setear: ${verifyValue} (tipo: ${typeof verifyValue})`);
            
            // Forzar persistencia del cambio
            try {
                // Marcar como modificado
                if (model.markDirty) {
                    model.markDirty(targetRow);
                }
                
                // Commit del registro
                if (model.commitRecord) {
                    model.commitRecord(targetRow);
                }
                
                // Commit del modelo completo
                if (model.commit) {
                    model.commit();
                }
                
                console.log(`✅ apexGridUtils: Cambio persistido correctamente`);
                
            } catch (commitError) {
                console.warn('apexGridUtils: Error al hacer commit:', commitError);
            }
            
            // Rehabilitar formateadores
            try {
                if (model.setOption) {
                    model.setOption('disableFormatting', false);
                }
            } catch (e) {
                console.warn('apexGridUtils: No se pudo rehabilitar formateadores:', e);
            }
            
            // Refrescar vista si es necesario
            if (refresh) {
                try {
                    // Refrescar la vista del grid
                    grid.view$.trigger('refresh');
                    
                    // Alternativa: refrescar la región completa
                    setTimeout(() => {
                        try {
                            apex.region(gridStaticId).refresh();
                        } catch (e) {
                            console.warn('apexGridUtils: No se pudo refrescar región:', e);
                        }
                    }, 100);
                    
                    console.log(`🔄 apexGridUtils: Vista refrescada`);
                    
                } catch (refreshError) {
                    console.warn('apexGridUtils: Error al refrescar vista:', refreshError);
                }
            }
            
            // Verificación final
            setTimeout(() => {
                const finalCheckValue = model.getValue(targetRow, columnName);
                console.log(`📊 apexGridUtils: Verificación final - ${columnName}: ${finalCheckValue} (tipo: ${typeof finalCheckValue})`);
                
                // Comparar valores normalizados para evitar problemas de formato
                const normalizedExpected = typeof finalValue === 'number' ? finalValue : parseFloat(String(finalValue).replace(',', '.'));
                const normalizedActual = typeof finalCheckValue === 'number' ? finalCheckValue : parseFloat(String(finalCheckValue).replace(',', '.'));
                
                if (Math.abs(normalizedExpected - normalizedActual) > 0.001) {
                    console.warn(`⚠️ apexGridUtils: Valor no se mantuvo - Esperado: ${finalValue}, Actual: ${finalCheckValue}`);
                } else {
                    console.log(`✅ apexGridUtils: Valor se mantuvo correctamente`);
                }
            }, 200);
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils setNumericValueRobust error:', error);
            return false;
        }
    }

    /**
     * Setear valor numérico robusto en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setSelectedNumericValueRobust(gridStaticId, columnName, value, decimalPlaces = null, refresh = true) {
        return setNumericValueRobust(gridStaticId, columnName, -1, value, decimalPlaces, refresh);
    }

    /**
     * Setear valor numérico robusto en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: null = sin formatear)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setFirstNumericValueRobust(gridStaticId, columnName, value, decimalPlaces = null, refresh = true) {
        return setNumericValueRobust(gridStaticId, columnName, 1, value, decimalPlaces, refresh);
    }

    /**
     * Setear valor numérico con formato europeo (7960,462)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: 2)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setNumericValueEuropean(gridStaticId, columnName, rowIndex, value, decimalPlaces = 2, refresh = true) {
        try {
            console.log(`🇪🇺 apexGridUtils: Seteando valor europeo ${value} en ${columnName}, fila ${rowIndex}`);
            
            // Obtener el grid
            const grid = apex.region(gridStaticId).call("getViews").grid;
            const model = grid.model;
            
            let targetRow = null;
            
            // Obtener fila objetivo
            if (rowIndex === -1) {
                const array = grid.getSelectedRecords();
                if (array && array.length > 0) {
                    targetRow = array[0][1];
                } else {
                    console.warn(`apexGridUtils: No hay fila seleccionada en ${gridStaticId}`);
                    return false;
                }
            } else {
                const allRecords = [];
                model.forEach(function(record) {
                    allRecords.push(record);
                });
                
                if (allRecords.length >= rowIndex && rowIndex > 0) {
                    targetRow = allRecords[rowIndex - 1];
                } else {
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId} (total filas: ${allRecords.length})`);
                    return false;
                }
            }
            
            if (!targetRow) {
                console.error(`apexGridUtils: No se pudo obtener fila objetivo`);
                return false;
            }
            
            // Obtener valor actual para comparar
            const currentValue = model.getValue(targetRow, columnName);
            console.log(`📊 apexGridUtils: Valor actual en ${columnName}: ${currentValue} (tipo: ${typeof currentValue})`);
            
            // Formatear valor al formato europeo
            const europeanValue = formatToEuropean(value, decimalPlaces, true);
            console.log(`🇪🇺 apexGridUtils: Valor formateado europeo: ${europeanValue}`);
            
            // Establecer el valor como string formateado
            model.setValue(targetRow, columnName, europeanValue);
            
            // Verificar que se estableció correctamente
            const verifyValue = model.getValue(targetRow, columnName);
            console.log(`📊 apexGridUtils: Valor después de setear: ${verifyValue} (tipo: ${typeof verifyValue})`);
            
            // Forzar persistencia del cambio
            try {
                // Marcar como modificado
                if (model.markDirty) {
                    model.markDirty(targetRow);
                }
                
                // Commit del registro
                if (model.commitRecord) {
                    model.commitRecord(targetRow);
                }
                
                console.log(`✅ apexGridUtils: Cambio persistido correctamente`);
                
            } catch (commitError) {
                console.warn('apexGridUtils: Error al hacer commit:', commitError);
            }
            
            // Refrescar vista si es necesario
            if (refresh) {
                try {
                    // Refrescar la vista del grid
                    grid.view$.trigger('refresh');
                    
                    // Alternativa: refrescar la región completa
                    setTimeout(() => {
                        try {
                            apex.region(gridStaticId).refresh();
                        } catch (e) {
                            console.warn('apexGridUtils: No se pudo refrescar región:', e);
                        }
                    }, 100);
                    
                    console.log(`🔄 apexGridUtils: Vista refrescada`);
                    
                } catch (refreshError) {
                    console.warn('apexGridUtils: Error al refrescar vista:', refreshError);
                }
            }
            
            // Verificación final
            setTimeout(() => {
                const finalCheckValue = model.getValue(targetRow, columnName);
                console.log(`📊 apexGridUtils: Verificación final - ${columnName}: ${finalCheckValue} (tipo: ${typeof finalCheckValue})`);
                
                if (finalCheckValue === europeanValue) {
                    console.log(`✅ apexGridUtils: Valor europeo se mantuvo correctamente`);
                } else {
                    console.warn(`⚠️ apexGridUtils: Valor europeo no se mantuvo - Esperado: ${europeanValue}, Actual: ${finalCheckValue}`);
                }
            }, 200);
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils setNumericValueEuropean error:', error);
            return false;
        }
    }

    /**
     * Setear valor numérico con formato europeo en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: 2)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setSelectedNumericValueEuropean(gridStaticId, columnName, value, decimalPlaces = 2, refresh = true) {
        return setNumericValueEuropean(gridStaticId, columnName, -1, value, decimalPlaces, refresh);
    }

    /**
     * Setear valor numérico con formato europeo en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} value - Valor a establecer
     * @param {number} decimalPlaces - Número de decimales para formatear (default: 2)
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setFirstNumericValueEuropean(gridStaticId, columnName, value, decimalPlaces = 2, refresh = true) {
        return setNumericValueEuropean(gridStaticId, columnName, 1, value, decimalPlaces, refresh);
    }

    /**
     * Función helper para refrescar un grid de manera simple
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {boolean} refreshRegion - Si debe refrescar también la región completa (default: true)
     * @returns {boolean} - true si se refrescó correctamente
     */
    function refreshGrid(gridStaticId, refreshRegion = true) {
        try {
            console.log(`🔄 apexGridUtils: Refrescando grid ${gridStaticId}`);
            
            const grid = apex.region(gridStaticId).call("getViews").grid;
            
            // Refrescar vista del grid
            try {
                grid.view$.trigger('refresh');
                console.log(`✅ apexGridUtils: Vista del grid ${gridStaticId} refrescada`);
            } catch (e) {
                console.warn(`apexGridUtils: No se pudo refrescar vista del grid ${gridStaticId}:`, e);
            }
            
            // Refrescar región completa si está habilitado
            if (refreshRegion) {
                try {
                    apex.region(gridStaticId).refresh();
                    console.log(`✅ apexGridUtils: Región ${gridStaticId} refrescada`);
                } catch (e) {
                    console.warn(`apexGridUtils: No se pudo refrescar región ${gridStaticId}:`, e);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error(`apexGridUtils refreshGrid error para ${gridStaticId}:`, error);
            return false;
        }
    }

    /**
     * Función helper para refrescar grid y recalcular automáticamente
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} targetColumn - Columna específica a recalcular (opcional)
     * @param {number} delay - Delay antes del recálculo (default: 100)
     * @returns {boolean} - true si se ejecutó correctamente
     */
    function refreshGridAndRecalculateSimple(gridStaticId, targetColumn = null, delay = 100) {
        try {
            console.log(`🔄 apexGridUtils: Refrescando y recalculando ${gridStaticId}${targetColumn ? ` -> ${targetColumn}` : ''}`);
            
            // Primero refrescar el grid
            refreshGrid(gridStaticId, true);
            
            // Luego recalcular si hay configuraciones automáticas
            setTimeout(() => {
                refreshAutoCalculation(gridStaticId, targetColumn, 50);
            }, delay);
            
            return true;
            
        } catch (error) {
            console.error(`apexGridUtils refreshGridAndRecalculateSimple error para ${gridStaticId}:`, error);
            return false;
        }
    }

    /**
     * Confirmar cambios en el modelo del grid sin refrescar la vista
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {boolean} commitAll - Si debe hacer commit de todos los registros (default: true)
     * @returns {boolean} - true si se confirmaron correctamente
     */
    function commitGridChanges(gridStaticId, commitAll = true) {
        try {
            console.log(`💾 apexGridUtils: Confirmando cambios en ${gridStaticId}`);
            
            const grid = apex.region(gridStaticId).call("getViews").grid;
            const model = grid.model;
            
            let changesCommitted = 0;
            
            if (commitAll) {
                // Confirmar todos los registros modificados
                model.forEach(function(record) {
                    try {
                        // Verificar si el registro está modificado
                        if (model.isDirty && model.isDirty(record)) {
                            // Marcar como confirmado
                            if (model.markDirty) {
                                model.markDirty(record);
                            }
                            
                            // Commit del registro individual
                            if (model.commitRecord) {
                                model.commitRecord(record);
                            }
                            
                            changesCommitted++;
                            console.log(`💾 apexGridUtils: Registro confirmado en ${gridStaticId}`);
                        }
                    } catch (recordError) {
                        console.warn(`apexGridUtils: Error al confirmar registro individual:`, recordError);
                    }
                });
                
                // Commit del modelo completo
                try {
                    if (model.commit) {
                        model.commit();
                        console.log(`💾 apexGridUtils: Modelo completo confirmado en ${gridStaticId}`);
                    }
                } catch (commitError) {
                    console.warn(`apexGridUtils: Error al confirmar modelo completo:`, commitError);
                }
                
            } else {
                // Solo confirmar el registro activo/seleccionado
                try {
                    const array = grid.getSelectedRecords();
                    if (array && array.length > 0) {
                        const selectedRecord = array[0][1];
                        
                        if (model.markDirty) {
                            model.markDirty(selectedRecord);
                        }
                        
                        if (model.commitRecord) {
                            model.commitRecord(selectedRecord);
                        }
                        
                        changesCommitted = 1;
                        console.log(`💾 apexGridUtils: Registro seleccionado confirmado en ${gridStaticId}`);
                    }
                } catch (selectedError) {
                    console.warn(`apexGridUtils: Error al confirmar registro seleccionado:`, selectedError);
                }
            }
            
            console.log(`✅ apexGridUtils: ${changesCommitted} cambios confirmados en ${gridStaticId}`);
            return true;
            
        } catch (error) {
            console.error(`apexGridUtils commitGridChanges error para ${gridStaticId}:`, error);
            return false;
        }
    }

    /**
     * Refrescar solo la vista del grid sin recargar datos (confirmar cambios primero)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {boolean} commitChanges - Si debe confirmar cambios antes de refrescar (default: true)
     * @returns {boolean} - true si se refrescó correctamente
     */
    function refreshGridViewOnly(gridStaticId, commitChanges = true) {
        try {
            console.log(`🔄 apexGridUtils: Refrescando solo vista de ${gridStaticId}`);
            
            const grid = apex.region(gridStaticId).call("getViews").grid;
            
            // Confirmar cambios antes de refrescar si está habilitado
            if (commitChanges) {
                commitGridChanges(gridStaticId, true);
            }
            
            // Refrescar solo la vista del grid (sin recargar datos)
            try {
                // Método 1: Refrescar vista del grid
                if (grid.view$ && grid.view$.trigger) {
                    grid.view$.trigger('refresh');
                    console.log(`✅ apexGridUtils: Vista del grid ${gridStaticId} refrescada`);
                }
                
                // Método 2: Refrescar vista usando el método del grid
                if (grid.refreshView) {
                    grid.refreshView();
                    console.log(`✅ apexGridUtils: Vista del grid ${gridStaticId} refrescada usando refreshView()`);
                }
                
                // Método 3: Refrescar usando el método de la vista
                if (grid.getView && grid.getView().refresh) {
                    grid.getView().refresh();
                    console.log(`✅ apexGridUtils: Vista del grid ${gridStaticId} refrescada usando getView().refresh()`);
                }
                
                return true;
                
            } catch (viewError) {
                console.warn(`apexGridUtils: Error al refrescar vista del grid ${gridStaticId}:`, viewError);
                
                // Fallback: intentar refrescar usando el método de la región (pero solo vista)
                try {
                    if (grid.view$ && grid.view$.grid) {
                        grid.view$.grid('refresh');
                        console.log(`✅ apexGridUtils: Vista del grid ${gridStaticId} refrescada usando fallback`);
                        return true;
                    }
                } catch (fallbackError) {
                    console.warn(`apexGridUtils: Error en fallback para ${gridStaticId}:`, fallbackError);
                }
                
                return false;
            }
            
        } catch (error) {
            console.error(`apexGridUtils refreshGridViewOnly error para ${gridStaticId}:`, error);
            return false;
        }
    }

    /**
     * Refrescar grid de manera segura (confirmar cambios y refrescar solo vista)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {boolean} commitChanges - Si debe confirmar cambios antes de refrescar (default: true)
     * @param {boolean} refreshRegion - Si debe refrescar también la región completa (default: false)
     * @returns {boolean} - true si se refrescó correctamente
     */
    function refreshGridSafe(gridStaticId, commitChanges = true, refreshRegion = false) {
        try {
            console.log(`🛡️ apexGridUtils: Refrescando grid de manera segura ${gridStaticId}`);
            
            // Confirmar cambios primero
            if (commitChanges) {
                commitGridChanges(gridStaticId, true);
            }
            
            // Refrescar solo la vista del grid
            const viewRefreshed = refreshGridViewOnly(gridStaticId, false);
            
            // Refrescar región completa solo si se especifica (y con cuidado)
            if (refreshRegion && viewRefreshed) {
                try {
                    // Usar un timeout para asegurar que los cambios se hayan aplicado
                    setTimeout(() => {
                        try {
                            apex.region(gridStaticId).refresh();
                            console.log(`✅ apexGridUtils: Región ${gridStaticId} refrescada de manera segura`);
                        } catch (regionError) {
                            console.warn(`apexGridUtils: No se pudo refrescar región ${gridStaticId}:`, regionError);
                        }
                    }, 100);
                } catch (regionError) {
                    console.warn(`apexGridUtils: Error al refrescar región ${gridStaticId}:`, regionError);
                }
            }
            
            return viewRefreshed;
            
        } catch (error) {
            console.error(`apexGridUtils refreshGridSafe error para ${gridStaticId}:`, error);
            return false;
        }
    }