/**
 * HOC that wraps a component in <ErrorBoundary> (Sentry.withErrorBoundary
 * parity).
 *
 *   export default withErrorBoundary(MyPage, { fallback: <Oops /> });
 */

/* eslint-disable react/prop-types */
import React from 'react';

import ErrorBoundary from './ErrorBoundary';

export default function withErrorBoundary(WrappedComponent, boundaryProps = {}) {
  function Wrapped(props) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  Wrapped.displayName = `withErrorBoundary(${name})`;
  return Wrapped;
}
