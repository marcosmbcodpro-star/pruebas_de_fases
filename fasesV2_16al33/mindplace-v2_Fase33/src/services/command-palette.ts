import type { RouteLocationRaw } from 'vue-router';

export type CommandContext = 'global' | 'workspace' | 'graph' | 'quality' | 'search' | 'versions' | 'other';
export type CommandAction =
  | { type: 'route'; to: RouteLocationRaw }
  | { type: 'legacy'; command: string; payload?: Record<string, unknown> }
  | { type: 'search'; query?: string };

export interface PaletteCommand {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  shortcut?: string;
  contexts: CommandContext[];
  action: CommandAction;
}

export const PHASE29_COMMANDS: PaletteCommand[] = [
  { id: 'search', title: 'Buscar', description: 'Abrir búsqueda avanzada', keywords: ['buscar', 'search', 'consulta'], shortcut: '⌘ K', contexts: ['global', 'workspace', 'graph', 'quality', 'search', 'versions'], action: { type: 'search' } },
  { id: 'new-note', title: 'Nueva tarjeta', description: 'Crear una tarjeta de nota en el caso actual', keywords: ['crear', 'tarjeta', 'nota', 'nuevo', 'card', 'note'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'new-note' } },
  { id: 'new-person', title: 'Nueva persona', description: 'Crear una tarjeta de persona', keywords: ['crear', 'persona', 'contacto'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'new-person' } },
  { id: 'new-evidence', title: 'Nueva evidencia', description: 'Crear una tarjeta de evidencia', keywords: ['crear', 'evidencia', 'prueba'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'new-evidence' } },
  { id: 'new-connection', title: 'Nueva conexión', description: 'Activar el modo para crear una relación', keywords: ['crear', 'conexion', 'relación', 'link', 'edge'], contexts: ['global', 'workspace', 'graph'], action: { type: 'legacy', command: 'new-connection' } },
  { id: 'focus', title: 'Centrar elemento', description: 'Centrar la selección actual en el tablero', keywords: ['centrar', 'focus', 'seleccion', 'centro'], contexts: ['global', 'workspace', 'graph'], action: { type: 'legacy', command: 'board-focus' } },
  { id: 'open-graph', title: 'Abrir grafo', description: 'Cambiar a la vista de grafo', keywords: ['grafo', 'graph', 'relaciones'], contexts: ['global', 'workspace', 'quality', 'search'], action: { type: 'route', to: '/fase-26' } },
  { id: 'open-quality', title: 'Diagnóstico de calidad', description: 'Revisar consistencia del caso', keywords: ['calidad', 'diagnostico', 'errores', 'consistencia'], contexts: ['global', 'workspace', 'graph'], action: { type: 'route', to: '/fase-27' } },
  { id: 'open-search', title: 'Búsqueda avanzada', description: 'Buscar combinando criterios', keywords: ['buscar', 'avanzada', 'filtros', 'and', 'or', 'not'], contexts: ['global', 'workspace', 'graph', 'quality', 'search'], action: { type: 'route', to: '/fase-28' } },
  { id: 'new-case', title: 'Nuevo caso', description: 'Abrir el diálogo de creación de caso', keywords: ['caso', 'nuevo', 'crear'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'new-case' } },
  { id: 'switch-case', title: 'Cambiar de caso', description: 'Abrir el archivo de casos para elegir otro proyecto', keywords: ['caso', 'cambiar', 'proyecto', 'abrir'], contexts: ['global', 'workspace', 'graph', 'quality', 'search'], action: { type: 'legacy', command: 'back-cases' } },
  { id: 'export', title: 'Exportar caso', description: 'Abrir las opciones de exportación del caso actual', keywords: ['exportar', 'informe', 'json', 'mapa', 'datos'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'phase29-export' } },
  { id: 'backup', title: 'Crear copia de seguridad', description: 'Abrir el sistema de copias completo', keywords: ['copia', 'backup', 'seguridad', 'guardar'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'backup' } },
  { id: 'settings', title: 'Ajustes', description: 'Abrir la configuración de MindPlace', keywords: ['ajustes', 'configuración', 'preferencias', 'settings'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'settings' } },
  { id: 'versions', title: 'Versiones del caso', description: 'Abrir historial y restauración de versiones', keywords: ['version', 'historial', 'restaurar', 'versiones'], contexts: ['global', 'workspace', 'graph', 'quality'], action: { type: 'route', to: '/fase-24' } },
  { id: 'compare', title: 'Comparar versiones', description: 'Comparar dos versiones del caso', keywords: ['comparar', 'diff', 'cambios', 'versiones'], contexts: ['global', 'workspace', 'versions'], action: { type: 'route', to: '/fase-25' } },
  { id: 'administration', title: 'Acciones administrativas', description: 'Abrir el archivo de casos y herramientas de gestión', keywords: ['administracion', 'administrar', 'papelera', 'importar', 'backup'], contexts: ['global', 'workspace'], action: { type: 'legacy', command: 'back-cases' } },
  { id: 'collaboration', title: 'Colaboración', description: 'Compartir casos, permisos, presencia e historial de colaboración', keywords: ['colaboracion', 'compartir', 'usuarios', 'permisos', 'equipo'], contexts: ['global', 'workspace'], action: { type: 'route', to: '/fase-33' } }
];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function getCommandContext(pathname: string): CommandContext {
  if (pathname === '/fase-26') return 'graph';
  if (pathname === '/fase-27') return 'quality';
  if (pathname === '/fase-28' || pathname === '/fase-29') return 'search';
  if (pathname === '/fase-24' || pathname === '/fase-25') return 'versions';
  if (pathname === '/') return 'workspace';
  return 'other';
}

export function filterCommands(commands: PaletteCommand[], input: string, context: CommandContext): PaletteCommand[] {
  const needle = normalize(input.trim());
  return commands
    .filter(command => command.contexts.includes('global') || command.contexts.includes(context))
    .map(command => {
      const haystack = normalize([command.title, command.description, ...command.keywords].join(' '));
      if (!needle) return { command, score: 0 };
      let score = 0;
      if (normalize(command.title).startsWith(needle)) score += 100;
      if (normalize(command.title).includes(needle)) score += 50;
      if (normalize(command.keywords.join(' ')).includes(needle)) score += 25;
      if (haystack.includes(needle)) score += 10;
      return { command, score };
    })
    .filter(item => !needle || item.score > 0)
    .sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title))
    .map(item => item.command);
}
