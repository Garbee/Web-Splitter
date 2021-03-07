import style from './WebSplitter.css';

export class WebSplitter extends HTMLElement {
  constructor() {
    super();
    this._style = null;
    this._separator = null;
    this.isBeingDragged = false;
    this.isPrimaryCollapsed = false;
    this.isSecondaryCollapsed = false;
    this.currentPointerLocation = null;
    this._totalMovement = 0;
    this.previousMovement = null;
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.observePrimaryWidth = this.observePrimaryWidth.bind(this);
    this.observeSecondaryWidth = this.observeSecondaryWidth.bind(this);
    this.attachShadow({
      mode: 'open',
    });
    this.container = document.createElement('div');
    this.primaryWrapper = document.createElement('div');
    this.secondaryWrapper = document.createElement('div');
    this.render();
    this.container.addEventListener(
      'pointerdown',
      this.handlePointerDown,
    );
    this.addEventListener(
      'keydown',
      this.handleKeyDown,
    );
    this.primaryWidthObserver = new ResizeObserver(
      this.observePrimaryWidth,
    );
    this.secondaryWidthObserver = new ResizeObserver(
      this.observeSecondaryWidth,
    );
  }

  get direction() {
    return this.getAttribute('direction') ?? 'horizontal';
  }

  get isFixed() {
    return this.hasAttribute('is-fixed');
  }

  get totalMovement() {
    return this._totalMovement;
  }

  set totalMovement(value) {
    this._totalMovement = value;
    this.container.style.setProperty(
      '--web-splitter-movement',
      `${this.totalMovement}px`,
    );
  }

  get style() {
    if (this._style === null) {
      const decoder = new TextDecoder();
      this._style = decoder.decode(style);
    }

    return this._style;
  }

  get separator() {
    if (this._separator !== null) {
      return this._separator;
    }

    const slot = this.shadowRoot.querySelector(
      'slot[name="separator"]',
    );

    if (Boolean(slot.assignedElements.length) === true) {
      [this._separator] = slot.assignedElements;
      return this._separator;
    }

    this._separator = this.shadowRoot.querySelector(
      '.web-splitter__separator',
    );
    return this._separator;
  }

  observePrimaryWidth(entries) {
    const { target, contentRect } = entries[0];
    this.isPrimaryCollapsed = contentRect.width === 0;
    if (this.isPrimaryCollapsed) {
      target.setAttribute('aria-hidden', 'true');
      return;
    }
    target.removeAttribute('aria-hidden');
  }

  observeSecondaryWidth(entries) {
    const { target, contentRect } = entries[0];
    this.isSecondaryCollapsed = contentRect.width === 0;
    if (this.isSecondaryCollapsed) {
      target.setAttribute('aria-hidden', 'true');
      return;
    }
    target.removeAttribute('aria-hidden');
  }

  collapsePrimaryPane() {
    if (this.isPrimaryCollapsed === true) {
      return;
    }
    let { totalMovement, isSecondaryCollapsed } = this;
    const rect = this.primaryWrapper.getBoundingClientRect();
    totalMovement -= rect.width;
    if (isSecondaryCollapsed) {
      const separatorRect = this.separator.getBoundingClientRect();
      totalMovement -= separatorRect.width;
    }
    this.totalMovement = totalMovement;
  }

  collapseSecondaryPane() {
    if (this.isSecondaryCollapsed === true) {
      return;
    }
    let { totalMovement, isPrimaryCollapsed } = this;
    const rect = this.secondaryWrapper.getBoundingClientRect();
    totalMovement += rect.width;
    if (isPrimaryCollapsed) {
      const separatorRect = this.separator.getBoundingClientRect();
      totalMovement += separatorRect.width;
    }
    this.totalMovement = totalMovement;
  }

  togglePrimaryPane() {
    if (this.previousMovement === null) {
      this.previousMovement = this.totalMovement;
      this.collapsePrimaryPane();
      return;
    }

    this.totalMovement = this.previousMovement;
    this.previousMovement = null;
  }

