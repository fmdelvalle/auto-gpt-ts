# Importante
Este es un port del proyecto AutoGPT de Python. El original tiene más comandos y plugins.
Puedes encontrarlo en https://github.com/Significant-Gravitas/Auto-GPT

# Por qué
Comencé este proyecto porque no pude hacer funcionar el original. La API de DuckDuckGo estaba rota,
obtenía respuestas vacías en todas partes, etc. Además, quería aprender la arquitectura del proyecto,
y resulta que la migración paso a paso fue de mucha ayuda. También fue arriesgado,
ya que las bibliotecas de IA para Typescript no son tan abundantes como en Python, así que tuve que elegir nuevas,
y en algunos casos implementar algunas partes (partes de Numpy, el sentencizador, etc.). 

# Sitio web y documentación de Python AutoGPT 📰📖
¡Echa un vistazo a *https://agpt.co*, el sitio oficial de noticias y actualizaciones de Auto-GPT!
La documentación también tiene un lugar aquí, en *https://docs.agpt.co*
AutoGPT-TS no tiene un sitio web oficial aún, solo la página de GitHub.

# Para colaboradores 👷🏼
AutoGPT-TS tomó la estructura de plugins de AutoGPT, pero es probable que la interfaz cambie.
También es posible que mejoremos algunas partes de la aplicación. El primer paso fue convertir la funcionalidad principal a TypeScript,
ahora arreglaré un poco la arquitectura para que sea más extensible y mantenible.
Agradecería sugerencias, pruebas y correcciones de errores. Puedes crear issues en GitHub para ello.

# 🚀 Lanzamiento v0.0.1 🚀
Esta es la primera versión, con solo las funciones principales y tal vez demasiados logs.

## Funciones faltantes 🐋
 * Más comandos
 * Más backends de memoria, si es necesario
 * TTS y voz a texto
 * Soporte completo de .env
 * Más pruebas unitarias

## Funciones adicionales 🐋
 * Es asíncrono, por lo que es posible tener múltiples ejecuciones en el mismo hilo
 * Divisor en oraciones (sentencizer) más rápido
 * Multiidioma en proceso. Cada agente puede usar un idioma diferente.
