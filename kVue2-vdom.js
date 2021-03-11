function defineReactive(obj, key, val) {
    observe(val);

    // 创建对应的 Dep
    const dep = new Dep();

    Object.defineProperty(obj, key, {
        get() {
            // console.log('get', key);
            Dep.target && dep.addDep(Dep.target);
            return val
        },
        set(newValue) {
            if (newValue !== val) {
                // console.log('set', key);
                observe(newValue);
                val = newValue;
                dep.notify();
            }
        }
    })
}

function observe(obj) {
    if (typeof obj !== 'object' || obj === null) return

    new Observer(obj);
}

// 代理函数
function proxy(vm) {
    Object.keys(vm.$data).forEach(key => {
        Object.defineProperty(vm, key, {
            get() {
                // 直接转发 data 上得值
                return vm.$data[key]
            },
            set(newVlaue) {
                vm.$data[key] = newVlaue
            }
        })
    })
}

// 传入一个 obj，判断 obj 类型，做不同相应处理
class Observer {
    constructor(val) {
        if (Array.isArray(val)) {
            // todo: 数组响应式
        } else {
            this.walk(val)
        }
    }

    walk(obj) {
        Object.keys(obj).forEach(key => {
            defineReactive(obj, key, obj[key])
        })
    }
}

// 构造函数
class kVue {
    constructor(options) {
        // 1. 保存配置
        this.$options = options;
        this.$data = options.data;

        // 2. 对 data 做响应式处理
        observe(this.$data);

        // 2.5 代理
        proxy(this);

        // 3. 编译视图模板
        // new Compile(options.el, this);

        // 调用 $mount
        if (options.el) {
            this.$mount(options.el)
        }
    }

    $mount(el) {
        // 获取宿主dom
        this.$el = document.querySelector(el)

        // 创建一个组件更新函数
        const updateComponent = () => {
            // vdom
            const { render } = this.$options;
            const vnode = render.call(this, this.$createElement);
            this._update(vnode)
        }

        new Watcher(this, updateComponent);
    }

    $createElement(tag, props, children) {
        return { tag, props, children }
    }

    _update(vnode) {
        // 获取上次的vnode
        const prevVnode = this._vnode;
        if (!prevVnode) {
            // init
            this.__patch__(this.$el, vnode);
        } else {
            // update
            this.__patch__(prevVnode, vnode);
        }
    }

    __patch__(oldVnode, vnode) {
        if (oldVnode.nodeType) {
            // oldVnode是dom，挂载
            const parent = oldVnode.parentElement;
            const refElm = oldVnode.nextSibling;
            // 将vnode转换成dom
            const el = this.createElm(vnode);
            parent.insertBefore(el, refElm);
            parent.removeChild(oldVnode);
        } else {
            // update
            // 1. 获取要更新dom
            const el = vnode.el = oldVnode.el;

            // 2. props update

            // 3. children update
            // 获取双方孩子
            const oldCh = oldVnode.children;
            const newCh = vnode.children;
            if (typeof newCh === 'string') {
                if (typeof oldCh === 'string') {
                    // text update
                    if (newCh !== oldCh) {
                        el.textContent = newCh;
                    }
                } else {
                    // array
                    el.textContent = newCh;
                }
            } else {
                if (typeof oldCh === 'string') {
                    el.innerHTML = '';
                    newCh.forEach(child => {
                        el.appendChild(this.createElm(child));
                    })
                } else {
                    this.updateChildren(el, oldCh, newCh)
                }
            }
        }

        // 保存vnode，以备将来更新时使用
        this._vnode = vnode;
    }

    updateChildren(parentElm, oldCh, newCh) {
        const len = Math.min(oldCh.length, newCh.length);
        for (let i = 0; i < len; i++) {
            this.__patch__(oldCh[i], newCh[i])
        }

        if (newCh.length > oldCh.length) {
            newCh.slice(len).forEach(child => {
                const el = this.createElm(child);
                parentElm.appendChild(el)
            })
        } else if (newCh.length > oldCh.length) {
            newCh.slice(len).forEach(child => {
                parentElm.removeChild(child.el)
            })
        }
    }

