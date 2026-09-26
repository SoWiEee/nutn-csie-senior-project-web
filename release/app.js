var NutnSiteApp = (() => {
  // vendor/lenis/dist/lenis.mjs
  var version = "1.3.26";
  function clamp(min, input, max) {
    return Math.max(min, Math.min(input, max));
  }
  function lerp(x, y, t) {
    return (1 - t) * x + t * y;
  }
  function damp(x, y, lambda, deltaTime) {
    return lerp(x, y, 1 - Math.exp(-lambda * deltaTime));
  }
  function modulo(n, d) {
    return (n % d + d) % d;
  }
  var Animate = class {
    isRunning = false;
    value = 0;
    from = 0;
    to = 0;
    currentTime = 0;
    lerp;
    duration;
    easing;
    onUpdate;
    /**
    * Advance the animation by the given delta time
    *
    * @param deltaTime - The time in seconds to advance the animation
    */
    advance(deltaTime) {
      if (!this.isRunning) return;
      let completed = false;
      if (this.duration && this.easing) {
        this.currentTime += deltaTime;
        const linearProgress = clamp(0, this.currentTime / this.duration, 1);
        completed = linearProgress >= 1;
        const easedProgress = completed ? 1 : this.easing(linearProgress);
        this.value = this.from + (this.to - this.from) * easedProgress;
      } else if (this.lerp) {
        this.value = damp(this.value, this.to, this.lerp * 60, deltaTime);
        if (Math.round(this.value) === Math.round(this.to)) {
          this.value = this.to;
          completed = true;
        }
      } else {
        this.value = this.to;
        completed = true;
      }
      if (completed) this.stop();
      this.onUpdate?.(this.value, completed);
    }
    /** Stop the animation */
    stop() {
      this.isRunning = false;
    }
    /**
    * Set up the animation from a starting value to an ending value
    * with optional parameters for lerping, duration, easing, and onUpdate callback
    *
    * @param from - The starting value
    * @param to - The ending value
    * @param options - Options for the animation
    */
    fromTo(from, to, { lerp: lerp2, duration, easing, onStart, onUpdate }) {
      this.from = this.value = from;
      this.to = to;
      this.lerp = lerp2;
      this.duration = duration;
      this.easing = easing;
      this.currentTime = 0;
      this.isRunning = true;
      onStart?.();
      this.onUpdate = onUpdate;
    }
  };
  function debounce(callback, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = void 0;
        callback.apply(this, args);
      }, delay);
    };
  }
  var Dimensions = class {
    width = 0;
    height = 0;
    scrollHeight = 0;
    scrollWidth = 0;
    debouncedResize;
    wrapperResizeObserver;
    contentResizeObserver;
    constructor(wrapper, content, { autoResize = true, debounce: debounceValue = 250 } = {}) {
      this.wrapper = wrapper;
      this.content = content;
      if (autoResize) {
        this.debouncedResize = debounce(this.resize, debounceValue);
        if (this.wrapper instanceof Window) window.addEventListener("resize", this.debouncedResize);
        else {
          this.wrapperResizeObserver = new ResizeObserver(this.debouncedResize);
          this.wrapperResizeObserver.observe(this.wrapper);
        }
        this.contentResizeObserver = new ResizeObserver(this.debouncedResize);
        this.contentResizeObserver.observe(this.content);
      }
      this.resize();
    }
    destroy() {
      this.wrapperResizeObserver?.disconnect();
      this.contentResizeObserver?.disconnect();
      if (this.wrapper === window && this.debouncedResize) window.removeEventListener("resize", this.debouncedResize);
    }
    resize = () => {
      this.onWrapperResize();
      this.onContentResize();
    };
    onWrapperResize = () => {
      if (this.wrapper instanceof Window) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
      } else {
        this.width = this.wrapper.clientWidth;
        this.height = this.wrapper.clientHeight;
      }
    };
    onContentResize = () => {
      if (this.wrapper instanceof Window) {
        this.scrollHeight = this.content.scrollHeight;
        this.scrollWidth = this.content.scrollWidth;
      } else {
        this.scrollHeight = this.wrapper.scrollHeight;
        this.scrollWidth = this.wrapper.scrollWidth;
      }
    };
    get limit() {
      return {
        x: this.scrollWidth - this.width,
        y: this.scrollHeight - this.height
      };
    }
  };
  var Emitter = class {
    events = {};
    /**
    * Emit an event with the given data
    * @param event Event name
    * @param args Data to pass to the event handlers
    */
    emit(event, ...args) {
      const callbacks = this.events[event] || [];
      for (let i = 0, length = callbacks.length; i < length; i++) callbacks[i]?.(...args);
    }
    /**
    * Add a callback to the event
    * @param event Event name
    * @param cb Callback function
    * @returns Unsubscribe function
    */
    on(event, cb) {
      if (this.events[event]) this.events[event].push(cb);
      else this.events[event] = [cb];
      return () => {
        this.events[event] = this.events[event]?.filter((i) => cb !== i);
      };
    }
    /**
    * Remove a callback from the event
    * @param event Event name
    * @param callback Callback function
    */
    off(event, callback) {
      this.events[event] = this.events[event]?.filter((i) => callback !== i);
    }
    /**
    * Remove all event listeners and clean up
    */
    destroy() {
      this.events = {};
    }
  };
  var LINE_HEIGHT = 100 / 6;
  var listenerOptions = { passive: false };
  function getDeltaMultiplier(deltaMode, size) {
    if (deltaMode === 1) return LINE_HEIGHT;
    if (deltaMode === 2) return size;
    return 1;
  }
  var VirtualScroll = class {
    touchStart = {
      x: 0,
      y: 0
    };
    lastDelta = {
      x: 0,
      y: 0
    };
    window = {
      width: 0,
      height: 0
    };
    emitter = new Emitter();
    constructor(element, options = {
      wheelMultiplier: 1,
      touchMultiplier: 1
    }) {
      this.element = element;
      this.options = options;
      window.addEventListener("resize", this.onWindowResize);
      this.onWindowResize();
      this.element.addEventListener("wheel", this.onWheel, listenerOptions);
      this.element.addEventListener("touchstart", this.onTouchStart, listenerOptions);
      this.element.addEventListener("touchmove", this.onTouchMove, listenerOptions);
      this.element.addEventListener("touchend", this.onTouchEnd, listenerOptions);
    }
    /**
    * Add an event listener for the given event and callback
    *
    * @param event Event name
    * @param callback Callback function
    */
    on(event, callback) {
      return this.emitter.on(event, callback);
    }
    /** Remove all event listeners and clean up */
    destroy() {
      this.emitter.destroy();
      window.removeEventListener("resize", this.onWindowResize);
      this.element.removeEventListener("wheel", this.onWheel, listenerOptions);
      this.element.removeEventListener("touchstart", this.onTouchStart, listenerOptions);
      this.element.removeEventListener("touchmove", this.onTouchMove, listenerOptions);
      this.element.removeEventListener("touchend", this.onTouchEnd, listenerOptions);
    }
    /**
    * Event handler for 'touchstart' event
    *
    * @param event Touch event
    */
    onTouchStart = (event) => {
      const { clientX, clientY } = event.targetTouches ? event.targetTouches[0] : event;
      this.touchStart.x = clientX;
      this.touchStart.y = clientY;
      this.lastDelta = {
        x: 0,
        y: 0
      };
      this.emitter.emit("scroll", {
        deltaX: 0,
        deltaY: 0,
        event
      });
    };
    /** Event handler for 'touchmove' event */
    onTouchMove = (event) => {
      const { clientX, clientY } = event.targetTouches ? event.targetTouches[0] : event;
      const deltaX = -(clientX - this.touchStart.x) * this.options.touchMultiplier;
      const deltaY = -(clientY - this.touchStart.y) * this.options.touchMultiplier;
      this.touchStart.x = clientX;
      this.touchStart.y = clientY;
      this.lastDelta = {
        x: deltaX,
        y: deltaY
      };
      this.emitter.emit("scroll", {
        deltaX,
        deltaY,
        event
      });
    };
    onTouchEnd = (event) => {
      this.emitter.emit("scroll", {
        deltaX: this.lastDelta.x,
        deltaY: this.lastDelta.y,
        event
      });
    };
    /** Event handler for 'wheel' event */
    onWheel = (event) => {
      let { deltaX, deltaY, deltaMode } = event;
      const multiplierX = getDeltaMultiplier(deltaMode, this.window.width);
      const multiplierY = getDeltaMultiplier(deltaMode, this.window.height);
      deltaX *= multiplierX;
      deltaY *= multiplierY;
      deltaX *= this.options.wheelMultiplier;
      deltaY *= this.options.wheelMultiplier;
      this.emitter.emit("scroll", {
        deltaX,
        deltaY,
        event
      });
    };
    onWindowResize = () => {
      this.window = {
        width: window.innerWidth,
        height: window.innerHeight
      };
    };
  };
  var defaultEasing = (t) => Math.min(1, 1.001 - 2 ** (-10 * t));
  var Lenis = class {
    _isScrolling = false;
    _isStopped = false;
    _isLocked = false;
    _preventNextNativeScrollEvent = false;
    _resetVelocityTimeout = null;
    _rafId = null;
    _isDraggingSelection = false;
    reducedMotionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    /**
    * Whether or not the user is touching the screen
    */
    isTouching;
    /**
    * Whether or not the device is running iOS
    */
    isIos;
    /**
    * The time in ms since the lenis instance was created
    */
    time = 0;
    /**
    * User data that will be forwarded through the scroll event
    *
    * @example
    * lenis.scrollTo(100, {
    *   userData: {
    *     foo: 'bar'
    *   }
    * })
    */
    userData = {};
    /**
    * The last velocity of the scroll
    */
    lastVelocity = 0;
    /**
    * The current velocity of the scroll
    */
    velocity = 0;
    /**
    * The direction of the scroll
    */
    direction = 0;
    /**
    * The options passed to the lenis instance
    */
    options;
    /**
    * The target scroll value
    */
    targetScroll;
    /**
    * The animated scroll value
    */
    animatedScroll;
    animate = new Animate();
    emitter = new Emitter();
    dimensions;
    virtualScroll;
    constructor({ wrapper = window, content = document.documentElement, eventsTarget = wrapper, smoothWheel = true, syncTouch = false, syncTouchLerp = 0.075, touchInertiaExponent = 1.7, duration, easing, lerp: lerp2 = 0.1, infinite = false, orientation = "vertical", gestureOrientation = orientation === "horizontal" ? "both" : "vertical", touchMultiplier = 1, wheelMultiplier = 1, autoResize = true, prevent, virtualScroll, overscroll = true, autoRaf = false, anchors = false, autoToggle = false, allowNestedScroll = false, __experimental__naiveDimensions = false, naiveDimensions = __experimental__naiveDimensions, stopInertiaOnNavigate = false, respectReducedMotion = true } = {}) {
      window.lenisVersion = version;
      if (!window.lenis) window.lenis = {};
      window.lenis.version = version;
      if (orientation === "horizontal") window.lenis.horizontal = true;
      if (syncTouch === true) window.lenis.touch = true;
      this.isIos = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
      if (!wrapper || wrapper === document.documentElement) wrapper = window;
      if (typeof duration === "number" && typeof easing !== "function") easing = defaultEasing;
      else if (typeof easing === "function" && typeof duration !== "number") duration = 1;
      this.options = {
        wrapper,
        content,
        eventsTarget,
        smoothWheel,
        syncTouch,
        syncTouchLerp,
        touchInertiaExponent,
        duration,
        easing,
        lerp: lerp2,
        infinite,
        gestureOrientation,
        orientation,
        touchMultiplier,
        wheelMultiplier,
        autoResize,
        prevent,
        virtualScroll,
        overscroll,
        autoRaf,
        anchors,
        autoToggle,
        allowNestedScroll,
        naiveDimensions,
        stopInertiaOnNavigate,
        respectReducedMotion
      };
      this.dimensions = new Dimensions(wrapper, content, { autoResize });
      this.updateClassName();
      this.targetScroll = this.animatedScroll = this.actualScroll;
      this.options.wrapper.addEventListener("scroll", this.onNativeScroll);
      this.options.wrapper.addEventListener("scrollend", this.onScrollEnd, { capture: true });
      if (this.options.anchors || this.options.stopInertiaOnNavigate) this.options.wrapper.addEventListener("click", this.onClick);
      this.options.wrapper.addEventListener("pointerdown", this.onPointerDown);
      this.virtualScroll = new VirtualScroll(eventsTarget, {
        touchMultiplier,
        wheelMultiplier
      });
      this.virtualScroll.on("scroll", this.onVirtualScroll);
      if (this.options.autoToggle) {
        this.checkOverflow();
        this.rootElement.addEventListener("transitionend", this.onTransitionEnd);
      }
      if (this.options.autoRaf) this._rafId = requestAnimationFrame(this.raf);
    }
    /**
    * Destroy the lenis instance, remove all event listeners and clean up the class name
    */
    destroy() {
      this.emitter.destroy();
      this.options.wrapper.removeEventListener("scroll", this.onNativeScroll);
      this.options.wrapper.removeEventListener("scrollend", this.onScrollEnd, { capture: true });
      this.options.wrapper.removeEventListener("pointerdown", this.onPointerDown);
      if (this.options.anchors || this.options.stopInertiaOnNavigate) this.options.wrapper.removeEventListener("click", this.onClick);
      this.virtualScroll.destroy();
      this.dimensions.destroy();
      this.cleanUpClassName();
      if (this._rafId) cancelAnimationFrame(this._rafId);
    }
    on(event, callback) {
      return this.emitter.on(event, callback);
    }
    off(event, callback) {
      return this.emitter.off(event, callback);
    }
    onScrollEnd = (e) => {
      if (!(e instanceof CustomEvent)) {
        if (this.isScrolling === "smooth" || this.isScrolling === false) e.stopPropagation();
      }
    };
    dispatchScrollendEvent = () => {
      this.options.wrapper.dispatchEvent(new CustomEvent("scrollend", {
        bubbles: this.options.wrapper === window,
        detail: { lenisScrollEnd: true }
      }));
    };
    get overflow() {
      const property = this.isHorizontal ? "overflow-x" : "overflow-y";
      return getComputedStyle(this.rootElement)[property];
    }
    checkOverflow() {
      if (["hidden", "clip"].includes(this.overflow)) this.internalStop();
      else this.internalStart();
    }
    onTransitionEnd = (event) => {
      if (event.propertyName?.includes("overflow") && event.target === this.rootElement) this.checkOverflow();
    };
    setScroll(scroll) {
      if (this.isHorizontal) this.options.wrapper.scrollTo({
        left: scroll,
        behavior: "instant"
      });
      else this.options.wrapper.scrollTo({
        top: scroll,
        behavior: "instant"
      });
    }
    onClick = (event) => {
      const linkElementsUrls = event.composedPath().filter((node) => node instanceof HTMLAnchorElement && node.href).map((element) => new URL(element.href));
      const currentUrl = new URL(window.location.href);
      if (this.options.anchors) {
        const anchorElementUrl = linkElementsUrls.find((targetUrl) => currentUrl.host === targetUrl.host && currentUrl.pathname === targetUrl.pathname && targetUrl.hash);
        if (anchorElementUrl) {
          const options = typeof this.options.anchors === "object" && this.options.anchors ? this.options.anchors : void 0;
          const target = decodeURIComponent(anchorElementUrl.hash);
          this.scrollTo(target, options);
          return;
        }
      }
      if (this.options.stopInertiaOnNavigate) {
        if (linkElementsUrls.some((targetUrl) => currentUrl.host === targetUrl.host && currentUrl.pathname !== targetUrl.pathname)) {
          this.reset();
          return;
        }
      }
    };
    onPointerDown = (event) => {
      if (event.button === 1) this.reset();
    };
    isTouchOnSelectionHandle(event) {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
      const touch = event.targetTouches[0] ?? event.changedTouches[0];
      if (!touch) return false;
      const rects = selection.getRangeAt(0).getClientRects();
      if (rects.length === 0) return false;
      const first = rects[0];
      const last = rects[rects.length - 1];
      const HANDLE_RADIUS = 40;
      const nearStart = Math.hypot(touch.clientX - first.left, touch.clientY - first.top) <= HANDLE_RADIUS;
      const nearEnd = Math.hypot(touch.clientX - last.right, touch.clientY - last.bottom) <= HANDLE_RADIUS;
      return nearStart || nearEnd;
    }
    onVirtualScroll = (data) => {
      if (typeof this.options.virtualScroll === "function" && this.options.virtualScroll(data) === false) return;
      const { deltaX, deltaY, event } = data;
      this.emitter.emit("virtual-scroll", {
        deltaX,
        deltaY,
        event
      });
      if (event.ctrlKey) return;
      if (event.lenisStopPropagation) return;
      const isTouch = event.type.includes("touch");
      const isWheel = event.type.includes("wheel");
      if (isTouch && this.isIos) {
        if (event.type === "touchstart") this._isDraggingSelection = this.isTouchOnSelectionHandle(event);
        if (this._isDraggingSelection) {
          if (event.type === "touchend") this._isDraggingSelection = false;
          return;
        }
      }
      this.isTouching = event.type === "touchstart" || event.type === "touchmove";
      const isClickOrTap = deltaX === 0 && deltaY === 0;
      if (this.options.syncTouch && isTouch && event.type === "touchstart" && isClickOrTap && !this.isStopped && !this.isLocked) {
        this.reset();
        return;
      }
      const isUnknownGesture = this.options.gestureOrientation === "vertical" && deltaY === 0 || this.options.gestureOrientation === "horizontal" && deltaX === 0;
      if (isClickOrTap || isUnknownGesture) return;
      let composedPath = event.composedPath();
      composedPath = composedPath.slice(0, composedPath.indexOf(this.rootElement));
      const prevent = this.options.prevent;
      const gestureOrientation = Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
      if (composedPath.find((node) => node instanceof HTMLElement && (typeof prevent === "function" && prevent?.(node) || node.hasAttribute?.("data-lenis-prevent") || gestureOrientation === "vertical" && node.hasAttribute?.("data-lenis-prevent-vertical") || gestureOrientation === "horizontal" && node.hasAttribute?.("data-lenis-prevent-horizontal") || isTouch && node.hasAttribute?.("data-lenis-prevent-touch") || isWheel && node.hasAttribute?.("data-lenis-prevent-wheel") || this.options.allowNestedScroll && this.hasNestedScroll(node, {
        deltaX,
        deltaY
      })))) return;
      if (this.isStopped || this.isLocked) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (!(this.options.syncTouch && isTouch || this.options.smoothWheel && isWheel)) {
        this.isScrolling = "native";
        this.animate.stop();
        event.lenisStopPropagation = true;
        return;
      }
      let delta = deltaY;
      if (this.options.gestureOrientation === "both") delta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
      else if (this.options.gestureOrientation === "horizontal") delta = deltaX;
      if (!this.options.overscroll || this.options.infinite || this.options.wrapper !== window && this.limit > 0 && (this.animatedScroll > 0 && this.animatedScroll < this.limit || this.animatedScroll === 0 && deltaY > 0 || this.animatedScroll === this.limit && deltaY < 0)) event.lenisStopPropagation = true;
      if (event.cancelable) event.preventDefault();
      const isSyncTouch = isTouch && this.options.syncTouch;
      const hasTouchInertia = isTouch && event.type === "touchend";
      if (hasTouchInertia) delta = Math.sign(delta) * Math.abs(this.velocity) ** this.options.touchInertiaExponent;
      this.scrollTo(this.targetScroll + delta, {
        programmatic: false,
        ...isSyncTouch ? { lerp: hasTouchInertia ? this.options.syncTouchLerp : 1 } : {
          lerp: this.options.lerp,
          duration: this.options.duration,
          easing: this.options.easing
        }
      });
    };
    /**
    * Force lenis to recalculate the dimensions
    */
    resize() {
      this.dimensions.resize();
      this.animatedScroll = this.targetScroll = this.actualScroll;
      this.emit();
    }
    emit() {
      this.emitter.emit("scroll", this);
    }
    onNativeScroll = () => {
      if (this._resetVelocityTimeout !== null) {
        clearTimeout(this._resetVelocityTimeout);
        this._resetVelocityTimeout = null;
      }
      if (this._preventNextNativeScrollEvent) {
        this._preventNextNativeScrollEvent = false;
        return;
      }
      if (this.isScrolling === false || this.isScrolling === "native") {
        const lastScroll = this.animatedScroll;
        this.animatedScroll = this.targetScroll = this.actualScroll;
        this.lastVelocity = this.velocity;
        this.velocity = this.animatedScroll - lastScroll;
        this.direction = Math.sign(this.animatedScroll - lastScroll);
        if (!this.isStopped) this.isScrolling = "native";
        this.emit();
        if (this.velocity !== 0) this._resetVelocityTimeout = setTimeout(() => {
          this.lastVelocity = this.velocity;
          this.velocity = 0;
          this.isScrolling = false;
          this.emit();
        }, 400);
      }
    };
    reset() {
      this.isLocked = false;
      this.isScrolling = false;
      this.animatedScroll = this.targetScroll = this.actualScroll;
      this.lastVelocity = this.velocity = 0;
      this.animate.stop();
    }
    /**
    * Start lenis scroll after it has been stopped
    */
    start() {
      if (!this.isStopped) return;
      if (this.options.autoToggle) {
        this.rootElement.style.removeProperty("overflow");
        return;
      }
      this.internalStart();
    }
    internalStart() {
      if (!this.isStopped) return;
      this.reset();
      this.isStopped = false;
      this.emit();
    }
    /**
    * Stop lenis scroll
    */
    stop() {
      if (this.isStopped) return;
      if (this.options.autoToggle) {
        this.rootElement.style.setProperty("overflow", "clip");
        return;
      }
      this.internalStop();
    }
    internalStop() {
      if (this.isStopped) return;
      this.reset();
      this.isStopped = true;
      this.emit();
    }
    /**
    * RequestAnimationFrame for lenis
    *
    * @param time The time in ms from an external clock like `requestAnimationFrame` or Tempus
    */
    raf = (time) => {
      const deltaTime = time - (this.time || time);
      this.time = time;
      this.animate.advance(deltaTime * 1e-3);
      if (this.options.autoRaf) this._rafId = requestAnimationFrame(this.raf);
    };
    /**
    * Scroll to a target value
    *
    * @param target The target value to scroll to
    * @param options The options for the scroll
    *
    * @example
    * lenis.scrollTo(100, {
    *   offset: 100,
    *   duration: 1,
    *   easing: (t) => 1 - Math.cos((t * Math.PI) / 2),
    *   lerp: 0.1,
    *   onStart: () => {
    *     console.log('onStart')
    *   },
    *   onComplete: () => {
    *     console.log('onComplete')
    *   },
    * })
    */
    scrollTo(_target, { offset = 0, immediate = false, lock = false, programmatic = true, lerp: lerp2 = programmatic ? this.options.lerp : void 0, duration = programmatic ? this.options.duration : void 0, easing = programmatic ? this.options.easing : void 0, onStart, onComplete, force = false, userData } = {}) {
      if (this.prefersReducedMotion) if (programmatic) immediate = true;
      else {
        lerp2 = 1;
        duration = void 0;
        easing = void 0;
      }
      if ((this.isStopped || this.isLocked) && !force) return;
      let target = _target;
      let adjustedOffset = offset;
      if (typeof target === "string" && [
        "top",
        "left",
        "start",
        "#"
      ].includes(target)) target = 0;
      else if (typeof target === "string" && [
        "bottom",
        "right",
        "end"
      ].includes(target)) target = this.limit;
      else {
        let node = null;
        if (typeof target === "string") {
          node = target.startsWith("#") ? document.getElementById(target.slice(1)) : document.querySelector(target);
          if (!node) if (target === "#top") target = 0;
          else console.warn("Lenis: Target not found", target);
        } else if (target instanceof HTMLElement && target?.nodeType) node = target;
        if (node) {
          if (this.options.wrapper !== window) {
            const wrapperRect = this.rootElement.getBoundingClientRect();
            adjustedOffset -= this.isHorizontal ? wrapperRect.left : wrapperRect.top;
          }
          const rect = node.getBoundingClientRect();
          const targetStyle = getComputedStyle(node);
          const scrollMargin = this.isHorizontal ? Number.parseFloat(targetStyle.scrollMarginLeft) : Number.parseFloat(targetStyle.scrollMarginTop);
          const containerStyle = getComputedStyle(this.rootElement);
          const scrollPadding = this.isHorizontal ? Number.parseFloat(containerStyle.scrollPaddingLeft) : Number.parseFloat(containerStyle.scrollPaddingTop);
          target = (this.isHorizontal ? rect.left : rect.top) + this.animatedScroll - (Number.isNaN(scrollMargin) ? 0 : scrollMargin) - (Number.isNaN(scrollPadding) ? 0 : scrollPadding);
        }
      }
      if (typeof target !== "number") return;
      target += adjustedOffset;
      if (this.options.infinite) {
        if (programmatic) {
          this.targetScroll = this.animatedScroll = this.scroll;
          const distance = target - this.animatedScroll;
          if (distance > this.limit / 2) target -= this.limit;
          else if (distance < -this.limit / 2) target += this.limit;
        }
      } else target = clamp(0, target, this.limit);
      if (target === this.targetScroll) {
        onStart?.(this);
        onComplete?.(this);
        return;
      }
      this.userData = userData ?? {};
      if (immediate) {
        this.animatedScroll = this.targetScroll = target;
        this.setScroll(this.scroll);
        this.reset();
        this.preventNextNativeScrollEvent();
        this.emit();
        onComplete?.(this);
        this.userData = {};
        requestAnimationFrame(() => {
          this.dispatchScrollendEvent();
        });
        return;
      }
      if (!programmatic) this.targetScroll = target;
      if (typeof duration === "number" && typeof easing !== "function") easing = defaultEasing;
      else if (typeof easing === "function" && typeof duration !== "number") duration = 1;
      this.animate.fromTo(this.animatedScroll, target, {
        duration,
        easing,
        lerp: lerp2,
        onStart: () => {
          if (lock) this.isLocked = true;
          this.isScrolling = "smooth";
          onStart?.(this);
        },
        onUpdate: (value, completed) => {
          this.isScrolling = "smooth";
          this.lastVelocity = this.velocity;
          this.velocity = value - this.animatedScroll;
          this.direction = Math.sign(this.velocity);
          this.animatedScroll = value;
          this.setScroll(this.scroll);
          if (programmatic) this.targetScroll = value;
          if (!completed) this.emit();
          if (completed) {
            this.reset();
            this.emit();
            onComplete?.(this);
            this.userData = {};
            requestAnimationFrame(() => {
              this.dispatchScrollendEvent();
            });
            this.preventNextNativeScrollEvent();
          }
        }
      });
    }
    preventNextNativeScrollEvent() {
      this._preventNextNativeScrollEvent = true;
      requestAnimationFrame(() => {
        this._preventNextNativeScrollEvent = false;
      });
    }
    hasNestedScroll(node, { deltaX, deltaY }) {
      const time = Date.now();
      if (!node._lenis) node._lenis = {};
      const cache2 = node._lenis;
      let hasOverflowX;
      let hasOverflowY;
      let isScrollableX;
      let isScrollableY;
      let hasOverscrollBehaviorX;
      let hasOverscrollBehaviorY;
      let scrollWidth;
      let scrollHeight;
      let clientWidth;
      let clientHeight;
      if (time - (cache2.time ?? 0) > 2e3) {
        cache2.time = Date.now();
        const computedStyle = window.getComputedStyle(node);
        cache2.computedStyle = computedStyle;
        hasOverflowX = [
          "auto",
          "overlay",
          "scroll"
        ].includes(computedStyle.overflowX);
        hasOverflowY = [
          "auto",
          "overlay",
          "scroll"
        ].includes(computedStyle.overflowY);
        hasOverscrollBehaviorX = ["auto"].includes(computedStyle.overscrollBehaviorX);
        hasOverscrollBehaviorY = ["auto"].includes(computedStyle.overscrollBehaviorY);
        cache2.hasOverflowX = hasOverflowX;
        cache2.hasOverflowY = hasOverflowY;
        if (!(hasOverflowX || hasOverflowY)) return false;
        scrollWidth = node.scrollWidth;
        scrollHeight = node.scrollHeight;
        clientWidth = node.clientWidth;
        clientHeight = node.clientHeight;
        isScrollableX = scrollWidth > clientWidth;
        isScrollableY = scrollHeight > clientHeight;
        cache2.isScrollableX = isScrollableX;
        cache2.isScrollableY = isScrollableY;
        cache2.scrollWidth = scrollWidth;
        cache2.scrollHeight = scrollHeight;
        cache2.clientWidth = clientWidth;
        cache2.clientHeight = clientHeight;
        cache2.hasOverscrollBehaviorX = hasOverscrollBehaviorX;
        cache2.hasOverscrollBehaviorY = hasOverscrollBehaviorY;
      } else {
        isScrollableX = cache2.isScrollableX;
        isScrollableY = cache2.isScrollableY;
        hasOverflowX = cache2.hasOverflowX;
        hasOverflowY = cache2.hasOverflowY;
        scrollWidth = cache2.scrollWidth;
        scrollHeight = cache2.scrollHeight;
        clientWidth = cache2.clientWidth;
        clientHeight = cache2.clientHeight;
        hasOverscrollBehaviorX = cache2.hasOverscrollBehaviorX;
        hasOverscrollBehaviorY = cache2.hasOverscrollBehaviorY;
      }
      if (!(hasOverflowX && isScrollableX || hasOverflowY && isScrollableY)) return false;
      const orientation = Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
      let scroll;
      let maxScroll;
      let delta;
      let hasOverflow;
      let isScrollable;
      let hasOverscrollBehavior;
      if (orientation === "horizontal") {
        scroll = Math.round(node.scrollLeft);
        maxScroll = scrollWidth - clientWidth;
        delta = deltaX;
        hasOverflow = hasOverflowX;
        isScrollable = isScrollableX;
        hasOverscrollBehavior = hasOverscrollBehaviorX;
      } else if (orientation === "vertical") {
        scroll = Math.round(node.scrollTop);
        maxScroll = scrollHeight - clientHeight;
        delta = deltaY;
        hasOverflow = hasOverflowY;
        isScrollable = isScrollableY;
        hasOverscrollBehavior = hasOverscrollBehaviorY;
      } else return false;
      if (!hasOverscrollBehavior && (scroll >= maxScroll || scroll <= 0)) return true;
      return (delta > 0 ? scroll < maxScroll : scroll > 0) && hasOverflow && isScrollable;
    }
    /**
    * The root element on which lenis is instanced
    */
    get rootElement() {
      return this.options.wrapper === window ? document.documentElement : this.options.wrapper;
    }
    /**
    * The limit which is the maximum scroll value
    */
    get limit() {
      if (this.options.naiveDimensions) {
        if (this.isHorizontal) return this.rootElement.scrollWidth - this.rootElement.clientWidth;
        return this.rootElement.scrollHeight - this.rootElement.clientHeight;
      }
      return this.dimensions.limit[this.isHorizontal ? "x" : "y"];
    }
    /**
    * Whether or not the scroll is horizontal
    */
    get isHorizontal() {
      return this.options.orientation === "horizontal";
    }
    /**
    * The actual scroll value
    */
    get actualScroll() {
      const wrapper = this.options.wrapper;
      return this.isHorizontal ? wrapper.scrollX ?? wrapper.scrollLeft : wrapper.scrollY ?? wrapper.scrollTop;
    }
    /**
    * The current scroll value
    */
    get scroll() {
      return this.options.infinite ? modulo(this.animatedScroll, this.limit) : this.animatedScroll;
    }
    /**
    * The progress of the scroll relative to the limit
    */
    get progress() {
      return this.limit === 0 ? 1 : this.scroll / this.limit;
    }
    /**
    * Current scroll state
    */
    get isScrolling() {
      return this._isScrolling;
    }
    set isScrolling(value) {
      if (this._isScrolling !== value) {
        this._isScrolling = value;
        this.updateClassName();
      }
    }
    /**
    * Check if lenis is stopped
    */
    get isStopped() {
      return this._isStopped;
    }
    set isStopped(value) {
      if (this._isStopped !== value) {
        this._isStopped = value;
        this.updateClassName();
      }
    }
    /**
    * Check if lenis is locked
    */
    get isLocked() {
      return this._isLocked;
    }
    set isLocked(value) {
      if (this._isLocked !== value) {
        this._isLocked = value;
        this.updateClassName();
      }
    }
    /**
    * Check if lenis is smooth scrolling
    */
    get isSmooth() {
      return this.isScrolling === "smooth";
    }
    /**
    * Whether the user prefers reduced motion and lenis is honoring it (see `respectReducedMotion` option)
    */
    get prefersReducedMotion() {
      return this.options.respectReducedMotion && this.reducedMotionMediaQuery.matches;
    }
    /**
    * The class name applied to the wrapper element
    */
    get className() {
      let className = "lenis";
      if (this.options.autoToggle) className += " lenis-autoToggle";
      if (this.isStopped) className += " lenis-stopped";
      if (this.isLocked) className += " lenis-locked";
      if (this.isScrolling) className += " lenis-scrolling";
      if (this.isScrolling === "smooth") className += " lenis-smooth";
      return className;
    }
    updateClassName() {
      this.cleanUpClassName();
      this.className.split(" ").forEach((className) => {
        this.rootElement.classList.add(className);
      });
    }
    cleanUpClassName() {
      for (const className of Array.from(this.rootElement.classList)) if (className === "lenis" || className.startsWith("lenis-")) this.rootElement.classList.remove(className);
    }
  };

  // vendor/liquidglass/index.js
  var DEFAULTS = {
    blurAmount: 0,
    refraction: 0.69,
    chromAberration: 0.05,
    edgeHighlight: 0.05,
    specular: 0,
    fresnel: 1,
    distortion: 0,
    cornerRadius: 65,
    zRadius: 40,
    opacity: 1,
    saturation: 0,
    tintStrength: 0,
    brightness: 0,
    shadowOpacity: 0.3,
    shadowSpread: 10,
    shadowOffsetY: 1,
    pointerX: 0,
    pointerY: 0,
    pointerActive: 0,
    pointerRadius: 180,
    pointerStrength: 0.65,
    pointerVelocityX: 0,
    pointerVelocityY: 0,
    floating: false,
    button: false,
    bevelMode: 0
  };
  var BLUR_ITERATIONS = 6;
  var SHADOW_PAD = 20;
  var GLASS_RENDER_BUDGET = 1;
  var SCROLL_IDLE_DELAY = 120;
  var SCROLL_RENDER_INTERVAL = 16;
  var glassRenderBudgetFrame = -1;
  var glassRenderBudgetUsed = 0;
  function claimGlassRenderBudget() {
    const frame = Math.floor(performance.now() / 16.667);
    if (frame !== glassRenderBudgetFrame) {
      glassRenderBudgetFrame = frame;
      glassRenderBudgetUsed = 0;
    }
    if (glassRenderBudgetUsed >= GLASS_RENDER_BUDGET) return false;
    glassRenderBudgetUsed += 1;
    return true;
  }
  function resolveUrl(url, baseUrl) {
    if (url.match(/^[a-z]+:\/\//i)) {
      return url;
    }
    if (url.match(/^\/\//)) {
      return window.location.protocol + url;
    }
    if (url.match(/^[a-z]+:/i)) {
      return url;
    }
    const doc = document.implementation.createHTMLDocument();
    const base = doc.createElement("base");
    const a = doc.createElement("a");
    doc.head.appendChild(base);
    doc.body.appendChild(a);
    if (baseUrl) {
      base.href = baseUrl;
    }
    a.href = url;
    return a.href;
  }
  var uuid = /* @__PURE__ */ (() => {
    let counter = 0;
    const random = () => (
      // eslint-disable-next-line no-bitwise
      `0000${(Math.random() * 36 ** 4 << 0).toString(36)}`.slice(-4)
    );
    return () => {
      counter += 1;
      return `u${random()}${counter}`;
    };
  })();
  function toArray(arrayLike) {
    const arr = [];
    for (let i = 0, l = arrayLike.length; i < l; i++) {
      arr.push(arrayLike[i]);
    }
    return arr;
  }
  var styleProps = null;
  function getStyleProperties(options = {}) {
    if (styleProps) {
      return styleProps;
    }
    if (options.includeStyleProperties) {
      styleProps = options.includeStyleProperties;
      return styleProps;
    }
    styleProps = toArray(window.getComputedStyle(document.documentElement));
    return styleProps;
  }
  function px(node, styleProperty) {
    const win = node.ownerDocument.defaultView || window;
    const val = win.getComputedStyle(node).getPropertyValue(styleProperty);
    return val ? parseFloat(val.replace("px", "")) : 0;
  }
  function getNodeWidth(node) {
    const leftBorder = px(node, "border-left-width");
    const rightBorder = px(node, "border-right-width");
    return node.clientWidth + leftBorder + rightBorder;
  }
  function getNodeHeight(node) {
    const topBorder = px(node, "border-top-width");
    const bottomBorder = px(node, "border-bottom-width");
    return node.clientHeight + topBorder + bottomBorder;
  }
  function getImageSize(targetNode, options = {}) {
    const width = options.width || getNodeWidth(targetNode);
    const height = options.height || getNodeHeight(targetNode);
    return { width, height };
  }
  function getPixelRatio() {
    let ratio;
    let FINAL_PROCESS;
    try {
      FINAL_PROCESS = process;
    } catch (e) {
    }
    const val = FINAL_PROCESS && FINAL_PROCESS.env ? FINAL_PROCESS.env.devicePixelRatio : null;
    if (val) {
      ratio = parseInt(val, 10);
      if (Number.isNaN(ratio)) {
        ratio = 1;
      }
    }
    return ratio || window.devicePixelRatio || 1;
  }
  var canvasDimensionLimit = 16384;
  function checkCanvasDimensions(canvas) {
    if (canvas.width > canvasDimensionLimit || canvas.height > canvasDimensionLimit) {
      if (canvas.width > canvasDimensionLimit && canvas.height > canvasDimensionLimit) {
        if (canvas.width > canvas.height) {
          canvas.height *= canvasDimensionLimit / canvas.width;
          canvas.width = canvasDimensionLimit;
        } else {
          canvas.width *= canvasDimensionLimit / canvas.height;
          canvas.height = canvasDimensionLimit;
        }
      } else if (canvas.width > canvasDimensionLimit) {
        canvas.height *= canvasDimensionLimit / canvas.width;
        canvas.width = canvasDimensionLimit;
      } else {
        canvas.width *= canvasDimensionLimit / canvas.height;
        canvas.height = canvasDimensionLimit;
      }
    }
  }
  function createImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        img.decode().then(() => {
          requestAnimationFrame(() => resolve(img));
        });
      };
      img.onerror = reject;
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.src = url;
    });
  }
  async function svgToDataURL(svg) {
    return Promise.resolve().then(() => new XMLSerializer().serializeToString(svg)).then(encodeURIComponent).then((html) => `data:image/svg+xml;charset=utf-8,${html}`);
  }
  async function nodeToDataURL(node, width, height) {
    const xmlns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(xmlns, "svg");
    const foreignObject = document.createElementNS(xmlns, "foreignObject");
    svg.setAttribute("width", `${width}`);
    svg.setAttribute("height", `${height}`);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    foreignObject.setAttribute("x", "0");
    foreignObject.setAttribute("y", "0");
    foreignObject.setAttribute("externalResourcesRequired", "true");
    svg.appendChild(foreignObject);
    foreignObject.appendChild(node);
    return svgToDataURL(svg);
  }
  var isInstanceOfElement = (node, instance) => {
    if (node instanceof instance)
      return true;
    const nodePrototype = Object.getPrototypeOf(node);
    if (nodePrototype === null)
      return false;
    return nodePrototype.constructor.name === instance.name || isInstanceOfElement(nodePrototype, instance);
  };
  function formatCSSText(style) {
    const content = style.getPropertyValue("content");
    return `${style.cssText} content: '${content.replace(/'|"/g, "")}';`;
  }
  function formatCSSProperties(style, options) {
    return getStyleProperties(options).map((name) => {
      const value = style.getPropertyValue(name);
      const priority = style.getPropertyPriority(name);
      return `${name}: ${value}${priority ? " !important" : ""};`;
    }).join(" ");
  }
  function getPseudoElementStyle(className, pseudo, style, options) {
    const selector = `.${className}:${pseudo}`;
    const cssText = style.cssText ? formatCSSText(style) : formatCSSProperties(style, options);
    return document.createTextNode(`${selector}{${cssText}}`);
  }
  function clonePseudoElement(nativeNode, clonedNode, pseudo, options) {
    const style = window.getComputedStyle(nativeNode, pseudo);
    const content = style.getPropertyValue("content");
    if (content === "" || content === "none") {
      return;
    }
    const className = uuid();
    try {
      clonedNode.className = `${clonedNode.className} ${className}`;
    } catch (err) {
      return;
    }
    const styleElement = document.createElement("style");
    styleElement.appendChild(getPseudoElementStyle(className, pseudo, style, options));
    clonedNode.appendChild(styleElement);
  }
  function clonePseudoElements(nativeNode, clonedNode, options) {
    clonePseudoElement(nativeNode, clonedNode, ":before", options);
    clonePseudoElement(nativeNode, clonedNode, ":after", options);
  }
  var WOFF = "application/font-woff";
  var JPEG = "image/jpeg";
  var mimes = {
    woff: WOFF,
    woff2: WOFF,
    ttf: "application/font-truetype",
    eot: "application/vnd.ms-fontobject",
    png: "image/png",
    jpg: JPEG,
    jpeg: JPEG,
    gif: "image/gif",
    tiff: "image/tiff",
    svg: "image/svg+xml",
    webp: "image/webp"
  };
  function getExtension(url) {
    const match = /\.([^./]*?)$/g.exec(url);
    return match ? match[1] : "";
  }
  function getMimeType(url) {
    const extension = getExtension(url).toLowerCase();
    return mimes[extension] || "";
  }
  function getContentFromDataUrl(dataURL) {
    return dataURL.split(/,/)[1];
  }
  function isDataUrl(url) {
    return url.search(/^(data:)/) !== -1;
  }
  function makeDataUrl(content, mimeType) {
    return `data:${mimeType};base64,${content}`;
  }
  async function fetchAsDataURL(url, init, process2) {
    const res = await fetch(url, init);
    if (res.status === 404) {
      throw new Error(`Resource "${res.url}" not found`);
    }
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onloadend = () => {
        try {
          resolve(process2({ res, result: reader.result }));
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(blob);
    });
  }
  var cache = {};
  function getCacheKey(url, contentType, includeQueryParams) {
    let key = url.replace(/\?.*/, "");
    if (includeQueryParams) {
      key = url;
    }
    if (/ttf|otf|eot|woff2?/i.test(key)) {
      key = key.replace(/.*\//, "");
    }
    return contentType ? `[${contentType}]${key}` : key;
  }
  async function resourceToDataURL(resourceUrl, contentType, options) {
    const cacheKey = getCacheKey(resourceUrl, contentType, options.includeQueryParams);
    if (cache[cacheKey] != null) {
      return cache[cacheKey];
    }
    if (options.cacheBust) {
      resourceUrl += (/\?/.test(resourceUrl) ? "&" : "?") + (/* @__PURE__ */ new Date()).getTime();
    }
    let dataURL;
    try {
      const content = await fetchAsDataURL(resourceUrl, options.fetchRequestInit, ({ res, result }) => {
        if (!contentType) {
          contentType = res.headers.get("Content-Type") || "";
        }
        return getContentFromDataUrl(result);
      });
      dataURL = makeDataUrl(content, contentType);
    } catch (error) {
      dataURL = options.imagePlaceholder || "";
      let msg = `Failed to fetch resource: ${resourceUrl}`;
      if (error) {
        msg = typeof error === "string" ? error : error.message;
      }
      if (msg) {
        console.warn(msg);
      }
    }
    cache[cacheKey] = dataURL;
    return dataURL;
  }
  async function cloneCanvasElement(canvas) {
    const dataURL = canvas.toDataURL();
    if (dataURL === "data:,") {
      return canvas.cloneNode(false);
    }
    return createImage(dataURL);
  }
  async function cloneVideoElement(video, options) {
    if (video.currentSrc) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      ctx === null || ctx === void 0 ? void 0 : ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataURL2 = canvas.toDataURL();
      return createImage(dataURL2);
    }
    const poster = video.poster;
    const contentType = getMimeType(poster);
    const dataURL = await resourceToDataURL(poster, contentType, options);
    return createImage(dataURL);
  }
  async function cloneIFrameElement(iframe, options) {
    var _a;
    try {
      if ((_a = iframe === null || iframe === void 0 ? void 0 : iframe.contentDocument) === null || _a === void 0 ? void 0 : _a.body) {
        return await cloneNode(iframe.contentDocument.body, options, true);
      }
    } catch (_b) {
    }
    return iframe.cloneNode(false);
  }
  async function cloneSingleNode(node, options) {
    if (isInstanceOfElement(node, HTMLCanvasElement)) {
      return cloneCanvasElement(node);
    }
    if (isInstanceOfElement(node, HTMLVideoElement)) {
      return cloneVideoElement(node, options);
    }
    if (isInstanceOfElement(node, HTMLIFrameElement)) {
      return cloneIFrameElement(node, options);
    }
    return node.cloneNode(isSVGElement(node));
  }
  var isSlotElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SLOT";
  var isSVGElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SVG";
  async function cloneChildren(nativeNode, clonedNode, options) {
    var _a, _b;
    if (isSVGElement(clonedNode)) {
      return clonedNode;
    }
    let children = [];
    if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
      children = toArray(nativeNode.assignedNodes());
    } else if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && ((_a = nativeNode.contentDocument) === null || _a === void 0 ? void 0 : _a.body)) {
      children = toArray(nativeNode.contentDocument.body.childNodes);
    } else {
      children = toArray(((_b = nativeNode.shadowRoot) !== null && _b !== void 0 ? _b : nativeNode).childNodes);
    }
    if (children.length === 0 || isInstanceOfElement(nativeNode, HTMLVideoElement)) {
      return clonedNode;
    }
    await children.reduce((deferred, child) => deferred.then(() => cloneNode(child, options)).then((clonedChild) => {
      if (clonedChild) {
        clonedNode.appendChild(clonedChild);
      }
    }), Promise.resolve());
    return clonedNode;
  }
  function cloneCSSStyle(nativeNode, clonedNode, options) {
    const targetStyle = clonedNode.style;
    if (!targetStyle) {
      return;
    }
    const sourceStyle = window.getComputedStyle(nativeNode);
    if (sourceStyle.cssText) {
      targetStyle.cssText = sourceStyle.cssText;
      targetStyle.transformOrigin = sourceStyle.transformOrigin;
    } else {
      getStyleProperties(options).forEach((name) => {
        let value = sourceStyle.getPropertyValue(name);
        if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && name === "display" && value === "inline") {
          value = "block";
        }
        if (name === "d" && clonedNode.getAttribute("d")) {
          value = `path(${clonedNode.getAttribute("d")})`;
        }
        targetStyle.setProperty(name, value, sourceStyle.getPropertyPriority(name));
      });
    }
  }
  function cloneInputValue(nativeNode, clonedNode) {
    if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
      clonedNode.innerHTML = nativeNode.value;
    }
    if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
      clonedNode.setAttribute("value", nativeNode.value);
    }
  }
  function cloneSelectValue(nativeNode, clonedNode) {
    if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
      const clonedSelect = clonedNode;
      const selectedOption = Array.from(clonedSelect.children).find((child) => nativeNode.value === child.getAttribute("value"));
      if (selectedOption) {
        selectedOption.setAttribute("selected", "");
      }
    }
  }
  function decorate(nativeNode, clonedNode, options) {
    if (isInstanceOfElement(clonedNode, Element)) {
      cloneCSSStyle(nativeNode, clonedNode, options);
      clonePseudoElements(nativeNode, clonedNode, options);
      cloneInputValue(nativeNode, clonedNode);
      cloneSelectValue(nativeNode, clonedNode);
    }
    return clonedNode;
  }
  async function ensureSVGSymbols(clone, options) {
    const uses = clone.querySelectorAll ? clone.querySelectorAll("use") : [];
    if (uses.length === 0) {
      return clone;
    }
    const processedDefs = {};
    for (let i = 0; i < uses.length; i++) {
      const use = uses[i];
      const id = use.getAttribute("xlink:href");
      if (id) {
        const exist = clone.querySelector(id);
        const definition = document.querySelector(id);
        if (!exist && definition && !processedDefs[id]) {
          processedDefs[id] = await cloneNode(definition, options, true);
        }
      }
    }
    const nodes = Object.values(processedDefs);
    if (nodes.length) {
      const ns = "http://www.w3.org/1999/xhtml";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("xmlns", ns);
      svg.style.position = "absolute";
      svg.style.width = "0";
      svg.style.height = "0";
      svg.style.overflow = "hidden";
      svg.style.display = "none";
      const defs = document.createElementNS(ns, "defs");
      svg.appendChild(defs);
      for (let i = 0; i < nodes.length; i++) {
        defs.appendChild(nodes[i]);
      }
      clone.appendChild(svg);
    }
    return clone;
  }
  async function cloneNode(node, options, isRoot) {
    if (!isRoot && options.filter && !options.filter(node)) {
      return null;
    }
    return Promise.resolve(node).then((clonedNode) => cloneSingleNode(clonedNode, options)).then((clonedNode) => cloneChildren(node, clonedNode, options)).then((clonedNode) => decorate(node, clonedNode, options)).then((clonedNode) => ensureSVGSymbols(clonedNode, options));
  }
  var URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
  var URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
  var FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;
  function toRegex(url) {
    const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, "g");
  }
  function parseURLs(cssText) {
    const urls = [];
    cssText.replace(URL_REGEX, (raw, quotation, url) => {
      urls.push(url);
      return raw;
    });
    return urls.filter((url) => !isDataUrl(url));
  }
  async function embed(cssText, resourceURL, baseURL, options, getContentFromUrl) {
    try {
      const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL;
      const contentType = getMimeType(resourceURL);
      let dataURL;
      if (getContentFromUrl) {
        const content = await getContentFromUrl(resolvedURL);
        dataURL = makeDataUrl(content, contentType);
      } else {
        dataURL = await resourceToDataURL(resolvedURL, contentType, options);
      }
      return cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`);
    } catch (error) {
    }
    return cssText;
  }
  function filterPreferredFontFormat(str, { preferredFontFormat }) {
    return !preferredFontFormat ? str : str.replace(FONT_SRC_REGEX, (match) => {
      while (true) {
        const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || [];
        if (!format) {
          return "";
        }
        if (format === preferredFontFormat) {
          return `src: ${src};`;
        }
      }
    });
  }
  function shouldEmbed(url) {
    return url.search(URL_REGEX) !== -1;
  }
  async function embedResources(cssText, baseUrl, options) {
    if (!shouldEmbed(cssText)) {
      return cssText;
    }
    const filteredCSSText = filterPreferredFontFormat(cssText, options);
    const urls = parseURLs(filteredCSSText);
    return urls.reduce((deferred, url) => deferred.then((css) => embed(css, url, baseUrl, options)), Promise.resolve(filteredCSSText));
  }
  async function embedProp(propName, node, options) {
    var _a;
    const propValue = (_a = node.style) === null || _a === void 0 ? void 0 : _a.getPropertyValue(propName);
    if (propValue) {
      const cssString = await embedResources(propValue, null, options);
      node.style.setProperty(propName, cssString, node.style.getPropertyPriority(propName));
      return true;
    }
    return false;
  }
  async function embedBackground(clonedNode, options) {
    ;
    await embedProp("background", clonedNode, options) || await embedProp("background-image", clonedNode, options);
    await embedProp("mask", clonedNode, options) || await embedProp("-webkit-mask", clonedNode, options) || await embedProp("mask-image", clonedNode, options) || await embedProp("-webkit-mask-image", clonedNode, options);
  }
  async function embedImageNode(clonedNode, options) {
    const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement);
    if (!(isImageElement && !isDataUrl(clonedNode.src)) && !(isInstanceOfElement(clonedNode, SVGImageElement) && !isDataUrl(clonedNode.href.baseVal))) {
      return;
    }
    const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal;
    const dataURL = await resourceToDataURL(url, getMimeType(url), options);
    await new Promise((resolve, reject) => {
      clonedNode.onload = resolve;
      clonedNode.onerror = options.onImageErrorHandler ? (...attributes) => {
        try {
          resolve(options.onImageErrorHandler(...attributes));
        } catch (error) {
          reject(error);
        }
      } : reject;
      const image = clonedNode;
      if (image.decode) {
        image.decode = resolve;
      }
      if (image.loading === "lazy") {
        image.loading = "eager";
      }
      if (isImageElement) {
        clonedNode.srcset = "";
        clonedNode.src = dataURL;
      } else {
        clonedNode.href.baseVal = dataURL;
      }
    });
  }
  async function embedChildren(clonedNode, options) {
    const children = toArray(clonedNode.childNodes);
    const deferreds = children.map((child) => embedImages(child, options));
    await Promise.all(deferreds).then(() => clonedNode);
  }
  async function embedImages(clonedNode, options) {
    if (isInstanceOfElement(clonedNode, Element)) {
      await embedBackground(clonedNode, options);
      await embedImageNode(clonedNode, options);
      await embedChildren(clonedNode, options);
    }
  }
  function applyStyle(node, options) {
    const { style } = node;
    if (options.backgroundColor) {
      style.backgroundColor = options.backgroundColor;
    }
    if (options.width) {
      style.width = `${options.width}px`;
    }
    if (options.height) {
      style.height = `${options.height}px`;
    }
    const manual = options.style;
    if (manual != null) {
      Object.keys(manual).forEach((key) => {
        style[key] = manual[key];
      });
    }
    return node;
  }
  var cssFetchCache = {};
  async function fetchCSS(url) {
    let cache2 = cssFetchCache[url];
    if (cache2 != null) {
      return cache2;
    }
    const res = await fetch(url);
    const cssText = await res.text();
    cache2 = { url, cssText };
    cssFetchCache[url] = cache2;
    return cache2;
  }
  async function embedFonts(data, options) {
    let cssText = data.cssText;
    const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
    const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
    const loadFonts = fontLocs.map(async (loc) => {
      let url = loc.replace(regexUrl, "$1");
      if (!url.startsWith("https://")) {
        url = new URL(url, data.url).href;
      }
      return fetchAsDataURL(url, options.fetchRequestInit, ({ result }) => {
        cssText = cssText.replace(loc, `url(${result})`);
        return [loc, result];
      });
    });
    return Promise.all(loadFonts).then(() => cssText);
  }
  function parseCSS(source) {
    if (source == null) {
      return [];
    }
    const result = [];
    const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
    let cssText = source.replace(commentsRegex, "");
    const keyframesRegex = new RegExp("((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})", "gi");
    while (true) {
      const matches = keyframesRegex.exec(cssText);
      if (matches === null) {
        break;
      }
      result.push(matches[0]);
    }
    cssText = cssText.replace(keyframesRegex, "");
    const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
    const combinedCSSRegex = "((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})";
    const unifiedRegex = new RegExp(combinedCSSRegex, "gi");
    while (true) {
      let matches = importRegex.exec(cssText);
      if (matches === null) {
        matches = unifiedRegex.exec(cssText);
        if (matches === null) {
          break;
        } else {
          importRegex.lastIndex = unifiedRegex.lastIndex;
        }
      } else {
        unifiedRegex.lastIndex = importRegex.lastIndex;
      }
      result.push(matches[0]);
    }
    return result;
  }
  async function getCSSRules(styleSheets, options) {
    const ret = [];
    const deferreds = [];
    styleSheets.forEach((sheet) => {
      if ("cssRules" in sheet) {
        try {
          toArray(sheet.cssRules || []).forEach((item, index) => {
            if (item.type === CSSRule.IMPORT_RULE) {
              let importIndex = index + 1;
              const url = item.href;
              const deferred = fetchCSS(url).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
                try {
                  sheet.insertRule(rule, rule.startsWith("@import") ? importIndex += 1 : sheet.cssRules.length);
                } catch (error) {
                  console.error("Error inserting rule from remote css", {
                    rule,
                    error
                  });
                }
              })).catch((e) => {
                console.error("Error loading remote css", e.toString());
              });
              deferreds.push(deferred);
            }
          });
        } catch (e) {
          const inline = styleSheets.find((a) => a.href == null) || document.styleSheets[0];
          if (sheet.href != null) {
            deferreds.push(fetchCSS(sheet.href).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
              inline.insertRule(rule, inline.cssRules.length);
            })).catch((err) => {
              console.error("Error loading remote stylesheet", err);
            }));
          }
          console.error("Error inlining remote css file", e);
        }
      }
    });
    return Promise.all(deferreds).then(() => {
      styleSheets.forEach((sheet) => {
        if ("cssRules" in sheet) {
          try {
            toArray(sheet.cssRules || []).forEach((item) => {
              ret.push(item);
            });
          } catch (e) {
            console.error(`Error while reading CSS rules from ${sheet.href}`, e);
          }
        }
      });
      return ret;
    });
  }
  function getWebFontRules(cssRules) {
    return cssRules.filter((rule) => rule.type === CSSRule.FONT_FACE_RULE).filter((rule) => shouldEmbed(rule.style.getPropertyValue("src")));
  }
  async function parseWebFontRules(node, options) {
    if (node.ownerDocument == null) {
      throw new Error("Provided element is not within a Document");
    }
    const styleSheets = toArray(node.ownerDocument.styleSheets);
    const cssRules = await getCSSRules(styleSheets, options);
    return getWebFontRules(cssRules);
  }
  function normalizeFontFamily(font) {
    return font.trim().replace(/["']/g, "");
  }
  function getUsedFonts(node) {
    const fonts = /* @__PURE__ */ new Set();
    function traverse(node2) {
      const fontFamily = node2.style.fontFamily || getComputedStyle(node2).fontFamily;
      fontFamily.split(",").forEach((font) => {
        fonts.add(normalizeFontFamily(font));
      });
      Array.from(node2.children).forEach((child) => {
        if (child instanceof HTMLElement) {
          traverse(child);
        }
      });
    }
    traverse(node);
    return fonts;
  }
  async function getWebFontCSS(node, options) {
    const rules = await parseWebFontRules(node, options);
    const usedFonts = getUsedFonts(node);
    const cssTexts = await Promise.all(rules.filter((rule) => usedFonts.has(normalizeFontFamily(rule.style.fontFamily))).map((rule) => {
      const baseUrl = rule.parentStyleSheet ? rule.parentStyleSheet.href : null;
      return embedResources(rule.cssText, baseUrl, options);
    }));
    return cssTexts.join("\n");
  }
  async function embedWebFonts(clonedNode, options) {
    const cssText = options.fontEmbedCSS != null ? options.fontEmbedCSS : options.skipFonts ? null : await getWebFontCSS(clonedNode, options);
    if (cssText) {
      const styleNode = document.createElement("style");
      const sytleContent = document.createTextNode(cssText);
      styleNode.appendChild(sytleContent);
      if (clonedNode.firstChild) {
        clonedNode.insertBefore(styleNode, clonedNode.firstChild);
      } else {
        clonedNode.appendChild(styleNode);
      }
    }
  }
  async function toSvg(node, options = {}) {
    const { width, height } = getImageSize(node, options);
    const clonedNode = await cloneNode(node, options, true);
    await embedWebFonts(clonedNode, options);
    await embedImages(clonedNode, options);
    applyStyle(clonedNode, options);
    const datauri = await nodeToDataURL(clonedNode, width, height);
    return datauri;
  }
  async function toCanvas(node, options = {}) {
    const { width, height } = getImageSize(node, options);
    const svg = await toSvg(node, options);
    const img = await createImage(svg);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const ratio = options.pixelRatio || getPixelRatio();
    const canvasWidth = options.canvasWidth || width;
    const canvasHeight = options.canvasHeight || height;
    canvas.width = canvasWidth * ratio;
    canvas.height = canvasHeight * ratio;
    if (!options.skipAutoScale) {
      checkCanvasDimensions(canvas);
    }
    canvas.style.width = `${canvasWidth}`;
    canvas.style.height = `${canvasHeight}`;
    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  var _sharedFontBlocks = null;
  function parseFontFamily(block) {
    const m = block.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1/i);
    return m ? m[2].trim() : "";
  }
  function parseFontWeight(block) {
    const m = block.match(/font-weight\s*:\s*([^;]+)/i);
    return m ? m[1].trim() : "400";
  }
  function parseFontStyle(block) {
    const m = block.match(/font-style\s*:\s*([^;]+)/i);
    return m ? m[1].trim() : "normal";
  }
  function parseUnicodeRange(block) {
    const m = block.match(/unicode-range\s*:\s*([^;]+)/i);
    if (!m) return null;
    const ranges = [];
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      const rangeMatch = trimmed.match(/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/);
      if (!rangeMatch) continue;
      const start = parseInt(rangeMatch[1], 16);
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 16) : start;
      ranges.push([start, end]);
    }
    return ranges.length > 0 ? ranges : null;
  }
  function weightMatches(descriptor, target) {
    const parts = descriptor.split(/\s+/).map(Number);
    const t = Number(target) || 400;
    if (parts.length >= 2) {
      return t >= parts[0] && t <= parts[1];
    }
    return parts[0] === t;
  }
  function textMatchesUnicodeRange(text, ranges) {
    for (let i = 0; i < text.length; i++) {
      const cp = text.codePointAt(i);
      for (const [lo, hi] of ranges) {
        if (cp >= lo && cp <= hi) return true;
      }
      if (cp > 65535) i++;
    }
    return false;
  }
  function collectFontUsage(element) {
    const indexMap = /* @__PURE__ */ new Map();
    const fonts = [];
    function walk(node) {
      if (node.nodeType === 3) {
        const content = node.textContent || "";
        if (content.trim() === "") return;
        const parent = node.parentElement;
        if (!parent) return;
        const style = getComputedStyle(parent);
        const weight = style.fontWeight;
        const fontStyle = style.fontStyle;
        for (const raw of style.fontFamily.split(",")) {
          const family = raw.replace(/['"]/g, "").trim().toLowerCase();
          const key = `${family}|${weight}|${fontStyle}`;
          const idx = indexMap.get(key);
          if (idx !== void 0) {
            fonts[idx].text += content;
          } else {
            indexMap.set(key, fonts.length);
            fonts.push({ family, weight, style: fontStyle, text: content });
          }
        }
      } else if (node.nodeType === 1) {
        const el = node;
        for (let i = 0; i < el.childNodes.length; i++) {
          walk(el.childNodes[i]);
        }
      }
    }
    walk(element);
    return fonts;
  }
  function filterFontBlocksForElement(blocks, element) {
    const usages = collectFontUsage(element);
    if (usages.length === 0) return [];
    return blocks.filter((block) => {
      const matchingUsages = usages.filter((u) => {
        if (u.family !== block.family) return false;
        const styleOk = block.style === u.style || block.style === "normal" && u.style === "normal";
        return styleOk && weightMatches(block.weight, u.weight);
      });
      if (matchingUsages.length === 0) return false;
      if (block.unicodeRanges) {
        const hasMatch = matchingUsages.some(
          (u) => u.text.length > 0 && textMatchesUnicodeRange(u.text, block.unicodeRanges)
        );
        if (!hasMatch) return false;
      }
      return true;
    });
  }
  async function fetchAsDataUrl(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  async function buildFontBlocks() {
    const fontFaceRules = [];
    const links = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    );
    for (const link of links) {
      if (!link.href) continue;
      try {
        const res = await fetch(link.href, { cache: "force-cache" });
        if (!res.ok) continue;
        const cssText = await res.text();
        const sheet = new CSSStyleSheet();
        await sheet.replace(cssText);
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            fontFaceRules.push(rule.cssText);
          }
        }
      } catch {
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      if (sheet.href) continue;
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            fontFaceRules.push(rule.cssText);
          }
        }
      } catch {
      }
    }
    const loadedFamilies = /* @__PURE__ */ new Set();
    if (document.fonts) {
      for (const ff of document.fonts) {
        if (ff.status === "loaded") {
          loadedFamilies.add(
            ff.family.replace(/['"]/g, "").trim().toLowerCase()
          );
        }
      }
    }
    const candidates = loadedFamilies.size > 0 ? fontFaceRules.filter((r) => loadedFamilies.has(parseFontFamily(r).toLowerCase())) : fontFaceRules;
    const embedded = await Promise.all(
      candidates.map(async (ruleText) => {
        const urlRegex = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;
        const urlMatches = Array.from(ruleText.matchAll(urlRegex));
        let css = ruleText;
        for (const m of urlMatches) {
          const url = m[1];
          if (url.startsWith("data:")) continue;
          const dataUrl = await fetchAsDataUrl(url);
          if (dataUrl) {
            css = css.replace(m[0], `url(${dataUrl})`);
          }
        }
        return {
          css,
          family: parseFontFamily(ruleText).toLowerCase(),
          weight: parseFontWeight(ruleText),
          style: parseFontStyle(ruleText),
          unicodeRanges: parseUnicodeRange(ruleText)
        };
      })
    );
    return embedded;
  }
  var HtmlCapture = class {
    constructor(root) {
      this._capturing = /* @__PURE__ */ new Set();
      this.onCacheUpdate = null;
      this._fontBlocks = [];
      this.root = root;
      this.cache = /* @__PURE__ */ new Map();
      this.dpr = 1;
    }
    // ────────────────────────────────────────────
    // Public API
    // ────────────────────────────────────────────
    /**
     * Resolve the page's @font-face rules into a single CSS string with
     * every `url(...)` source already inlined as a base64 data URL. The
     * result is reused on every subsequent toCanvas call so the captured
     * raster renders text with the page's actual webfonts (e.g. Inter)
     * instead of system fallbacks. Matching glyph metrics is what makes
     * the refracted text line up with the live DOM under the glass.
     *
     * The build is shared at module scope across every LiquidGlass
     * instance — the first init() pays the fetch + base64 cost, every
     * subsequent init() awaits the same Promise.
     *
     * Implemented manually rather than via html-to-image's getFontEmbedCSS
     * because that path walks document.styleSheets via CSSOM, which throws
     * SecurityError on every cross-origin stylesheet and has a brittle
     * recovery flow. We just fetch each <link rel="stylesheet"> directly
     * (CORS-friendly for the typical Google Fonts / CDN cases), regex out
     * the @font-face blocks, and inline each url(...) ourselves.
     */
    async prefetchFontEmbedCSS() {
      if (!_sharedFontBlocks) {
        _sharedFontBlocks = buildFontBlocks();
      }
      this._fontBlocks = await _sharedFontBlocks;
    }
    /**
     * Return the @font-face CSS string for a specific element,
     * filtered to only the blocks whose family + weight + style
     * match computed styles on the element's text nodes, AND whose
     * unicode-range covers at least one codepoint in the element's
     * text content.
     */
    fontEmbedCSSForElement(element) {
      if (this._fontBlocks.length === 0) return "";
      const relevant = filterFontBlocksForElement(this._fontBlocks, element);
      return relevant.map((b) => b.css).join("\n");
    }
    /**
     * Update the device pixel ratio used for future captures.
     */
    resize(dpr = 1) {
      this.dpr = dpr;
      this.cache.clear();
    }
    /**
     * Ensure an element's cached canvas is fresh enough for the current DPR.
     *
     * Cache semantics:
     *   - Fresh hit (size matches within 0.5 px) → return immediately.
     *   - Stale hit (size differs) → keep the stale entry so callers can
     *     stretch-blit it, and kick off an async re-capture.
     *   - Cache miss → kick off an async capture.
     *
     * Concurrent re-captures for the same element are deduplicated
     * via the `_capturing` set, so calling this every frame is cheap.
     */
    async captureElement(element, force = false) {
      const rect = element.getBoundingClientRect();
      const cssW = rect.width;
      const cssH = rect.height;
      const w = Math.round(cssW * this.dpr);
      const h = Math.round(cssH * this.dpr);
      if (w <= 0 || h <= 0) {
        this.cache.delete(element);
        return;
      }
      const cached = this.cache.get(element);
      const cacheIsFresh = !!cached && cached.canvas.width > 0 && cached.canvas.height > 0 && Math.abs(cached.w - w) < 0.5 && Math.abs(cached.h - h) < 0.5;
      if (!force && cacheIsFresh) return;
      if (this._capturing.has(element)) return;
      if (element.tagName === "CANVAS") {
        return;
      }
      this._capturing.add(element);
      try {
        await this._captureWithHtmlToImage(element, w, h, cssW, cssH);
      } finally {
        this._capturing.delete(element);
      }
    }
    /**
     * Draw the current cached capture for an element into an arbitrary
     * 2D canvas. Returns true when a cached snapshot was available.
     */
    drawCachedElement(element, targetCtx, x, y, w, h) {
      const cached = this.cache.get(element);
      if (!cached) return false;
      if (cached.canvas.width <= 0 || cached.canvas.height <= 0) {
        this.cache.delete(element);
        return false;
      }
      targetCtx.drawImage(cached.canvas, x, y, w, h);
      return true;
    }
    /**
     * Capture an element's DOM content as a standalone canvas, optionally
     * excluding specified child nodes from the capture.
     *
     * The hideNodes are pruned from the cloned tree via html-to-image's
     * filter callback, so the live DOM is never mutated and there is no
     * visible flicker on the page even when this runs inside the render
     * loop (e.g. on a re-capture triggered by a content change).
     */
    async captureToCanvas(element, cssW, cssH, hideNodes = null) {
      if (cssW <= 0 || cssH <= 0) return null;
      const hideSet = hideNodes && hideNodes.length ? new Set(hideNodes) : null;
      try {
        const rendered = await toCanvas(element, {
          width: cssW,
          height: cssH,
          pixelRatio: this.dpr,
          backgroundColor: void 0,
          // Reuse the prefetched font embed CSS so the per-glass
          // content image (used for compositing labels on top of
          // the shader output) uses the same Inter face the live
          // page does. Skips html-to-image's noisy CSSOM walk.
          fontEmbedCSS: this.fontEmbedCSSForElement(element),
          filter: hideSet ? (node) => !hideSet.has(node) : void 0,
          style: {
            position: "static",
            top: "auto",
            left: "auto",
            right: "auto",
            bottom: "auto",
            transform: "none",
            margin: "0"
          }
        });
        return rendered;
      } catch (err) {
        console.warn("LiquidGlass: captureToCanvas failed for element:", element, err);
        return null;
      }
    }
    /**
     * Remove an element's entry from the capture cache.
     */
    invalidateCache(element) {
      this.cache.delete(element);
    }
    /** Destroy the capture system and free resources. */
    destroy() {
      this.cache.clear();
    }
    // ────────────────────────────────────────────
    // html-to-image back-end
    // ────────────────────────────────────────────
    async _captureWithHtmlToImage(element, w, h, cssW, cssH) {
      if (cssW <= 0 || cssH <= 0 || w <= 0 || h <= 0) return;
      try {
        const rendered = await toCanvas(element, {
          width: cssW,
          height: cssH,
          pixelRatio: this.dpr,
          // Per-element font embed CSS so the captured raster
          // uses the page's actual webfont at the correct weight
          // and unicode subset for this element's text content.
          fontEmbedCSS: this.fontEmbedCSSForElement(element)
        });
        this.cache.set(element, { canvas: rendered, w, h });
        this.onCacheUpdate?.(element);
      } catch (err) {
        console.warn("LiquidGlass: html-to-image capture failed for element:", element, err);
      }
    }
  };
  var VS_QUAD = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
	v_uv = a_pos * 0.5 + 0.5;
	gl_Position = vec4(a_pos, 0.0, 1.0);
}`;
  var FS_BLIT = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_scale;
uniform vec2 u_offset;
varying vec2 v_uv;
void main() {
	gl_FragColor = texture2D(u_tex, v_uv * u_scale + u_offset);
}`;
  var FS_BLUR = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_dir;
varying vec2 v_uv;
void main() {
	vec4 s  = texture2D(u_tex, v_uv) * 0.227027;
	s += texture2D(u_tex, v_uv + u_dir * 1.0) * 0.194594;
	s += texture2D(u_tex, v_uv - u_dir * 1.0) * 0.194594;
	s += texture2D(u_tex, v_uv + u_dir * 2.0) * 0.121622;
	s += texture2D(u_tex, v_uv - u_dir * 2.0) * 0.121622;
	s += texture2D(u_tex, v_uv + u_dir * 3.0) * 0.054054;
	s += texture2D(u_tex, v_uv - u_dir * 3.0) * 0.054054;
	s += texture2D(u_tex, v_uv + u_dir * 4.0) * 0.016216;
	s += texture2D(u_tex, v_uv - u_dir * 4.0) * 0.016216;
	gl_FragColor = s;
}`;
  var VS_GLASS = `
attribute vec2 a_pos;
uniform vec2 u_center;   // panel centre in root-pixel coords (top-left origin)
uniform vec2 u_size;     // panel size in px
uniform vec2 u_res;      // root element size in px
uniform float u_pad;     // shadow padding in px
varying vec2 v_localPx;
varying vec2 v_screenUV;

void main() {
	vec2 total = u_size + vec2(u_pad * 2.0);
	v_localPx = a_pos * total;                       // px from panel centre
	vec2 px = u_center + a_pos * total;              // screen px (DOM)
	v_screenUV = vec2(px.x / u_res.x, 1.0 - px.y / u_res.y);
	vec2 ndc = (px / u_res) * 2.0 - 1.0;
	ndc.y = -ndc.y;
	gl_Position = vec4(ndc, 0.0, 1.0);
}`;
  var FS_GLASS = `
precision highp float;

uniform sampler2D u_bgTex;
uniform sampler2D u_blurTex;
uniform vec2 u_size;           // panel px
uniform float u_radius;        // corner radius px
uniform vec2 u_res;

uniform float u_refract;
uniform float u_chroma;
uniform float u_edgeHL;
uniform float u_spec;
uniform float u_fresnel;
uniform float u_distort;
uniform float u_alpha;
uniform float u_sat;
uniform float u_tint;
uniform float u_zRadius;
uniform float u_brightness;
uniform float u_shadowAlpha;
uniform float u_shadowSpread;
uniform float u_shadowOffY;
uniform float u_bevelMode;
uniform vec2 u_pointer;
uniform float u_pointerActive;
uniform float u_pointerRadius;
uniform float u_pointerStrength;
uniform vec2 u_pointerVelocity;

varying vec2 v_localPx;
varying vec2 v_screenUV;

// Rounded-rect signed distance
float rrSDF(vec2 p, vec2 b, float r) {
	vec2 q = abs(p) - b + vec2(r);
	return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
}

// Bevel height field.
// Both modes use the same half-circle profile (smooth peak at centre,
// steep at edges).  The difference is in the refraction model:
//   mode 0 = biconvex pill \u2014 light refracts at both surfaces (entry + exit).
//   mode 1 = dome (plano-convex) \u2014 flat bottom, so only exit refraction.
// d = distance inside from edge (-sdf), zR = z-radius of the bevel.
float bevelHeight(float d, float zR) {
	if (d <= 0.0) return 0.0;
	if (d >= zR) return zR;
	return sqrt(d * (2.0 * zR - d));
}

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
	vec2 half_ = u_size * 0.5;
	float r = min(u_radius, min(half_.x, half_.y));
	float sdf = rrSDF(v_localPx, half_, r);

	// \u2500\u2500 Shadow (outside panel, offset by shadowOffY) \u2500\u2500
	if (sdf > 0.0) {
		float sdfShadow = rrSDF(v_localPx - vec2(0.0, u_shadowOffY), half_, r);
		float d = max(sdfShadow - 1.0, 0.0);
		float spread = max(u_shadowSpread, 1.0);
		float falloff = 1.0 / (spread * spread);
		float outerShadow = exp(-d * d * falloff) * 0.65;
		float contactShadow = exp(-d * 0.08 / max(spread * 0.04, 0.01)) * 0.35;
		float shadow = (outerShadow + contactShadow) * u_shadowAlpha;
		gl_FragColor = vec4(0.0, 0.0, 0.0, shadow);
		return;
	}

	// \u2500\u2500 Anti-aliased mask \u2500\u2500
	float mask = 1.0 - smoothstep(-1.5, 0.5, sdf);

	float maxD = min(half_.x, half_.y);
	float inside = -sdf;
	float edge = smoothstep(maxD * 0.35, 0.0, inside);

	// \u2500\u2500 Surface normal (top surface) via bevel height field \u2500\u2500
	float zR = u_zRadius;
	float e = 2.0;
	float dC = inside;
	float dR = -rrSDF(v_localPx + vec2(e, 0.0), half_, r);
	float dL = -rrSDF(v_localPx - vec2(e, 0.0), half_, r);
	float dU = -rrSDF(v_localPx + vec2(0.0, e), half_, r);
	float dD = -rrSDF(v_localPx - vec2(0.0, e), half_, r);
	float hC = bevelHeight(dC, zR);
	float hR = bevelHeight(dR, zR);
	float hL = bevelHeight(dL, zR);
	float hU = bevelHeight(dU, zR);
	float hD = bevelHeight(dD, zR);
	vec2 hGrad = vec2(hR - hL, hU - hD) / (2.0 * e);
	vec3 N = normalize(vec3(-hGrad, 1.0));

	float depth = smoothstep(0.0, zR, inside);

	// \u2500\u2500 Refraction \u2500\u2500
	vec2 pxToUV = vec2(1.0, -1.0) / u_res;
	float ior = 1.5;
	float refrPow = 1.0 - 1.0 / ior;
	float thickness = hC * 2.0;
	float thickNorm = thickness / max(zR * 2.0, 1.0);
	vec2 refrPx;
	if (u_bevelMode < 0.5) {
		// Biconvex: physically-based dual-surface refraction
		vec2 exitRefr = hGrad * refrPow;
		vec2 entryRefr = hGrad * refrPow;
		vec2 throughRefr = entryRefr * thickNorm * 0.5;
		refrPx = (exitRefr + entryRefr + throughRefr) * u_refract * 30.0;
		vec2 centerDir = -v_localPx / max(half_, vec2(1.0));
		refrPx += centerDir * u_refract * 4.0 * depth;
	} else {
		// Dome (plano-convex): uniform magnification by contracting UV toward center.
		// Each pixel samples from closer to center \u2192 content appears larger.
		refrPx = -v_localPx * u_refract * depth * 0.35;
	}
	vec2 refr = refrPx * pxToUV;

	// Cursor-local flow field: a restrained ripple follows the pointer
	// without moving the card itself. The effect is strongest near the
	// cursor and fades before it reaches the opposite edge.
	vec2 pointerDelta = v_localPx - (u_pointer - u_size * 0.5);
	float pointerDistance = length(pointerDelta);
	float pointerInfluence = u_pointerActive * (1.0 - smoothstep(0.0, u_pointerRadius, pointerDistance));
	vec2 pointerDirection = pointerDelta / max(pointerDistance, 1.0);
	vec2 pointerTangent = vec2(-pointerDirection.y, pointerDirection.x);
	float pointerWave = sin(pointerDistance * 0.08);
	vec2 pointerFlow = (pointerDirection * pointerWave + pointerTangent * (0.35 * cos(pointerDistance * 0.06)))
		* pointerInfluence * u_pointerStrength * 16.0;
	float pointerSpeed = length(u_pointerVelocity);
	vec2 velocityDirection = u_pointerVelocity / max(pointerSpeed, 0.001);
	float velocityWave = sin(dot(pointerDelta, velocityDirection) * 0.045 + pointerDistance * 0.035);
	vec2 velocityFlow = (velocityDirection * velocityWave + pointerTangent * (0.2 * cos(pointerDistance * 0.05)))
		* pointerInfluence * min(pointerSpeed, 12.0) * u_pointerStrength * 1.8;
	pointerFlow += velocityFlow;
	refr += pointerFlow * pxToUV;

	// \u2500\u2500 Micro-distortion noise \u2500\u2500
	vec2 ns = v_localPx * 0.08;
	vec2 absPxToUV = vec2(1.0) / u_res;
	vec2 micro = (vec2(hash(ns), hash(ns + vec2(37.0))) - 0.5) * u_distort * 4.0 * absPxToUV;

	// \u2500\u2500 Chromatic aberration \u2500\u2500
	float caS = u_chroma * 18.0 * (edge * 0.7 + 0.3) * 2.0;
	vec2 caD = N.xy * caS * pxToUV;
	vec2 base = v_screenUV + refr + micro;

	vec3 sharp = vec3(
		texture2D(u_bgTex,  base + caD).r,
		texture2D(u_bgTex,  base).g,
		texture2D(u_bgTex,  base - caD).b
	);
	vec3 blur = vec3(
		texture2D(u_blurTex, base + caD).r,
		texture2D(u_blurTex, base).g,
		texture2D(u_blurTex, base - caD).b
	);
	// \u2500\u2500 Edge-weighted blur mix \u2500\u2500
	// Centre of the panel uses the blurred sample; the rim blends
	// toward the sharp sample so refraction edges stay crisp.
	float edgeMix = (1.0 - edge * 0.15);
	vec3 col = mix(sharp, blur, edgeMix);

	// \u2500\u2500 Brightness \u2500\u2500
	col *= 1.0 + u_brightness;

	// \u2500\u2500 Saturation \u2500\u2500
	float lum = dot(col, vec3(0.299, 0.587, 0.114));
	col = mix(vec3(lum), col, 1.0 + u_sat);

	// \u2500\u2500 Cool glass tint \u2500\u2500
	col = mix(col, col * vec3(0.92, 0.95, 1.05), u_tint);
	col *= 1.0 + 0.06 * depth;

	// \u2500\u2500 Fresnel \u2500\u2500
	float fres = pow(1.0 - abs(N.z), 4.0) * u_fresnel;

	// \u2500\u2500 Specular highlights (multi-light Blinn-Phong) \u2500\u2500
	vec3 V = vec3(0.0, 0.0, 1.0);
	vec3 L1 = normalize(vec3(0.4, 0.7, 1.0));
	vec3 H1 = normalize(L1 + V);
	float sp1 = pow(max(dot(N, H1), 0.0), 90.0);
	vec3 L2 = normalize(vec3(-0.3, -0.5, 1.0));
	vec3 H2 = normalize(L2 + V);
	float sp2 = pow(max(dot(N, H2), 0.0), 50.0) * 0.3;
	vec3 L3 = normalize(vec3(0.1, 0.3, 1.0));
	float spB = pow(max(dot(N, L3), 0.0), 6.0) * 0.1;
	vec3 L4 = normalize(vec3(0.0, 0.9, 0.4));
	vec3 H4 = normalize(L4 + V);
	float sp4 = pow(max(dot(N, H4), 0.0), 120.0) * 0.6;
	float totalSpec = (sp1 + sp2 + spB + sp4) * u_spec;

	// \u2500\u2500 Inner border / stroke highlight \u2500\u2500
	float borderWidth = 1.5;
	float innerStroke = smoothstep(-borderWidth - 1.0, -borderWidth, sdf)
	                  * (1.0 - smoothstep(-1.0, 0.0, sdf));
	float topBias = 0.5 + 0.5 * (-v_localPx.y / half_.y);
	innerStroke *= (0.4 + 0.6 * topBias);

	// \u2500\u2500 Edge highlight & inner glow \u2500\u2500
	float rim = edge * u_edgeHL * 0.22;
	float innerGlow = smoothstep(5.0, 0.0, -sdf) * u_edgeHL * 0.15;

	// \u2500\u2500 Environment-like reflection (fake) \u2500\u2500
	float envRefl = (N.y * 0.5 + 0.5) * fres * 0.08;

	// \u2500\u2500 Composite \u2500\u2500
	vec3 fin = col;
	fin += vec3(totalSpec);
	fin += vec3(rim + innerGlow);
	fin += vec3(innerStroke * u_edgeHL * 0.55);
	fin += vec3(envRefl);
	fin += vec3(pointerInfluence * 0.045);
	fin = mix(fin, vec3(1.0), fres * 0.2);

	gl_FragColor = vec4(fin, mask * u_alpha);
}`;
  var GlassRenderer = class {
    constructor() {
      this.fboCache = /* @__PURE__ */ new Map();
      this.activeFBOs = null;
      this.bgTex = null;
      this.bgTexWidth = 0;
      this.bgTexHeight = 0;
      this.width = 0;
      this.height = 0;
      this.contextLost = false;
      this.canvas = document.createElement("canvas");
      this.canvas.style.display = "none";
      document.body.appendChild(this.canvas);
      this.cropCanvas = document.createElement("canvas");
      this.cropCtx = this.cropCanvas.getContext("2d");
      const gl = this.canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        preserveDrawingBuffer: true
      });
      if (!gl) {
        throw new Error("LiquidGlass: WebGL is not supported in this browser.");
      }
      this.gl = gl;
      this._initPrograms();
      this._initBuffers();
      this._onContextLost = (e) => {
        e.preventDefault();
        this.contextLost = true;
        console.warn("LiquidGlass: WebGL context lost.");
      };
      this._onContextRestored = () => {
        console.info("LiquidGlass: WebGL context restored \u2014 reinitialising.");
        this.contextLost = false;
        this._initPrograms();
        this._initBuffers();
        for (const fboSet of this.fboCache.values()) {
          this._freeFBOSet(fboSet);
        }
        this.fboCache.clear();
        this.activeFBOs = null;
        this.bgTex = null;
        this.bgTexWidth = 0;
        this.bgTexHeight = 0;
      };
      this.canvas.addEventListener("webglcontextlost", this._onContextLost);
      this.canvas.addEventListener("webglcontextrestored", this._onContextRestored);
    }
    // ────────────────────────────────────────────
    // Initialisation
    // ────────────────────────────────────────────
    _initPrograms() {
      this.blitP = this._link(VS_QUAD, FS_BLIT);
      this.blitU = this._uloc(this.blitP, ["u_tex", "u_scale", "u_offset"]);
      this.blurP = this._link(VS_QUAD, FS_BLUR);
      this.blurU = this._uloc(this.blurP, ["u_tex", "u_dir"]);
      this.glassP = this._link(VS_GLASS, FS_GLASS);
      this.glassU = this._uloc(this.glassP, [
        "u_bgTex",
        "u_blurTex",
        "u_center",
        "u_size",
        "u_radius",
        "u_res",
        "u_pad",
        "u_refract",
        "u_chroma",
        "u_edgeHL",
        "u_spec",
        "u_fresnel",
        "u_distort",
        "u_alpha",
        "u_sat",
        "u_tint",
        "u_zRadius",
        "u_brightness",
        "u_shadowAlpha",
        "u_shadowSpread",
        "u_shadowOffY",
        "u_bevelMode",
        "u_pointer",
        "u_pointerActive",
        "u_pointerRadius",
        "u_pointerStrength",
        "u_pointerVelocity"
      ]);
    }
    _initBuffers() {
      const gl = this.gl;
      this.quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      this.panelBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.panelBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    }
    // ────────────────────────────────────────────
    // Resize
    // ────────────────────────────────────────────
    resize(width, height) {
      this.width = width;
      this.height = height;
      for (const fboSet of this.fboCache.values()) {
        this._freeFBOSet(fboSet);
      }
      this.fboCache.clear();
      this.activeFBOs = null;
      this.canvas.width = 0;
      this.canvas.height = 0;
    }
    // ────────────────────────────────────────────
    // Background upload
    // ────────────────────────────────────────────
    uploadAndBlur(sourceCanvas, sourceX, sourceY, width, height, blurAmount) {
      if (this.contextLost) return;
      const gl = this.gl;
      if (!this._setActiveSize(width, height)) return;
      const W = this.width;
      const H = this.height;
      const fboSet = this.activeFBOs;
      this.cropCanvas.width = W;
      this.cropCanvas.height = H;
      this.cropCtx.clearRect(0, 0, W, H);
      this.cropCtx.drawImage(sourceCanvas, -sourceX, -sourceY);
      if (!this.bgTex) {
        this.bgTex = gl.createTexture();
      }
      gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      if (this.bgTexWidth !== W || this.bgTexHeight !== H) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        this.bgTexWidth = W;
        this.bgTexHeight = H;
      }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.cropCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboSet.bg.fbo);
      gl.viewport(0, 0, W, H);
      gl.useProgram(this.blitP);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
      gl.uniform1i(this.blitU.u_tex, 0);
      gl.uniform2f(this.blitU.u_scale, 1, 1);
      gl.uniform2f(this.blitU.u_offset, 0, 0);
      this._drawQuad(this.blitP, this.quadBuf);
      const bw = fboSet.blurA.w;
      const bh = fboSet.blurA.h;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboSet.blurA.fbo);
      gl.viewport(0, 0, bw, bh);
      gl.bindTexture(gl.TEXTURE_2D, fboSet.bg.tex);
      this._drawQuad(this.blitP, this.quadBuf);
      if (blurAmount > 0) {
        const spread = blurAmount * 2.5;
        gl.useProgram(this.blurP);
        gl.uniform1i(this.blurU.u_tex, 0);
        for (let i = 0; i < BLUR_ITERATIONS; i++) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fboSet.blurB.fbo);
          gl.viewport(0, 0, bw, bh);
          gl.bindTexture(gl.TEXTURE_2D, fboSet.blurA.tex);
          gl.uniform2f(this.blurU.u_dir, spread / bw, 0);
          this._drawQuad(this.blurP, this.quadBuf);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fboSet.blurA.fbo);
          gl.bindTexture(gl.TEXTURE_2D, fboSet.blurB.tex);
          gl.uniform2f(this.blurU.u_dir, 0, spread / bh);
          this._drawQuad(this.blurP, this.quadBuf);
        }
      }
    }
    // ────────────────────────────────────────────
    // Glass panel rendering
    // ────────────────────────────────────────────
    renderGlassPanel(config, width, height, dpr) {
      if (this.contextLost) return;
      const gl = this.gl;
      const W = this.width;
      const H = this.height;
      const fboSet = this.activeFBOs;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.glassP);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fboSet.bg.tex);
      gl.uniform1i(this.glassU.u_bgTex, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fboSet.blurA.tex);
      gl.uniform1i(this.glassU.u_blurTex, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, this.canvas.height - H, W, H);
      gl.uniform2f(this.glassU.u_res, W, H);
      gl.uniform2f(this.glassU.u_center, W * 0.5, H * 0.5);
      gl.uniform2f(this.glassU.u_size, width * dpr, height * dpr);
      gl.uniform1f(this.glassU.u_radius, config.cornerRadius * dpr);
      gl.uniform1f(this.glassU.u_pad, SHADOW_PAD * dpr);
      gl.uniform1f(this.glassU.u_refract, config.refraction);
      gl.uniform1f(this.glassU.u_chroma, config.chromAberration);
      gl.uniform1f(this.glassU.u_edgeHL, config.edgeHighlight);
      gl.uniform1f(this.glassU.u_spec, config.specular);
      gl.uniform1f(this.glassU.u_fresnel, config.fresnel);
      gl.uniform1f(this.glassU.u_distort, config.distortion);
      gl.uniform1f(this.glassU.u_alpha, config.opacity);
      gl.uniform1f(this.glassU.u_sat, config.saturation);
      gl.uniform1f(this.glassU.u_tint, config.tintStrength);
      gl.uniform1f(this.glassU.u_zRadius, config.zRadius * dpr);
      gl.uniform1f(this.glassU.u_brightness, config.brightness);
      gl.uniform1f(this.glassU.u_shadowAlpha, config.shadowOpacity);
      gl.uniform1f(this.glassU.u_shadowSpread, config.shadowSpread * dpr);
      gl.uniform1f(this.glassU.u_shadowOffY, config.shadowOffsetY * dpr);
      gl.uniform1f(this.glassU.u_bevelMode, config.bevelMode);
      gl.uniform2f(this.glassU.u_pointer, config.pointerX * dpr, config.pointerY * dpr);
      gl.uniform1f(this.glassU.u_pointerActive, config.pointerActive);
      gl.uniform1f(this.glassU.u_pointerRadius, config.pointerRadius * dpr);
      gl.uniform1f(this.glassU.u_pointerStrength, config.pointerStrength);
      gl.uniform2f(this.glassU.u_pointerVelocity, config.pointerVelocityX * dpr, config.pointerVelocityY * dpr);
      this._drawQuad(this.glassP, this.panelBuf);
      gl.disable(gl.BLEND);
    }
    clear() {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, this.canvas.height - this.height, this.width, this.height);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, this.canvas.height - this.height, this.width, this.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
    }
    destroy() {
      this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
      this.canvas.removeEventListener("webglcontextrestored", this._onContextRestored);
      if (!this.contextLost) {
        const gl = this.gl;
        for (const fboSet of this.fboCache.values()) {
          this._freeFBOSet(fboSet);
        }
        this.fboCache.clear();
        if (this.bgTex) gl.deleteTexture(this.bgTex);
        gl.deleteBuffer(this.quadBuf);
        gl.deleteBuffer(this.panelBuf);
        gl.deleteProgram(this.blitP);
        gl.deleteProgram(this.blurP);
        gl.deleteProgram(this.glassP);
      }
      this.canvas.remove();
    }
    // ────────────────────────────────────────────
    // FBO management
    // ────────────────────────────────────────────
    _setActiveSize(w, h) {
      if (w <= 0 || h <= 0) return false;
      this.width = w;
      this.height = h;
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      const key = `${w}x${h}`;
      let fboSet = this.fboCache.get(key);
      if (!fboSet) {
        fboSet = {
          bg: this._makeFBO(w, h),
          blurA: this._makeFBO(w, h),
          blurB: this._makeFBO(w, h)
        };
        this.fboCache.set(key, fboSet);
      }
      this.activeFBOs = fboSet;
      return true;
    }
    _makeFBO(w, h) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fbo, tex, w, h };
    }
    _freeFBO(fboObj) {
      if (!fboObj) return;
      const gl = this.gl;
      gl.deleteFramebuffer(fboObj.fbo);
      gl.deleteTexture(fboObj.tex);
    }
    _freeFBOSet(fboSet) {
      this._freeFBO(fboSet.bg);
      this._freeFBO(fboSet.blurA);
      this._freeFBO(fboSet.blurB);
    }
    // ────────────────────────────────────────────
    // Shader helpers
    // ────────────────────────────────────────────
    _compile(src, type) {
      const gl = this.gl;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("LiquidGlass shader compile error:", gl.getShaderInfoLog(s), src);
        return null;
      }
      return s;
    }
    _link(vsSrc, fsSrc) {
      const gl = this.gl;
      const p = gl.createProgram();
      gl.attachShader(p, this._compile(vsSrc, gl.VERTEX_SHADER));
      gl.attachShader(p, this._compile(fsSrc, gl.FRAGMENT_SHADER));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("LiquidGlass program link error:", gl.getProgramInfoLog(p));
      }
      return p;
    }
    _uloc(prog, names) {
      const gl = this.gl;
      const u = {};
      for (const n of names) {
        u[n] = gl.getUniformLocation(prog, n);
      }
      return u;
    }
    _drawQuad(prog, buf) {
      const gl = this.gl;
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
  var sharedGlassRenderer = null;
  var sharedGlassRendererUsers = 0;
  function acquireSharedGlassRenderer() {
    if (!sharedGlassRenderer) sharedGlassRenderer = new GlassRenderer();
    sharedGlassRendererUsers += 1;
    return sharedGlassRenderer;
  }
  function releaseSharedGlassRenderer(renderer) {
    if (renderer !== sharedGlassRenderer) return;
    sharedGlassRendererUsers = Math.max(0, sharedGlassRendererUsers - 1);
    if (sharedGlassRendererUsers === 0) {
      sharedGlassRenderer.destroy();
      sharedGlassRenderer = null;
    }
  }
  var sharedBackdropRaster = null;
  function getSharedBackdropRaster(image, dpr) {
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
    const key = `${image.currentSrc || image.src}|${image.naturalWidth}x${image.naturalHeight}|${width}x${height}|${dpr}`;
    if (sharedBackdropRaster?.key === key) return sharedBackdropRaster.canvas;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const fitted = LiquidGlass._objectFitRect(
      image.naturalWidth,
      image.naturalHeight,
      width,
      height,
      "cover",
      "50% 50%"
    );
    ctx.fillStyle = "rgb(15, 17, 27)";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.64;
    ctx.filter = "saturate(0.78) brightness(0.68) contrast(1.08)";
    ctx.drawImage(image, fitted.sx, fitted.sy, fitted.sw, fitted.sh, 0, 0, width, height);
    ctx.restore();
    sharedBackdropRaster = { key, canvas };
    return canvas;
  }
  var BUTTON_CLASS = "liquid-glass-button";
  var STYLE_ID = "liquid-glass-button-styles";
  var BUTTON_CSS = `
.${BUTTON_CLASS} {
	cursor: pointer;
}
`;
  var LiquidGlass = class _LiquidGlass {
    // ────────────────────────────────────────────
    // Constructor (prefer LiquidGlass.init)
    // ────────────────────────────────────────────
    constructor({ root, glassElements, backgroundImage = null, backgroundCanvas = null, defaults = {}, renderScale = 1, active = true, captureGlassContent = true, prewarmCaptures = true }) {
      this.fps = 0;
      this._running = false;
      this._destroyed = false;
      this._active = Boolean(active);
      this._rafId = 0;
      this.renderScale = Math.max(0.5, Math.min(1, Number(renderScale) || 1));
      this.captureGlassContent = captureGlassContent !== false;
      this.prewarmCaptures = prewarmCaptures !== false;
      this._hasDynamic = false;
      this._globalDirty = true;
      this._positionDirty = false;
      this._scrolling = false;
      this._scrollIdleTimer = 0;
      this._lastScrollRender = 0;
      this._scrollPriorityIndex = 0;
      this._glassDirty = /* @__PURE__ */ new Set();
      this._userMarkedChanged = /* @__PURE__ */ new Set();
      this._capturingGlassContent = false;
      this._glassContentDirty = /* @__PURE__ */ new Set();
      this._fpsFrames = 0;
      this._fpsTime = 0;
      this._observer = null;
      this._glassSubtreeObserver = null;
      this._sortedChildren = [];
      this._glassCache = /* @__PURE__ */ new Map();
      this._glassContentImages = /* @__PURE__ */ new Map();
      this._glassLastSize = /* @__PURE__ */ new Map();
      this._buttonStates = /* @__PURE__ */ new Map();
      this._buttonListeners = /* @__PURE__ */ new Map();
      this._pointer = {
        clientX: 0,
        clientY: 0,
        lastTime: 0,
        velocityX: 0,
        velocityY: 0,
        hasPosition: false,
        active: false,
        hoverElement: null
      };
      this._onFocus = () => this._handleResume();
      this._onVisibilityChange = () => {
        if (document.hidden) {
          this._resetPointer();
          return;
        }
        this._handleResume();
      };
      this._drag = {
        active: false,
        element: null,
        startX: 0,
        startY: 0,
        origTx: 0,
        origTy: 0
      };
      if (!root) throw new Error("LiquidGlass: `root` element is required.");
      this.root = root;
      this.backgroundImage = backgroundImage;
      this.backgroundCanvas = backgroundCanvas;
      this.defaults = { ...DEFAULTS, ...defaults };
      this.glassSet = new Set(Array.from(glassElements || []));
      this.glassCanvases = /* @__PURE__ */ new Map();
      this.capture = new HtmlCapture(root);
      this.capture.onCacheUpdate = (element) => {
        this._markGlassesIntersecting(element);
      };
      this.renderer = acquireSharedGlassRenderer();
      this._sceneCanvas = document.createElement("canvas");
      this._sceneCtx = this._sceneCanvas.getContext("2d");
      this.renderer.canvas.addEventListener("webglcontextrestored", () => {
        this._glassCache.clear();
        this._globalDirty = true;
      });
      this._onResize = this._handleResize.bind(this);
      this._onPointerDown = this._handlePointerDown.bind(this);
      this._onPointerMove = this._handlePointerMove.bind(this);
      this._onPointerUp = this._handlePointerUp.bind(this);
      this._onScroll = () => {
        if (!this._active) return;
        this._scrolling = true;
        this._positionDirty = true;
        window.clearTimeout(this._scrollIdleTimer);
        this._scrollIdleTimer = window.setTimeout(() => {
          this._scrolling = false;
          this._positionDirty = true;
        }, SCROLL_IDLE_DELAY);
      };
      this._onBlur = () => this._resetPointer();
    }
    // ────────────────────────────────────────────
    // Static entry point
    // ────────────────────────────────────────────
    static async init(options) {
      const instance = new _LiquidGlass(options);
      try {
        await instance._start();
        return instance;
      } catch (error) {
        instance.destroy();
        throw error;
      }
    }
    // ────────────────────────────────────────────
    // Lifecycle
    // ────────────────────────────────────────────
    async _start() {
      this.root.style.userSelect = "none";
      this.root.style.webkitUserSelect = "none";
      this._setupGlassElements();
      this._hasDynamic = this._detectDynamic();
      this._sortedChildren = this._getSortedChildren();
      this._handleResize();
      await this.capture.prefetchFontEmbedCSS();
      if (this.captureGlassContent) await this._captureGlassContent();
      if (this.prewarmCaptures) await this._prewarmStaticCaptures();
      window.addEventListener("resize", this._onResize);
      window.addEventListener("scroll", this._onScroll, { passive: true });
      window.addEventListener("blur", this._onBlur);
      window.addEventListener("focus", this._onFocus);
      window.addEventListener("pageshow", this._onFocus);
      document.addEventListener("visibilitychange", this._onVisibilityChange);
      this.root.addEventListener("pointerdown", this._onPointerDown);
      window.addEventListener("pointermove", this._onPointerMove);
      window.addEventListener("pointerup", this._onPointerUp);
      this._observer = new MutationObserver(() => {
        this._sortedChildren = this._getSortedChildren();
        this._globalDirty = true;
      });
      this._observer.observe(this.root, { childList: true });
      this._glassSubtreeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const owner = this._closestGlassAncestor(mutation.target);
          if (mutation.type === "attributes" && mutation.attributeName === "data-config") {
            if (owner) this._markGlassAndDependents(owner);
            continue;
          }
          if (owner) {
            if (this.captureGlassContent) this._glassContentDirty.add(owner);
            this._markGlassAndDependents(owner);
          }
        }
      });
      for (const el of this.glassSet) {
        this._glassSubtreeObserver.observe(el, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["data-config"]
        });
      }
      this._glassContentDirty.clear();
      this._running = true;
      this._globalDirty = true;
      if (this._active) this._rafId = requestAnimationFrame(() => this._renderLoop());
    }
    setActive(active) {
      const next = Boolean(active);
      if (this._destroyed || next === this._active) return;
      this._active = next;
      if (!this._running) return;
      if (!next) {
        cancelAnimationFrame(this._rafId);
        this._rafId = 0;
        this._scrolling = false;
        window.clearTimeout(this._scrollIdleTimer);
        return;
      }
      this._globalDirty = true;
      this._positionDirty = true;
      const rect = this.root.getBoundingClientRect();
      const lastSize = this._activeRootSize;
      if (!lastSize || Math.abs(lastSize.width - rect.width) > 0.5 || Math.abs(lastSize.height - rect.height) > 0.5) {
        this._handleResize();
      }
      this._rafId = requestAnimationFrame(() => this._renderLoop());
    }
    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      this._active = false;
      this._running = false;
      cancelAnimationFrame(this._rafId);
      this.root.style.removeProperty("user-select");
      this.root.style.removeProperty("-webkit-user-select");
      window.removeEventListener("resize", this._onResize);
      window.removeEventListener("scroll", this._onScroll);
      window.clearTimeout(this._scrollIdleTimer);
      window.removeEventListener("blur", this._onBlur);
      window.removeEventListener("focus", this._onFocus);
      window.removeEventListener("pageshow", this._onFocus);
      document.removeEventListener("visibilitychange", this._onVisibilityChange);
      this.root.removeEventListener("pointerdown", this._onPointerDown);
      window.removeEventListener("pointermove", this._onPointerMove);
      window.removeEventListener("pointerup", this._onPointerUp);
      this._observer?.disconnect();
      this._observer = null;
      this._glassSubtreeObserver?.disconnect();
      this._glassSubtreeObserver = null;
      for (const [el, canvas] of this.glassCanvases) {
        canvas.remove();
        el.style.removeProperty("position");
        el.style.removeProperty("overflow");
        el.style.removeProperty("touch-action");
        el.classList.remove(BUTTON_CLASS);
      }
      this.glassCanvases.clear();
      this._glassCache.clear();
      this._glassContentImages.clear();
      this._glassLastSize.clear();
      for (const removers of this._buttonListeners.values()) {
        for (const r of removers) r();
      }
      this._buttonListeners.clear();
      this._buttonStates.clear();
      document.getElementById(STYLE_ID)?.remove();
      this.capture.destroy();
      releaseSharedGlassRenderer(this.renderer);
    }
    _resetPointer() {
      if (this._pointer.hoverElement) {
        this._glassDirty.add(this._pointer.hoverElement);
      }
      this._pointer.clientX = 0;
      this._pointer.clientY = 0;
      this._pointer.lastTime = 0;
      this._pointer.velocityX = 0;
      this._pointer.velocityY = 0;
      this._pointer.hasPosition = false;
      this._pointer.active = false;
      this._pointer.hoverElement = null;
    }
    _handleResume() {
      if (this._destroyed || document.hidden) return;
      this._resetPointer();
      this._globalDirty = true;
      this._positionDirty = true;
      if (!this._running || !this._active || this._rafId) return;
      this._rafId = requestAnimationFrame(() => this._renderLoop());
    }
    // ────────────────────────────────────────────
    // Glass element setup
    // ────────────────────────────────────────────
    _setupGlassElements() {
      let needsButtonStyles = false;
      for (const el of this.glassSet) {
        if (el.parentElement !== this.root) {
          console.warn("LiquidGlass: glass element must be a direct child of root, skipping.", el);
          this.glassSet.delete(el);
          continue;
        }
        const currentPosition = window.getComputedStyle(el).position;
        if (currentPosition === "static") {
          el.style.position = "relative";
        }
        el.style.overflow = "visible";
        const config = this._getConfig(el);
        if (config.floating) {
          el.style.touchAction = "none";
        }
        if (config.button) {
          el.classList.add(BUTTON_CLASS);
          needsButtonStyles = true;
          this._setupButtonListeners(el);
        }
        const canvas = document.createElement("canvas");
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;background:transparent;";
        el.insertBefore(canvas, el.firstChild);
        this.glassCanvases.set(el, canvas);
      }
      if (needsButtonStyles && !document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = BUTTON_CSS;
        document.head.appendChild(style);
      }
    }
    /**
     * Walk up from a mutation target until we hit a glass element
     * registered on this instance. Returns null if the node isn't
     * inside any glass subtree (shouldn't normally happen since the
     * observers are scoped to glass elements, but the mutation target
     * may be a Text node or detached during a removal).
     */
    _closestGlassAncestor(node) {
      let cur = node;
      while (cur) {
        if (cur.nodeType === 1 && this.glassSet.has(cur)) {
          return cur;
        }
        cur = cur.parentNode;
      }
      return null;
    }
    /**
     * Mark a glass element (and any glass that visually depends on it
     * via z-order overlap) as needing a shader re-render on the next
     * frame.
     *
     * `rectOverride` lets callers pass a rect that differs from the
     * element's current bounding box — useful for drag, where we
     * want to invalidate both the *old* and *new* footprints in the
     * same call so glasses behind the dragged panel can clear its
     * trail and glasses ahead can pick up its new shadow.
     */
    _markGlassAndDependents(element, rectOverride) {
      if (this.glassSet.has(element)) {
        this._glassDirty.add(element);
      }
      const rootRect = this.root.getBoundingClientRect();
      const dpr = this._getRenderDpr();
      const elementDOMRect = rectOverride ?? element.getBoundingClientRect();
      const elementBox = this._getPixelRect(
        elementDOMRect,
        rootRect,
        dpr,
        this.glassSet.has(element) ? SHADOW_PAD : 0
      );
      let seenElement = false;
      for (const child of this._sortedChildren) {
        if (child === element) {
          seenElement = true;
          continue;
        }
        if (!seenElement) continue;
        if (!this.glassSet.has(child)) continue;
        const sampleRect = this._getPixelRect(
          child.getBoundingClientRect(),
          rootRect,
          dpr,
          SHADOW_PAD
        );
        if (_LiquidGlass._rectsIntersect(elementBox, sampleRect)) {
          this._glassDirty.add(child);
        }
      }
    }
    /**
     * Mark every glass element whose sample rect intersects the given
     * element's bounding rect, regardless of stacking order. Used by
     * the async cache-update callback (a wrapper's pixels just got
     * fresh, so any glass that samples them needs to re-render) and
     * by the public markChanged() API for elements outside the glass
     * set.
     */
    _markGlassesIntersecting(element) {
      const rootRect = this.root.getBoundingClientRect();
      const dpr = this._getRenderDpr();
      const elementBox = this._getPixelRect(
        element.getBoundingClientRect(),
        rootRect,
        dpr,
        this.glassSet.has(element) ? SHADOW_PAD : 0
      );
      for (const glass of this.glassSet) {
        const sampleRect = this._getPixelRect(
          glass.getBoundingClientRect(),
          rootRect,
          dpr,
          SHADOW_PAD
        );
        if (_LiquidGlass._rectsIntersect(elementBox, sampleRect)) {
          this._glassDirty.add(glass);
        }
      }
    }
    /**
     * Public API: mark an element (or all glass elements when called
     * with no arguments) as needing a shader re-render on the next
     * frame. Useful for content the library can't observe on its own —
     * a `<canvas>` whose pixels you just updated, an `<img>` you just
     * swapped via JS, a wrapper whose CSS background-image you just
     * changed, etc.
     *
     * For elements registered via `data-dynamic`, the library already
     * treats them as always-dirty and re-renders affected glasses
     * every frame; calling markChanged() on them is a no-op but is
     * harmless.
     *
     * @param element The element that changed visually. Pass nothing
     * (or `undefined`) to mark every glass on this instance dirty.
     */
    markChanged(element) {
      if (!element) {
        this._globalDirty = true;
        return;
      }
      this._userMarkedChanged.add(element);
    }
    _setupButtonListeners(el) {
      const state = { hover: false, pressed: false };
      this._buttonStates.set(el, state);
      const mark = () => this._markGlassAndDependents(el);
      const onOver = () => {
        state.hover = true;
        mark();
      };
      const onOut = () => {
        state.hover = false;
        state.pressed = false;
        mark();
      };
      const onDown = () => {
        state.pressed = true;
        mark();
      };
      const onUp = () => {
        state.pressed = false;
        mark();
      };
      el.addEventListener("pointerover", onOver);
      el.addEventListener("pointerout", onOut);
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
      this._buttonListeners.set(el, [
        () => el.removeEventListener("pointerover", onOver),
        () => el.removeEventListener("pointerout", onOut),
        () => el.removeEventListener("pointerdown", onDown),
        () => el.removeEventListener("pointerup", onUp),
        () => el.removeEventListener("pointercancel", onUp)
      ]);
    }
    // ────────────────────────────────────────────
    // Glass content pre-capture
    // ────────────────────────────────────────────
    /**
     * Re-capture the DOM content (text, icons, etc.) of glass elements
     * whose subtrees have been mutated since the last capture, hiding
     * the injected shader canvas so it isn't included.
     *
     * Pass `targets = null` to capture every glass element (used at
     * init and on resize); pass a Set to capture only specific ones.
     *
     * Guarded against concurrent execution: if a capture is already
     * running, the affected elements stay in `_glassContentDirty` and
     * the next render-loop tick picks them up.
     */
    async _captureGlassContent(targets = null) {
      if (!this.captureGlassContent || this._capturingGlassContent) return;
      this._capturingGlassContent = true;
      try {
        for (const [el, glassCanvas] of this.glassCanvases) {
          if (targets && !targets.has(el)) continue;
          const rect = el.getBoundingClientRect();
          const img = await this.capture.captureToCanvas(
            el,
            rect.width,
            rect.height,
            [glassCanvas]
          );
          if (img) {
            this._glassContentImages.set(el, img);
          }
        }
      } finally {
        this._capturingGlassContent = false;
      }
    }
    /**
     * Synchronously walk every non-glass direct child of root and
     * await its html-to-image capture so the cache is fully populated
     * by the time the render loop starts. Without this, the first
     * frame's glass shader sees an empty (white) local scene for
     * ~one or two frames while the async captures resolve.
     */
    async _prewarmStaticCaptures() {
      for (const child of this._sortedChildren) {
        if (this.glassSet.has(child)) continue;
        const tag = child.tagName;
        if (tag === "CANVAS" || tag === "IMG" || tag === "VIDEO") continue;
        if (child.hasAttribute("data-dynamic")) continue;
        try {
          await this.capture.captureElement(child, false);
        } catch (err) {
          console.warn("LiquidGlass: prewarm capture failed:", child, err);
        }
      }
    }
    // ────────────────────────────────────────────
    // Child ordering & stacking context
    // ────────────────────────────────────────────
    _getSortedChildren() {
      const children = Array.from(this.root.children);
      const rootDisplay = window.getComputedStyle(this.root).display;
      const isFlexOrGridParent = rootDisplay === "flex" || rootDisplay === "inline-flex" || rootDisplay === "grid" || rootDisplay === "inline-grid";
      const tagged = children.map((el, domIndex) => {
        const style = window.getComputedStyle(el);
        const hasStackingContext = _LiquidGlass._formsStackingContext(style, isFlexOrGridParent);
        const rawZ = parseInt(style.zIndex, 10);
        const zIndex = isNaN(rawZ) ? 0 : rawZ;
        return { el, domIndex, hasStackingContext, zIndex };
      });
      tagged.sort((a, b) => {
        if (!a.hasStackingContext && b.hasStackingContext) return -1;
        if (a.hasStackingContext && !b.hasStackingContext) return 1;
        if (a.hasStackingContext && b.hasStackingContext) {
          if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
        }
        return a.domIndex - b.domIndex;
      });
      return tagged.map((t) => t.el);
    }
    /**
     * Returns true when the element forms a CSS stacking context — i.e.
     * when its z-index participates in painting order. Mirrors the spec:
     * https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context
     *
     * Used by `_getSortedChildren` to decide painting order for the
     * local scene assembly. The set of triggers needs to match the
     * browser's actual stacking model — otherwise overlays end up
     * painted before the background image and get erased.
     */
    static _formsStackingContext(style, isFlexOrGridParent) {
      if (style.position !== "static") return true;
      if (isFlexOrGridParent && style.zIndex !== "auto") return true;
      if (parseFloat(style.opacity) < 1) return true;
      if (style.transform !== "none" && style.transform !== "") return true;
      if (style.filter !== "none" && style.filter !== "") return true;
      if (style.perspective !== "none" && style.perspective !== "") return true;
      if (style.clipPath !== "none" && style.clipPath !== "") return true;
      if (style.mixBlendMode !== "normal" && style.mixBlendMode !== "") return true;
      if (style.isolation === "isolate") return true;
      const bf = style.backdropFilter || style.webkitBackdropFilter;
      if (bf && bf !== "none") return true;
      const mask = style.maskImage || style.webkitMaskImage;
      if (mask && mask !== "none") return true;
      const contain = style.contain;
      if (contain && /\b(layout|paint|strict|content)\b/.test(contain)) return true;
      if (style.willChange) {
        const triggers = /* @__PURE__ */ new Set([
          "transform",
          "opacity",
          "filter",
          "backdrop-filter",
          "perspective",
          "clip-path",
          "mask",
          "mask-image",
          "isolation",
          "mix-blend-mode"
        ]);
        const tokens = style.willChange.split(",").map((t) => t.trim());
        for (const t of tokens) {
          if (triggers.has(t)) return true;
        }
      }
      return false;
    }
    _detectDynamic() {
      const dynEls = this.root.querySelectorAll("[data-dynamic]");
      for (const el of dynEls) {
        if (!this.glassSet.has(el)) {
          return true;
        }
      }
      const videos = this.root.querySelectorAll("video");
      for (const vid of videos) {
        if (!this.glassSet.has(vid)) {
          return true;
        }
      }
      return false;
    }
    // ────────────────────────────────────────────
    // Configuration
    // ────────────────────────────────────────────
    _getConfig(el) {
      const cachedEl = el;
      const configKey = el.dataset.config ?? "";
      if (cachedEl.configCacheKey !== configKey) {
        let perElement = {};
        if (configKey) {
          try {
            const parsed = JSON.parse(configKey);
            if (parsed && typeof parsed === "object") {
              perElement = parsed;
            } else {
              console.warn("LiquidGlass: data-config must decode to an object for element:", el);
            }
          } catch (_e) {
            console.warn("LiquidGlass: invalid JSON in data-config for element:", el);
          }
        }
        cachedEl.configCache = perElement;
        cachedEl.configCacheKey = configKey;
      }
      const config = { ...this.defaults, ...cachedEl.configCache || {} };
      if (config.button) {
        const state = this._buttonStates.get(el);
        if (state) {
          if (state.pressed) {
            config.zRadius = config.zRadius * 0.8;
            config.shadowSpread = config.shadowSpread * 1.2;
          } else if (state.hover) {
            config.brightness = config.brightness + 0.2;
          }
        }
      }
      return config;
    }
    // ────────────────────────────────────────────
    // Resize
    // ────────────────────────────────────────────
    _handleResize() {
      const dpr = this._getRenderDpr();
      const rect = this.root.getBoundingClientRect();
      this.capture.resize(dpr);
      this._activeRootSize = { width: rect.width, height: rect.height };
      for (const el of this.glassSet) {
        this._updateGlassCanvasSize(el);
      }
      this._glassCache.clear();
      if (this.captureGlassContent) {
        for (const el of this.glassSet) this._glassContentDirty.add(el);
      }
      this._globalDirty = true;
    }
    _getRenderDpr() {
      const deviceDpr = Math.min(window.devicePixelRatio || 1, 2);
      return Math.max(0.8, deviceDpr * this.renderScale);
    }
    _updateGlassCanvasSize(el) {
      const canvas = this.glassCanvases.get(el);
      if (!canvas) return;
      const dpr = this._getRenderDpr();
      const elW = Math.round(el.offsetWidth);
      const elH = Math.round(el.offsetHeight);
      const padW = SHADOW_PAD * 2;
      const padH = SHADOW_PAD * 2;
      canvas.width = Math.round((elW + padW) * dpr);
      canvas.height = Math.round((elH + padH) * dpr);
      canvas.style.cssText = [
        "position:absolute",
        `left:${-SHADOW_PAD}px`,
        `top:${-SHADOW_PAD}px`,
        `width:${elW + padW}px`,
        `height:${elH + padH}px`,
        "pointer-events:none",
        "z-index:-1",
        "background:transparent"
      ].join(";") + ";";
      this._glassLastSize.set(el, { w: elW, h: elH });
    }
    _checkGlassSizeChanges() {
      let changed = false;
      for (const el of this.glassSet) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const last = this._glassLastSize.get(el);
        if (!last || Math.abs(last.w - w) > 0.5 || Math.abs(last.h - h) > 0.5) {
          this._updateGlassCanvasSize(el);
          this._glassCache.delete(el);
          this.capture.invalidateCache(el);
          if (this.captureGlassContent) this._glassContentDirty.add(el);
          changed = true;
        }
      }
      return changed;
    }
    // ────────────────────────────────────────────
    // Floating (drag) behaviour — Pointer Events
    // ────────────────────────────────────────────
    /** Parse the current translate(x, y) values from an element's transform. */
    static _getTranslateXY(el) {
      const style = getComputedStyle(el);
      const matrix = style.transform;
      if (!matrix || matrix === "none") return [0, 0];
      const m = matrix.match(/matrix\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(",").map(Number);
        return [parts[4] || 0, parts[5] || 0];
      }
      return [0, 0];
    }
    _handlePointerDown(e) {
      for (let i = this._sortedChildren.length - 1; i >= 0; i--) {
        const el = this._sortedChildren[i];
        if (!this.glassSet.has(el)) continue;
        const config = this._getConfig(el);
        if (!config.floating) continue;
        const rect = el.getBoundingClientRect();
        const elW = el.offsetWidth;
        const elH = el.offsetHeight;
        const visualLeft = rect.left + (rect.width - elW) / 2;
        const visualTop = rect.top + (rect.height - elH) / 2;
        if (e.clientX >= visualLeft && e.clientX <= visualLeft + elW && e.clientY >= visualTop && e.clientY <= visualTop + elH) {
          const [tx, ty] = _LiquidGlass._getTranslateXY(el);
          this._drag.active = true;
          this._drag.element = el;
          this._drag.startX = e.clientX;
          this._drag.startY = e.clientY;
          this._drag.origTx = tx;
          this._drag.origTy = ty;
          el.style.cursor = "grabbing";
          el.setPointerCapture(e.pointerId);
          e.preventDefault();
          break;
        }
      }
    }
    _handlePointerMove(e) {
      if (!this._active) return;
      if (!e.pointerType || e.pointerType === "mouse") {
        const previousHoverElement = this._pointer.hoverElement;
        const now = performance.now();
        if (this._pointer.hasPosition && this._pointer.lastTime > 0) {
          const dt = Math.max(8, now - this._pointer.lastTime);
          const rawVelocityX = Math.max(-24, Math.min(24, (e.clientX - this._pointer.clientX) * 16 / dt));
          const rawVelocityY = Math.max(-24, Math.min(24, (e.clientY - this._pointer.clientY) * 16 / dt));
          this._pointer.velocityX = this._pointer.velocityX * 0.55 + rawVelocityX * 0.45;
          this._pointer.velocityY = this._pointer.velocityY * 0.55 + rawVelocityY * 0.45;
        }
        this._pointer.clientX = e.clientX;
        this._pointer.clientY = e.clientY;
        this._pointer.lastTime = now;
        this._pointer.hasPosition = true;
        const hoveredGlass = [...this.glassSet].find((el2) => {
          const rect = el2.getBoundingClientRect();
          return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        });
        this._pointer.active = Boolean(hoveredGlass);
        this._pointer.hoverElement = hoveredGlass || null;
        if (previousHoverElement && previousHoverElement !== hoveredGlass) {
          this._glassDirty.add(previousHoverElement);
        }
        if (hoveredGlass) this._glassDirty.add(hoveredGlass);
      }
      if (!this._drag.active) {
        for (const el2 of this.glassSet) {
          const config = this._getConfig(el2);
          if (!config.floating) continue;
          const rect = el2.getBoundingClientRect();
          const elW2 = el2.offsetWidth;
          const elH2 = el2.offsetHeight;
          const visualLeft = rect.left + (rect.width - elW2) / 2;
          const visualTop = rect.top + (rect.height - elH2) / 2;
          if (e.clientX >= visualLeft && e.clientX <= visualLeft + elW2 && e.clientY >= visualTop && e.clientY <= visualTop + elH2) {
            el2.style.cursor = "grab";
          } else {
            el2.style.cursor = "";
          }
        }
        return;
      }
      const el = this._drag.element;
      const dx = e.clientX - this._drag.startX;
      const dy = e.clientY - this._drag.startY;
      let newTx = this._drag.origTx + dx;
      let newTy = this._drag.origTy + dy;
      const rootRect = this.root.getBoundingClientRect();
      const elW = el.offsetWidth;
      const elH = el.offsetHeight;
      const elRect = el.getBoundingClientRect();
      const [curTx, curTy] = _LiquidGlass._getTranslateXY(el);
      const baseLeft = elRect.left + (elRect.width - elW) / 2 - rootRect.left - curTx;
      const baseTop = elRect.top + (elRect.height - elH) / 2 - rootRect.top - curTy;
      const margin = 10;
      const posLeft = baseLeft + newTx;
      const posTop = baseTop + newTy;
      const maxLeft = rootRect.width - elW - margin;
      const maxTop = rootRect.height - elH - margin;
      if (posLeft < margin) newTx += margin - posLeft;
      if (posTop < margin) newTy += margin - posTop;
      if (posLeft > maxLeft) newTx -= posLeft - maxLeft;
      if (posTop > maxTop) newTy -= posTop - maxTop;
      const oldRect = el.getBoundingClientRect();
      this._markGlassAndDependents(el, oldRect);
      el.style.transform = `translate(${newTx}px, ${newTy}px)`;
      this._markGlassAndDependents(el);
    }
    _handlePointerUp(_e) {
      if (!this._drag.active) return;
      const dragged = this._drag.element;
      dragged.style.cursor = "";
      this._drag.active = false;
      this._drag.element = null;
      this._markGlassAndDependents(dragged);
    }
    // ────────────────────────────────────────────
    // Render loop
    // ────────────────────────────────────────────
    _renderLoop() {
      if (!this._running || !this._active) {
        this._rafId = 0;
        return;
      }
      const now = performance.now();
      this._fpsFrames++;
      if (now - this._fpsTime >= 1e3) {
        this.fps = this._fpsFrames;
        this._fpsFrames = 0;
        this._fpsTime = now;
      }
      if (this._checkGlassSizeChanges()) {
      }
      if (this.captureGlassContent && this._glassContentDirty.size > 0 && !this._capturingGlassContent) {
        const targets = new Set(this._glassContentDirty);
        this._glassContentDirty.clear();
        this._captureGlassContent(targets);
      }
      try {
        this._renderFrame();
      } catch (err) {
        console.error("LiquidGlass: render error:", err);
      }
      this._rafId = requestAnimationFrame(() => this._renderLoop());
    }
    _renderFrame() {
      if (!this._active) return;
      const dpr = this._getRenderDpr();
      const rootRect = this.root.getBoundingClientRect();
      const isDragging = this._drag.active;
      if (this._scrolling) {
        const now = performance.now();
        if (now - this._lastScrollRender < SCROLL_RENDER_INTERVAL) return;
        this._lastScrollRender = now;
      }
      if (this._userMarkedChanged.size > 0) {
        for (const el of this._userMarkedChanged) {
          this._markGlassesIntersecting(el);
        }
        this._userMarkedChanged.clear();
      }
      if (this._globalDirty) {
        for (const el of this.glassSet) this._glassDirty.add(el);
        this._globalDirty = false;
      }
      if (this._positionDirty) {
        this._positionDirty = false;
        for (const el of this.glassSet) {
          const rect = el.getBoundingClientRect();
          const isViewportVisible = rect.width > 0 && rect.height > 0 && rect.bottom >= -SHADOW_PAD && rect.right >= -SHADOW_PAD && rect.left <= window.innerWidth + SHADOW_PAD && rect.top <= window.innerHeight + SHADOW_PAD;
          if (isViewportVisible) this._glassDirty.add(el);
        }
      }
      const needsRender = this._glassDirty.size > 0 || this._hasDynamic || isDragging;
      if (!needsRender) return;
      const dirtyTargets = new Set(this._glassDirty);
      this._glassDirty.clear();
      const renderedThisFrame = [];
      const scrollPriority = this._scrolling && this.glassSet.size > 1 ? [...this.glassSet][this._scrollPriorityIndex++ % this.glassSet.size] : null;
      const priorityElement = scrollPriority || this._pointer.hoverElement;
      const renderOrder = priorityElement && dirtyTargets.has(priorityElement) ? [priorityElement, ...this._sortedChildren.filter((child) => child !== priorityElement)] : this._sortedChildren;
      for (const child of renderOrder) {
        if (!this.glassSet.has(child)) continue;
        this._renderGlassElement(
          child,
          rootRect,
          dpr,
          isDragging,
          dirtyTargets,
          renderedThisFrame
        );
      }
    }
    /**
     * Render a single glass element by composing just the scene region
     * that can affect it, then running the shader over that local input.
     *
     * Whether the shader actually re-runs depends on:
     *   - explicit dirty mark for this element (in `dirtyTargets`),
     *   - any earlier glass in z-order that re-rendered this frame
     *     and whose rect intersects this glass's sample rect,
     *   - this glass having moved since last frame (position cache),
     *   - this glass having dynamic contributors in its sample (video,
     *     data-dynamic),
     *   - or active drag involving this element.
     *
     * On render, an entry is pushed to `renderedThisFrame` so later
     * glasses can check whether they need to refresh too.
     */
    _renderGlassElement(child, rootRect, dpr, isDragging, dirtyTargets, renderedThisFrame) {
      const config = this._getConfig(child);
      const elRect = child.getBoundingClientRect();
      const isViewportVisible = elRect.width > 0 && elRect.height > 0 && elRect.bottom >= -SHADOW_PAD && elRect.right >= -SHADOW_PAD && elRect.left <= window.innerWidth + SHADOW_PAD && elRect.top <= window.innerHeight + SHADOW_PAD;
      if (!isViewportVisible) return;
      const elW = child.offsetWidth;
      const elH = child.offsetHeight;
      const pointerX = this._pointer.clientX - elRect.left;
      const pointerY = this._pointer.clientY - elRect.top;
      const pointerActive = this._pointer.hasPosition && pointerX >= 0 && pointerX <= elRect.width && pointerY >= 0 && pointerY <= elRect.height;
      config.pointerX = pointerX;
      config.pointerY = pointerY;
      config.pointerActive = pointerActive ? 1 : 0;
      config.pointerVelocityX = this._pointer.velocityX;
      config.pointerVelocityY = this._pointer.velocityY;
      const centerX = elRect.left - rootRect.left + elRect.width / 2;
      const centerY = elRect.top - rootRect.top + elRect.height / 2;
      const glassCanvas = this.glassCanvases.get(child);
      const isBeingDragged = isDragging && this._drag.element === child;
      const sampleRect = this._getPixelRect(elRect, rootRect, dpr, SHADOW_PAD);
      const elementRect = this._getPixelRect(elRect, rootRect, dpr);
      const cached = this._glassCache.get(child);
      const posChanged = !cached || Math.abs(cached.centerX - centerX) > 0.5 || Math.abs(cached.centerY - centerY) > 0.5;
      const hasDynamicContributors = this._hasDynamic && this._glassHasDynamicContributors(child, sampleRect, rootRect, dpr);
      let priorGlassChanged = false;
      for (const r of renderedThisFrame) {
        if (_LiquidGlass._rectsIntersect(r.rect, sampleRect) && _LiquidGlass._rectsIntersect(r.elementRect, elementRect)) {
          priorGlassChanged = true;
          break;
        }
      }
      const isExplicitlyDirty = dirtyTargets.has(child);
      const needsShaderRender = isDragging ? isBeingDragged || isExplicitlyDirty || priorGlassChanged || hasDynamicContributors : !cached || posChanged || isExplicitlyDirty || priorGlassChanged || hasDynamicContributors;
      if (needsShaderRender && glassCanvas) {
        if (!claimGlassRenderBudget()) {
          this._glassDirty.add(child);
          return;
        }
        const renderW = glassCanvas.width;
        const renderH = glassCanvas.height;
        this._composeSceneForGlass(child, sampleRect, rootRect, dpr);
        this.renderer.uploadAndBlur(
          this._sceneCanvas,
          0,
          0,
          renderW,
          renderH,
          config.blurAmount
        );
        this.renderer.clear();
        this.renderer.renderGlassPanel(
          config,
          elW,
          elH,
          dpr
        );
        const ctx = glassCanvas.getContext("2d");
        ctx.clearRect(0, 0, glassCanvas.width, glassCanvas.height);
        ctx.drawImage(
          this.renderer.canvas,
          0,
          0,
          glassCanvas.width,
          glassCanvas.height,
          0,
          0,
          glassCanvas.width,
          glassCanvas.height
        );
        this._glassCache.set(child, { centerX, centerY });
        renderedThisFrame.push({ rect: sampleRect, elementRect });
      }
    }
    /**
     * Build the local input scene for a glass panel by walking only the
     * contributors that paint before it in the stacking order.
     */
    _composeSceneForGlass(currentGlass, sampleRect, rootRect, dpr) {
      this._prepareSceneCanvas(sampleRect.w, sampleRect.h);
      this._drawBackgroundToScene(sampleRect, rootRect, dpr);
      for (const child of this._sortedChildren) {
        if (child === currentGlass) break;
        if (this.glassSet.has(child)) {
          this._drawPriorGlassToScene(child, sampleRect, rootRect, dpr);
        } else {
          this._drawNonGlassChildToScene(child, sampleRect, rootRect, dpr);
        }
      }
    }
    /**
     * Draw the fixed page backdrop into the local scene before composing
     * DOM contributors. The package normally only sees direct children of
     * `root`, so this explicit layer lets a glass panel refract an image
     * that lives behind the whole page rather than a per-card duplicate.
    */
    _drawBackgroundToScene(sampleRect, rootRect, dpr) {
      const backgroundCanvas = this.backgroundCanvas;
      if (backgroundCanvas && backgroundCanvas.width > 0 && backgroundCanvas.height > 0) {
        const canvasScaleX = backgroundCanvas.width / Math.max(1, window.innerWidth);
        const canvasScaleY = backgroundCanvas.height / Math.max(1, window.innerHeight);
        const cssX = rootRect.left + sampleRect.x / dpr;
        const cssY = rootRect.top + sampleRect.y / dpr;
        this._sceneCtx.drawImage(
          backgroundCanvas,
          cssX * canvasScaleX,
          cssY * canvasScaleY,
          sampleRect.w / dpr * canvasScaleX,
          sampleRect.h / dpr * canvasScaleY,
          0,
          0,
          sampleRect.w,
          sampleRect.h
        );
        return;
      }
      const image = this.backgroundImage;
      if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
      const backdrop = getSharedBackdropRaster(image, dpr);
      const globalX = rootRect.left * dpr + sampleRect.x;
      const globalY = rootRect.top * dpr + sampleRect.y;
      const ctx = this._sceneCtx;
      ctx.drawImage(backdrop, globalX, globalY, sampleRect.w, sampleRect.h, 0, 0, sampleRect.w, sampleRect.h);
      const overlay = ctx.createLinearGradient(0, 0, 0, sampleRect.h);
      overlay.addColorStop(0, "rgba(8, 10, 20, 0.2)");
      overlay.addColorStop(1, "rgba(10, 12, 24, 0.58)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, sampleRect.w, sampleRect.h);
      const tint = ctx.createLinearGradient(0, 0, sampleRect.w, sampleRect.h);
      tint.addColorStop(0, "rgba(24, 48, 88, 0.16)");
      tint.addColorStop(0.52, "rgba(18, 32, 66, 0.09)");
      tint.addColorStop(1, "rgba(8, 18, 40, 0.2)");
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, sampleRect.w, sampleRect.h);
    }
    _prepareSceneCanvas(width, height) {
      if (this._sceneCanvas.width !== width || this._sceneCanvas.height !== height) {
        this._sceneCanvas.width = width;
        this._sceneCanvas.height = height;
      } else {
        this._sceneCtx.clearRect(0, 0, width, height);
      }
      this._sceneCtx.fillStyle = "#0b162b";
      this._sceneCtx.fillRect(0, 0, width, height);
    }
    _glassHasDynamicContributors(currentGlass, sampleRect, rootRect, dpr) {
      if (this._childHasDynamicContent(currentGlass)) return true;
      for (const child of this._sortedChildren) {
        if (child === currentGlass) break;
        if (this.glassSet.has(child)) continue;
        if (!this._childHasDynamicContent(child)) continue;
        if (this._childTouchesSample(child, sampleRect, rootRect, dpr)) {
          return true;
        }
      }
      return false;
    }
    _childHasDynamicContent(child) {
      if (child.hasAttribute("data-dynamic")) return true;
      if (child.tagName === "VIDEO") return true;
      return child.querySelector("[data-dynamic], video") !== null;
    }
    _drawNonGlassChildToScene(child, sampleRect, rootRect, dpr) {
      const tag = child.tagName;
      if (tag === "CANVAS" || tag === "IMG" || tag === "VIDEO") {
        this._drawMediaElement(child, this._sceneCtx, sampleRect, rootRect, dpr);
        return;
      }
      if (!this._elementTouchesSample(child, sampleRect, rootRect, dpr)) {
        return;
      }
      this._captureMediaDescendants(child, this._sceneCtx, sampleRect, rootRect, dpr);
      const isDynamic = child.hasAttribute("data-dynamic");
      this.capture.captureElement(child, isDynamic);
      const rect = this._getPixelRect(child.getBoundingClientRect(), rootRect, dpr);
      this.capture.drawCachedElement(
        child,
        this._sceneCtx,
        rect.x - sampleRect.x,
        rect.y - sampleRect.y,
        rect.w,
        rect.h
      );
    }
    /**
     * Recursively find and draw all img/video/canvas elements inside
     * a wrapper, skipping any glass elements and their injected canvases.
     */
    _captureMediaDescendants(parent, targetCtx, sampleRect, rootRect, dpr) {
      const mediaEls = parent.querySelectorAll("img, video, canvas");
      for (const el of mediaEls) {
        const htmlEl = el;
        let isGlassCanvas = false;
        for (const [, gc] of this.glassCanvases) {
          if (gc === el) {
            isGlassCanvas = true;
            break;
          }
        }
        if (isGlassCanvas) continue;
        this._drawMediaElement(htmlEl, targetCtx, sampleRect, rootRect, dpr);
      }
    }
    /** Draw a single img/video/canvas into a local scene canvas. */
    _drawMediaElement(el, targetCtx, sampleRect, rootRect, dpr) {
      const tag = el.tagName;
      const r = el.getBoundingClientRect();
      if (!this._elementTouchesSample(el, sampleRect, rootRect, dpr)) return false;
      const rect = this._getPixelRect(r, rootRect, dpr);
      const dx = rect.x - sampleRect.x;
      const dy = rect.y - sampleRect.y;
      const dw = rect.w;
      const dh = rect.h;
      if (dw <= 0 || dh <= 0) return false;
      if (tag === "CANVAS") {
        const liveCanvas = el;
        if (liveCanvas.width <= 0 || liveCanvas.height <= 0) return false;
        targetCtx.drawImage(liveCanvas, dx, dy, dw, dh);
        return true;
      } else if (tag === "IMG") {
        const img = el;
        if (!img.complete || img.naturalWidth === 0) return false;
        this._drawMediaFitted(
          targetCtx,
          img,
          img.naturalWidth,
          img.naturalHeight,
          el,
          r,
          dx,
          dy,
          dw,
          dh
        );
        return true;
      } else if (tag === "VIDEO") {
        const vid = el;
        if (vid.readyState < 1) return false;
        try {
          this._drawMediaFitted(
            targetCtx,
            vid,
            vid.videoWidth,
            vid.videoHeight,
            el,
            r,
            dx,
            dy,
            dw,
            dh
          );
        } catch {
          return false;
        }
        return true;
      }
      return false;
    }
    /** Draw an img or video onto a local scene canvas, respecting object-fit. */
    _drawMediaFitted(targetCtx, mediaEl, natW, natH, child, r, dx, dy, dw, dh) {
      if (natW && natH) {
        const computed = getComputedStyle(child);
        const fit = computed.objectFit || "fill";
        const pos = computed.objectPosition || "50% 50%";
        const src = _LiquidGlass._objectFitRect(natW, natH, r.width, r.height, fit, pos);
        targetCtx.drawImage(mediaEl, src.sx, src.sy, src.sw, src.sh, dx, dy, dw, dh);
      } else {
        targetCtx.drawImage(mediaEl, dx, dy, dw, dh);
      }
    }
    _drawPriorGlassToScene(child, sampleRect, rootRect, dpr) {
      const glassCanvas = this.glassCanvases.get(child);
      const elRect = child.getBoundingClientRect();
      if (glassCanvas) {
        const shaderRect = this._getPixelRect(elRect, rootRect, dpr, SHADOW_PAD);
        if (_LiquidGlass._rectsIntersect(shaderRect, sampleRect)) {
          this._sceneCtx.drawImage(
            glassCanvas,
            0,
            0,
            glassCanvas.width,
            glassCanvas.height,
            shaderRect.x - sampleRect.x,
            shaderRect.y - sampleRect.y,
            shaderRect.w,
            shaderRect.h
          );
        }
      }
      const contentImg = this._glassContentImages.get(child);
      if (!contentImg) return;
      const contentRect = this._getPixelRect(elRect, rootRect, dpr);
      if (!_LiquidGlass._rectsIntersect(contentRect, sampleRect)) return;
      this._sceneCtx.drawImage(
        contentImg,
        contentRect.x - sampleRect.x,
        contentRect.y - sampleRect.y,
        contentRect.w,
        contentRect.h
      );
    }
    _getPixelRect(rect, rootRect, dpr, pad = 0) {
      return {
        x: Math.round((rect.left - rootRect.left - pad) * dpr),
        y: Math.round((rect.top - rootRect.top - pad) * dpr),
        w: Math.round((rect.width + pad * 2) * dpr),
        h: Math.round((rect.height + pad * 2) * dpr)
      };
    }
    _childTouchesSample(child, sampleRect, rootRect, dpr) {
      if (this._elementTouchesSample(child, sampleRect, rootRect, dpr)) return true;
      for (const el of child.querySelectorAll("[data-dynamic], video")) {
        if (this._elementTouchesSample(el, sampleRect, rootRect, dpr)) {
          return true;
        }
      }
      return false;
    }
    _elementTouchesSample(element, sampleRect, rootRect, dpr) {
      const pad = this._getPaintOverflowPad(element);
      const bounds = this._getPixelRect(element.getBoundingClientRect(), rootRect, dpr, pad);
      return _LiquidGlass._rectsIntersect(bounds, sampleRect);
    }
    _getPaintOverflowPad(element) {
      if (this.glassSet.has(element)) return SHADOW_PAD;
      const style = getComputedStyle(element);
      const backdropFilter = style.backdropFilter || style.webkitBackdropFilter;
      const maskImage = style.maskImage || style.webkitMaskImage;
      const paintsOutsideBounds = style.boxShadow && style.boxShadow !== "none" || style.textShadow && style.textShadow !== "none" || style.filter && style.filter !== "none" || backdropFilter && backdropFilter !== "none" || maskImage && maskImage !== "none" || style.mixBlendMode && style.mixBlendMode !== "normal";
      return paintsOutsideBounds ? SHADOW_PAD : 0;
    }
    static _rectsIntersect(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
    /** Compute the source rectangle for drawImage that replicates CSS object-fit / object-position. */
    static _objectFitRect(natW, natH, boxW, boxH, fit, pos) {
      let sx = 0, sy = 0, sw = natW, sh = natH;
      if (fit === "fill" || fit === "scale-down" && natW <= boxW && natH <= boxH) {
        return { sx, sy, sw, sh };
      }
      const parts = pos.split(/\s+/);
      const parseFrac = (v, total) => {
        if (v.endsWith("%")) return parseFloat(v) / 100;
        return parseFloat(v) / total;
      };
      const fx = parseFrac(parts[0] || "50%", boxW);
      const fy = parseFrac(parts[1] || "50%", boxH);
      if (fit === "cover") {
        const scale = Math.max(boxW / natW, boxH / natH);
        sw = boxW / scale;
        sh = boxH / scale;
        sx = (natW - sw) * fx;
        sy = (natH - sh) * fy;
      } else if (fit === "contain" || fit === "scale-down") {
        return { sx: 0, sy: 0, sw: natW, sh: natH };
      } else if (fit === "none") {
        sw = boxW;
        sh = boxH;
        sx = (natW - sw) * fx;
        sy = (natH - sh) * fy;
      }
      sx = Math.max(0, Math.min(sx, natW - 1));
      sy = Math.max(0, Math.min(sy, natH - 1));
      sw = Math.min(sw, natW - sx);
      sh = Math.min(sh, natH - sy);
      return { sx, sy, sw, sh };
    }
  };

  // hero-ripple.js
  var VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = (aPosition + 1.0) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;
  var FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uText;
  uniform sampler2D uTrail;
  uniform vec2 uTrailSize;

  void main() {
    vec2 stepSize = 1.0 / uTrailSize;
    vec4 trail = texture2D(uTrail, vUv);
    vec2 slope = vec2(
      texture2D(uTrail, vUv + vec2(stepSize.x, 0.0)).a - texture2D(uTrail, vUv - vec2(stepSize.x, 0.0)).a,
      texture2D(uTrail, vUv + vec2(0.0, stepSize.y)).a - texture2D(uTrail, vUv - vec2(0.0, stepSize.y)).a
    );
    vec2 uv = vUv + slope * 0.028 + (trail.rg - 0.5) * trail.a * 0.008;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0);
    } else {
      vec4 text = texture2D(uText, uv);
      gl_FragColor = vec4(text.rgb * text.a, text.a);
    }
  }
