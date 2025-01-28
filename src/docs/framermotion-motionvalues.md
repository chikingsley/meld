# Motion Values Documentation

## Overview
- Motion values track the state and velocity of animated values.
- They are composable, signal-like, and performant.
- Motion components create them automatically, but they can be created manually for advanced use cases.
- Example:
    ```jsx
    import { motion, useMotionValue } from "motion/react"

    export function MyComponent() {
      const x = useMotionValue(0)
      return <motion.div style={{ x }} />
    }
    ```
- Manually creating motion values allows:
    - Setting and getting their state.
    - Synchronizing motion across components.
    - Chaining them via the `useTransform` hook.
    - Updating visual properties without triggering React renders.
    - Subscribing to updates.
- Example with `useTransform`:
    ```jsx
    const x = useMotionValue(0)
    const opacity = useTransform(
      x,
      [-200, 0, 200],
      [0, 1, 0]
    )

    return <motion.div drag="x" style={{ x, opacity }} />
    ```

## Usage
- Created with `useMotionValue` hook, passing the initial state (string or number).
    ```jsx
    import { useMotionValue } from "motion/react"

    const x = useMotionValue(0)
    ```
- Passed to `motion` components via the `style` prop:
    ```jsx
    <motion.li style={{ x }} />
    ```
- Or for SVG attributes, via the attribute prop itself:
    ```jsx
    <motion.circle cx={cx} />
    ```
- The same motion value can be passed to multiple components.
- Updated with the `set()` method:
    ```jsx
    x.set(100)
    ```
    - Changes to the motion value update the DOM without triggering a React re-render. Updates are batched to the next animation frame.
- A motion value can hold any string or number.
- Read with the `get()` method:
    ```jsx
    x.get() // 100
    ```
- Numerical motion values can return a velocity via the `getVelocity()` method. This returns the velocity as calculated per second.
    ```jsx
    const xVelocity = x.getVelocity()
    ```
    - Returns 0 for non-numerical values.

## Events
- Listeners can be added to motion values via the `on()` method or the `useMotionValueEvent` hook:
    ```jsx
    useMotionValueEvent(x, "change", (latest) => console.log(latest))
    ```
- Available events: `"change"`, `"animationStart"`, `"animationComplete"`, `"animationCancel"`.

## Composition
- Motion provides hooks like `useSpring` and `useTransform` for creating and composing motion values.
- Example: `useTransform` creates a new motion value from existing ones:
    ```jsx
    const y = useTransform(() => x.get() * 2)
    ```
- Example: `useSpring` creates a spring-based motion value:
    ```jsx
    const dragX = useMotionValue(0)
    const dragY = useMotionValue(0)
    const x = useSpring(dragX)
    const y = useSpring(dragY)
    ```
- These motion values can then be passed to motion components, or further composed with more hooks like `useVelocity`.

## API
- **`get()`**: Returns the latest state of the motion value.
- **`getVelocity()`**: Returns the latest velocity of the motion value (0 if the value is non-numerical).
- **`set()`**: Sets the motion value to a new state.
    ```jsx
    x.set("#f00")
    ```
- **`jump()`**: Sets the motion value to a new state, breaking continuity from previous values.
    - Resets velocity to 0.
    - Ends active animations.
    - Ignores attached effects (e.g., `useSpring` spring).
    ```jsx
    const x = useSpring(0)
    x.jump(10)
    x.getVelocity() // 0
    ```
- **`isAnimating()`**: Returns `true` if the value is currently animating.
- **`stop()`**: Stops the active animation.
- **`on()`**: Subscribes to motion value events. Returns a function to unsubscribe the listener.
    ```jsx
    const unsubscribe = x.on("change", latest => console.log(latest))
    ```
    - When using `on` inside a React component, it should be wrapped with `useEffect` or use the `useMotionValueEvent` hook instead.
- **`destroy()`**: Destroys and cleans up subscribers to this motion value.
    - Normally handled automatically; only needed if a motion value is manually created outside the React render cycle.
