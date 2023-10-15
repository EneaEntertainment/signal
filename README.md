# Signal

A small and fast signals library. Adds support for asynchronous signals.

Based on [type-signals](https://github.com/englercj/type-signals)

---
### Installation

```js
npm install --save-dev @enea-entertainment/signal
```

[![NPM](https://nodei.co/npm/@enea-entertainment/signal.png?compact=true)](https://nodei.co/npm/@enea-entertainment/signal/)


---
### Usage

```js

type IHandlerParam = (a: number, b: string)=> void;

function handler(a: number, b: string)
{
    console.log(a, b);
}

function asyncHandler(resolve: ()=> void, a: number, b: string)
{
    console.log(a, b);

    resolve();
}

async function test()
{
    const signal = new Signal<IHandlerParam>();

    signal.add(handler);

    signal.dispatch(1, 'foo');

    // ----------------------------

    const asyncSignal = new AsyncSignal<IHandlerParam>();

    asyncSignal.add(asyncHandler);

    await asyncSignal.dispatch(1, 'foo');
}

test();
```

---
## Disabling the signal

```js
const signal = new Signal<IHandlerParam>();

signal.add(handler);

signal.dispatch(1, 'foo');

signal.enabled = false;

signal.dispatch(2, 'bar'); // won't be called
```

---
## License

MIT, see [LICENSE](LICENSE) for details.