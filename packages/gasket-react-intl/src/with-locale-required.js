import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import path from 'path';
import { manifest } from './config';
import { LOADING, localeUtils } from './utils';
import { useGasketIntl } from './hooks';

const { defaultLocale, defaultPath } = manifest;

/**
 * Sets up and attaches the getInitialProps static method which preloads locale
 * files during SSR for Next.js pages. For browser routing, the locale files
 * will be fetched as normal.
 *
 * @param {React.ComponentType} Wrapper - The HOC
 * @param {LocalePathPart} localePathPath - Path containing locale files
 */
function attachGetInitialProps(Wrapper, localePathPath) {
  const { WrappedComponent } = Wrapper;

  Wrapper.getInitialProps = async (ctx) => {
    const { res } = ctx;
    let localesProps;

    if (res) {
      const { locale = defaultLocale } = res.locals.gasketData.intl || {};
      const localesParentDir = path.dirname(res.locals.localesDir);
      localesProps = localeUtils.serverLoadData(localePathPath, locale, localesParentDir);
    }

    return {
      ...(localesProps ? { localesProps } : {}),
      ...(WrappedComponent.getInitialProps ? await WrappedComponent.getInitialProps(ctx) : {})
    };
  };
}

/**
 * Make an HOC that loads a locale file before rendering wrapped component
 *
 * @param {LocalePathPart} localePathPath - Path containing locale files
 * @param {object} [options] - Options
 * @param {React.Component} [options.loading=null] - Custom component to show while loading
 * @param {React.Component} [options.initialProps=false] - Preload locales during SSR with Next.js pages
 * @returns {function} wrapper
 */
export default function withLocaleRequired(localePathPath = defaultPath, options = {}) {
  const { loading = null, initialProps = false } = options;
  /**
   * Wrap the component
   * @param {React.Component} Component - Component to wrap
   * @returns {React.Component} wrapped component
   */
  return Component => {
    /**
     * Wrapper component that returns based on locale file status
     *
     * @param {object} props - Component props
     * @returns {JSX.Element} element
     */
    function Wrapper(props) {
      const loadState = useGasketIntl(localePathPath);
      if (loadState === LOADING) return loading;
      return <Component { ...props } />;
    }

    hoistNonReactStatics(Wrapper, Component);
    Wrapper.displayName = `withLocaleRequired(${ Component.displayName || Component.name || 'Component' })`;
    Wrapper.WrappedComponent = Component;

    if (initialProps || 'getInitialProps' in Component) {
      attachGetInitialProps(Wrapper, localePathPath);
    }

    return Wrapper;
  };
}