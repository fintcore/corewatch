/**
 * Touch breadcrumbs: describes what the user tapped using the closest
 * accessibilityLabel / testID / nativeID, or the component name.
 *
 * React Native does not expose the touched element publicly, so this reads the
 * event's fiber (`_targetInst`, the same approach other SDKs use). It is best
 * effort and fully guarded: if React changes its internals, touches are just
 * not recorded.
 */

const MAX_DEPTH = 20;
const LABEL_PROPS = ['accessibilityLabel', 'aria-label', 'testID', 'nativeID'];
// Internal host/wrapper names that say nothing about what was tapped.
const SKIP_NAMES = /^(RCT|Animated|View|Text|TouchableHighlight|TouchableOpacity|TouchableWithoutFeedback|Pressable|ScrollView|AndroidHorizontalScrollContentView)$/;

function componentName(fiber) {
  const type = fiber && fiber.elementType;
  if (!type || typeof type === 'string') return null;
  return type.displayName || type.name || null;
}

/** @returns {{ label: string | null, component: string | null }} */
export function describeTouchTarget(event) {
  let fiber = event && (event._targetInst || (event.nativeEvent && event.nativeEvent._targetInst));
  let label = null;
  let component = null;

  for (let depth = 0; fiber && depth < MAX_DEPTH; depth += 1) {
    const props = fiber.memoizedProps || {};
    if (!label) {
      for (const key of LABEL_PROPS) {
        if (typeof props[key] === 'string' && props[key]) {
          label = props[key];
          break;
        }
      }
    }
    if (!component) {
      const name = componentName(fiber);
      if (name && !SKIP_NAMES.test(name)) component = name;
    }
    if (label && component) break;
    fiber = fiber.return;
  }

  return { label, component };
}

/**
 * Returns an onTouchStart handler that records `ui.touch` breadcrumbs.
 * @param {() => object | null} getClient
 */
export function createTouchHandler(getClient) {
  let last = null;
  return (event) => {
    try {
      const client = getClient();
      if (!client) return;
      const { label, component } = describeTouchTarget(event);
      if (!label && !component) return;

      const message = label && component ? `${component} "${label}"` : label || component;
      // Multi-touch and nested responders can fire twice for one tap.
      const now = Date.now();
      if (last && last.message === message && now - last.at < 300) return;
      last = { message, at: now };

      client.addBreadcrumb({ category: 'ui.touch', level: 'info', message });
    } catch (_) {
      /* never break touch handling */
    }
  };
}
