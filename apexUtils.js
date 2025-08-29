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
        const grid = apex.region(gridStaticId).call("getViews").grid;
        if (!grid) {
            console.error('apexGridUtils: No se pudo encontrar el grid con ID:', gridStaticId);
            return;
        }
        const model = grid.model;

        // 1. ITERAR SOBRE TODAS LAS FILAS DEL MODELO
        model.forEach(function(record) {
            
            // 2. OMITIR FILAS MARCADAS PARA ELIMINACIÓN
            if (isRecordMarkedForDeletion(record, model)) {
                return; // Saltar a la siguiente fila
            }

            try {
                // 3. OBTENER VALORES Y APLICAR FÓRMULA (para la fila actual del bucle)
                const values = {};
                settings.sourceColumns.forEach(column => {
                    values[column] = normalizeNumber(model.getValue(record, column));
                });

                let result = settings.formula(values, record); // Pasamos 'record' por si la fórmula lo necesita
                const decimalPlaces = settings.decimalPlaces || 2;
                const roundedResult = parseFloat(Number(result).toFixed(decimalPlaces));

                // 4. CONDICIÓN DE GUARDA (ANTI-BUCLE)
                const currentValue = model.getValue(record, settings.targetColumn);
                const roundedCurrentValue = parseFloat(Number(currentValue).toFixed(decimalPlaces));

                if (roundedCurrentValue !== roundedResult) {
                    model.setValue(record, settings.targetColumn, roundedResult);
                }

            } catch (recordError) {
                const recordId = model.getRecordId(record) || "nuevo";
                console.warn(`Error al procesar la fórmula en la fila ${recordId}:`, recordError);
            }
        });

    } catch (error) {
        console.error('apexGridUtils calculateFormula error:', error);
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
                let total = 0;
                
                model.forEach(function(record, index, id) {
                     // ✅ ¡PUNTO CLAVE!
                     // Ignorar los registros marcados para eliminación en la suma.
                    if (isRecordMarkedForDeletion(record, model)) {
                        return; // Siguiente registro
                    }
                    
                    const value = model.getValue(record, columnName);
                    if (value !== null && value !== undefined && value !== '') {
                        total += normalizeNumber(value);
                    }
                });
                
                const formattedTotal = parseFloat(total.toFixed(decimalPlaces));
                apex.item(targetItem).setValue(formattedTotal);
                return formattedTotal;
            };
            
            // Calcular suma inicial
            const initialSum = calculateSum();
            
            // Configurar actualización automática si está habilitada
            if (autoUpdate) {
                // Suscribirse a cambios en el modelo
                model.subscribe({
                    onChange: function(type, change) {
                        if (['set', 'add', 'delete', 'reset'].includes(type)) {
                            // Un pequeño delay puede ayudar a que el modelo se estabilice antes de calcular
                           setTimeout(calculateSum, 50);
                       }
                    }
                });
                
                // También escuchar cambios en la estructura del grid (nuevas filas, eliminaciones)
                model.subscribe({
                    onChange: function(type) {
                        if (type === 'add' || type === 'delete' || type === 'reset' || type === 'add') {
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
     * Navegar a una celda específica en el Interactive Grid (Versión Mejorada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna a la que navegar
     * @param {number} rowIndex - Índice de la fila (0 = primera fila, -1 = fila seleccionada)
     * @param {boolean} focus - Si debe hacer focus en la celda (default: true)
     */
    function gotoCell(gridStaticId, columnName, rowIndex = -1, focus = true) {
        try {
            console.log(`🎯 apexGridUtils: Navegando a celda ${columnName} en fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}`);
            
            // Obtener el grid usando el método que funciona
            const grid = apex.region(gridStaticId).call("getViews").grid;
            const model = apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").model;
            
            let targetRecord = null;
            
            // Obtener registro objetivo
            if (rowIndex === -1) {
                // Usar el registro seleccionado
                const selectedRecords = apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").getSelectedRecords();
                if (selectedRecords && selectedRecords.length > 0) {
                    targetRecord = selectedRecords[0];
                } else {
                    console.warn(`apexGridUtils: No hay registro seleccionado en ${gridStaticId}`);
                    return false;
                }
            } else {
                // Obtener registro por índice
                let recordIndex = 0;
                console.log(`🔍 apexGridUtils DEBUG: Buscando fila ${rowIndex}, rowIndex-1 = ${rowIndex - 1}`);
                model.forEach(function(record, index, id) {
                    console.log(`🔍 apexGridUtils DEBUG: recordIndex = ${recordIndex}, index = ${index}, id = ${id}`);
                    if (recordIndex === rowIndex - 1) {  // rowIndex 1 = primera fila (índice 0)
                        targetRecord = record;
                        console.log(`✅ apexGridUtils DEBUG: Encontrado registro objetivo en recordIndex = ${recordIndex}`);
                        return false; // Salir del forEach
                    }
                    recordIndex++;
                });
                
                if (!targetRecord) {
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId}`);
                    return false;
                }
            }
            
            if (targetRecord) {
                // Navegar a la celda usando el método que funciona
                grid.gotoCell(targetRecord, columnName);
                console.log(`✅ apexGridUtils: Navegación a celda ${columnName} completada`);
                
                // Hacer focus si está habilitado
                if (focus) {
                    setTimeout(() => {
                        try {
                            // Intentar hacer focus en la celda
                            const cellElement = grid.getCellElement ? grid.getCellElement(targetRecord, columnName) : null;
                            if (cellElement && cellElement.length > 0) {
                                cellElement.focus();
                                console.log(`✅ apexGridUtils: Focus en celda aplicado`);
                            }
                        } catch (e) {
                            console.warn(`apexGridUtils: No se pudo aplicar focus:`, e);
                        }
                    }, 100);
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('apexGridUtils gotoCell error:', error);
            return false;
        }
    }

    /**
     * Navegar a la primera celda de una columna específica (Versión Mejorada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     */
    function gotoFirstCell(gridStaticId, columnName) {
        return gotoCell(gridStaticId, columnName, 0, true);
    }

    /**
     * Navegar a la celda de la fila seleccionada (Versión Simplificada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @returns {boolean} - true si se navegó correctamente
     */
    function gotoSelectedCell(gridStaticId, columnName) {
        try {
            console.log(`🎯 apexGridUtils: Navegando a celda seleccionada ${columnName} en ${gridStaticId}`);
            
            // Obtener el grid usando el método directo
            var grid = apex.region(gridStaticId).call("getViews").grid;
            
            // Obtener registros seleccionados
            var array = grid.getSelectedRecords();
            
            // Verificar que hay registros seleccionados
            if (!array || array.length === 0) {
                console.warn(`apexGridUtils: No hay registros seleccionados en ${gridStaticId}`);
                return false;
            }
            
            // Navegar a la celda usando el método directo
            grid.gotoCell(array[0][1], columnName);
            
            console.log(`✅ apexGridUtils: Navegación a celda ${columnName} completada`);
            return true;
            
        } catch (error) {
            console.error('apexGridUtils gotoSelectedCell error:', error);
            return false;
        }
    }

    /**
     * Setear un valor específico en una celda del Interactive Grid (Versión Mejorada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setCellValue(gridStaticId, columnName, rowIndex, value, refresh = true) {
        try {
            console.log(`🔧 apexGridUtils: Seteando valor ${value} en ${columnName}, fila ${rowIndex}`);
            
            // Validaciones robustas de parámetros
            if (!gridStaticId || typeof gridStaticId !== 'string') {
                console.error('apexGridUtils: gridStaticId debe ser un string válido');
                return false;
            }
            
            if (!columnName || typeof columnName !== 'string') {
                console.error('apexGridUtils: columnName debe ser un string válido');
                return false;
            }
            
            if (rowIndex === undefined || rowIndex === null) {
                console.error('apexGridUtils: rowIndex no puede ser undefined o null');
                return false;
            }
            
            // Validar el valor - permitir 0, false, string vacío, pero no undefined/null
            if (value === undefined || value === null) {
                console.error('apexGridUtils: value no puede ser undefined o null');
                return false;
            }
            
            // Obtener el modelo usando el método que funciona
            const model = apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").model;
            
            if (!model) {
                console.error('apexGridUtils: No se pudo obtener el modelo del grid');
                return false;
            }
            
            console.log(`✅ apexGridUtils: Modelo obtenido correctamente`);
            
            let targetRecord = null;
            
            // Obtener registro objetivo
            if (rowIndex === -1) {
                // Usar el registro seleccionado
                const selectedRecords = apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").getSelectedRecords();
                if (selectedRecords && selectedRecords.length > 0) {
                    targetRecord = selectedRecords[0];
                } else {
                    console.warn(`apexGridUtils: No hay registro seleccionado en ${gridStaticId}`);
                    return false;
                }
            } else {
                // Obtener registro por índice usando un enfoque más directo
                console.log(`🔍 apexGridUtils DEBUG: Buscando fila ${rowIndex}, rowIndex-1 = ${rowIndex - 1}`);
                
                // Usar un array para almacenar todos los registros y acceder por índice
                const allRecords = [];
                
                try {
                    model.forEach(function(record, index, id) {
                        console.log(`🔍 apexGridUtils DEBUG: Procesando registro - index: ${index}, id: ${id}`);
                        if (record && typeof record === 'object') {
                            allRecords.push(record);
                        } else {
                            console.warn(`apexGridUtils: Registro inválido encontrado en índice ${index}`);
                        }
                    });
                } catch (forEachError) {
                    console.error('apexGridUtils: Error en model.forEach:', forEachError);
                    return false;
                }
                
                console.log(`📊 apexGridUtils: Total registros encontrados: ${allRecords.length}`);
                
                const targetIndex = rowIndex - 1; // rowIndex 1 = primera fila (índice 0)
                
                if (targetIndex >= 0 && targetIndex < allRecords.length) {
                    targetRecord = allRecords[targetIndex];
                    console.log(`✅ apexGridUtils DEBUG: Encontrado registro objetivo en índice ${targetIndex} (ID: ${targetRecord.id})`);
                } else {
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId} (total filas: ${allRecords.length})`);
                    return false;
                }
            }
            
            if (!targetRecord) {
                console.error(`apexGridUtils: No se pudo obtener registro objetivo`);
                return false;
            }
            
            console.log(`✅ apexGridUtils: Registro objetivo obtenido - ID: ${targetRecord.id}`);
            
            // Obtener valor actual para comparar
            let currentValue;
            try {
                currentValue = model.getValue(targetRecord, columnName);
                console.log(`📊 apexGridUtils: Valor actual en ${columnName}: ${currentValue}`);
            } catch (getValueError) {
                console.error('apexGridUtils: Error al obtener valor actual:', getValueError);
                return false;
            }
            
            // Verificar que el registro no esté eliminado
            let metadata = null;
            try {
                const recordId = targetRecord.id;
                // Solo intentar obtener metadata si el recordId existe y el método está disponible
                if (recordId && model.getRecordMetadata && typeof model.getRecordMetadata === 'function') {
                    metadata = model.getRecordMetadata(recordId);
                    
                    if (metadata && metadata.deleted) {
                        console.warn(`apexGridUtils: Registro ${recordId} está eliminado, no se puede modificar`);
                        return false;
                    }
                } else {
                    console.log(`apexGridUtils: Metadata no disponible o recordId no encontrado, continuando...`);
                }
            } catch (metadataError) {
                console.warn('apexGridUtils: Error al obtener metadata del registro:', metadataError);
                // Continuar sin metadata si no está disponible
            }
            
            // Preparar el valor final - manejar formato europeo si es necesario
            let finalValue = value;
            
            // Si el valor es numérico y la columna parece ser numérica, formatear al formato europeo
            if (typeof value === 'number' && !isNaN(value)) {
                // Detectar si la columna es numérica basándose en el nombre
                const numericColumns = ['COSTO', 'CANTIDAD', 'TOTAL', 'PRECIO', 'IMPORTE', 'SUBTOTAL', 'IVA', 'DESCUENTO'];
                const isNumericColumn = numericColumns.some(col => columnName.toUpperCase().includes(col));
                
                if (isNumericColumn) {
                    try {
                        // Formatear al formato europeo (punto como separador de miles, coma como decimal)
                        finalValue = value.toFixed(3).replace('.', ',');
                        console.log(`📊 apexGridUtils: Valor formateado al formato europeo: ${finalValue}`);
                    } catch (formatError) {
                        console.error('apexGridUtils: Error al formatear valor:', formatError);
                        finalValue = value; // Usar valor original si falla el formateo
                    }
                }
            }
            
            // Establecer el valor usando el método directo que funciona
            try {
                model.setValue(targetRecord, columnName, finalValue);
                console.log(`📊 apexGridUtils: Valor establecido: ${finalValue}`);
            } catch (setValueError) {
                console.error('apexGridUtils: Error al establecer valor:', setValueError);
                return false;
            }
            
            // Verificar que se estableció correctamente
            let verifyValue;
            try {
                verifyValue = model.getValue(targetRecord, columnName);
                console.log(`📊 apexGridUtils: Valor después de seteo: ${verifyValue}`);
            } catch (verifyError) {
                console.error('apexGridUtils: Error al verificar valor:', verifyError);
                return false;
            }
            
            // Forzar el estado "dirty" del registro para que APEX lo reconozca como modificado
            try {
                if (model.markDirty) {
                    model.markDirty(targetRecord);
                    console.log(`✅ apexGridUtils: Registro marcado como dirty`);
                }
                
                // Commit del registro individual
                if (model.commitRecord) {
                    model.commitRecord(targetRecord);
                    console.log(`✅ apexGridUtils: Registro confirmado`);
                }
            } catch (commitError) {
                console.warn('apexGridUtils: Error al confirmar registro:', commitError);
            }
            
            // Refrescar la vista si está habilitado
            if (refresh) {
                try {
                    const grid = apex.region(gridStaticId).call("getViews").grid;
                    if (grid.view$ && grid.view$.trigger) {
                        grid.view$.trigger('refresh');
                        console.log(`✅ apexGridUtils: Vista refrescada`);
                    }
                } catch (e) {
                    console.warn('apexGridUtils: No se pudo refrescar la vista:', e);
                }
            }
            
            // Verificación final con retry si es necesario
            setTimeout(() => {
                const finalCheckValue = model.getValue(targetRecord, columnName);
                console.log(`📊 apexGridUtils: Verificación final - ${columnName}: ${finalCheckValue}`);
                
                // Si el valor cambió inesperadamente, intentar re-establecerlo
                if (finalCheckValue !== finalValue && finalCheckValue !== value) {
                    console.warn(`⚠️ apexGridUtils: Valor cambió inesperadamente, re-estableciendo...`);
                    
                    // Re-establecer el valor
                    model.setValue(targetRecord, columnName, finalValue);
                    
                    // Forzar dirty state nuevamente
                    if (model.markDirty) {
                        model.markDirty(targetRecord);
                    }
                    
                    // Verificación final después del retry
                    setTimeout(() => {
                        const retryValue = model.getValue(targetRecord, columnName);
                        if (retryValue === finalValue || retryValue === value) {
                            console.log(`✅ apexGridUtils: Valor re-establecido correctamente`);
                        } else {
                            console.warn(`⚠️ apexGridUtils: Valor no se pudo mantener estable: ${retryValue}`);
                        }
                    }, 100);
                } else {
                    console.log(`✅ apexGridUtils: Valor se mantuvo correctamente`);
                }
            }, 100);
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils setCellValue error:', error);
            console.error('apexGridUtils setCellValue - Parámetros recibidos:', {
                gridStaticId: gridStaticId,
                columnName: columnName,
                rowIndex: rowIndex,
                value: value,
                valueType: typeof value,
                refresh: refresh
            });
            return false;
        }
    }

    /**
     * Setear valor en la fila seleccionada (Versión Mejorada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     */
    function setSelectedCellValue(gridStaticId, columnName, value, refresh = true) {
        return setCellValue(gridStaticId, columnName, -1, value, refresh);
    }

    /**
     * Setear valor en la primera fila (Versión Mejorada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     */
    function setFirstCellValue(gridStaticId, columnName, value, refresh = true) {
        return setCellValue(gridStaticId, columnName, 1, value, refresh);
    }

    /**
     * Obtener el valor de una celda específica del Interactive Grid (Versión Mejorada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @returns {any} - Valor de la celda o null si no se encuentra
     */
    function getCellValue(gridStaticId, columnName, rowIndex = -1) {
        try {
            // Obtener el modelo usando el método que funciona
            const model = apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").model;
            
            let targetRecord = null;
            
            // Obtener registro objetivo
            if (rowIndex === -1) {
                // Usar el registro seleccionado
                const selectedRecords = apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").getSelectedRecords();
                if (selectedRecords && selectedRecords.length > 0) {
                    targetRecord = selectedRecords[0];
                } else {
                    console.warn(`apexGridUtils: No hay registro seleccionado en ${gridStaticId}`);
                    return null;
                }
            } else {
                // Obtener registro por índice usando un enfoque más directo
                console.log(`🔍 apexGridUtils DEBUG: Buscando fila ${rowIndex}, rowIndex-1 = ${rowIndex - 1}`);
                
                // Usar un array para almacenar todos los registros y acceder por índice
                const allRecords = [];
                model.forEach(function(record, index, id) {
                    allRecords.push(record);
                });
                
                const targetIndex = rowIndex - 1; // rowIndex 1 = primera fila (índice 0)
                
                if (targetIndex >= 0 && targetIndex < allRecords.length) {
                    targetRecord = allRecords[targetIndex];
                    console.log(`✅ apexGridUtils DEBUG: Encontrado registro objetivo en índice ${targetIndex} (ID: ${targetRecord.id})`);
                } else {
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId} (total filas: ${allRecords.length})`);
                    return null;
                }
            }
            
            if (!targetRecord) {
                console.error(`apexGridUtils: No se pudo obtener registro objetivo`);
                return null;
            }
            
            const rawValue = model.getValue(targetRecord, columnName);
            
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
            
            console.log(`📊 apexGridUtils: Valor obtenido de ${columnName}, fila ${rowIndex === -1 ? 'seleccionada' : rowIndex}: ${finalValue} (tipo: ${typeof finalValue})`);
            return finalValue;
            
        } catch (error) {
            console.error('apexGridUtils getCellValue error:', error);
            return null;
        }
    }

    /**
     * Obtener valor de la celda seleccionada (Versión Mejorada)
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @returns {any} - Valor de la celda o null si no se encuentra
     */
    function getSelectedCellValue(gridStaticId, columnName) {
        return getCellValue(gridStaticId, columnName, -1);
    }

    /**
     * Obtener todos los campos de la última fila seleccionada como un objeto
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {array} columns - Array de nombres de columnas a obtener (opcional, si no se especifica obtiene todas)
     * @returns {object|null} - Objeto con todos los campos de la fila o null si no hay fila seleccionada
     */
    function getCurrentRow(gridStaticId, columns = null) {
        try {
            console.log(`📊 apexGridUtils: Obteniendo fila actual de ${gridStaticId}`);
            
            // Usar exactamente tu método que funciona
            const row = apex.region(gridStaticId).call("getCurrentView");
            const record = row.getContextRecord(document.activeElement);
            
            if (!record || !record[0]) {
                console.warn(`apexGridUtils: No se pudo obtener el registro de la fila seleccionada`);
                return null;
            }
            
            console.log(`📊 apexGridUtils: Registro obtenido exitosamente`);
            
            // Obtener columnas especificadas por el usuario
            let columnsToGet = columns;
            if (!columnsToGet || columnsToGet.length === 0) {
                console.error(`apexGridUtils: Debes especificar las columnas que necesitas obtener del grid ${gridStaticId}`);
                return null;
            }
            
            console.log(`📊 apexGridUtils: Columnas a obtener: ${columnsToGet.join(', ')}`);
            
            // Crear objeto con todos los campos de la fila
            const rowData = {};
            
            // Obtener las columnas del grid para mapear nombres a índices
            const gridColumns = [];
            try {
                if (row.getColumns) {
                    const columns = row.getColumns();
                    columns.forEach((col, index) => {
                        // Usar col.property que es el nombre real de la columna
                        if (col.property) {
                            gridColumns.push({ name: col.property, index: col.index });
                        }
                    });
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error al obtener columnas del grid:`, e);
            }
            
            columnsToGet.forEach(columnName => {
                try {
                    let value = null;
                    
                    // Buscar el índice de la columna por nombre
                    const columnInfo = gridColumns.find(col => col.name === columnName);
                    if (columnInfo) {
                        value = record[0][columnInfo.index];
                        console.log(`📊 apexGridUtils: ${columnName} (índice ${columnInfo.index}) = ${value}`);
                    } else {
                        console.warn(`apexGridUtils: No se encontró la columna ${columnName} en el grid`);
                        value = null;
                    }
                    
                    rowData[columnName] = value;
                } catch (error) {
                    console.warn(`apexGridUtils: Error al obtener valor de columna ${columnName}:`, error);
                    rowData[columnName] = null;
                }
            });
            
            console.log(`✅ apexGridUtils: Fila actual obtenida con ${Object.keys(rowData).length} campos:`, rowData);
            return rowData;
            
        } catch (error) {
            console.error('apexGridUtils getCurrentRow error:', error);
            return null;
        }
    }

    /**
     * Obtener valor de la primera fila (Versión Mejorada)
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
        getCurrentRow: getCurrentRow,
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
        refreshGridSafe: refreshGridSafe,
        forceRecordDirty: forceRecordDirty,
        setCellValueWithDirty: setCellValueWithDirty,
        setSelectedCellValueWithDirty: setSelectedCellValueWithDirty,
        setFirstCellValueWithDirty: setFirstCellValueWithDirty,
        forceDirtyState: forceDirtyState,
        setCellValueWithStabilization: setCellValueWithStabilization,
        setSelectedCellValueWithStabilization: setSelectedCellValueWithStabilization,
        setFirstCellValueWithStabilization: setFirstCellValueWithStabilization,
        simulateUserInteraction: simulateUserInteraction,
        setCellValueWithActivation: setCellValueWithActivation,
        setSelectedCellValueWithActivation: setSelectedCellValueWithActivation,
        setFirstCellValueWithActivation: setFirstCellValueWithActivation,
        setCellValueRobust: setCellValueRobust,
        setSelectedCellValueRobust: setSelectedCellValueRobust,
        setFirstCellValueRobust: setFirstCellValueRobust,
        initializeFocusRestoration: initializeFocusRestoration,
        enableFocusRestoration: enableFocusRestoration,
        disableFocusRestoration: disableFocusRestoration,
        getLastFocusedCell: getLastFocusedCell,
        setLastFocusedCell: setLastFocusedCell,
        restoreFocus: restoreFocus,
        clearLastFocusedCell: clearLastFocusedCell,
        getFocusRestorationStatus: getFocusRestorationStatus,
        recalculateAllRows: recalculateAllRows,
        setItemOnRowSelect: setItemOnRowSelect,
        setItemOnRowOrCellChange: setItemOnRowOrCellChange
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
                    region = apex.region(gridStaticId).widget().interactiveGrid('getViews').grid;
                    region.model.clearChanges();
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
     * Forzar el estado "dirty" de un registro usando múltiples métodos
     * @param {object} model - Modelo del grid
     * @param {object} targetRow - Registro objetivo
     * @param {string} columnName - Nombre de la columna (opcional)
     * @returns {boolean} - true si se marcó correctamente
     */
    function forceDirtyState(model, targetRow, columnName = null) {
        try {
            console.log(`🔄 apexGridUtils: Forzando dirty state usando múltiples métodos...`);
            
            let successCount = 0;
            
            // Método 1: markDirty
            try {
                if (model.markDirty) {
                    model.markDirty(targetRow);
                    successCount++;
                    console.log(`✅ apexGridUtils: Dirty state usando markDirty()`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error con markDirty:`, e);
            }
            
            // Método 2: setDirty en modelo
            try {
                if (model.setDirty) {
                    model.setDirty(targetRow, true);
                    successCount++;
                    console.log(`✅ apexGridUtils: Dirty state usando model.setDirty()`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error con model.setDirty:`, e);
            }
            
            // Método 3: setDirty en registro
            try {
                if (targetRow.setDirty) {
                    targetRow.setDirty(true);
                    successCount++;
                    console.log(`✅ apexGridUtils: Dirty state usando record.setDirty()`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error con record.setDirty:`, e);
            }
            
            // Método 4: setValue con opciones dirty
            try {
                if (columnName && model.setValue && model.setValue.length > 3) {
                    const currentValue = model.getValue(targetRow, columnName);
                    if (currentValue !== undefined) {
                        model.setValue(targetRow, columnName, currentValue, { dirty: true });
                        successCount++;
                        console.log(`✅ apexGridUtils: Dirty state usando setValue con opciones`);
                    }
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error con setValue con opciones:`, e);
            }
            
            // Método 5: updateRecord
            try {
                if (model.updateRecord) {
                    model.updateRecord(targetRow);
                    successCount++;
                    console.log(`✅ apexGridUtils: Dirty state usando updateRecord()`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error con updateRecord:`, e);
            }
            
            // Método 6: Simular cambio manual
            try {
                if (columnName) {
                    const currentValue = model.getValue(targetRow, columnName);
                    if (currentValue !== undefined) {
                        // Re-establecer el valor para forzar dirty state
                        model.setValue(targetRow, columnName, currentValue);
                        successCount++;
                        console.log(`✅ apexGridUtils: Dirty state usando re-establecimiento de valor`);
                    }
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error con re-establecimiento:`, e);
            }
            
            console.log(`📊 apexGridUtils: ${successCount} métodos de dirty state ejecutados exitosamente`);
            return successCount > 0;
            
        } catch (error) {
            console.error('apexGridUtils forceDirtyState error:', error);
            return false;
        }
    }

    /**
     * Forzar el estado "dirty" de un registro para que APEX lo reconozca como modificado
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @returns {boolean} - true si se marcó correctamente
     */
    function forceRecordDirty(gridStaticId, rowIndex = -1) {
        try {
            console.log(`🔄 apexGridUtils: Forzando estado dirty en ${gridStaticId}, fila ${rowIndex}`);
            
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
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId}`);
                    return false;
                }
            }
            
            if (!targetRow) {
                console.error(`apexGridUtils: No se pudo obtener fila objetivo`);
                return false;
            }
            
            // Usar la función mejorada para forzar dirty state
            return forceDirtyState(model, targetRow, 'COSTO'); // Usar COSTO como columna por defecto
            
        } catch (error) {
            console.error(`apexGridUtils forceRecordDirty error para ${gridStaticId}:`, error);
            return false;
        }
    }

    /**
     * Confirmar cambios en el modelo del grid sin refrescar la vista
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {boolean} commitAll - Si debe hacer commit de todos los registros (default: true)
     * @param {boolean} forceDirty - Si debe forzar el estado dirty antes de confirmar (default: true)
     * @returns {boolean} - true si se confirmaron correctamente
     */
    function commitGridChanges(gridStaticId, commitAll = true, forceDirty = true) {
        try {
            console.log(`💾 apexGridUtils: Confirmando cambios en ${gridStaticId}`);
            
            const grid = apex.region(gridStaticId).call("getViews").grid;
            const model = grid.model;
            
            let changesCommitted = 0;
            
            if (commitAll) {
                // Confirmar todos los registros modificados
                model.forEach(function(record) {
                    try {
                        // Forzar estado dirty si está habilitado
                        if (forceDirty) {
                            try {
                                if (model.markDirty) {
                                    model.markDirty(record);
                                }
                                if (record.setDirty) {
                                    record.setDirty(true);
                                }
                            } catch (dirtyError) {
                                console.warn(`apexGridUtils: Error al forzar dirty state:`, dirtyError);
                            }
                        }
                        
                        // Verificar si el registro está modificado
                        let isModified = false;
                        
                        // Método 1: Usar isDirty si está disponible
                        if (model.isDirty && model.isDirty(record)) {
                            isModified = true;
                        }
                        
                        // Método 2: Verificar si tiene propiedades de modificación
                        if (record.isDirty && record.isDirty()) {
                            isModified = true;
                        }
                        
                        // Método 3: Siempre intentar confirmar si forceDirty está habilitado
                        if (forceDirty) {
                            isModified = true;
                        }
                        
                        if (isModified) {
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
                        
                        // Forzar estado dirty si está habilitado
                        if (forceDirty) {
                            if (model.markDirty) {
                                model.markDirty(selectedRecord);
                            }
                            if (selectedRecord.setDirty) {
                                selectedRecord.setDirty(true);
                            }
                        }
                        
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
                            grid = apex.region(gridStaticId).widget().interactiveGrid('getViews').grid;
                            grid.model.clearChanges();
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

    /**
     * Setear valor en una celda específica del Interactive Grid con estado dirty
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @param {boolean} forceDirty - Si debe forzar el estado dirty (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setCellValueWithDirty(gridStaticId, columnName, rowIndex, value, refresh = true, forceDirty = true) {
        try {
            console.log(`🔧 apexGridUtils: Seteando valor con dirty ${value} en ${columnName}, fila ${rowIndex}`);
            
            // Obtener el grid usando el método que funciona
            const grid = apex.region(gridStaticId).call("getViews").grid;
            const model = grid.model;
            
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
                model.forEach(function(record) {
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
                // Obtener valor actual para comparar
                const currentValue = model.getValue(targetRow, columnName);
                console.log(`📊 apexGridUtils: Valor actual en ${columnName}: ${currentValue}`);
                
                // Establecer el valor en el modelo
                model.setValue(targetRow, columnName, value);
                console.log(`📊 apexGridUtils: Valor establecido: ${value}`);
                
                // Forzar estado dirty si está habilitado
                if (forceDirty) {
                    console.log(`🔄 apexGridUtils: Forzando estado dirty...`);
                    
                    // Usar la función mejorada para forzar dirty state
                    const dirtySuccess = forceDirtyState(model, targetRow, columnName);
                    
                    if (dirtySuccess) {
                        console.log(`✅ apexGridUtils: Estado dirty forzado exitosamente`);
                    } else {
                        console.warn(`⚠️ apexGridUtils: No se pudo forzar estado dirty`);
                    }
                }
                
                // Refrescar la vista si está habilitado
                if (refresh) {
                    try {
                        // Método correcto para Interactive Grids de APEX
                        grid.view$.trigger('refresh');
                        console.log(`✅ apexGridUtils: Vista refrescada`);
                    } catch (e) {
                        console.warn('apexGridUtils: No se pudo refrescar la vista:', e);
                    }
                }
                
                // Verificación final
                setTimeout(() => {
                    const finalValue = model.getValue(targetRow, columnName);
                    console.log(`📊 apexGridUtils: Verificación final - ${columnName}: ${finalValue}`);
                    
                    // Verificar si el registro está marcado como dirty usando múltiples métodos
                    let isDirty = false;
                    
                    try {
                        // Método 1: Usar isDirty del modelo
                        if (model.isDirty && model.isDirty(targetRow)) {
                            isDirty = true;
                            console.log(`✅ apexGridUtils: Registro confirmado como dirty usando model.isDirty()`);
                        }
                    } catch (e) {
                        console.warn(`apexGridUtils: Error con model.isDirty:`, e);
                    }
                    
                    try {
                        // Método 2: Usar isDirty del registro
                        if (targetRow.isDirty && targetRow.isDirty()) {
                            isDirty = true;
                            console.log(`✅ apexGridUtils: Registro confirmado como dirty usando record.isDirty()`);
                        }
                    } catch (e) {
                        console.warn(`apexGridUtils: Error con record.isDirty:`, e);
                    }
                    
                    try {
                        // Método 3: Verificar si el registro tiene propiedades de modificación
                        if (targetRow.isModified && targetRow.isModified()) {
                            isDirty = true;
                            console.log(`✅ apexGridUtils: Registro confirmado como modified usando isModified()`);
                        }
                    } catch (e) {
                        console.warn(`apexGridUtils: Error con isModified:`, e);
                    }
                    
                    try {
                        // Método 4: Verificar si el registro tiene estado de cambio
                        if (targetRow.hasChanges && targetRow.hasChanges()) {
                            isDirty = true;
                            console.log(`✅ apexGridUtils: Registro confirmado como changed usando hasChanges()`);
                        }
                    } catch (e) {
                        console.warn(`apexGridUtils: Error con hasChanges:`, e);
                    }
                    
                    if (!isDirty) {
                        console.warn(`⚠️ apexGridUtils: Registro no está marcado como dirty - intentando forzar...`);
                        
                        // Intentar forzar dirty state una vez más
                        try {
                            if (model.setDirty) {
                                model.setDirty(targetRow, true);
                                console.log(`🔄 apexGridUtils: Dirty state forzado nuevamente usando setDirty()`);
                            }
                        } catch (e) {
                            console.warn(`apexGridUtils: Error al forzar dirty state:`, e);
                        }
                        
                        try {
                            if (model.markDirty) {
                                model.markDirty(targetRow);
                                console.log(`🔄 apexGridUtils: Dirty state forzado nuevamente usando markDirty()`);
                            }
                        } catch (e) {
                            console.warn(`apexGridUtils: Error al forzar dirty state:`, e);
                        }
                    } else {
                        console.log(`✅ apexGridUtils: Estado dirty confirmado correctamente`);
                    }
                }, 100);
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('apexGridUtils setCellValueWithDirty error:', error);
            return false;
        }
    }

    /**
     * Setear valor en la fila seleccionada con estado dirty
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @param {boolean} forceDirty - Si debe forzar el estado dirty (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setSelectedCellValueWithDirty(gridStaticId, columnName, value, refresh = true, forceDirty = true) {
        return setCellValueWithDirty(gridStaticId, columnName, -1, value, refresh, forceDirty);
    }

    /**
     * Setear valor en la primera fila con estado dirty
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @param {boolean} forceDirty - Si debe forzar el estado dirty (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setFirstCellValueWithDirty(gridStaticId, columnName, value, refresh = true, forceDirty = true) {
        return setCellValueWithDirty(gridStaticId, columnName, 1, value, refresh, forceDirty);
    }

    /**
     * Setear valor con espera de estabilización y confirmación automática
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {any} value - Valor a establecer
     * @param {number} maxAttempts - Máximo número de intentos (default: 5)
     * @param {number} delayBetweenAttempts - Delay entre intentos en ms (default: 200)
     * @returns {Promise<boolean>} - Promise que resuelve a true si se estableció correctamente
     */
    function setCellValueWithStabilization(gridStaticId, columnName, rowIndex, value, maxAttempts = 5, delayBetweenAttempts = 200) {
        return new Promise((resolve) => {
            try {
                console.log(`🔄 apexGridUtils: Iniciando seteo con estabilización - ${value} en ${columnName}, fila ${rowIndex}`);
                
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
                        resolve(false);
                        return;
                    }
                } else {
                    const allRecords = [];
                    model.forEach(function(record) {
                        allRecords.push(record);
                    });
                    
                    if (allRecords.length >= rowIndex && rowIndex > 0) {
                        targetRow = allRecords[rowIndex - 1];
                    } else {
                        console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId}`);
                        resolve(false);
                        return;
                    }
                }
                
                if (!targetRow) {
                    console.error(`apexGridUtils: No se pudo obtener fila objetivo`);
                    resolve(false);
                    return;
                }
                
                let attempts = 0;
                let lastValue = null;
                
                function attemptSetValue() {
                    attempts++;
                    console.log(`🔄 apexGridUtils: Intento ${attempts}/${maxAttempts} - Estableciendo valor ${value}`);
                    
                    // Obtener valor actual
                    const currentValue = model.getValue(targetRow, columnName);
                    console.log(`📊 apexGridUtils: Valor actual: ${currentValue}, Valor objetivo: ${value}`);
                    
                    // Establecer el valor
                    model.setValue(targetRow, columnName, value);
                    
                    // Forzar dirty state
                    forceDirtyState(model, targetRow, columnName);
                    
                    // Esperar un poco y verificar si el valor se mantuvo
                    setTimeout(() => {
                        const verifyValue = model.getValue(targetRow, columnName);
                        console.log(`📊 apexGridUtils: Valor después de seteo: ${verifyValue}`);
                        
                        // Verificar si el valor se estabilizó
                        if (verifyValue === value || verifyValue === lastValue) {
                            console.log(`✅ apexGridUtils: Valor estabilizado en ${verifyValue}`);
                            
                            // Confirmar cambios
                            commitGridChanges(gridStaticId, true, true);
                            
                            // Refrescar vista
                            try {
                                grid.view$.trigger('refresh');
                                console.log(`✅ apexGridUtils: Vista refrescada`);
                            } catch (e) {
                                console.warn(`apexGridUtils: Error al refrescar vista:`, e);
                            }
                            
                            resolve(true);
                        } else {
                            lastValue = verifyValue;
                            
                            if (attempts < maxAttempts) {
                                console.log(`🔄 apexGridUtils: Valor no estabilizado, reintentando...`);
                                setTimeout(attemptSetValue, delayBetweenAttempts);
                            } else {
                                console.warn(`⚠️ apexGridUtils: No se pudo estabilizar el valor después de ${maxAttempts} intentos`);
                                
                                // Intentar una última vez con un enfoque diferente
                                try {
                                    // Forzar el valor usando setValue con opciones
                                    if (model.setValue && model.setValue.length > 3) {
                                        model.setValue(targetRow, columnName, value, { 
                                            dirty: true, 
                                            silent: false,
                                            validate: false 
                                        });
                                    } else {
                                        model.setValue(targetRow, columnName, value);
                                    }
                                    
                                    // Forzar dirty state nuevamente
                                    forceDirtyState(model, targetRow, columnName);
                                    
                                    // Confirmar cambios
                                    commitGridChanges(gridStaticId, true, true);
                                    
                                    console.log(`✅ apexGridUtils: Último intento completado`);
                                    resolve(true);
                                } catch (finalError) {
                                    console.error(`apexGridUtils: Error en último intento:`, finalError);
                                    resolve(false);
                                }
                            }
                        }
                    }, delayBetweenAttempts);
                }
                
                // Iniciar el proceso
                attemptSetValue();
                
            } catch (error) {
                console.error('apexGridUtils setCellValueWithStabilization error:', error);
                resolve(false);
            }
        });
    }

    /**
     * Setear valor con estabilización en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {number} maxAttempts - Máximo número de intentos (default: 5)
     * @param {number} delayBetweenAttempts - Delay entre intentos en ms (default: 200)
     * @returns {Promise<boolean>} - Promise que resuelve a true si se estableció correctamente
     */
    function setSelectedCellValueWithStabilization(gridStaticId, columnName, value, maxAttempts = 5, delayBetweenAttempts = 200) {
        return setCellValueWithStabilization(gridStaticId, columnName, -1, value, maxAttempts, delayBetweenAttempts);
    }

    /**
     * Setear valor con estabilización en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {number} maxAttempts - Máximo número de intentos (default: 5)
     * @param {number} delayBetweenAttempts - Delay entre intentos en ms (default: 200)
     * @returns {Promise<boolean>} - Promise que resuelve a true si se estableció correctamente
     */
    function setFirstCellValueWithStabilization(gridStaticId, columnName, value, maxAttempts = 5, delayBetweenAttempts = 200) {
        return setCellValueWithStabilization(gridStaticId, columnName, 1, value, maxAttempts, delayBetweenAttempts);
    }

    /**
     * Simular interacción del usuario para activar el grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @returns {boolean} - true si se activó correctamente
     */
    function simulateUserInteraction(gridStaticId, columnName, rowIndex = -1) {
        try {
            console.log(`🎯 apexGridUtils: Simulando interacción del usuario en ${gridStaticId}`);
            
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
                    console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId}`);
                    return false;
                }
            }
            
            if (!targetRow) {
                console.error(`apexGridUtils: No se pudo obtener fila objetivo`);
                return false;
            }
            
            // Método 1: Navegar a la celda
            try {
                grid.gotoCell(targetRow, columnName);
                console.log(`✅ apexGridUtils: Navegación a celda simulada`);
            } catch (e) {
                console.warn(`apexGridUtils: Error en navegación:`, e);
            }
            
            // Método 2: Simular focus en la celda
            try {
                const cellElement = grid.getCellElement ? grid.getCellElement(targetRow, columnName) : null;
                if (cellElement && cellElement.length > 0) {
                    cellElement.focus();
                    console.log(`✅ apexGridUtils: Focus en celda simulado`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error en focus:`, e);
            }
            
            // Método 3: Simular click en la celda
            try {
                const cellElement = grid.getCellElement ? grid.getCellElement(targetRow, columnName) : null;
                if (cellElement && cellElement.length > 0) {
                    cellElement.trigger('click');
                    console.log(`✅ apexGridUtils: Click en celda simulado`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error en click:`, e);
            }
            
            // Método 4: Activar modo edición
            try {
                if (grid.setEditMode) {
                    grid.setEditMode(true);
                    console.log(`✅ apexGridUtils: Modo edición activado`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error en modo edición:`, e);
            }
            
            // Método 5: Forzar activación del registro
            try {
                if (grid.setActiveRecord) {
                    grid.setActiveRecord(targetRow);
                    console.log(`✅ apexGridUtils: Registro activado`);
                }
            } catch (e) {
                console.warn(`apexGridUtils: Error en activación de registro:`, e);
            }
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils simulateUserInteraction error:', error);
            return false;
        }
    }

    /**
     * Setear valor con activación previa del grid
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {any} value - Valor a establecer
     * @param {boolean} simulateInteraction - Si debe simular interacción del usuario (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setCellValueWithActivation(gridStaticId, columnName, rowIndex, value, simulateInteraction = true) {
        try {
            console.log(`🎯 apexGridUtils: Seteando valor con activación - ${value} en ${columnName}, fila ${rowIndex}`);
            
            // Simular interacción del usuario primero
            if (simulateInteraction) {
                simulateUserInteraction(gridStaticId, columnName, rowIndex);
                
                // Esperar un poco para que la interacción se procese
                setTimeout(() => {
                    // Ahora establecer el valor
                    setCellValueWithDirty(gridStaticId, columnName, rowIndex, value, true, true);
                    
                    // Confirmar cambios después de un delay adicional
                    setTimeout(() => {
                        commitGridChanges(gridStaticId, true, true);
                        console.log(`✅ apexGridUtils: Valor establecido con activación completado`);
                    }, 100);
                }, 200);
            } else {
                // Establecer valor directamente
                setCellValueWithDirty(gridStaticId, columnName, rowIndex, value, true, true);
                commitGridChanges(gridStaticId, true, true);
            }
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils setCellValueWithActivation error:', error);
            return false;
        }
    }

    /**
     * Setear valor con activación en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} simulateInteraction - Si debe simular interacción del usuario (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setSelectedCellValueWithActivation(gridStaticId, columnName, value, simulateInteraction = true) {
        return setCellValueWithActivation(gridStaticId, columnName, -1, value, simulateInteraction);
    }

    /**
     * Setear valor con activación en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} simulateInteraction - Si debe simular interacción del usuario (default: true)
     * @returns {boolean} - true si se estableció correctamente
     */
    function setFirstCellValueWithActivation(gridStaticId, columnName, value, simulateInteraction = true) {
        return setCellValueWithActivation(gridStaticId, columnName, 1, value, simulateInteraction);
    }

    /**
     * Setear valor en una celda con manejo robusto para evitar que APEX lo revierta
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {number} rowIndex - Índice de la fila (1 = primera fila, -1 = fila seleccionada)
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @param {number} maxRetries - Máximo número de reintentos (default: 3)
     * @returns {Promise<boolean>} - Promise que resuelve a true si se estableció correctamente
     */
    function setCellValueRobust(gridStaticId, columnName, rowIndex, value, refresh = true, maxRetries = 3) {
        return new Promise((resolve) => {
            try {
                console.log(`🛡️ apexGridUtils: Seteando valor robusto ${value} en ${columnName}, fila ${rowIndex}`);
                
                const grid = apex.region(gridStaticId).call("getViews").grid;
                const model = grid.model;
                
                let targetRecord = null;
                
                // Obtener registro objetivo
                if (rowIndex === -1) {
                    const selectedRecords = apex.region(gridStaticId).widget().interactiveGrid("getCurrentView").getSelectedRecords();
                    if (selectedRecords && selectedRecords.length > 0) {
                        targetRecord = selectedRecords[0];
                    } else {
                        console.warn(`apexGridUtils: No hay registro seleccionado en ${gridStaticId}`);
                        resolve(false);
                        return;
                    }
                } else {
                    const allRecords = [];
                    model.forEach(function(record) {
                        allRecords.push(record);
                    });
                    
                    if (allRecords.length >= rowIndex && rowIndex > 0) {
                        targetRecord = allRecords[rowIndex - 1];
                    } else {
                        console.warn(`apexGridUtils: Fila ${rowIndex} fuera de rango en ${gridStaticId}`);
                        resolve(false);
                        return;
                    }
                }
                
                if (!targetRecord) {
                    console.error(`apexGridUtils: No se pudo obtener registro objetivo`);
                    resolve(false);
                    return;
                }
                
                let attempts = 0;
                let lastValue = null;
                
                function attemptSetValue() {
                    attempts++;
                    console.log(`🔄 apexGridUtils: Intento ${attempts}/${maxRetries} - Estableciendo valor ${value}`);
                    
                    try {
                        // Paso 1: Deshabilitar temporalmente los listeners de APEX
                        let originalListeners = null;
                        try {
                            if (model._listeners) {
                                originalListeners = model._listeners;
                                model._listeners = [];
                                console.log(`✅ apexGridUtils: Listeners deshabilitados temporalmente`);
                            }
                        } catch (e) {
                            console.warn(`apexGridUtils: No se pudieron deshabilitar listeners:`, e);
                        }
                        
                        // Paso 2: Obtener valor actual
                        const currentValue = model.getValue(targetRecord, columnName);
                        console.log(`📊 apexGridUtils: Valor actual: ${currentValue}, Valor objetivo: ${value}`);
                        
                        // Paso 3: Establecer el valor usando múltiples métodos
                        let setValueSuccess = false;
                        
                        // Método 1: setValue directo
                        try {
                            model.setValue(targetRecord, columnName, value);
                            setValueSuccess = true;
                            console.log(`✅ apexGridUtils: Valor establecido usando setValue directo`);
                        } catch (e) {
                            console.warn(`apexGridUtils: Error con setValue directo:`, e);
                        }
                        
                        // Método 2: setValue con opciones si el método 1 falló
                        if (!setValueSuccess) {
                            try {
                                model.setValue(targetRecord, columnName, value, { silent: true, dirty: true });
                                setValueSuccess = true;
                                console.log(`✅ apexGridUtils: Valor establecido usando setValue con opciones`);
                            } catch (e) {
                                console.warn(`apexGridUtils: Error con setValue con opciones:`, e);
                            }
                        }
                        
                        // Paso 4: Forzar estado dirty de manera agresiva
                        try {
                            // Método 1: markDirty
                            if (model.markDirty) {
                                model.markDirty(targetRecord);
                            }
                            
                            // Método 2: setDirty en registro
                            if (targetRecord.setDirty) {
                                targetRecord.setDirty(true);
                            }
                            
                            // Método 3: Simular cambio manual
                            const tempValue = model.getValue(targetRecord, columnName);
                            if (tempValue !== value) {
                                model.setValue(targetRecord, columnName, value);
                            }
                            
                            console.log(`✅ apexGridUtils: Estado dirty forzado`);
                        } catch (e) {
                            console.warn(`apexGridUtils: Error al forzar dirty state:`, e);
                        }
                        
                        // Paso 5: Restaurar listeners
                        try {
                            if (originalListeners) {
                                model._listeners = originalListeners;
                                console.log(`✅ apexGridUtils: Listeners restaurados`);
                            }
                        } catch (e) {
                            console.warn(`apexGridUtils: Error al restaurar listeners:`, e);
                        }
                        
                        // Paso 6: Commit inmediato
                        try {
                            if (model.commitRecord) {
                                model.commitRecord(targetRecord);
                            }
                            if (model.commit) {
                                model.commit();
                            }
                            console.log(`✅ apexGridUtils: Commit ejecutado`);
                        } catch (e) {
                            console.warn(`apexGridUtils: Error en commit:`, e);
                        }
                        
                        // Paso 7: Verificar si el valor se mantuvo
                        setTimeout(() => {
                            const verifyValue = model.getValue(targetRecord, columnName);
                            console.log(`📊 apexGridUtils: Valor después de seteo: ${verifyValue}`);
                            
                            // Verificar si el valor se estabilizó
                            if (verifyValue === value || verifyValue === lastValue) {
                                console.log(`✅ apexGridUtils: Valor estabilizado en ${verifyValue}`);
                                
                                // Refrescar vista si está habilitado
                                if (refresh) {
                                    try {
                                        if (grid.view$ && grid.view$.trigger) {
                                            grid.view$.trigger('refresh');
                                            console.log(`✅ apexGridUtils: Vista refrescada`);
                                        }
                                    } catch (e) {
                                        console.warn(`apexGridUtils: Error al refrescar vista:`, e);
                                    }
                                }
                                
                                resolve(true);
                            } else {
                                console.warn(`⚠️ apexGridUtils: Valor cambió a ${verifyValue}, intentando de nuevo...`);
                                lastValue = verifyValue;
                                
                                if (attempts < maxRetries) {
                                    setTimeout(attemptSetValue, 200);
                                } else {
                                    console.error(`❌ apexGridUtils: No se pudo estabilizar el valor después de ${maxRetries} intentos`);
                                    resolve(false);
                                }
                            }
                        }, 100);
                        
                    } catch (error) {
                        console.error(`apexGridUtils: Error en intento ${attempts}:`, error);
                        
                        if (attempts < maxRetries) {
                            setTimeout(attemptSetValue, 200);
                        } else {
                            resolve(false);
                        }
                    }
                }
                
                // Iniciar el proceso
                attemptSetValue();
                
            } catch (error) {
                console.error('apexGridUtils setCellValueRobust error:', error);
                resolve(false);
            }
        });
    }

    /**
     * Setear valor robusto en la fila seleccionada
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @param {number} maxRetries - Máximo número de reintentos (default: 3)
     * @returns {Promise<boolean>} - Promise que resuelve a true si se estableció correctamente
     */
    function setSelectedCellValueRobust(gridStaticId, columnName, value, refresh = true, maxRetries = 3) {
        return setCellValueRobust(gridStaticId, columnName, -1, value, refresh, maxRetries);
    }

    /**
     * Setear valor robusto en la primera fila
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string} columnName - Nombre de la columna
     * @param {any} value - Valor a establecer
     * @param {boolean} refresh - Si debe refrescar la vista (default: true)
     * @param {number} maxRetries - Máximo número de reintentos (default: 3)
     * @returns {Promise<boolean>} - Promise que resuelve a true si se estableció correctamente
     */
    function setFirstCellValueRobust(gridStaticId, columnName, value, refresh = true, maxRetries = 3) {
        return setCellValueRobust(gridStaticId, columnName, 1, value, refresh, maxRetries);
    }

    // =============================================================================
    // SISTEMA DE RE-ENFOQUE AUTOMÁTICO DE CELDAS
    // =============================================================================
    
    // Variable global para almacenar la última celda con foco
    let lastFocusedCell = null;
    let focusRestorationEnabled = true;

    /**
     * Inicializar el sistema de re-enfoque automático
     * @param {boolean} enable - Si debe habilitar el sistema (default: true)
     */
    function initializeFocusRestoration(enable = true) {
        try {
            focusRestorationEnabled = enable;
            
            if (enable) {
                /* console.log('apexGridUtils: Sistema de re-enfoque automático inicializado'); */
                
                // Captura el foco cuando el usuario está dentro del IG
                $(document).off('focusin.apexGridUtils').on('focusin.apexGridUtils', '.a-GV-cell', function () {
                    lastFocusedCell = this;
                    /* console.log('apexGridUtils: Celda enfocada capturada:', this); */
                });

                // Cuando vuelve el foco al navegador, intenta restaurar el enfoque
                $(window).off('focus.apexGridUtils').on('focus.apexGridUtils', function () {
                    if (lastFocusedCell && focusRestorationEnabled) {
                        setTimeout(() => {
                            try {
                                lastFocusedCell.focus();
                                /* console.log('apexGridUtils: Foco restaurado en celda'); */
                            } catch (error) {
                                console.warn('apexGridUtils: Error al restaurar foco:', error);
                                lastFocusedCell = null; // Limpiar referencia inválida
                            }
                        }, 50); // pequeño retraso para evitar conflictos
                    }
                });
                
                console.log('apexGridUtils: Eventos de re-enfoque configurados');
            } else {
                // Deshabilitar el sistema
                $(document).off('focusin.apexGridUtils');
                $(window).off('focus.apexGridUtils');
                lastFocusedCell = null;
                /* console.log('apexGridUtils: Sistema de re-enfoque automático deshabilitado'); */
            }
            
            return true;
            
        } catch (error) {
            console.error('apexGridUtils initializeFocusRestoration error:', error);
            return false;
        }
    }

    /**
     * Habilitar el sistema de re-enfoque automático
     */
    function enableFocusRestoration() {
        return initializeFocusRestoration(true);
    }

    /**
     * Deshabilitar el sistema de re-enfoque automático
     */
    function disableFocusRestoration() {
        return initializeFocusRestoration(false);
    }

    /**
     * Obtener la última celda enfocada
     * @returns {HTMLElement|null} - Elemento de la celda o null si no hay
     */
    function getLastFocusedCell() {
        return lastFocusedCell;
    }

    /**
     * Establecer manualmente la última celda enfocada
     * @param {HTMLElement} cellElement - Elemento de la celda
     */
    function setLastFocusedCell(cellElement) {
        if (cellElement && cellElement.classList && cellElement.classList.contains('a-GV-cell')) {
            lastFocusedCell = cellElement;
            /* console.log('apexGridUtils: Última celda enfocada establecida manualmente'); */
            return true;
        } else {
            console.warn('apexGridUtils: Elemento no es una celda válida del Interactive Grid');
            return false;
        }
    }

    /**
     * Restaurar el foco manualmente
     * @param {number} delay - Delay en milisegundos antes de restaurar (default: 50)
     * @returns {boolean} - true si se restauró correctamente
     */
    function restoreFocus(delay = 50) {
        try {
            if (lastFocusedCell && focusRestorationEnabled) {
                setTimeout(() => {
                    try {
                        lastFocusedCell.focus();
                        /* console.log('apexGridUtils: Foco restaurado manualmente'); */
                        return true;
                    } catch (error) {
                        console.warn('apexGridUtils: Error al restaurar foco manualmente:', error);
                        lastFocusedCell = null;
                        return false;
                    }
                }, delay);
                return true;
            } else {
                console.warn('apexGridUtils: No hay celda enfocada para restaurar o el sistema está deshabilitado');
                return false;
            }
        } catch (error) {
            console.error('apexGridUtils restoreFocus error:', error);
            return false;
        }
    }

    /**
     * Limpiar la referencia de la última celda enfocada
     */
    function clearLastFocusedCell() {
        lastFocusedCell = null;
        /* console.log('apexGridUtils: Referencia de última celda enfocada limpiada'); */
    }

    /**
     * Obtener el estado del sistema de re-enfoque
     * @returns {object} - Objeto con el estado del sistema
     */
    function getFocusRestorationStatus() {
        return {
            enabled: focusRestorationEnabled,
            lastFocusedCell: lastFocusedCell,
            hasLastFocusedCell: lastFocusedCell !== null,
            cellInfo: lastFocusedCell ? {
                tagName: lastFocusedCell.tagName,
                className: lastFocusedCell.className,
                id: lastFocusedCell.id,
                textContent: lastFocusedCell.textContent ? lastFocusedCell.textContent.substring(0, 50) + '...' : ''
            } : null
        };
    }

    // Inicializar automáticamente el sistema de re-enfoque cuando se carga el módulo
    setTimeout(() => {
        initializeFocusRestoration(true);
    }, 100);

    /**
    * Verifica de forma fiable si un registro de un modelo de IG está marcado para eliminación.
    * @param {object} record El objeto de registro del modelo.
    * @param {object} model El modelo del Interactive Grid.
    * @returns {boolean} True si el registro está marcado para ser eliminado.
    */
    function isRecordMarkedForDeletion(record, model) {
        try {
            // El método más fiable es a través de los metadatos del registro.
            const recordId = model.getRecordId(record);
            if (recordId) {
                const meta = model.getRecordMetadata(recordId);
                // Si el registro fue eliminado (meta.deleted) o es un agregado (meta.agg), no debe procesarse.
                if (meta && (meta.deleted || meta.agg)) {
                    return true;
                }
            }
            // Fallback por si la metadata no está disponible o es un registro nuevo sin ID.
            // La propiedad 't' con el valor 'd' también es un indicador interno de APEX.
            if (record._meta && record._meta.t === 'd') {
                return true;
            }

        } catch (e) {
            console.warn('apexGridUtils: No se pudo verificar el estado del registro.', e);
        }
        return false;
    }

    /**
     * Recalcula y setea valores en una columna de todas las filas del Interactive Grid.
     * @param {string} gridStaticId - Static ID del Interactive Grid
     * @param {string[]|object} sourceColumnsOrConfig - Array de nombres de columnas fuente O objeto de configuración
     * @param {string} targetColumn - Columna donde se seteará el resultado (solo si se usa formato antiguo)
     * @param {function} formula - Función que recibe (values, record, index) y retorna el valor a setear (solo si se usa formato antiguo)
     * @param {number} decimalPlaces - Cantidad de decimales a redondear (default: 2, solo si se usa formato antiguo)
     * @param {number} delay - Delay en milisegundos entre operaciones (default: 50)
     */
    function recalculateAllRows(gridStaticId, sourceColumnsOrConfig, targetColumn, formula, decimalPlaces = 2, delay = 50) {

        setTimeout(() => {

            try {
                // Detectar si se está usando el nuevo formato (objeto de configuración)
                let config;
                if (typeof sourceColumnsOrConfig === 'object' && !Array.isArray(sourceColumnsOrConfig)) {
                    // Nuevo formato: objeto de configuración
                    config = sourceColumnsOrConfig;
                    
                    // Validar parámetros requeridos
                    if (!config.sourceColumns || !config.targetColumn || !config.formula) {
                        console.error('apexGridUtils: Faltan parámetros requeridos en configuración');
                        return false;
                    }
                    
                    // Agregar delay al config si no está definido
                    if (config.delay === undefined) {
                        config.delay = delay;
                    }
                } else {
                    // Formato antiguo: parámetros separados (mantener compatibilidad)
                    config = {
                        sourceColumns: sourceColumnsOrConfig,
                        targetColumn: targetColumn,
                        formula: formula,
                        decimalPlaces: decimalPlaces,
                        delay: delay
                    };
                }

                const grid = apex.region(gridStaticId).call("getViews").grid;
                const model = grid.model;

                console.log(`🔄 apexGridUtils: Recalculando todas las filas en ${gridStaticId} -> ${config.targetColumn} (delay: ${config.delay}ms)`);

                let processedRows = 0;
                let skippedRows = 0;
                
                // Procesar registros de forma síncrona
                model.forEach(function(record, index, id) {
                    try {
                        // Verificar si el registro está marcado para eliminación
                        if (isRecordMarkedForDeletion(record, model)) {
                            console.log(`⏭️ apexGridUtils: Saltando registro ${id} - marcado para eliminación`);
                            skippedRows++;
                            return; // Continuar con el siguiente registro
                        }
                        
                        // Construir objeto de valores fuente
                        const values = {};
                        config.sourceColumns.forEach(col => {
                            values[col] = apexGridUtils.normalizeNumber(model.getValue(record, col));
                        });

                        // Calcular el nuevo valor usando la fórmula
                        let result = config.formula(values, record, index);

                        // Redondear a los decimales indicados
                        const decimalPlaces = config.decimalPlaces || 2;
                        result = parseFloat(Number(result).toFixed(decimalPlaces));

                        // Setear el valor en la columna destino
                        model.setValue(record, config.targetColumn, result);

                        // Marcar como dirty si corresponde
                        if (model.markDirty) model.markDirty(record);

                        processedRows++;
                        
                    } catch (recordError) {
                        console.warn(`apexGridUtils: Error al procesar registro ${id}:`, recordError);
                        skippedRows++;
                    }
                });

                // Refrescar la vista del grid
                grid.view$.trigger('refresh');
                
                console.log(`✅ apexGridUtils: Recalculación completada - ${processedRows} filas procesadas, ${skippedRows} filas saltadas`);
                return true;
                
            } catch (error) {
                console.error('apexGridUtils.recalculateAllRows error:', error);
                return false;
            }
            
        }, delay);
        
    }

    /**
     * Escucha la selección de fila en un IG y setea el valor de una columna en un item de página.
     * @param {string} gridStaticId - Static ID del IG (ej: 'IG_ANIMALES').
     * @param {string} columnName - Nombre de la columna a extraer (ej: 'COD_ANIMAL').
     * @param {string} itemName - Nombre del item de página donde setear el valor (ej: 'P_COD_ANIMAL').
     */
    function setItemOnRowSelect(gridStaticId, columnName, itemName) {
        try {
            // Esperar a que el IG esté inicializado
            var region = apex.region(gridStaticId);
            if (!region || !region.widget) {
                console.error('apexGridUtils: No se encontró la región IG con Static ID:', gridStaticId);
                return false;
            }
            var $ig = region.widget();
            // Evitar múltiples bindings
            $ig.off('interactivegridselectionchange.setItemOnRowSelect');
            $ig.on('interactivegridselectionchange.setItemOnRowSelect', function(event, ui) {
                try {
                    var view = $ig.interactiveGrid('getViews', 'grid');
                    var model = view.model;
                    var selectedRecords = ui.selectedRecords;
                    if (selectedRecords && selectedRecords.length > 0) {
                        var record = selectedRecords[0];
                        var value = model.getValue(record, columnName);
                        if (typeof $s === 'function') {
                            $s(itemName, value);
                        } else if (window.apex && apex.item && typeof apex.item(itemName).setValue === 'function') {
                            apex.item(itemName).setValue(value);
                        } else {
                            console.warn('apexGridUtils: No se pudo setear el valor en el item de página:', itemName);
                        }
                    }
                } catch (e) {
                    console.error('apexGridUtils: Error en setItemOnRowSelect (handler):', e);
                }
            });
            return true;
        } catch (error) {
            console.error('apexGridUtils: Error en setItemOnRowSelect:', error);
            return false;
        }
    }
    /**
     * Escucha selección de fila y cambios en una columna específica, y setea el valor en un item de página.
     * @param {string} gridStaticId - Static ID del IG.
     * @param {string} columnName - Columna a extraer.
     * @param {string} itemName - Item de página a setear.
     */
    function setItemOnRowOrCellChange(gridStaticId, columnName, itemName) {
        try {
            var region = apex.region(gridStaticId);
            if (!region || !region.widget) {
                console.error('apexGridUtils: No se encontró la región IG con Static ID:', gridStaticId);
                return false;
            }
            var $ig = region.widget();
            var view = $ig.interactiveGrid('getViews', 'grid');
            var model = view.model;

            // Limpia listeners previos
            $ig.off('interactivegridselectionchange.setItemOnRowSelect');
            model.unsubscribe && model.unsubscribe('setItemOnRowSelect');

            // Listener de selección de fila
            $ig.on('interactivegridselectionchange.setItemOnRowSelect', function(event, ui) {
                try {
                    var selectedRecords = ui.selectedRecords;
                    if (selectedRecords && selectedRecords.length > 0) {
                        var record = selectedRecords[0];
                        var value = model.getValue(record, columnName);
                        if (typeof $s === 'function') {
                            $s(itemName, value);
                        } else if (window.apex && apex.item && typeof apex.item(itemName).setValue === 'function') {
                            apex.item(itemName).setValue(value);
                        }
                    }
                } catch (e) {
                    console.error('apexGridUtils: Error en setItemOnRowOrCellChange (selection handler):', e);
                }
            });

            // Listener de cambio de celda
            model.subscribe({
                id: 'setItemOnRowSelect',
                onChange: function(type, change) {
                    if (type === 'set' && change.field === columnName) {
                        // Obtener el registro afectado
                        var value = model.getValue(change.record, columnName);
                        if (typeof $s === 'function') {
                            $s(itemName, value);
                        } else if (window.apex && apex.item && typeof apex.item(itemName).setValue === 'function') {
                            apex.item(itemName).setValue(value);
                        }
                    }
                }
            });

            return true;
        } catch (error) {
            console.error('apexGridUtils: Error en setItemOnRowOrCellChange:', error);
            return false;
        }
    }