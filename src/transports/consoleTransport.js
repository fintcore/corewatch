/**
 * Console transport: pretty-prints every event as a styled console group.
 * Nothing leaves the browser. It is the default when init() gets no transports.
 */

const LEVEL_STYLE = {
  fatal: 'color:#fff;background:#b71c1c;padding:2px 6px;border-radius:3px',
  error: 'color:#fff;background:#d32f2f;padding:2px 6px;border-radius:3px',
  warning: 'color:#000;background:#f9a825;padding:2px 6px;border-radius:3px',
  info: 'color:#fff;background:#1976d2;padding:2px 6px;border-radius:3px',
  debug: 'color:#fff;background:#616161;padding:2px 6px;border-radius:3px',
};

function frameLine(f) {
  const loc = [f.filename, f.lineno, f.colno].filter((v) => v != null && v !== '').join(':');
  return `  at ${f.function} (${loc})`;
}

export function createConsoleTransport(options = {}) {
  const collapsed = options.collapsed !== false; // default: collapsed groups

  return {
    name: 'console',
    send(event) {
      if (typeof console === 'undefined') return;

      /* eslint-disable no-console */
      const style = LEVEL_STYLE[event.level] || LEVEL_STYLE.info;
      const title = `%c${event.level.toUpperCase()}%c ${event.message || '(no message)'}`;
      const group = collapsed && console.groupCollapsed ? console.groupCollapsed : console.group;

      if (group) group.call(console, title, style, 'color:inherit;font-weight:bold');
      else console.log(title, style, 'color:inherit');

      console.log('eventId    :', event.eventId);
      console.log('mechanism  :', event.mechanism);
      console.log('release    :', event.release, '| env:', event.environment, '| project:', event.project);
      console.log('url        :', event.context && event.context.url);

      if (event.exception) {
        console.log('exception  :', `${event.exception.type}: ${event.exception.value}`);
        if (event.exception.stack && event.exception.stack.length) {
          console.log(`stack:\n${ event.exception.stack.map(frameLine).join('\n')}`);
        }
      }

      if (event.user) console.log('user       :', event.user);
      if (event.tags && Object.keys(event.tags).length) console.log('tags       :', event.tags);
      if (event.extra && Object.keys(event.extra).length) console.log('extra      :', event.extra);

      if (event.breadcrumbs && event.breadcrumbs.length) {
        if (console.table) {
          console.table(
            event.breadcrumbs.map((b) => ({
              time: b.timestamp,
              category: b.category,
              level: b.level,
              message: b.message,
            })),
          );
        } else {
          console.log('breadcrumbs:', event.breadcrumbs);
        }
      }

      console.log('context    :', event.context);

      if (console.groupEnd) console.groupEnd();
      /* eslint-enable no-console */
    },
  };
}
