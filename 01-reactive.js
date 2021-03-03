function defineReactive(obj, key, val) {
    observe(val);

    Object.defineProperty(obj, key, {
        get() {
            console.log('get', key);
            return val
        },
        set(newValue) {
            if (newValue !== val) {
                console.log('set', key);
                observe(newValue);
                val = newValue
            }
        },
    })
}

function observe(obj) {
    if (typeof obj !== 'object' || obj === null) return

    Object.keys(obj).forEach(key => {
        defineReactive(obj, key, obj[key])
    })
}

function set(obj, key, val) {
    defineReactive(obj, key, val)
}

const obj = {
    foo: 'foo',
    bar: 'bar',
    baz: {
        a: 1
    }
}
// observe(obj)
// // obj.foo
// // obj.bar
// obj.baz.a

// obj.baz = {
//     a: 10
// }
// obj.baz.a
obj.dong = 'dong';
obj.dong