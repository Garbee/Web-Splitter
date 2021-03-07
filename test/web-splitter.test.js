import { html, fixture, expect } from '@open-wc/testing';

import '../dist/WebSplitter.js';

describe('WebSplitter', () => {
  it('passes the a11y audit', async () => {
    const el = await fixture(html`
      <web-splitter>
        <div slot="primary">
            Primary
          </div>
          <div slot="secondary">
            Secondary
          </div>
      </web-splitter>
    `);

    await expect(el).shadowDom.to.be.accessible();
  });
});