`;
  var TITLE_PADDING = 16;
  var rasterizeTitle = (title) => {
    const rect = title.getBoundingClientRect();
    const bitmap = document.createElement("canvas");
    const scale = Math.min(Math.max(devicePixelRatio || 1, 1.5), 2);
    bitmap.width = Math.ceil((rect.width + TITLE_PADDING * 2) * scale);
    bitmap.height = Math.ceil((rect.height + TITLE_PADDING * 2) * scale);
    const context = bitmap.getContext("2d");
    context.scale(scale, scale);
    context.textBaseline = "alphabetic";
    const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const style = getComputedStyle(node.parentElement);
      context.font = style.font;
      context.fillStyle = style.color;
      context.letterSpacing = "0px";
      let line = [];
      const flush = () => {
        if (!line.length) return;
        const metrics = context.measureText(line.map(({ segment }) => segment).join(""));
        const first = line[0].glyph;
        const baseline = first.top - rect.top + TITLE_PADDING + (first.height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + 1;
        for (const { segment, glyph } of line) context.fillText(segment, glyph.left - rect.left + TITLE_PADDING, baseline);
      };
      for (const { segment, index } of segmenter.segment(node.textContent)) {
        range.setStart(node, index);
        range.setEnd(node, index + segment.length);
        const glyph = range.getBoundingClientRect();
        if (!glyph.width) continue;
        if (line.length && Math.abs(glyph.top - line[0].glyph.top) > 2) {
          flush();
          line = [];
        }
        line.push({ segment, glyph });
      }
      flush();
    }
    return bitmap;
  };
  var initHeroRipple = () => {
    const root = document.querySelector("[data-hero-ripple]");
    const title = root?.querySelector("h1");
    const canvas = root?.querySelector("canvas");
    if (!title || !canvas || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, powerPreference: "low-power" });
    if (!gl) return;
    const shader = (type, source) => {
      const part = gl.createShader(type);
      gl.shaderSource(part, source);
      gl.compileShader(part);
      if (!gl.getShaderParameter(part, gl.COMPILE_STATUS)) return null;
      return part;
    };
    const vertex = shader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const positions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const attribute = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(gl.getUniformLocation(program, "uText"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "uTrail"), 1);
    const makeTexture = (unit) => {
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    const textTexture = makeTexture(0);
    const trailTexture = makeTexture(1);
    const trailCanvas = document.createElement("canvas");
    const trailContext = trailCanvas.getContext("2d");
    const touches = [];
    let ready = false;
    let visible = true;
    let frame = 0;
    let captureVersion = 0;
    const draw = (now) => {
      frame = 0;
      if (!ready || !visible || document.hidden || document.body.dataset.view !== "home") return;
      trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      for (let i = touches.length - 1; i >= 0; i -= 1) {
        const age = (now - touches[i].time) / 480;
        if (age >= 1) {
          touches.splice(i, 1);
          continue;
        }
        const { x, y, dx, dy } = touches[i];
        const radius = trailCanvas.width * (0.045 + age * 0.025);
        const cx = x * trailCanvas.width;
        const cy = y * trailCanvas.height;
        const red = Math.round(128 + dx * 105);
        const green = Math.round(128 - dy * 105);
        const gradient = trailContext.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(${red}, ${green}, 255, ${0.7 * (1 - age)})`);
        gradient.addColorStop(1, `rgba(${red}, ${green}, 255, 0)`);
        trailContext.fillStyle = gradient;
        trailContext.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, trailTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      root.classList.toggle("is-ripple-active", touches.length > 0);
      if (touches.length) frame = requestAnimationFrame(draw);
    };
    const requestDraw = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const capture = async () => {
      const version2 = ++captureVersion;
      ready = false;
      root.classList.remove("is-ripple-ready");
      root.classList.remove("is-ripple-active");
      try {
        await document.fonts.ready;
        const rect = title.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const bitmap = rasterizeTitle(title);
        if (version2 !== captureVersion) return;
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.style.left = `${-TITLE_PADDING}px`;
        canvas.style.top = `${-TITLE_PADDING}px`;
        canvas.style.width = `${rect.width + TITLE_PADDING * 2}px`;
        canvas.style.height = `${rect.height + TITLE_PADDING * 2}px`;
        trailCanvas.width = 64;
        trailCanvas.height = Math.max(16, Math.round(64 * rect.height / rect.width));
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, trailTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
        gl.uniform2f(gl.getUniformLocation(program, "uTrailSize"), trailCanvas.width, trailCanvas.height);
        gl.viewport(0, 0, canvas.width, canvas.height);
        ready = true;
        draw(performance.now());
        root.classList.add("is-ripple-ready");
      } catch (error) {
        console.warn("Hero ripple unavailable; keeping the HTML title.", error);
      }
    };
    window.addEventListener("pointermove", (event) => {
      if (!ready || event.pointerType !== "mouse" || !visible || document.body.dataset.view !== "home") return;
      const rect = title.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      const x = (event.clientX - rect.left + TITLE_PADDING) / (rect.width + TITLE_PADDING * 2);
      const y = (event.clientY - rect.top + TITLE_PADDING) / (rect.height + TITLE_PADDING * 2);
      const last = touches.at(-1);
      touches.push({ x, y, dx: last ? Math.max(-1, Math.min(1, (x - last.x) * 9)) : 0, dy: last ? Math.max(-1, Math.min(1, (y - last.y) * 9)) : 0, time: performance.now() });
      if (touches.length > 12) touches.shift();
      requestDraw();
    }, { passive: true });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestDraw();
    }).observe(title);
    new ResizeObserver(() => {
      window.clearTimeout(capture.resizeTimer);
      capture.resizeTimer = window.setTimeout(capture, 150);
    }).observe(title);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) requestDraw();
    });
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      ready = false;
      root.classList.remove("is-ripple-ready", "is-ripple-active");
    });
    void capture();
  };

  // script.js
  var GLASS_DEBUG_PREFIX = "[DEBUG-glass-life-116]";
  var glassDebugEnabled = new URLSearchParams(window.location.search).get("debugGlass") === "1";
  var glassDebugEntries = [];
  var glassDebugPanel = null;
  var glassDebugSummary = null;
  var glassDebugOutput = null;
  var getGlassDebugSnapshot = () => ({ ready: false });
  var updateGlassDebugPanel = () => {
    if (!glassDebugPanel || !glassDebugSummary || !glassDebugOutput) return;
    glassDebugSummary.textContent = `Glass debug \xB7 ${glassDebugEntries.length} events`;
    glassDebugOutput.textContent = glassDebugEntries.slice(-24).map((entry) => JSON.stringify(entry)).join("\n");
    glassDebugOutput.scrollTop = glassDebugOutput.scrollHeight;
  };
  var recordGlassDebug = (event, details = {}) => {
    if (!glassDebugEnabled) return;
    const entry = {
      wallTime: (/* @__PURE__ */ new Date()).toISOString(),
      elapsedMs: Math.round(performance.now()),
      event,
      visibility: document.visibilityState,
      scrollY: Math.round(window.scrollY),
      ...details
    };
    glassDebugEntries.push(entry);
    if (glassDebugEntries.length > 300) glassDebugEntries.shift();
    console.info(GLASS_DEBUG_PREFIX, JSON.stringify(entry));
    updateGlassDebugPanel();
  };
  var installGlassDebugPanel = () => {
    if (!glassDebugEnabled || !document.body || glassDebugPanel) return;
    const style = document.createElement("style");
    style.textContent = `
    [data-glass-debug-panel] { position: fixed; z-index: 2147483646; left: max(8px, env(safe-area-inset-left)); bottom: max(8px, env(safe-area-inset-bottom)); width: min(30rem, calc(100vw - 16px)); color: #eaf2ff; font: 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
    [data-glass-debug-panel] details { overflow: hidden; border: 1px solid rgb(153 194 255 / 42%); border-radius: 10px; background: rgb(5 13 28 / 94%); box-shadow: 0 8px 28px rgb(0 0 0 / 30%); }
    [data-glass-debug-panel] summary { min-height: 40px; padding: 10px 12px; cursor: pointer; font-weight: 700; touch-action: manipulation; }
    [data-glass-debug-panel] [data-debug-actions] { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 10px 10px; }
    [data-glass-debug-panel] button { min-height: 40px; padding: 0 10px; border: 1px solid rgb(153 194 255 / 30%); border-radius: 7px; background: #122546; color: inherit; font: inherit; touch-action: manipulation; }
    [data-glass-debug-panel] pre { max-height: 32vh; overflow: auto; margin: 0; padding: 0 10px 10px; white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
  `;
    const panel = document.createElement("aside");
    panel.dataset.glassDebugPanel = "";
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const actions = document.createElement("div");
    actions.dataset.debugActions = "";
    const captureButton = document.createElement("button");
    captureButton.type = "button";
    captureButton.textContent = "\u8A18\u9304\u76EE\u524D\u72C0\u614B";
    captureButton.addEventListener("click", () => recordGlassDebug("manual-snapshot", { snapshot: getGlassDebugSnapshot() }));
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "\u8907\u88FD\u7D00\u9304";
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(glassDebugEntries, null, 2));
        copyButton.textContent = "\u5DF2\u8907\u88FD";
      } catch {
        copyButton.textContent = "\u5C55\u958B\u5F8C\u9577\u6309\u7D00\u9304\u8907\u88FD";
      }
    });
    const output = document.createElement("pre");
    output.setAttribute("aria-live", "polite");
    actions.append(captureButton, copyButton);
    details.append(summary, actions, output);
    panel.append(details);
    document.head.append(style);
    document.body.append(panel);
    glassDebugPanel = panel;
    glassDebugSummary = summary;
    glassDebugOutput = output;
    updateGlassDebugPanel();
  };
  if (glassDebugEnabled) {
    window.NutnGlassDebug = Object.freeze({
      enabled: true,
      record: recordGlassDebug
    });
  }
  var header = document.querySelector("[data-header]");
  var menuToggle = document.querySelector(".menu-toggle");
  var siteNav = document.querySelector("#site-nav");
  var viewButtons = [...document.querySelectorAll("[data-view]")];
  var viewTabs = [...document.querySelectorAll(".view-tab")];
  var viewPanels = [...document.querySelectorAll("[data-view-panel]")];
  var scheduleList = document.querySelector("[data-schedule-list]");
  var projectList = document.querySelector("[data-project-list]");
  var projectDialog = document.querySelector("#project-dialog");
  var projectDialogTitle = document.querySelector("#project-dialog-title");
  var projectDialogEnglishTitle = document.querySelector("#project-dialog-title-en");
  var projectDialogGroup = document.querySelector("#project-dialog-group");
  var projectDialogMembers = document.querySelector("#project-dialog-members");
  var projectDialogTags = document.querySelector("#project-dialog-tags");
  var projectDialogSummary = document.querySelector("#project-dialog-summary");
  var projectDialogSummaryContent = document.querySelector("#project-dialog-summary-content");
  var projectDialogClose = document.querySelector("[data-project-dialog-close]");
  var projects = [
    { id: "01", code: "NUTN-CSIE-PRJ-116-001", group: "sense", title: "\u7B2C 01 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u9673\u4FCA\u4EA6\u3001\u5433\u8A8C\u8ED2", studentIds: "S11259001\u3001S11259009", advisor: "\u6731\u660E\u6BC5", time: "13:00 ~ 13:15", conferenceTags: [] },
    { id: "02", code: "NUTN-CSIE-PRJ-116-002", group: "sense", title: "\u7B2C 02 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u9673\u51FD\u5F97\u3001\u9EC3\u67CF\u667A", studentIds: "S11259002\u3001S11259016", advisor: "\u674E\u5065\u8208", time: "13:15 ~ 13:30", conferenceTags: [] },
    { id: "03", code: "NUTN-CSIE-PRJ-116-003", group: "sense", title: "\u904B\u7528 Transformer \u7D50\u5408\u5149\u6D41\u9810\u6E2C\u884C\u4EBA\u8207\u884C\u8ECA\u8DEF\u5F91\u5BE6\u73FE\u7528\u8DEF\u4EBA\u5B89\u5168", titleEn: "Enhancing Road User Safety by Predicting Pedestrian and Vehicle Trajectories Using Transformer-Integrated Optical Flow", members: "\u7FC1\u7ACB\u6668\u3001\u9EC3\u53EF\u745C\u3001\u6D2A\u4F2F\u7FCA", studentIds: "S11259004\u3001S11259035\u3001S11259046", advisor: "\u9673\u5B97\u79A7", time: "13:30 ~ 13:45", conferenceTags: ["TANET 2026"] },
    { id: "04", code: "NUTN-CSIE-PRJ-116-004", group: "sense", title: "\u7B2C 04 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u5F35\u4EE5\u878D\u3001\u5442\u5B88\u52F3\u3001\u5085\u8702\u8CB4", studentIds: "S11259005\u3001S11259007\u3001S11259036", advisor: "\u6731\u660E\u6BC5", time: "13:45 ~ 14:00", conferenceTags: [] },
    { id: "05", code: "NUTN-CSIE-PRJ-116-005", group: "sense", title: "\u7B2C 05 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u9673\u88D5\u8343\u3001\u6797\u660E\u4EAE", studentIds: "S11259006\u3001S11259053", advisor: "\u674E\u5EFA\u6A39", time: "14:00 ~ 14:15", conferenceTags: [] },
    { id: "06", code: "NUTN-CSIE-PRJ-116-006", group: "sense", title: "\u7B2C 06 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u9418\u57F9\u5609\u3001\u66FE\u91D1\u5B8F\u3001\u8607\u5955\u5B89", studentIds: "S11259008\u3001S11259030\u3001S11259047", advisor: "\u9673\u69AE\u9298", time: "14:25 ~ 14:40", conferenceTags: [] },
    { id: "07", code: "NUTN-CSIE-PRJ-116-007", group: "sense", title: "\u7B2C 07 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u56B4\u624D\u52DD\u3001\u674E\u4F7E\u6069\u3001\u9EC3\u8056\u5091", studentIds: "S11259011\u3001S11259044\u3001S11259055", advisor: "\u8607\u6EA2\u82B3", time: "14:40 ~ 14:55", conferenceTags: [] },
    { id: "08", code: "NUTN-CSIE-PRJ-116-008", group: "sense", title: "\u7B2C 08 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u674E\u7965\u5B89\u3001\u8521\u4F91\u8ED2", studentIds: "S11259012\u3001S11259040", advisor: "\u674E\u5EFA\u6A39", time: "14:55 ~ 15:10", conferenceTags: [] },
    { id: "09", code: "NUTN-CSIE-PRJ-116-009", group: "sense", title: "\u81EA\u7136\u8A9E\u8A00\u5C0E\u5411\u7684\u4E09\u7DAD\u8996\u89BA\u7406\u89E3\u8207\u7269\u4EF6\u5B9A\u4F4D", titleEn: "Natural Language-Guided 3D Visual Understanding and Object Localization", members: "\u7F85\u6690\u5A81\u3001\u838A\u65FB\u82B3\u3001\u674E\u5B89\u4EE5", studentIds: "S11259013\u3001S11259019\u3001S11259029", advisor: "\u6797\u671D\u8208", time: "15:10 ~ 15:25", conferenceTags: [] },
    { id: "10", code: "NUTN-CSIE-PRJ-116-010", group: "decision", title: "\u57FA\u65BC VGGT \u4E4B\u591A\u8996\u89D2 3D \u91CD\u5EFA\u6539\u9032", titleEn: "Enhancing VGGT for Efficient Multi-View 3D Reconstruction", members: "\u9EC3\u5B50\u9F4A\u3001\u6797\u5D07\u744B\u3001\u9673\u51A0\u53CB", studentIds: "S11259014\u3001S11259031\u3001S11259039", advisor: "\u6797\u671D\u8208", time: "13:00 ~ 13:15", conferenceTags: [] },
    { id: "11", code: "NUTN-CSIE-PRJ-116-011", group: "decision", title: "\u7B2C 11 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u6D2A\u7B71\u6674\u3001\u5F35\u83EF\u5EAD", studentIds: "S11259017\u3001S11259042", advisor: "\u674E\u5EFA\u6A39", time: "13:15 ~ 13:30", conferenceTags: [] },
    { id: "12", code: "NUTN-CSIE-PRJ-116-012", group: "decision", title: "\u4E2D\u91AB\u8A3A\u65B7\u6CBB\u7642\u7CFB\u7D71", titleEn: "Traditional Chinese Medicine Diagnosis and Treatment System", members: "\u694A\u8AED\u660C\u3001\u82B1\u63DA\u666F\u3001\u674E\u6CF3\u5100", studentIds: "S11259018\u3001S11259025\u3001S11259049", advisor: "\u9AD8\u555F\u6D32", time: "13:30 ~ 13:45", conferenceTags: [] },
    { id: "13", code: "NUTN-CSIE-PRJ-116-013", group: "decision", title: "\u7B2C 13 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u6B66\u660E\u4E56\u3001\u856D\u9E97\u9E97", studentIds: "S11259020\u3001S11259021", advisor: "\u674E\u5065\u8208", time: "13:45 ~ 14:00", conferenceTags: [] },
    { id: "14", code: "NUTN-CSIE-PRJ-116-014", group: "decision", title: "\u7B2C 14 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u9EC3\u5955\u777F\u3001\u6797\u79C9\u9054\u3001\u8449\u82A2\u6770", studentIds: "S11259024\u3001S11259027\u3001S11259041", advisor: "\u9AD8\u555F\u6D32", time: "14:00 ~ 14:15", conferenceTags: [] },
    { id: "15", code: "NUTN-CSIE-PRJ-116-015", group: "decision", title: "\u7B2C 15 \u7D44\u5C08\u984C\u4F5C\u54C1", members: "\u77F3\u7693\u5B87", studentIds: "S11259032", advisor: "\u6731\u660E\u6BC5", time: "14:25 ~ 14:40", conferenceTags: [] },
    { id: "16", code: "NUTN-CSIE-PRJ-116-016", group: "decision", title: "\u57FA\u65BC Slurm \u8207 Kubernetes \u67B6\u69CB\u4E0B AI \u4F3A\u670D\u5668 GPU \u5DE5\u4F5C\u8CA0\u8F09\u667A\u6167\u6392\u7A0B", titleEn: "Intelligent GPU Workload Scheduling Techniques for AI Servers under a Slurm-on-Kubernetes Architecture", members: "\u856D\u53CB\u7FF0\u3001\u912D\u73FD\u5347", studentIds: "S11259033\u3001S11259043", advisor: "\u9673\u5B97\u79A7", time: "14:40 ~ 14:55", conferenceTags: ["TANET 2026"], summary: [
      {
        paragraph: "\u8FD1\u5E74\u4F86\uFF0C\u5927\u578B\u8A9E\u8A00\u6A21\u578B\u8207\u751F\u6210\u5F0F AI \u5FEB\u901F\u767C\u5C55\uFF0CGPU \u5DF2\u6210\u70BA\u8A13\u7DF4\u3001\u63A8\u8AD6\u8207\u8CC7\u6599\u8655\u7406\u7684\u4E3B\u8981\u904B\u7B97\u8CC7\u6E90\u3002\u7136\u800C\u5927\u5B78\u5BE6\u9A57\u5BA4\u8207\u4E2D\u5C0F\u578B\u53E2\u96C6\u5E38\u7531\u4E0D\u540C\u4E16\u4EE3 GPU \u7D44\u6210\uFF0C\u4E14 NVIDIA MPS \u5141\u8A31\u591A\u500B\u5DE5\u4F5C\u5171\u4EAB\u540C\u4E00\u5F35 GPU\uFF0C\u4F7F GPU \u5229\u7528\u7387\u3001\u5DE5\u4F5C\u5B8C\u6210\u6642\u9593\u8207\u6279\u6B21\u4F47\u5217\u7BA1\u7406\u96E3\u4EE5\u540C\u6642\u6700\u4F73\u5316\uFF0C\u5E38\u5E38\u9762\u81E8\u4EE5\u4E0B\u56F0\u5883\uFF1A",
        bullets: [
          "\u7570\u8CEA GPU \u7684\u904B\u7B97\u80FD\u529B\u8207\u8A18\u61B6\u9AD4\u5BB9\u91CF\u4E0D\u540C\uFF0C\u5DE5\u4F5C\u653E\u7F6E\u4E0D\u80FD\u53EA\u770B GPU \u6578\u91CF\u3002",
          "MPS \u914D\u984D\u6703\u5F71\u97FF\u5171\u7F6E\u5DE5\u4F5C\u6578\u3001\u53EF\u7528\u5BB9\u91CF\u8207\u5BE6\u969B\u5B8C\u6210\u6642\u9593\u3002"
        ]
      },
      {
        paragraph: "\u76EE\u524D\u5E38\u898B\u7684\u7CFB\u7D71\u5927\u591A\u53EA\u64C5\u9577\u5176\u4E2D\u4E00\u4EF6\u4E8B\u3002\u50B3\u7D71\u9AD8\u6548\u80FD\u904B\u7B97\u6392\u7A0B\u5668 Slurm \u96D6\u7136\u64C5\u9577\u6279\u6B21\u5DE5\u4F5C\u3001\u4F47\u5217\u8207\u8CC7\u6E90\u7BA1\u7406\uFF0C\u4F46\u50B3\u7D71 FCFS \u8207 Backfill \u4E3B\u8981\u4F9D\u56FA\u5B9A\u898F\u5247\u904B\u4F5C\uFF0C\u96E3\u4EE5\u540C\u6642\u611F\u77E5 GPU \u578B\u865F\u3001MPS \u914D\u984D\u3001\u5DE5\u4F5C\u7279\u5FB5\u8207\u4F47\u5217\u72C0\u614B\uFF0C\u4E5F\u5C0D\u5F48\u6027\u64F4\u7E2E\u8207\u96F2\u7AEF\u5F0F\u7BA1\u7406\u4E0D\u5920\u65B9\u4FBF\uFF1B\u76F8\u5C0D\u5730\uFF0C\u5BB9\u5668\u5E73\u53F0\u5982 Kubernetes \u9069\u5408\u5BB9\u5668\u90E8\u7F72\u3001\u81EA\u52D5\u64F4\u7E2E\u8207\u5065\u5EB7\u76E3\u63A7\uFF0C\u4E26\u4E0D\u76F4\u63A5\u63D0\u4F9B Slurm \u7684\u6279\u6B21\u6392\u7A0B\u8A9E\u610F\u3002\u73FE\u6709\u7814\u7A76\u8F03\u5C11\u5728\u771F\u5BE6 Slurm \u63D0\u4EA4\u6D41\u7A0B\u4E2D\uFF0C\u806F\u5408\u8655\u7406\u7570\u8CEA GPU\u3001MPS \u914D\u984D\u8207\u5B78\u7FD2\u5F0F\u5DE5\u4F5C\u6392\u5E8F\u3002"
      },
      {
        paragraph: "\u56E0\u6B64\uFF0C\u672C\u5C08\u984C\u5E0C\u671B\u7D50\u5408\u5169\u8005\u512A\u9EDE\uFF0C\u5EFA\u7ACB\u4E00\u5957\u65E2\u80FD\u4FDD\u6709\u7814\u7A76\u8005\u719F\u6089\u7684\u5DE5\u4F5C\u63D0\u4EA4\u6D41\u7A0B\uFF0C\u53C8\u80FD\u505A\u5230\u52D5\u614B\u5206\u914D CPU\u3001GPU \u8207\u5132\u5B58\u8CC7\u6E90\u7684\u7CFB\u7D71\u3002\u9032\u4E00\u6B65\u5730\uFF0C\u6211\u5011\u4E5F\u5E0C\u671B\u5C0E\u5165\u6DF1\u5EA6\u5F37\u5316\u5B78\u7FD2\u7B56\u7565\uFF0C\u8B93\u7CFB\u7D71\u53EF\u4EE5\u6839\u64DA\u5DE5\u4F5C\u4F47\u5217\u72C0\u614B\u8207\u53E2\u96C6\u72C0\u614B\uFF0C\u81EA\u52D5\u505A\u51FA\u66F4\u5408\u7406\u7684\u8CC7\u6E90\u5206\u914D\u6C7A\u7B56\u3002"
      }
    ] },
    { id: "17", code: "NUTN-CSIE-PRJ-116-017", group: "decision", title: "\u904B\u52D5\u6559\u7DF4", titleEn: "Sports Coach", members: "\u9EC3\u5B50\u52C1", studentIds: "S11259048", advisor: "\u9673\u5B97\u79A7", time: "14:55 ~ 15:10", conferenceTags: ["CVGIP 2026"] }
  ];
  var groupMeta = {
    sense: { title: "\u667A\u6167\u611F\u77E5\u8207\u8A0A\u865F\u5206\u6790\u7D44", label: "SENSE / SIGNAL ANALYSIS" },
    decision: { title: "\u667A\u6167\u63A8\u8AD6\u8207\u6C7A\u7B56\u7CFB\u7D71\u7D44", label: "INFERENCE / DECISION SYSTEMS" }
  };
  var escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  var tagMarkup = (tags = []) => tags.length ? tags.map((tag, index) => `<span class="conference-tag${index === 0 ? " conference-tag--accent" : ""}">${escapeHTML(tag)}</span>`).join("") : "";
  var projectSummaryMarkup = (blocks = []) => blocks.map(({ paragraph, bullets = [] }) => `<p>${escapeHTML(paragraph)}</p>${bullets.length ? `<ul>${bullets.map((bullet) => `<li>${escapeHTML(bullet)}</li>`).join("")}</ul>` : ""}`).join("");
  var timePointMarkup = (time, className = "") => {
    const [start] = time.split(" ~ ");
    return `<time class="schedule-time${className ? ` ${className}` : ""}">${escapeHTML(start)}</time>`;
  };
  var groupName = (group) => groupMeta[group].title;
  var projectInfoIcons = {
    group: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>',
    members: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5M16 9a2.5 2.5 0 1 0 0-5M16 14.5c2.2 0 3.8 1.1 4.5 3.5" /></svg>'
  };
  var projectInfoMarkup = (icon, label, value) => `<p><span class="project-card__info-icon" aria-hidden="true">${projectInfoIcons[icon]}</span><span class="sr-only">${label}</span>${escapeHTML(value)}</p>`;
  var renderSchedule = () => {
    if (!scheduleList) return;
    scheduleList.innerHTML = Object.entries(groupMeta).map(([group, meta]) => {
      const groupProjects = projects.filter((project) => project.group === group);
      const rows = groupProjects.map((project, index) => `${index === 5 ? `${timePointMarkup("14:15", "schedule-time--break")}<article class="schedule-card schedule-card--break" role="separator"><strong>Break \u{1F634}</strong></article>` : ""}
      ${timePointMarkup(project.time)}
      <article class="schedule-card schedule-card--signal" data-card-light>
        <span class="schedule-card__number" aria-hidden="true">${escapeHTML(project.id)}</span>
        <button class="schedule-card__trigger" type="button" data-schedule-project="${escapeHTML(project.id)}" aria-haspopup="dialog" aria-label="\u67E5\u770B\u7B2C ${escapeHTML(project.id)} \u7D44\u5C08\u984C\u8A73\u7D30\u8CC7\u8A0A">
          <strong>${escapeHTML(project.title)}</strong>
          <span class="schedule-card__toggle" aria-hidden="true">\u2197</span>
        </button>
        <span class="schedule-card__signal" aria-hidden="true"><svg viewBox="0 0 96 24" focusable="false"><path d="M1 16h13l5-9 8 14 8-15 8 10h12l6-6 7 9h15" /></svg></span>
      </article>`).join("");
      return `<section class="agenda-group" data-schedule-group="${group}" aria-label="${escapeHTML(meta.title)}">
      <div class="schedule schedule--dense">${rows}</div>
    </section>`;
    }).join("");
  };
  var openProjectDialog = (projectId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !projectDialog) return;
    projectDialogTitle.textContent = project.title;
    projectDialogEnglishTitle.textContent = project.titleEn || "";
    projectDialogEnglishTitle.hidden = !project.titleEn;
    projectDialogGroup.textContent = `\u7B2C ${project.id} \u7D44\u30FB${groupName(project.group)}`;
    projectDialogMembers.textContent = project.members;
    projectDialogTags.parentElement.hidden = project.conferenceTags.length === 0;
    projectDialogTags.innerHTML = tagMarkup(project.conferenceTags);
    projectDialogSummary.hidden = !project.summary?.length;
    projectDialogSummaryContent.innerHTML = projectSummaryMarkup(project.summary || []);
    if (typeof projectDialog.showModal === "function") {
      projectDialog.showModal();
    } else {
      projectDialog.setAttribute("open", "");
    }
    projectDialogClose?.focus();
  };
  var bindScheduleProjectLinks = () => {
    scheduleList?.querySelectorAll("[data-schedule-project]").forEach((trigger) => {
      trigger.addEventListener("click", () => openProjectDialog(trigger.dataset.scheduleProject));
    });
  };
  var bindProjectLinks = () => {
    projectList?.querySelectorAll("[data-project-detail]").forEach((trigger) => {
      trigger.addEventListener("click", () => openProjectDialog(trigger.dataset.projectDetail));
    });
  };
  var renderProjects = () => {
    if (!projectList) return;
    projectList.innerHTML = projects.map((project, index) => `<article class="project-card project-card--archive" data-project-group="${project.group}" data-card-light>
    <button class="project-card__trigger" type="button" data-project-detail="${escapeHTML(project.id)}" aria-haspopup="dialog" aria-label="\u67E5\u770B\u7B2C ${escapeHTML(project.id)} \u7D44\u5C08\u984C\u8A73\u7D30\u8CC7\u8A0A"></button>
    <div class="project-card__visual ${index % 3 === 1 ? "project-card__visual--violet" : index % 3 === 2 ? "project-card__visual--line" : ""}" aria-hidden="true"><span>${escapeHTML(project.id)}</span><i></i><i></i><i></i></div>
    <span class="project-card__shine" aria-hidden="true"></span>
    <div class="project-card__body"><h3>${escapeHTML(project.title)}</h3><div class="project-card__info">${projectInfoMarkup("group", "GROUP", `\u7B2C ${project.id} \u7D44\u30FB${groupName(project.group)}`)}${projectInfoMarkup("members", "MEMBERS", project.members)}</div>${project.conferenceTags.length ? `<div class="tag-row" aria-label="\u7814\u8A0E\u6703\u6295\u7A3F\u6A19\u7C64">${tagMarkup(project.conferenceTags)}</div>` : ""}</div>
    <span class="project-card__arrow" aria-hidden="true">\u2197</span>
  </article>`).join("");
  };
  var menuOpenedAtScrollY = 0;
  var setMenuState = (isOpen) => {
    const restoreFocus = !isOpen && siteNav?.contains(document.activeElement) && window.matchMedia("(max-width: 48rem)").matches;
    if (isOpen) menuOpenedAtScrollY = window.scrollY;
    menuToggle?.setAttribute("aria-expanded", String(isOpen));
    siteNav?.classList.toggle("is-open", isOpen);
    if (restoreFocus) menuToggle?.focus();
  };
  var scrollToTopImmediately = () => {
    if (window.NutnLenis) {
      window.NutnLenis.scrollTo(0, { immediate: true });
      return;
    }
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousBehavior;
  };
  var setView = (view, { updateHash = true } = {}) => {
    const nextView = ["home", "schedule", "projects"].includes(view) ? view : "home";
    viewPanels.forEach((panel) => {
      panel.hidden = panel.dataset.viewPanel !== nextView;
      panel.classList.toggle("is-active", panel.dataset.viewPanel === nextView);
    });
    viewTabs.forEach((tab) => {
      const active = tab.dataset.view === nextView;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    document.body.dataset.view = nextView;
    setMenuState(false);
    if (updateHash) {
      history.replaceState(null, "", `#${nextView}`);
      scrollToTopImmediately();
    }
    scheduleLiquidGlassForCurrentView("view");
  };
  var setFilterState = (buttons, activeButton) => buttons.forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  var closeProjectDialog = () => {
    if (!projectDialog) return;
    if (typeof projectDialog.close === "function") projectDialog.close();
    else projectDialog.removeAttribute("open");
  };
  projectDialogClose?.addEventListener("click", closeProjectDialog);
  projectDialog?.addEventListener("click", (event) => {
    if (event.target === projectDialog) closeProjectDialog();
  });
  var headerState = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
    const mobileMenuOpen = menuToggle?.getAttribute("aria-expanded") === "true" && window.matchMedia("(max-width: 48rem)").matches;
    if (mobileMenuOpen && window.scrollY - menuOpenedAtScrollY >= 72) setMenuState(false);
  };
  menuToggle?.addEventListener("click", () => setMenuState(menuToggle.getAttribute("aria-expanded") !== "true"));
  viewButtons.forEach((control) => control.addEventListener("click", (event) => {
    if (control.tagName === "A") event.preventDefault();
    setView(control.dataset.view);
    if (control.dataset.scrollTarget) {
      const target = document.getElementById(control.dataset.scrollTarget);
      if (!target) return;
      if (window.NutnLenis) {
        const scrollMarginTop = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        if (event.detail === 0) {
          window.NutnLenis.scrollTo(target, { offset: -scrollMarginTop, immediate: true });
          return;
        }
        window.NutnLenis.scrollTo(target, { offset: -scrollMarginTop });
        window.NutnLenis.requestFrame?.();
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }));
  document.querySelectorAll('a[href="#top"]').forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    scrollToTopImmediately();
  }));
  window.addEventListener("scroll", headerState, { passive: true });
  window.addEventListener("hashchange", () => setView(window.location.hash.slice(1), { updateHash: false }));
  var scheduleFilters = [...document.querySelectorAll("[data-schedule-filter]")];
  var applyScheduleFilter = (filter) => {
    const activeButton = scheduleFilters.find((button) => button.dataset.scheduleFilter === filter);
    if (!activeButton) return;
    setFilterState(scheduleFilters, activeButton);
    document.querySelectorAll("[data-schedule-group]").forEach((group) => {
      group.hidden = group.dataset.scheduleGroup !== filter;
    });
    scheduleLiquidGlassForCurrentView("schedule-filter");
  };
  scheduleFilters.forEach((button) => button.addEventListener("click", () => applyScheduleFilter(button.dataset.scheduleFilter)));
  var projectFilters = [...document.querySelectorAll("[data-project-filter]")];
  var projectFilterBar = projectFilters[0]?.closest(".filter-bar");
  var updateProjectFilterIndicator = () => {
    const activeButton = projectFilters.find((button) => button.classList.contains("is-active"));
    if (!activeButton || !projectFilterBar) return;
    projectFilterBar.style.setProperty("--filter-indicator-x", `${activeButton.offsetLeft}px`);
    projectFilterBar.style.setProperty("--filter-indicator-y", `${activeButton.offsetTop}px`);
    projectFilterBar.style.setProperty("--filter-indicator-width", `${activeButton.offsetWidth}px`);
    projectFilterBar.style.setProperty("--filter-indicator-height", `${activeButton.offsetHeight}px`);
  };
  if (projectFilterBar) {
    updateProjectFilterIndicator();
    window.addEventListener("resize", updateProjectFilterIndicator, { passive: true });
    if ("ResizeObserver" in window) {
      const filterIndicatorResizeObserver = new ResizeObserver(updateProjectFilterIndicator);
      filterIndicatorResizeObserver.observe(projectFilterBar);
      projectFilters.forEach((button) => filterIndicatorResizeObserver.observe(button));
    }
    document.fonts?.ready.then(updateProjectFilterIndicator);
  }
  projectFilters.forEach((button) => button.addEventListener("click", () => {
    const filter = button.dataset.projectFilter;
    setFilterState(projectFilters, button);
    updateProjectFilterIndicator();
    document.querySelectorAll("[data-project-group]").forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.projectGroup !== filter;
    });
  }));
  var bindCardPointerLight = () => {
    const cardSelector = "[data-card-light]";
    let activeCard = null;
    let pointerFrame = 0;
    let pendingPointer = null;
    const clearCard = (card) => {
      if (!card) return;
      card.style.setProperty("--card-light-opacity", "0");
    };
    const flushPointer = () => {
      pointerFrame = 0;
      if (!pendingPointer) return;
      const { card, event } = pendingPointer;
      pendingPointer = null;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--card-pointer-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--card-pointer-y", `${event.clientY - rect.top}px`);
      card.style.setProperty("--card-light-opacity", "1");
    };
    document.addEventListener("pointermove", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const target = event.target instanceof Element ? event.target.closest(cardSelector) : null;
      if (!target) {
        clearCard(activeCard);
        activeCard = null;
        return;
      }
      if (activeCard && activeCard !== target) clearCard(activeCard);
      activeCard = target;
      pendingPointer = { card: target, event };
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(flushPointer);
    }, { passive: true });
    document.addEventListener("pointerout", (event) => {
      if (!(event.target instanceof Element)) return;
      const card = event.target.closest(cardSelector);
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (card && (!related || !card.contains(related))) {
        clearCard(card);
        if (activeCard === card) activeCard = null;
      }
    }, { passive: true });
    window.addEventListener("blur", () => {
      clearCard(activeCard);
      activeCard = null;
    }, { passive: true });
  };
  var backdropElement = document.querySelector("[data-site-backdrop]");
  var backdropCanvas = document.querySelector("[data-site-backdrop-canvas]");
  var backdropImage = document.querySelector("[data-site-backdrop-source]");
  var backdropGl = null;
  var BACKDROP_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;
  var BACKDROP_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform vec2 u_image_size;
  uniform vec2 u_view_size;
  uniform vec2 u_pointer;
  uniform float u_time;

  vec2 cover_uv(vec2 uv) {
    float view_ratio = u_view_size.x / max(u_view_size.y, 1.0);
    float image_ratio = u_image_size.x / max(u_image_size.y, 1.0);
    vec2 crop = vec2(1.0);
    if (view_ratio > image_ratio) crop.y = image_ratio / view_ratio;
    else crop.x = view_ratio / image_ratio;
    return (uv - 0.5) * crop + 0.5;
  }

  float line(float value, float width) {
    return 1.0 - smoothstep(0.0, width, abs(fract(value) - 0.5));
  }

  float segment(vec2 p, vec2 a, vec2 b, float width) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(width, width * 1.8, length(pa - ba * h));
  }

  float pointGlow(vec2 p, vec2 center, float radius) {
    vec2 ratio = vec2(u_view_size.x / max(u_view_size.y, 1.0), 1.0);
    return exp(-length((p - center) * ratio) / radius);
  }

  void main() {
    vec2 uv = v_uv;
    vec2 image_uv = cover_uv(uv);
    vec3 photo = texture2D(u_image, image_uv).rgb;
    vec3 midnight = vec3(0.018, 0.034, 0.066);
    vec3 blue = vec3(0.22, 0.48, 1.0);
    vec3 ice = vec3(0.68, 0.84, 1.0);
    vec3 color = photo * 0.85;

    // Tracers run along the perspective paths already drawn in the artwork.
    float routeA = max(segment(image_uv, vec2(0.25, 0.31), vec2(0.73, 0.67), 0.0025),
                       segment(image_uv, vec2(0.73, 0.67), vec2(0.86, 0.86), 0.0025));
    float routeB = segment(image_uv, vec2(0.36, 0.29), vec2(0.78, 0.68), 0.0022);
    float routePhase = fract(u_time * 0.075);
    float routePulse = exp(-abs(image_uv.x - mix(0.25, 0.84, routePhase)) * 75.0);
    color += ice * (routeA + routeB * 0.75) * routePulse * 0.72;

    // The signal waveform breathes without shifting the underlying composition.
    float waveEnvelope = 1.0 - smoothstep(0.0, 0.12, abs(image_uv.x - 0.43));
    float waveY = 0.265 + sin((image_uv.x * 92.0) + u_time * 2.2) * 0.012 * waveEnvelope;
    float waveform = (1.0 - smoothstep(0.002, 0.006, abs(image_uv.y - waveY)))
      * smoothstep(0.29, 0.35, image_uv.x) * smoothstep(0.57, 0.50, image_uv.x);
    color += ice * waveform * (0.18 + waveEnvelope * 0.38);

    // Pulsing joints and a scanning ring animate the analysis motifs at right.
    vec2 joints[6];
    joints[0] = vec2(0.692, 0.430); joints[1] = vec2(0.683, 0.333);
    joints[2] = vec2(0.716, 0.270); joints[3] = vec2(0.640, 0.214);
    joints[4] = vec2(0.705, 0.155); joints[5] = vec2(0.660, 0.170);
    float jointLight = 0.0;
    for (int i = 0; i < 6; i++) {
      float beat = 0.55 + 0.45 * sin(u_time * 2.0 - float(i) * 0.65);
      jointLight += pointGlow(image_uv, joints[i], 0.012) * beat;
    }
    color += blue * jointLight * 0.16;

    vec2 scanCenter = vec2(0.865, 0.43);
    float scanRadius = 0.035 + fract(u_time * 0.18) * 0.16;
    float scanDistance = length((image_uv - scanCenter) * vec2(0.62, 1.0));
    float scanRing = 1.0 - smoothstep(0.004, 0.012, abs(scanDistance - scanRadius));
    color += ice * scanRing * (1.0 - smoothstep(0.18, 0.29, scanDistance)) * 0.22;

    // Pointer response remains local and subtle.
    color += blue * pointGlow(uv, u_pointer, 0.105) * 0.055;

    float vignette = smoothstep(0.3, 0.92, distance(uv, vec2(0.5)));
    color *= 1.0 - vignette * 0.18;
    color = mix(color, midnight, 0.05);
    gl_FragColor = vec4(color, 1.0);
  }
