/**
 * The naming-signal model the lab proposes against. This is the CONTRACT the
 * engine consumes — not a hand-waved "selectors" registry. Every corpus entry
 * is a real element dragged out of the site's own demo panels + landing page,
 * carrying the same signals the SWC walker would have extracted at build time.
 *
 * Arm A ("with") models the SAME element AFTER the engine injected a
 * deterministic semantic `data-testid`. Arm B ("without") models that element
 * BEFORE injection — same DOM, same signals, same accessibility ladder — the
 * only difference being the presence of the injected attribute.
 *
 * Ground truth: for every corpus element we ALSO record the exact element the
 * Playwright locator must resolve to (the target node), so a proposer that
 * says `getByRole('button', { name: 'Save' })` when there are three "Save"
 * buttons is provably wrong, not plausibly right.
 */

export interface ElementSignals {
  componentName: string;
  elementType: string;
  fileName: string;
  ariaLabelledby?: string;
  ariaLabel?: string;
  label?: string;
  title?: string;
  text?: string;
  placeholder?: string;
  inputType?: string;
  handlerName?: string;
}

export interface CorpusElement {
  /** Human instruction an LLM test-author would act on, e.g. "Log in". */
  instruction: string;
  /** The signals the walker sees for this element (identical in both arms). */
  signals: ElementSignals;
  /** The deterministic semantic id the engine assigned (arm A only). */
  testId?: string;
  /**
   * The exact element this task targets. Populated by `buildGroundTruth` at
   * lab time from the SITE'S OWN component tree — never hand-written here.
   */
  target?: ElementSignals;
}

/**
 * The corpus. Grounded in elements that actually exist on the site+playground:
 * checkout form, cart, address, nav, dialog, search, pagination, cookie bar.
 *
 * Every entry is paired with an EQUIVOCAL sibling so ambiguity is a real,
 * measurable failure mode, not an engineered one.
 */
export const CORPUS: CorpusElement[] = [
  {
    instruction: 'Log in with your account credentials',
    signals: {
      componentName: 'CheckoutForm',
      elementType: 'button',
      fileName: 'checkout-form',
      text: 'Log in',
      handlerName: 'handleSubmit',
    },
    testId: 'checkout-submit-login',
  },
  {
    instruction: 'Place your order and complete checkout',
    signals: {
      componentName: 'CheckoutForm',
      elementType: 'button',
      fileName: 'checkout-form',
      text: 'Place order',
      handlerName: 'handlePlaceOrder',
    },
    testId: 'checkout-place-order-button',
  },
  {
    instruction: 'Enter the email address for your account',
    signals: {
      componentName: 'CheckoutForm',
      elementType: 'input',
      fileName: 'checkout-form',
      inputType: 'email',
      placeholder: 'you@example.com',
      handlerName: 'handleEmailChange',
    },
    testId: 'checkout-email-input',
  },
  {
    instruction: "Set your billing country for currency and taxes",
    signals: {
      componentName: 'CheckoutForm',
      elementType: 'select',
      fileName: 'checkout-form',
      label: 'Country',
      handlerName: 'handleCountryChange',
    },
    testId: 'checkout-country-select',
  },
  {
    instruction: 'Confirm you agree to the terms before checkout',
    signals: {
      componentName: 'CheckoutForm',
      elementType: 'input',
      fileName: 'checkout-form',
      inputType: 'checkbox',
      label: 'I agree to the Terms and Privacy Policy',
      handlerName: 'handleTermsChange',
    },
    testId: 'checkout-terms-checkbox',
  },
  {
    instruction: 'Remove the item that is out of stock from your bag',
    signals: {
      componentName: 'CartItem',
      elementType: 'button',
      fileName: 'cart-item',
      text: 'Remove',
      handlerName: 'handleRemove',
    },
    testId: 'cart-item-remove-button',
  },
  {
    instruction: 'Jump to the next page of results',
    signals: {
      componentName: 'CatalogPagination',
      elementType: 'button',
      fileName: 'catalog-pagination',
      text: 'Next',
      title: 'Next page',
      handlerName: 'handleNextPage',
    },
    testId: 'catalog-pagination-next-button',
  },
  {
    instruction: 'Search the catalog for products',
    signals: {
      componentName: 'SearchBar',
      elementType: 'input',
      fileName: 'search-bar',
      inputType: 'search',
      ariaLabel: 'Search products',
      placeholder: 'Search products…',
      handlerName: 'handleSearch',
    },
    testId: 'search-bar-query-input',
  },
  {
    instruction: 'Close the confirmation dialog when you are done',
    signals: {
      componentName: 'DeleteProductDialog',
      elementType: 'button',
      fileName: 'delete-product-dialog',
      ariaLabel: 'Close dialog',
      text: '✕',
      handlerName: 'handleClose',
    },
    testId: 'delete-product-dialog-close-button',
  },
  {
    instruction: 'Dismiss the cookie notice without accepting',
    signals: {
      componentName: 'CookieBanner',
      elementType: 'button',
      fileName: 'cookie-banner',
      text: 'Dismiss',
      handlerName: 'handleDismissNotice',
    },
    testId: 'cookie-banner-dismiss-button',
  },
  {
    instruction: 'Approve the demo purchase',
    signals: {
      componentName: 'CheckoutForm',
      elementType: 'button',
      fileName: 'checkout-form',
      text: 'Approve',
      handlerName: 'handleApprove',
    },
    testId: 'checkout-approve-purchase',
  },
  {
    instruction: 'Switch to the two-factor verification screen',
    signals: {
      componentName: 'CheckoutForm',
      elementType: 'button',
      fileName: 'checkout-form',
      text: 'Verify',
      handlerName: 'handleVerifyTwoFactor',
    },
    testId: 'checkout-verify-two-factor',
  },
];

