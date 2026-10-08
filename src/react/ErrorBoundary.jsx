/**
 * Catches errors thrown during React render/lifecycle (the one surface global
 * handlers miss) and reports them with the component stack, then shows a
 * fallback instead of a blank white screen.
 */

/* eslint-disable react/prop-types */
import React, { Component } from 'react';

import { captureException } from '../index';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null, 
    };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error, 
    };
  }

  componentDidCatch(error, info) {
    const eventId = captureException(error, {
      mechanism: 'react.errorBoundary',
      react: {
        componentStack: info && info.componentStack, 
      },
    });
    this.setState({
      eventId, 
    });

    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, info, eventId);
      } catch (_) {
        /* ignore consumer callback errors */
      }
    }
  }

  reset() {
    this.setState({
      hasError: false,
      error: null,
      eventId: null, 
    });
    if (typeof this.props.onReset === 'function') this.props.onReset();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback({
        error: this.state.error,
        eventId: this.state.eventId,
        reset: this.reset,
      });
    }
    if (fallback !== undefined) return fallback;

    // Minimal built-in fallback (skeleton). Replace with your UI.
    return (
      <div style={{
        padding: 24,
        fontFamily: 'sans-serif', 
      }}>
        <h2>Algo salió mal.</h2>
        <button type="button" onClick={this.reset}>
          Reintentar
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