`;
  var compileBackdropShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  var initSiteBackdrop = async () => {
    if (!backdropElement || !backdropCanvas || !backdropImage) return null;
    if (!backdropImage.complete) {
      await new Promise((resolve) => {
        backdropImage.addEventListener("load", resolve, { once: true });
        backdropImage.addEventListener("error", resolve, { once: true });
      });
    }
    const gl = backdropCanvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      // LiquidGlass reads this canvas later via drawImage(); without the
      // preserved buffer, some browsers expose a cleared (black) frame after
      // compositing or tab resume even while the canvas itself still looks right.
      preserveDrawingBuffer: true
    });
    if (!gl || !backdropImage.naturalWidth || !backdropImage.naturalHeight) {
      recordGlassDebug("backdrop-unavailable", {
        hasWebGL: Boolean(gl),
        imageWidth: backdropImage.naturalWidth,
        imageHeight: backdropImage.naturalHeight
      });
      backdropElement.classList.add("is-static-fallback");
      return null;
    }
    backdropGl = gl;
    if (glassDebugEnabled) {
      backdropCanvas.addEventListener("webglcontextlost", (event) => {
        recordGlassDebug("backdrop-context-lost", {
          cancelable: event.cancelable,
          snapshot: getGlassDebugSnapshot()
        });
      });
      backdropCanvas.addEventListener("webglcontextrestored", () => {
        recordGlassDebug("backdrop-context-restored", { snapshot: getGlassDebugSnapshot() });
      });
    }
    const vertexShader = compileBackdropShader(gl, gl.VERTEX_SHADER, BACKDROP_VERTEX_SHADER);
    const fragmentShader = compileBackdropShader(gl, gl.FRAGMENT_SHADER, BACKDROP_FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) {
      backdropElement.classList.add("is-static-fallback");
      return null;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      backdropElement.classList.add("is-static-fallback");
      return null;
    }
    const position = gl.createBuffer();
    const texture = gl.createTexture();
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const imageLocation = gl.getUniformLocation(program, "u_image");
    const imageSizeLocation = gl.getUniformLocation(program, "u_image_size");
    const viewSizeLocation = gl.getUniformLocation(program, "u_view_size");
    const pointerLocation = gl.getUniformLocation(program, "u_pointer");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    if (!position || !texture || positionLocation < 0 || !imageLocation || !imageSizeLocation || !viewSizeLocation || !pointerLocation || !timeLocation) {
      gl.deleteProgram(program);
      backdropElement.classList.add("is-static-fallback");
      return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdropImage);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.useProgram(program);
    gl.uniform1i(imageLocation, 0);
    gl.uniform2f(imageSizeLocation, backdropImage.naturalWidth, backdropImage.naturalHeight);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    let frame = 0;
    let disposed = false;
    const pointer = { x: 0.72, y: 0.54, targetX: 0.72, targetY: 0.54 };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(backdropElement.clientWidth * dpr));
      const height = Math.max(1, Math.round(backdropElement.clientHeight * dpr));
      if (backdropCanvas.width === width && backdropCanvas.height === height) return;
      backdropCanvas.width = width;
      backdropCanvas.height = height;
      gl.viewport(0, 0, width, height);
    };
    const draw = (time = 0) => {
      if (disposed) return;
      resize();
      gl.useProgram(program);
      gl.uniform2f(viewSizeLocation, backdropCanvas.width, backdropCanvas.height);
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;
      gl.uniform2f(pointerLocation, pointer.x, pointer.y);
      gl.uniform1f(timeLocation, time * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const render = (time) => {
      draw(time);
      if (!reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(render);
    };
    const onResize = () => draw(0);
    const onPointerMove = (event) => {
      pointer.targetX = event.clientX / Math.max(window.innerWidth, 1);
      pointer.targetY = 1 - event.clientY / Math.max(window.innerHeight, 1);
    };
    const onVisibility = () => {
      window.cancelAnimationFrame(frame);
      if (!document.hidden) render(performance.now());
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility, { passive: true });
    backdropElement.classList.remove("is-static-fallback");
    render(0);
    return { canvas: backdropCanvas, image: backdropImage };
  };
  var siteBackdropReady = initSiteBackdrop().catch(() => {
    backdropElement?.classList.add("is-static-fallback");
    recordGlassDebug("backdrop-init-failed", { fallbackClass: backdropElement?.classList.contains("is-static-fallback") || false });
    return null;
  });
  var getLiquidGlassRoots = () => [...document.querySelectorAll("[data-liquid-glass-root]")];
  var liquidGlassInstances = /* @__PURE__ */ new Map();
  var liquidGlassPending = /* @__PURE__ */ new Map();
  var liquidGlassConstructor = null;
  var liquidGlassResizeTimer = 0;
  var readCanvasSample = (canvas) => {
    if (!canvas) return { present: false };
    try {
      const context = canvas.getContext("2d");
      if (!context) return { present: true, width: canvas.width, height: canvas.height, context: "unavailable" };
      const x = Math.max(0, Math.floor(canvas.width / 2));
      const y = Math.max(0, Math.floor(canvas.height / 2));
      const rgba = context.getImageData(x, y, 1, 1).data;
      return { present: true, width: canvas.width, height: canvas.height, centerRGBA: Array.from(rgba) };
    } catch (error) {
      return { present: true, width: canvas.width, height: canvas.height, sampleError: error.name || "Error" };
    }
  };
  getGlassDebugSnapshot = () => ({
    fallbackFlag: document.documentElement.dataset.liquidGlassFallback || null,
    backdrop: {
      fallbackClass: backdropElement?.classList.contains("is-static-fallback") || false,
      contextLost: backdropGl?.isContextLost() ?? null,
      size: backdropCanvas ? [backdropCanvas.width, backdropCanvas.height] : null
    },
    glassRoots: getLiquidGlassRoots().map((root) => {
      const instance = liquidGlassInstances.get(root);
      return {
        id: root.id || null,
        ready: root.dataset.liquidGlassReady === "true",
        active: instance?._active ?? null,
        scrolling: instance?._scrolling ?? null,
        pointer: instance?._pointer ? {
          hasPosition: instance._pointer.hasPosition,
          active: instance._pointer.active,
          hoveredCard: typeof instance._pointer.hoverElement?.className === "string" ? instance._pointer.hoverElement.className : null,
          x: Math.round(instance._pointer.clientX || 0),
          y: Math.round(instance._pointer.clientY || 0),
          velocityX: Math.round(instance._pointer.velocityX || 0),
          velocityY: Math.round(instance._pointer.velocityY || 0)
        } : null,
        rendererLostFlag: instance?.renderer?.contextLost ?? null,
        rendererContextLost: instance?.renderer?.gl?.isContextLost?.() ?? null,
        cards: [...root.querySelectorAll("[data-liquid-glass]")].map((card) => ({
          canvas: readCanvasSample(card.querySelector("canvas")),
          backgroundColor: getComputedStyle(card).backgroundColor,
          backgroundImage: getComputedStyle(card).backgroundImage
        }))
      };
    }),
    lenis: window.NutnLenis ? {
      scrolling: window.NutnLenis.isScrolling,
      scroll: Math.round(window.NutnLenis.scroll || 0),
      animatedScroll: Math.round(window.NutnLenis.animatedScroll || 0),
      targetScroll: Math.round(window.NutnLenis.targetScroll || 0)
    } : { enabled: false }
  });
  var attachLiquidGlassDebugListeners = (instance) => {
    if (!glassDebugEnabled || !instance.renderer?.canvas) return;
    const canvas = instance.renderer.canvas;
    canvas.addEventListener("webglcontextlost", (event) => {
      recordGlassDebug("glass-context-lost", {
        cancelable: event.cancelable,
        defaultPrevented: event.defaultPrevented,
        snapshot: getGlassDebugSnapshot()
      });
    });
    canvas.addEventListener("webglcontextrestored", () => {
      recordGlassDebug("glass-context-restored", { snapshot: getGlassDebugSnapshot() });
    });
  };
  var initGlassDiagnostics = () => {
    if (!glassDebugEnabled) return;
    installGlassDebugPanel();
    for (const root of getLiquidGlassRoots()) {
      for (const card of root.querySelectorAll("[data-liquid-glass]")) {
        for (const eventName of ["pointerenter", "pointerleave"]) {
          card.addEventListener(eventName, (event) => {
            window.setTimeout(() => recordGlassDebug(`glass-${eventName}`, {
              pointerType: event.pointerType || null,
              pointer: [Math.round(event.clientX), Math.round(event.clientY)],
              cardClass: typeof card.className === "string" ? card.className : null,
              snapshot: getGlassDebugSnapshot()
            }), 50);
          }, { passive: true });
        }
      }
    }
    document.addEventListener("visibilitychange", () => {
      recordGlassDebug("visibilitychange", { snapshot: getGlassDebugSnapshot() });
    });
    window.addEventListener("pagehide", (event) => {
      recordGlassDebug("pagehide", { persisted: event.persisted, snapshot: getGlassDebugSnapshot() });
    });
    window.addEventListener("pageshow", (event) => {
      recordGlassDebug("pageshow", { persisted: event.persisted, snapshot: getGlassDebugSnapshot() });
    });
    window.addEventListener("freeze", () => recordGlassDebug("freeze", { snapshot: getGlassDebugSnapshot() }));
    window.addEventListener("resume", () => recordGlassDebug("resume", { snapshot: getGlassDebugSnapshot() }));
    window.addEventListener("blur", () => recordGlassDebug("window-blur"));
    window.addEventListener("focus", () => recordGlassDebug("window-focus", { snapshot: getGlassDebugSnapshot() }));
    let debugScrolling = false;
    let lastProgressAt = 0;
    let scrollIdleTimer = 0;
    window.addEventListener("scroll", () => {
      const now = performance.now();
      if (!debugScrolling) {
        debugScrolling = true;
        lastProgressAt = now;
        recordGlassDebug("scroll-start", { snapshot: getGlassDebugSnapshot() });
      } else if (now - lastProgressAt >= 750) {
        lastProgressAt = now;
        recordGlassDebug("scroll-progress", { snapshot: getGlassDebugSnapshot() });
      }
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        debugScrolling = false;
        lastProgressAt = 0;
        recordGlassDebug("scroll-idle", { snapshot: getGlassDebugSnapshot() });
      }, 280);
    }, { passive: true });
    recordGlassDebug("debug-start", {
      userAgent: navigator.userAgent,
      viewport: [window.innerWidth, window.innerHeight],
      devicePixelRatio: window.devicePixelRatio || 1,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      snapshot: getGlassDebugSnapshot()
    });
  };
  var getLiquidGlassRenderScale = () => {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const memory = Number(navigator.deviceMemory) || 0;
    const cores = Number(navigator.hardwareConcurrency) || 0;
    const lowPower = memory > 0 && memory <= 4 || cores > 0 && cores <= 4;
    if (coarsePointer) return lowPower ? 0.58 : 0.72;
    return lowPower ? 0.86 : 1;
  };
  var isLiquidGlassRootEligible = (root) => {
    const activeView = document.body.dataset.view || "home";
    const panel = root.closest("[data-view-panel]");
    if (panel && panel.dataset.viewPanel !== activeView || root.closest("[hidden]")) return false;
    const rect = root.getBoundingClientRect();
    const margin = Math.max(160, window.innerHeight * 0.15);
    return rect.width > 0 && rect.height > 0 && rect.bottom >= -margin && rect.right >= -margin && rect.left <= window.innerWidth + margin && rect.top <= window.innerHeight + margin;
  };
  var initializeLiquidGlassRoot = async (root) => {
    if (liquidGlassInstances.has(root)) return liquidGlassInstances.get(root);
    if (liquidGlassPending.has(root)) return liquidGlassPending.get(root);
    if (!liquidGlassConstructor || !isLiquidGlassRootEligible(root)) return null;
    const initialize = async () => {
      const backdrop = await siteBackdropReady;
      const sourceImage = backdrop?.image || backdropImage;
      const sourceCanvas = backdrop?.canvas;
      const glassElements = [...root.children].filter((element) => element.hasAttribute("data-liquid-glass"));
      if (!glassElements.length) return null;
      const defaults = {
        blurAmount: 0.2,
        refraction: 0.84,
        chromAberration: 0.05,
        edgeHighlight: 0.1,
        specular: 0.02,
        fresnel: 0.88,
        distortion: 6e-3,
        opacity: 0.82,
        saturation: 0.02,
        tintStrength: 0.025,
        brightness: -0.06,
        cornerRadius: 8,
        zRadius: 22,
        shadowOpacity: 0.24,
        shadowSpread: 4,
        shadowOffsetY: 1,
        pointerRadius: 175,
        pointerStrength: 0.92
      };
      const instance = await liquidGlassConstructor.init({
        root,
        glassElements,
        backgroundImage: sourceImage,
        backgroundCanvas: sourceCanvas,
        renderScale: getLiquidGlassRenderScale(),
        active: true,
        captureGlassContent: false,
        prewarmCaptures: false,
        defaults
      });
      glassElements.forEach((element) => {
        element.style.setProperty("background-color", "rgba(18, 36, 70, 0.22)", "important");
        element.style.setProperty("background-image", "linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent 42%)", "important");
      });
      root.dataset.liquidGlassReady = "true";
      instance.setActive(isLiquidGlassRootEligible(root));
      liquidGlassInstances.set(root, instance);
      attachLiquidGlassDebugListeners(instance);
      recordGlassDebug("liquidglass-ready", { root: root.id || null, snapshot: getGlassDebugSnapshot() });
      return instance;
    };
    const pending = initialize().catch((error) => {
      document.documentElement.dataset.liquidGlassFallback = "true";
      recordGlassDebug("liquidglass-init-failed", { root: root.id || null, error: error.message || String(error) });
      console.warn("LiquidGlass enhancement unavailable; keeping the CSS glass fallback.", error);
      return null;
    }).finally(() => liquidGlassPending.delete(root));
    liquidGlassPending.set(root, pending);
    return pending;
  };
  var scheduleLiquidGlassForCurrentView = (reason = "manual") => {
    if (!liquidGlassConstructor) return;
    for (const root of getLiquidGlassRoots()) {
      const active = isLiquidGlassRootEligible(root);
      const instance = liquidGlassInstances.get(root);
      if (glassDebugEnabled && instance && instance._active !== active) {
        const rect = root.getBoundingClientRect();
        recordGlassDebug("liquidglass-active-change", {
          reason,
          active,
          view: document.body.dataset.view || "home",
          hidden: Boolean(root.closest("[hidden]")),
          rect: [Math.round(rect.top), Math.round(rect.bottom), Math.round(rect.width), Math.round(rect.height)],
          viewport: [window.innerWidth, window.innerHeight]
        });
      }
      instance?.setActive(active);
      if (active && !liquidGlassInstances.has(root)) void initializeLiquidGlassRoot(root);
    }
  };
  var liquidGlassScrollFrame = 0;
  var liquidGlassScrollIdleTimer = 0;
  var scheduleLiquidGlassDuringScroll = () => {
    if (!liquidGlassScrollFrame) {
      liquidGlassScrollFrame = window.requestAnimationFrame(() => {
        liquidGlassScrollFrame = 0;
        scheduleLiquidGlassForCurrentView("scroll");
      });
    }
    window.clearTimeout(liquidGlassScrollIdleTimer);
    liquidGlassScrollIdleTimer = window.setTimeout(() => {
      liquidGlassScrollIdleTimer = 0;
      scheduleLiquidGlassForCurrentView("scroll-idle");
    }, 180);
  };
  window.addEventListener("resize", () => {
    window.clearTimeout(liquidGlassResizeTimer);
    liquidGlassResizeTimer = window.setTimeout(() => scheduleLiquidGlassForCurrentView("resize"), 120);
  }, { passive: true });
  window.addEventListener("scroll", scheduleLiquidGlassDuringScroll, { passive: true });
  var initLiquidGlass = () => {
    if (window.NutnLiquidGlass) {
      liquidGlassConstructor = window.NutnLiquidGlass;
      scheduleLiquidGlassForCurrentView();
      return;
    }
    window.addEventListener("nutn-liquidglass-ready", () => {
      if (window.NutnLiquidGlass) {
        liquidGlassConstructor = window.NutnLiquidGlass;
        scheduleLiquidGlassForCurrentView();
      }
    }, { once: true });
  };
  renderSchedule();
  renderProjects();
  bindScheduleProjectLinks();
  bindProjectLinks();
  bindCardPointerLight();
  applyScheduleFilter(scheduleFilters[0]?.dataset.scheduleFilter || "sense");
  headerState();
  setView(window.location.hash.slice(1), { updateHash: false });
  initGlassDiagnostics();
  void initLiquidGlass();

  // app-entry.js
  var canSmoothWheel = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (canSmoothWheel && !prefersReducedMotion) {
    try {
      const lenis = new Lenis({
        autoRaf: false,
        smoothWheel: true,
        syncTouch: false,
        respectReducedMotion: true
      });
      let frame = 0;
      let previousRafTime = 0;
      const tick = (time) => {
        const lastLenisRafTime = lenis.time;
        if (window.NutnGlassDebug?.enabled && lastLenisRafTime > 0) {
          const gapMs = time - lastLenisRafTime;
          if (gapMs >= 100) {
            window.NutnGlassDebug.record("lenis-raf-gap", {
              gapMs: Math.round(gapMs),
              consecutiveLoopGapMs: previousRafTime > 0 ? Math.round(time - previousRafTime) : null,
              lastLenisRafTime: Math.round(lastLenisRafTime),
              isScrolling: lenis.isScrolling,
              scroll: Math.round(lenis.scroll || 0),
              animatedScroll: Math.round(lenis.animatedScroll || 0),
              targetScroll: Math.round(lenis.targetScroll || 0)
            });
          }
        }
        previousRafTime = time;
        lenis.raf(time);
        if (lenis.isScrolling === "smooth") {
          frame = window.requestAnimationFrame(tick);
          return;
        }
        frame = 0;
        previousRafTime = 0;
      };
      lenis.requestFrame = () => {
        if (!frame) frame = window.requestAnimationFrame(tick);
      };
      const rebaseLenisClock = (reason) => {
        const now = performance.now();
        const previousTime = lenis.time;
        lenis.time = now;
        window.NutnGlassDebug?.record("lenis-clock-rebased", {
          reason,
          gapMs: previousTime ? Math.round(now - previousTime) : null,
          isScrolling: lenis.isScrolling
        });
      };
      window.NutnLenis = lenis;
      lenis.on("virtual-scroll", ({ deltaX, deltaY, event }) => {
        if (window.NutnGlassDebug?.enabled) {
          window.NutnGlassDebug.record("lenis-input", {
            eventType: event?.type || null,
            deltaX: Math.round(deltaX || 0),
            deltaY: Math.round(deltaY || 0),
            timeSinceLastLenisRafMs: lenis.time ? Math.round(performance.now() - lenis.time) : null,
            isScrolling: lenis.isScrolling,
            scroll: Math.round(lenis.scroll || 0),
            targetScroll: Math.round(lenis.targetScroll || 0)
          });
        }
        if (lenis.isScrolling !== "smooth") rebaseLenisClock("idle-input");
        lenis.requestFrame();
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) rebaseLenisClock("visibility-resume");
      });
      window.addEventListener("focus", () => rebaseLenisClock("window-focus"));
      window.NutnGlassDebug?.record("lenis-ready", {
        canSmoothWheel,
        prefersReducedMotion,
        isIos: lenis.isIos
      });
    } catch (error) {
      console.warn("Lenis smooth wheel is unavailable; keeping native scrolling.", error);
    }
  } else {
    window.NutnGlassDebug?.record("lenis-skipped", {
      canSmoothWheel,
      prefersReducedMotion
    });
  }
  initHeroRipple();
  window.NutnLiquidGlass = LiquidGlass;
  window.dispatchEvent(new Event("nutn-liquidglass-ready"));
})();
