/** Helper to deduce the argument types of a function. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ArgumentTypes<T> = T extends (...args: infer U)=> infer R ? U : never;
export type WithVoidReturn<T extends Function> = (...args: [...ArgumentTypes<T>])=> void;
export type AsyncWithVoidReturn<T extends Function> = (...args: [()=> void, ...ArgumentTypes<T>])=> void;

/**
 * Interface representing a single binding to the signal.
 * This can be used to detach the handler function from the owning signal
 * so that it will no longer receive events.
 */
export interface SignalBinding
{
    /** Detaches this binding from the owning signal. */
    detach(): boolean;
}

class SignalBindingImpl<T extends Function> implements SignalBinding
{
    readonly fn: WithVoidReturn<T>;
    readonly once: boolean;
    readonly thisArg: any;

    next: SignalBindingImpl<T> | null = null;
    prev: SignalBindingImpl<T> | null = null;
    owner: Signal<any> | null = null;

    constructor(fn: WithVoidReturn<T>, once = false, thisArg: any)
    {
        this.fn = fn;
        this.once = once;
        this.thisArg = thisArg;
    }

    detach(): boolean
    {
        if (this.owner === null)
            return false;

        this.owner.detach(this);

        return true;
    }
}

/**
 * A signal is a dispatcher that can bind functions (handlers) to dispatched events.
 */
export class Signal<T extends Function = ()=> void>
{
    private _head: SignalBindingImpl<T> | null = null;
    private _tail: SignalBindingImpl<T> | null = null;

    public enabled = true;

    /**
     * Gathers a list of all the handlers currently bound to this signal.
     */
    handlers(): Array<SignalBinding>
    {
        let node = this._head;

        const handlers = [];

        while (node)
        {
            handlers.push(node);
            node = node.next;
        }

        return handlers;
    }

    /**
     * Returns true if this signal has any bound handlers.
     */
    hasAny(): boolean
    {
        return !!this._head;
    }

    /**
     * Returns true if the given binding is owned by this signal.
     *
     * @param node The binding to check.
     */
    has(node: SignalBinding): boolean
    {
        return (node as SignalBindingImpl<T>).owner === this;
    }

    /**
     * Dispatch an event to all handlers.
     * If the enabled is set to `false`, the event will not be dispatched.
     *
     * @param args The arguments to pass
     */
    dispatch(...args: ArgumentTypes<T>)
    {
        if (!this.enabled)
            return;

        let node = this._head;

        if (!node)
            return;

        while (node)
        {
            if (node.once)
                this.detach(node);

            const len = arguments.length;

            switch (len)
            {
                // @ts-ignore
                case 0: node.fn.call(node.thisArg); break;
                // @ts-ignore
                case 1: node.fn.call(node.thisArg, args[0]); break;
                // @ts-ignore
                case 2: node.fn.call(node.thisArg, args[0], args[1]); break;
                // @ts-ignore
                case 3: node.fn.call(node.thisArg, args[0], args[1], args[2]); break;
                // @ts-ignore
                case 4: node.fn.call(node.thisArg, args[0], args[1], args[2], args[3]); break;
                // @ts-ignore
                case 5: node.fn.call(node.thisArg, args[0], args[1], args[2], args[3], args[4]); break;

                default:
                    node.fn.apply(node.thisArg, args);
            }

            node = node.next;
        }
    }

    /**
     * Binds a new handler function to this signal that will be called for each dispatch.
     *
     * @param fn The handler function to bind.
     * @param thisArg Optional `this` argument to use when calling this handler
     */
    add(fn: WithVoidReturn<T>, thisArg: any = null): SignalBinding
    {
        return this._addSignalBinding(new SignalBindingImpl(fn, false, thisArg));
    }

    /**
     * Binds a new handler function to this signal that will only be called once on the next dispatch.
     *
     * @param fn The handler function to bind.
     * @param thisArg Optional `this` argument to use when calling this handler.
     */
    once(fn: WithVoidReturn<T>, thisArg: any = null): SignalBinding
    {
        return this._addSignalBinding(new SignalBindingImpl(fn, true, thisArg));
    }

    /**
     * Detaches a binding from this signal so that it is no longer called.
     *
     * @param node_ The binding to detach.
     */
    detach(node_: SignalBinding): this
    {
        const node = node_ as SignalBindingImpl<T>;

        if (node.owner !== this)
            return this;

        if (node.prev)
            node.prev.next = node.next;

        if (node.next)
            node.next.prev = node.prev;

        if (node === this._head)
        {
            this._head = node.next;

            if (node.next === null)
                this._tail = null;
        }
        else if (node === this._tail)
        {
            this._tail = node.prev;

            if (this._tail)
                this._tail.next = null;
        }

        node.owner = null;

        return this;
    }

    /**
     * Detaches all bindings.
     */
    detachAll()
    {
        let node = this._head;

        if (!node)
            return this;

        this._head = null;
        this._tail = null;

        while (node)
        {
            node.owner = null;
            node = node.next;
        }

        return this;
    }

    protected _addSignalBinding(node_: SignalBinding): SignalBinding
    {
        const node = node_ as SignalBindingImpl<T>;

        if (!this._head)
        {
            this._head = node;
            this._tail = node;
        }
        else
        {
            if (this._tail)
                this._tail.next = node;

            node.prev = this._tail;
            this._tail = node;
        }

        node.owner = this;

        return node;
    }
}

export class AsyncSignal<T extends Function = ()=> void> extends Signal
{
    add(fn: AsyncWithVoidReturn<T>, thisArg: any = null): SignalBinding
    {
        return this._addSignalBinding(new SignalBindingImpl(fn, false, thisArg));
    }

    async dispatch(...args: ArgumentTypes<T>): Promise<void>
    {
        if (!this.enabled)
            return;

        await new Promise<void>((resolve: ()=> void) =>
        {
            // @ts-ignore
            super.dispatch(resolve, ...args);
        });
    }
}
