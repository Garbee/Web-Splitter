import {
  FASTElement,
  customElement,
  attr,
  html,
  css,
  ref,
  observable,
} from '@microsoft/fast-element';

const template = html<WebSplitter>`
<div
  :className=${x => x.generateContainerClasses()}
  style="--web-splitter-movement: ${x => x.totalMovement + 'px'};"
  ${ref('container')}
  @keydown=${(x, c) => x.handleKeyDown(c.event as KeyboardEvent)}
  @pointerdown=${(x, c) => x.handlePointerDown(c.event as PointerEvent)}>
  <div
    class="web-splitter__primary web-splitter__section-wrapper"
    aria-hidden="${x => x.isPrimaryCollapsed ? 'true' : undefined}"
    ${ref('primaryWrapper')}>
    <slot name="primary"></slot>
  </div>
  <slot ${ref('separatorSlot')} name="separator">
    <div
      class="web-splitter__separator"
      ${ref('defaultSeparator')}
      role="separator"
      tabindex="0">
    </div>
  </slot>
  <div
    class="web-splitter__secondary web-splitter__section-wrapper"
    aria-hidden="${x => x.isSecondaryCollapsed ? 'true' : undefined}"
    ${ref('secondaryWrapper')}>
    <slot name="secondary"></slot>
  </div>
</div>
`;

const styles = css`
:host {
  display: block;
  box-sizing: border-box;
  contain: content;
}

.web-splitter {
  --web-splitter-separator-size: 14px;
  --web-splitter-initial-primary-size: 50%;
  --web-splitter-initial-secondary-size: 50%;
  --web-splitter-movement: 0px;
  --web-splitter-primary-space: clamp(
    0px,
    calc(
      var(--web-splitter-initial-primary-size) +
      var(--web-splitter-movement)),
    calc(100% - var(--web-splitter-separator-size))
  );
  --web-splitter-secondary-space: clamp(
    0px,
    calc(
      var(--web-splitter-initial-secondary-size) -
      var(--web-splitter-movement)),
    calc(100% - var(--web-splitter-separator-size))
  );
  box-sizing: border-box;
  display: grid;
  grid-template-areas: "primary separator secondary";
  grid-template-columns: var(--web-splitter-primary-space)
    var(--web-splitter-separator-size)
    var(--web-splitter-secondary-space);
  grid-template-rows: 100%;
  height: 100%;
  width: 100%;
  }

.web-splitter__primary {
  grid-area: primary;
}

.web-splitter__separator {
  grid-area: separator;
  height: 15%;
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  background-color: lightgray;
  cursor: col-resize;
  user-select: none;
  justify-self: center;
  align-items: center;
  align-self: center;
  transition: height 250ms linear;
}

.web-splitter__secondary {
  grid-area: secondary;
}

.web-splitter__section-wrapper {
  overflow: auto;
  box-sizing: border-box;
}

.web-splitter--active .web-splitter__separator {
  height: 100%;
}

.web-splitter--active .web-splitter__section-wrapper {
  pointer-events: none;
  user-select: none;
}

:host([is-fixed]) .web-splitter__separator {
  pointer-events: none;
}
`;

@customElement({
  name: 'web-splitter',
  template,
  styles,
})
export class WebSplitter extends FASTElement {
  separatorSlot: HTMLSlotElement;
  defaultSeparator: HTMLDivElement;
  primaryWrapper: HTMLDivElement;
  secondaryWrapper: HTMLDivElement;
  container: HTMLDivElement;

  _separator: HTMLElement;

  @observable
  isSecondaryCollapsed = false;
  @observable
  isPrimaryCollapsed = false;
  @observable
  isBeingDragged = false;
  @observable
  totalMovement = 0;

  @attr
  direction: 'horizontal' | 'vertical' = 'horizontal';
  @attr({
    mode: 'boolean',
  })
  isFixed = false;

  currentPointerLocation: number | null = null;
  previousMovement: number | null = null;
  primaryWidthObserver: ResizeObserver;
  secondaryWidthObserver: ResizeObserver;

  constructor() {
    super();

    this.primaryWidthObserver = new ResizeObserver(
      this.observePrimaryWidth.bind(this),
    );
    this.secondaryWidthObserver = new ResizeObserver(
      this.observeSecondaryWidth.bind(this),
    );
  }

  generateContainerClasses(): string {
    let classValue = '';
    const classes = {
      'web-splitter': true,
      'web-splitter--active': this.isBeingDragged,
    };
    for (const [key, value] of Object.entries(classes)) {
      if (value === true) {
        classValue += `${key} `;
      }
    }
    return classValue;
  }

  get separator(): HTMLElement {
    if (this._separator !== undefined) {
      return this._separator;
    }

    if (Boolean(this.separatorSlot.assignedElements.length) === true) {
      this._separator = (this.separatorSlot.assignedElements()[0] as HTMLElement);
      return this._separator;
    }

    this._separator = this.defaultSeparator
    return this._separator;
  }

  observePrimaryWidth(entries: ResizeObserverEntry[]): void {
    const { contentRect } = entries[0];
    this.isPrimaryCollapsed = contentRect.width === 0;
  }

  observeSecondaryWidth(entries: ResizeObserverEntry[]): void {
    const { contentRect } = entries[0];
    this.isSecondaryCollapsed = contentRect.width === 0;
  }

  collapsePrimaryPane(): void {
    if (this.isPrimaryCollapsed === true) {
      return;
    }
    let { totalMovement } = this;
    const rect = this.primaryWrapper.getBoundingClientRect();
    totalMovement -= rect.width;
    if (this.isSecondaryCollapsed) {
      const separatorRect = this.separator.getBoundingClientRect();
      totalMovement -= separatorRect.width;
    }
    this.totalMovement = totalMovement;
  }

  collapseSecondaryPane(): void {
    if (this.isSecondaryCollapsed === true) {
      return;
    }
    let { totalMovement } = this;
    const rect = this.secondaryWrapper.getBoundingClientRect();
    totalMovement += rect.width;
    if (this.isPrimaryCollapsed) {
      const separatorRect = this.separator.getBoundingClientRect();
      totalMovement += separatorRect.width;
    }
    this.totalMovement = totalMovement;
  }

  togglePrimaryPane(): void {
    if (this.previousMovement === null) {
      this.previousMovement = this.totalMovement;
      this.collapsePrimaryPane();
      return;
    }

    this.totalMovement = this.previousMovement;
    this.previousMovement = null;
  }

  handleKeyDown(event: KeyboardEvent): void {
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

  stopListening(): void {
    this.isBeingDragged = false;
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

  handlePointerMove(event: PointerEvent): void {
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

  handlePointerEnter(): void {
    this.isBeingDragged = true;
    this.addEventListener(
      'pointerleave',
      this.handlePointerLeave,
      {
        once: true,
      },
    );
  }

  handlePointerLeave(): void {
    this.isBeingDragged = false;
    this.addEventListener(
      'pointerenter',
      this.handlePointerEnter,
      {
        once: true,
      },
    );
  }

  handlePointerDown(event: PointerEvent): void {
    if (
      event.buttons === 1
      && event.composedPath().includes(this.separator)
      && this.isBeingDragged === false
    ) {
      const { direction } = this;
      this.isBeingDragged = true;
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

  connectedCallback(): void {
    super.connectedCallback();

    this.primaryWidthObserver.observe(
      this.primaryWrapper,
    );
    this.secondaryWidthObserver.observe(
      this.secondaryWrapper,
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.primaryWidthObserver.disconnect();
    this.secondaryWidthObserver.disconnect();
  }
}