  handleKeyDown(event) {
    if (event.composedPath().includes(this.separator) === false) {
      return;
    }

    const { direction, isFixed } = this;

    switch (event.key) {
      case 'ArrowLeft':
        if (isFixed || direction === 'vertical') {
          return;
        }
        this.totalMovement -= 1;
        break;
      case 'ArrowRight':
        if (isFixed || direction === 'vertical') {
          return;
        }
        this.totalMovement += 1;
        break;
      case 'ArrowUp':
        if (isFixed || direction === 'horizontal') {
          return;
        }
        this.totalMovement -= 1;
        break;
      case 'ArrowDown':
        if (isFixed || direction === 'horizontal') {
          return;
        }
        this.totalMovement += 1;
        break;
      case 'End':
        event.preventDefault();
        this.collapseSecondaryPane();
        break;
      case 'Home':
        event.preventDefault();
        this.collapsePrimaryPane();
        break;
      case 'Enter':
        this.togglePrimaryPane();
        break;
      default:
    }
  }

  stopListening() {
    this.isBeingDragged = false;
    this.container.classList.toggle(
      'web-splitter--active',
      this.isBeingDragged,
    );
    this.removeEventListener(
      'pointermove',
      this.handlePointerMove,
    );
    this.removeEventListener(
      'pointerleave',
      this.handlePointerLeave,
    );
    this.removeEventListener(
      'pointerenter',
      this.handlePointerEnter,
    );
  }

  handlePointerMove(event) {
    const { direction } = this;
    const currLocation = direction === 'vertical'
      ? event.pageY : event.pageX;
    const prevLocation = this.currentPointerLocation;
    const delta = currLocation - prevLocation;
    this.currentPointerLocation = currLocation;

    if (delta === 0) {
      return;
    }

    this.totalMovement += delta;
  }

  handlePointerEnter() {
    this.isBeingDragged = true;
    this.addEventListener(
      'pointerleave',
      this.handlePointerLeave,
      {
        once: true,
      },
    );
  }

  handlePointerLeave() {
    this.isBeingDragged = false;
    this.addEventListener(
      'pointerenter',
      this.handlePointerEnter,
      {
        once: true,
      },
    );
  }

  handlePointerDown(event) {
    if (
      event.buttons === 1
      && event.composedPath().includes(this.separator)
      && this.isBeingDragged === false
    ) {
      const { direction } = this;
      this.isBeingDragged = true;
      this.container.classList.toggle(
        'web-splitter--active',
        this.isBeingDragged,
      );
      this.currentPointerLocation = direction === 'vertical'
        ? event.pageY : event.pageX;
      this.addEventListener(
        'pointermove',
        this.handlePointerMove,
      );
      this.addEventListener(
        'pointerup',
        this.stopListening,
      );
      this.addEventListener(
        'pointerleave',
        this.handlePointerLeave,
      );
    }
  }

  connectedCallback() {
    this.primaryWidthObserver.observe(
      this.primaryWrapper,
    );
    this.secondaryWidthObserver.observe(
      this.secondaryWrapper,
    );
  }

  disconnectedCallback() {
    this.primaryWidthObserver.disconnect();
    this.secondaryWidthObserver.disconnect();
  }

  render() {
    const styleNode = document.createElement('style');
    styleNode.textContent = this.style;
    this.shadowRoot.appendChild(styleNode);

    this.container.classList.add('web-splitter');

    this.primaryWrapper.classList.add(
      'web-splitter__primary',
    );
    this.primaryWrapper.classList.add(
      'web-splitter__section-wrapper',
    );

    this.secondaryWrapper.classList.add(
      'web-splitter__secondary',
    );
    this.secondaryWrapper.classList.add(
      'web-splitter__section-wrapper',
    );

    const primarySlot = document.createElement('slot');
    primarySlot.name = 'primary';
    this.primaryWrapper.appendChild(primarySlot);

    const secondarySlot = document.createElement('slot');
    secondarySlot.name = 'secondary';
    this.secondaryWrapper.appendChild(secondarySlot);

    this.container.appendChild(this.primaryWrapper);

    const separator = document.createElement('slot');
    separator.name = 'separator';

    const defaultSeparator = document.createElement('div');
    defaultSeparator.setAttribute('role', 'separator');
    defaultSeparator.setAttribute('tabindex', '0');
    defaultSeparator.classList.add(
      'web-splitter__separator',
    );

    separator.appendChild(defaultSeparator);
    this.container.appendChild(separator);

    this.container.appendChild(this.secondaryWrapper);

    this.shadowRoot.appendChild(this.container);
  }
}
