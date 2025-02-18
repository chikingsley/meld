## AutoSizer

High-order component that automatically adjusts the width and height of a single child.

### Prop Types

| Property      | Type     | Required? | Description                                                                                                                                                     |
| :------------ | :------- | :-------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| children      | Function |     ✓     | Function responsible for rendering children. This function should implement the following signature: `({ height: number, width: number }) => PropTypes.element` |
| className     | String   |           | Optional custom CSS class name to attach to root `AutoSizer` element. This is an advanced property and is not typically necessary.                              |
| defaultHeight | Number   |           | Height passed to child for initial render; useful for server-side rendering. This value will be overridden with an accurate height after mounting.              |
| defaultWidth  | Number   |           | Width passed to child for initial render; useful for server-side rendering. This value will be overridden with an accurate width after mounting.                |
| disableHeight | Boolean  |           | Fixed `height`; if specified, the child's `height` property will not be managed                                                                                 |
| disableWidth  | Boolean  |           | Fixed `width`; if specified, the child's `width` property will not be managed                                                                                   |
| nonce         | String   |           | Nonce of the inlined stylesheets for [Content Security Policy](https://www.w3.org/TR/2016/REC-CSP2-20161215/#script-src-the-nonce-attribute)                    |
| onResize      | Function |           | Callback to be invoked on-resize; it is passed the following named parameters: `({ height: number, width: number })`.                                           |
| style         | Object   |           | Optional custom inline style to attach to root `AutoSizer` element. This is an advanced property and is not typically necessary.                                |

### Examples

Many react-virtualized components require explicit dimensions but sometimes you just want a component to just grow to fill all of the available space.
The `AutoSizer` component can be useful in this case.

One word of caution about using `AutoSizer` with flexbox containers.
Flex containers don't prevent their children from growing and `AutoSizer` greedily grows to fill as much space as possible.
Combining the two can cause a loop.
The simple way to fix this is to nest `AutoSizer` inside of a `block` element (like a `<div>`) rather than putting it as a direct child of the flex container.
Read more about common `AutoSizer` questions [here](usingAutoSizer.md).

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import {AutoSizer, List} from 'react-virtualized';
import 'react-virtualized/styles.css'; // only needs to be imported once

// List data as an array of strings
const list = [
  'Brian Vaughn',
  // And so on...
];

function rowRenderer({key, index, style}) {
  return (
    <div key={key} style={style}>
      {list[index]}
    </div>
  );
}

// Render your list
ReactDOM.render(
  <AutoSizer>
    {({height, width}) => (
      <List
        height={height}
        rowCount={list.length}
        rowHeight={20}
        rowRenderer={rowRenderer}
        width={width}
      />
    )}
  </AutoSizer>,
  document.getElementById('example'),
);
```
## Using AutoSizer

The `AutoSizer` component decorates a React element and automatically manages `width` and `height` properties so that decorated element fills the available space. This simplifies usage of components like `Grid`, `Table`, and `List` that require explicit dimensions.

This guide covers a few of the most commonly asked questions about using the component.

### Observation

This component uses [`javascript-detect-element-resize`](https://github.com/sdecima/javascript-detect-element-resize) algorithm, and it does a little direct DOM manipulation to its parent, outside React's VirtualDOM.

If the parent has style `position: static` (default value), it changes to `position: relative`. It also injects a sibling `div` for size measuring.

#### Why is my `AutoSizer` setting a height of 0?

`AutoSizer` expands to _fill_ its parent but it will not _stretch_ the parent.
This is done to prevent problems with flexbox layouts.
If `AutoSizer` is reporting a height (or width) of 0- then it's likely that the parent element (or one of its parents) has a height of 0.
One easy way to test this is to add a style property (eg `background-color: red;`) to the parent to ensure that it is the correct size.
(eg You may need to add `height: 100%` or `flex: 1` to the parent.)

#### Can I use AutoSizer to manage only width or height (not both)?

You can use `AutoSizer` to control only one dimension of its child component using the `disableHeight` or `disableWidth` attributes. For example, a fixed-height component that should grow to fill the available width can be created like so:

```jsx
<AutoSizer disableHeight>
  {({width}) => <Component height={200} width={width} {...props} />}
</AutoSizer>
```

#### Can I use AutoSizer within a flex container?

When using an `AutoSizer` as a direct child of a flex box it usually works out best to wrap it with a div, like so:

```jsx
<div style={{ display: 'flex' }}>
  <!-- Other children... -->
  <div style={{ flex: '1 1 auto' }}>
    <AutoSizer>
      {({ height, width }) => (
        <Component
          width={width}
          height={height}
          {...props}
        />
      )}
    </AutoSizer>
  </div>
</div>
```

#### Can I use AutoSizer with other HOCs like InfiniteLoader?

`AutoSizer` can be used within other react-virtualized HOCs such as `InfiniteLoader` or `ScrollSync` like so:

```jsx
<InfiniteLoader {...infiniteLoaderProps}>
  {({onRowsRendered, registerChild}) => (
    <AutoSizer>
      {({height, width}) => (
        <List
          ref={registerChild}
          width={width}
          height={height}
          onRowsRendered={onRowsRendered}
          {...listProps}
        />
      )}
    </AutoSizer>
  )}
</InfiniteLoader>
```

You can see an example of this [here](https://bvaughn.github.io/react-virtualized/#/components/InfiniteLoader).

### Applying Content Security Policy

[The specification of Content Security Policy](https://www.w3.org/TR/2016/REC-CSP2-20161215/#intro)
describes as the following:

> This document defines Content Security Policy, a mechanism web applications
> can use to mitigate a broad class of content injection vulnerabilities, such
> as cross-site scripting (XSS).

To apply Content Security Policy, pass a `nonce` to _react-virtualized_ and add a matching `nonce-source` to the `Content-Security-Policy` field in HTTP header.
```

AutoSizer.example.css
```
.AutoSizerWrapper {
  flex: 1 1 auto;
}

.List {
  border: 1px solid #e0e0e0;
}

.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 25px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.checkboxLabel {
  display: flex;
  align-items: center;
}
.checkbox {
  margin-right: 5px;
}
```

// AutoSizer.example.js
/** @flow */

import {List as ImmutableList} from 'immutable';
import PropTypes from 'prop-types';
import * as React from 'react';
import {
  ContentBox,
  ContentBoxHeader,
  ContentBoxParagraph,
} from '../demo/ContentBox';
import AutoSizer from './AutoSizer';
import List, {type RowRendererParams} from '../List';
import styles from './AutoSizer.example.css';

type State = {
  hideDescription: boolean,
};

export default class AutoSizerExample extends React.PureComponent<{}, State> {
  static contextTypes = {
    list: PropTypes.instanceOf(ImmutableList).isRequired,
  };

  state = {
    hideDescription: false,
  };

  render() {
    const {list} = this.context;
    const {hideDescription} = this.state;

    return (
      <ContentBox
        {...this.props}
        style={{
          height: 400,
        }}>
        <ContentBoxHeader
          text="AutoSizer"
          sourceLink="https://github.com/bvaughn/react-virtualized/blob/master/source/AutoSizer/AutoSizer.example.js"
          docsLink="https://github.com/bvaughn/react-virtualized/blob/master/docs/AutoSizer.md"
        />

        <ContentBoxParagraph>
          <label className={styles.checkboxLabel}>
            <input
              aria-label="Hide description (to show resize)?"
              className={styles.checkbox}
              type="checkbox"
              checked={hideDescription}
              onChange={event =>
                this.setState({hideDescription: event.target.checked})
              }
            />
            Hide description (to show resize)?
          </label>
        </ContentBoxParagraph>

        {!hideDescription && (
          <ContentBoxParagraph>
            This component decorates <code>List</code>, <code>Table</code>, or
            any other component and automatically manages its width and height.
            It uses Sebastian Decima's{' '}
            <a
              href="https://github.com/sdecima/javascript-detect-element-resize"
              target="_blank">
              element resize event
            </a>{' '}
            to determine the appropriate size. In this example{' '}
            <code>AutoSizer</code> grows to fill the remaining width and height
            of this flex column.
          </ContentBoxParagraph>
        )}

        <div className={styles.AutoSizerWrapper}>
          <AutoSizer>
            {({width, height}) => (
              <List
                className={styles.List}
                height={height}
                rowCount={list.size}
                rowHeight={30}
                rowRenderer={this._rowRenderer}
                width={width}
              />
            )}
          </AutoSizer>
        </div>
      </ContentBox>
    );
  }

  _rowRenderer = ({index, key, style}: RowRendererParams) => {
    const {list} = this.context;
    const row = list.get(index);

    return (
      <div key={key} className={styles.row} style={style}>
        {row.name}
      </div>
    );
  };
}
```