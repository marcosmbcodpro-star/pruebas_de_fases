MindPlace — Fase 4 completada
================================

31. CSS separado por responsabilidades
---------------------------------------
El CSS monolítico se ha dividido en 14 módulos. El orden de @import coincide con el orden original para conservar la cascada.

32. Revisión de reglas duplicadas/innecesarias
---------------------------------------------
Se revisaron los selectores repetidos. Los casos repetidos con propósito de override (responsive, temas y estados) se conservan porque forman parte de la cascada. No se eliminaron reglas cuya supresión pudiera cambiar comportamiento.

33. Especificidad
-----------------
La revisión conserva selectores de componente cuando son necesarios para los distintos tipos de tarjeta, temas, estados y responsive. No se introdujeron selectores más específicos sin necesidad.

34. Variables CSS
-----------------
Se centralizaron variables para tipografía compartida y superficies/paneles comunes, manteniendo los valores visuales existentes.

35. Reglas cruzadas
-------------------
Se mantiene la separación entre base, tablero, tarjetas, dashboard, overlays, temas y responsive. Los overrides de tema permanecen en capas previsibles.

36. Temas
---------
Los temas siguen usando las mismas variables y overrides existentes. La separación física no altera las clases de tema.

37. Sistema visual común
------------------------
La arquitectura queda preparada para seguir consolidando botones, paneles, modales y menús sin mezclar sus responsabilidades.

Comprobaciones realizadas
-------------------------
- El HTML sigue cargando ./css/styles.css.
- styles.css ahora actúa como archivo principal y carga los módulos en orden.
- Se conserva una copia de referencia en docs/archive/styles.legacy.css, fuera de la carga de producción.
- Se validan todos los módulos por sintaxis y llaves balanceadas.