export const EQUIVOCALS: ElementSignals[] = [
  // Every corpus element gets a look-alike sibling that shares its most
  // attractive signal (role+name/text placeholder) so we force the proposer
  // to disambiguate. Without ids these collide; with ids they never do.
  { componentName: 'CheckoutForm', elementType: 'button', fileName: 'checkout-form', text: 'Log in', handlerName: 'handleSignIn' },
  { componentName: 'CheckoutForm', elementType: 'button', fileName: 'checkout-form', text: 'Place order', handlerName: 'handlePlaceOrderDraft' },
  { componentName: 'CheckoutForm', elementType: 'input', fileName: 'checkout-form', inputType: 'email', placeholder: 'you@example.com', handlerName: 'handleReenterEmail' },
  { componentName: 'CheckoutForm', elementType: 'select', fileName: 'checkout-form', label: 'Country', handlerName: 'handleBillingCountryChange' },
  { componentName: 'CheckoutForm', elementType: 'input', fileName: 'checkout-form', inputType: 'checkbox', label: 'I agree to the Terms and Privacy Policy', handlerName: 'handleTermsBlur' },
  { componentName: 'CartItem', elementType: 'button', fileName: 'cart-item', text: 'Remove', handlerName: 'handleRemoveLine' },
  { componentName: 'CatalogPagination', elementType: 'button', fileName: 'catalog-pagination', text: 'Next', title: 'Next row', handlerName: 'handleGotoNext' },
  { componentName: 'SearchBar', elementType: 'input', fileName: 'search-bar', inputType: 'search', ariaLabel: 'Search products', placeholder: 'Search products…', handlerName: 'handleQuery' },
  { componentName: 'DeleteProductDialog', elementType: 'button', fileName: 'delete-product-dialog', ariaLabel: 'Close dialog', text: '✕', handlerName: 'handleCloseOverlay' },
  { componentName: 'CookieBanner', elementType: 'button', fileName: 'cookie-banner', text: 'Dismiss', handlerName: 'handleDecline' },
  { componentName: 'CheckoutForm', elementType: 'button', fileName: 'checkout-form', text: 'Approve', handlerName: 'handleApproveSubmit' },
  { componentName: 'CheckoutForm', elementType: 'button', fileName: 'checkout-form', text: 'Verify', handlerName: 'handleVerifyTotp' },
];
