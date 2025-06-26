# Mensaje de Commit para GitHub

```
feat: Agregar funciones de refresco de grid y mejorar manejo de errores

## ✨ Nuevas Funciones

### Funciones de Refresco de Grid
- **refreshGrid(gridStaticId, refreshRegion)**: Refresca Interactive Grids de manera simple y eficiente
  - Refresca vista del grid usando `grid.view$.trigger('refresh')`
  - Opcionalmente refresca región completa usando `apex.region().refresh()`
  - Manejo robusto de errores con logs detallados
  - Parámetro `refreshRegion` por defecto en `true`

- **refreshGridAndRecalculateSimple(gridStaticId, targetColumn, delay)**: Función combinada para refrescar y recalcular
  - Combina refresco del grid con recálculo automático de fórmulas
  - Permite especificar columna específica para recálculo
  - Delay configurable para asegurar sincronización
  - Ideal para operaciones post-modificación de datos

## 🔧 Mejoras

### Manejo de Errores
- Mejor manejo de errores en funciones de refresco
- Logs detallados para debugging
- Fallbacks automáticos cuando los métodos de refresco fallan

### Documentación
- Documentación completa de las nuevas funciones en README.md
- Ejemplos de uso prácticos
- Casos de uso específicos para diferentes escenarios

## 🐛 Correcciones

### Problemas de Sincronización
- Resuelto problema de `gridStaticId is not defined` en operaciones de refresco
- Mejorada sincronización entre modificaciones de datos y refresco de vista
- Corrección en el manejo de referencias a variables no definidas

## 📚 Documentación

### README.md Actualizado
- Nueva sección "Funciones de Refresco de Grid"
- Ejemplos de uso para `refreshGrid()` y `refreshGridAndRecalculateSimple()`
- Casos de uso específicos para diferentes escenarios
- Mejor organización de la documentación

## 🔄 Compatibilidad

- **Retrocompatible**: Todas las funciones existentes mantienen su API
- **Nuevas funciones**: Agregadas sin afectar funcionalidad existente
- **Configuración**: No requiere cambios en configuraciones existentes

## 📝 Archivos Modificados

- `apexUtils.js`: Agregadas funciones `refreshGrid()` y `refreshGridAndRecalculateSimple()`
- `README.md`: Nueva sección de documentación para funciones de refresco
- `CHANGELOG.md`: Registro de cambios siguiendo Keep a Changelog

## 🧪 Casos de Uso

```javascript
// Refrescar grid simple
apexGridUtils.refreshGrid('mi_grid');

// Refrescar y recalcular automáticamente
apexGridUtils.refreshGridAndRecalculateSimple('mi_grid', 'TOTAL', 100);

// Después de modificar valores programáticamente
apexGridUtils.setCellValue('mi_grid', 'COSTO', 1, 150.50, false);
apexGridUtils.refreshGrid('mi_grid');
```

## 🎯 Beneficios

- **Simplicidad**: Funciones simples para refrescar grids
- **Robustez**: Manejo de errores mejorado
- **Flexibilidad**: Opciones configurables para diferentes escenarios
- **Sincronización**: Mejor coordinación entre modificaciones y refresco
- **Debugging**: Logs detallados para facilitar troubleshooting

Closes #issue_number
```

## Comando Git para el Commit

```bash
git add .
git commit -m "feat: Agregar funciones de refresco de grid y mejorar manejo de errores

- Agregar refreshGrid() y refreshGridAndRecalculateSimple()
- Mejorar manejo de errores en operaciones de refresco
- Resolver problema de 'gridStaticId is not defined'
- Actualizar documentación en README.md
- Agregar CHANGELOG.md siguiendo Keep a Changelog

Nuevas funciones:
- refreshGrid(gridStaticId, refreshRegion)
- refreshGridAndRecalculateSimple(gridStaticId, targetColumn, delay)

Mejoras:
- Logs detallados para debugging
- Fallbacks automáticos para métodos de refresco
- Mejor sincronización entre modificaciones y refresco

Documentación:
- Nueva sección en README.md
- Ejemplos de uso prácticos
- Casos de uso específicos"
```

## Comando para Push

```bash
git push origin main
```

## Tags para Release

```bash
# Crear tag para la versión
git tag -a v1.2.0 -m "Release v1.2.0: Funciones de refresco de grid"

# Push del tag
git push origin v1.2.0
``` 