    createElm(vnode) {
        // dom创建和追加
        // 1. 创建根节点
        const el = document.createElement(vnode.tag);

        // 2. attrs
        if (vnode.props) {
            for (const key in vnode.props) {
                const value = vnode.props[key];
                el.setAttribute(key, value);
            }
        }

        // 3. children
        if (vnode.children) {
            if (typeof vnode.children === 'string') {
                // text
                el.textContent = vnode.children
            } else {
                // array
                vnode.children.forEach(child => {
                    const childDom = this.createElm(child);
                    el.appendChild(childDom);
                })
            }
        }

        // 4. 在vnode上面保存dom元素便于diff
        vnode.el = el;

        // 5. 返回dom
        return el
    }
}

class Compile {
    constructor(el, vm) {
        this.$vm = vm;

        this.$el = document.querySelector(el);

        this.$el && this.compile(this.$el)
    }

    compile(el) {
        // 对 el 这颗 dom 树递归遍历
        el.childNodes.forEach(node => {
            // 1. 如果是元素，判断其属性
            if (node.nodeType === 1) {
                // console.log('元素节点', node.nodeName);
                this.compileElement(node);
                node.childNodes.length && this.compile(node);
            }
            if (this.isInter(node)) {
                // 2. 如果是文本，判断是不是插值绑定{{}}
                // console.log('插值表达', RegExp.$1);
                this.compileText(node, RegExp.$1);
            }
        })
    }

    isInter(node) {
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent);
    }

    // 提取一个 upDate 方法，此方法为那些动态的依赖初始化并且创建 Watcher 实例
    upDate(node, exp, dir) {
        // 1. init
        const fn = this[dir + 'UpDater'];
        fn && fn(node, this.$vm[exp]);

        // 2. 创建 Watcher 实例
        new Watcher(this.$vm, exp, val => {
            fn && fn(node, val);
        });
    }

    compileText(node, exp) {
        this.upDate(node, exp, 'text')
    }

    textUpDater(node, val) {
        node.textContent = val;
    }

    compileElement(node) {
        const nodeAttrs = [...node.attributes];
        nodeAttrs.forEach(attr => {
            const { name, value } = attr;
            if (this.isDir(name)) {
                const dir = name.substring(2);
                this[dir] && this[dir](node, value);
            }
            if (this.isEvent(name)) {
                this.handleEvent(node, RegExp.$1, value);
            }
        })
    }

    handleEvent(node, exp, value) {
        const fn = this.$vm.$options.methods[value] && this.$vm.$options.methods[value];
        node.addEventListener(exp, fn.bind(this.$vm));
    }

    isEvent(attr) {
        return /^@(.*)/.test(attr) || /^k-on:(.*)/.test(attr);
    }

    isDir(attr) {
        return attr.startsWith('k-');
    }

    // k-model
    model(node, exp) {
        this.upDate(node, exp, 'model');

        node.addEventListener('input', e => {
            this.$vm[exp] = e.target.value;
        })
    }

    modelUpDater(node, val) {
        node.value = val;
    }

    // k-text
    text(node, exp) {
        this.upDate(node, exp, 'text')
    }

    // k-html
    html(node, exp) {
        this.upDate(node, exp, 'html')
    }

    htmlUpDater(node, val) {
        node.innerHTML = val;
    }
}

// Watcher: 负责视图中依赖的更新
class Watcher {
    constructor(vm, fn) {
        this.vm = vm;
        this.getter = fn;

        this.get()
    }

    get() {
        // 依赖收集触发
        Dep.target = this;
        this.getter.call(this.vm)
        Dep.target = null;
    }

    // 会被 Dep 调用
    upDate() {
        this.get()
    }
}

// Dep: 和 data 中的每个 key 一一对应，响应式处理时，每遍历一个属性，就创建一个 Dep 实例
class Dep {
    constructor() {
        this.deps = new Set;
    }

    addDep(watcher) {
        this.deps.add(watcher);
    }

    notify() {
        this.deps.forEach(watcher => watcher.upDate())
    }
}