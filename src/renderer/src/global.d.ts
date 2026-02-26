/// <reference types="react/jsx-runtime" />

// Re-export JSX namespace from React so files can use JSX.Element
import type * as ReactJSX from 'react/jsx-runtime'

declare global {
  namespace JSX {
    type Element = ReactJSX.JSX.Element
    type ElementType = ReactJSX.JSX.ElementType
    interface ElementAttributesProperty extends ReactJSX.JSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends ReactJSX.JSX.ElementChildrenAttribute {}
    interface IntrinsicElements extends ReactJSX.JSX.IntrinsicElements {}
    interface IntrinsicAttributes extends ReactJSX.JSX.IntrinsicAttributes {}
  }
}
