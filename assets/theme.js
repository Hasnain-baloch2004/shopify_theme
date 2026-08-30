/**
 * Aura Theme - General Ecommerce JavaScript
 * Clean Vanilla JS for Ajax Cart Drawer, Variant Selection, Accordions & Sticky Bar
 */

document.addEventListener('DOMContentLoaded', () => {
  initCartDrawer();
  initVariantSelectors();
  initAccordions();
  initProductGallery();
  initQuantityControls();
  initBundleSelectors();
  initMobileMenu();
  initStickyAddToCart();
  initHeaderSearch();
  initStickyAddToCartSubmit();
  initFooterAccordions();
  initCartPage();
});

/* Helper: Safe Route Generation */
function getRoute(endpoint) {
  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  return (root.endsWith('/') ? root : root + '/') + endpoint.replace(/^\//, '');
}

/* Helper: Safe Theme Settings Access */
function getThemeSetting(key, fallback) {
  if (window.Shopify && window.Shopify.theme_settings && window.Shopify.theme_settings[key] !== undefined) {
    return window.Shopify.theme_settings[key];
  }
  return fallback;
}

/* 1. Ajax Cart Drawer Handling */
function initCartDrawer() {
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartOverlay = document.querySelector('.cart-drawer-overlay');
  const openCartBtns = document.querySelectorAll('[data-action="open-cart"]');
  const closeCartBtns = document.querySelectorAll('[data-action="close-cart"]');

  if (!cartDrawer) return;

  function openCart() {
    cartDrawer.classList.add('active');
    if (cartOverlay) cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    fetchCart();
  }

  function closeCart() {
    cartDrawer.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  openCartBtns.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  }));

  closeCartBtns.forEach(btn => btn.addEventListener('click', closeCart));
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Cart Body Event Delegation for Quantity & Remove
  const cartBody = document.querySelector('.cart-drawer-body');
  if (cartBody) {
    cartBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="cart-qty-change"], [data-action="cart-remove-item"]');
      if (!btn) return;

      const key = btn.getAttribute('data-key');
      let qty = parseInt(btn.getAttribute('data-qty'), 10);
      if (btn.getAttribute('data-action') === 'cart-remove-item') {
        qty = 0;
      }

      if (key !== null && !isNaN(qty)) {
        updateCartItemQuantity(key, qty);
      }
    });
  }

  // Ajax Add to Cart Forms
  document.querySelectorAll('form[data-product-form], form[action*="/cart/add"]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      const enableDrawer = getThemeSetting('enable_cart_drawer', true);
      if (!enableDrawer) {
        return; // Allow native form submission if drawer is explicitly disabled
      }

      e.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
      }

      try {
        const formData = new FormData(form);
        const response = await fetch(getRoute('cart/add.js'), {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData
        });

        if (response.ok) {
          openCart();
        } else {
          const err = await response.json();
          alert(err.description || 'Error adding item to cart.');
        }
      } catch (error) {
        console.error('Add to cart failed:', error);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
        }
      }
    });
  });
}

// Fetch Cart Data & Update Drawer UI
async function fetchCart() {
  try {
    const response = await fetch(getRoute('cart.js'), {
      headers: { 'Accept': 'application/json' }
    });
    const cart = await response.json();
    updateCartDrawerUI(cart);
  } catch (error) {
    console.error('Fetch cart error:', error);
  }
}

function updateCartDrawerUI(cart) {
  const cartBody = document.querySelector('.cart-drawer-body');
  const cartSubtotal = document.querySelector('[data-cart-subtotal]');
  const cartCountBadges = document.querySelectorAll('.cart-count-badge');
  const shippingBox = document.querySelector('[data-shipping-progress-box]');
  const shippingContainer = document.querySelector('[data-free-shipping-threshold]');

  // Update Free Shipping Goal with Dynamic Merchant Settings
  if (shippingBox) {
    const thresholdDollars = parseFloat(
      shippingContainer?.getAttribute('data-free-shipping-threshold') ||
      getThemeSetting('free_shipping_threshold', 50)
    );
    const thresholdCents = thresholdDollars * 100;
    const unlockedMsg = getThemeSetting('free_shipping_unlocked_text', "Congratulations! You've unlocked FREE Express Shipping!");
    const progressTemplate = getThemeSetting('free_shipping_text', "Add [amount] more to qualify for FREE Express Shipping!");

    if (cart.total_price >= thresholdCents) {
      shippingBox.innerHTML = `<div style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary); text-align: center;">🎉 ${escapeHtml(unlockedMsg)}</div>`;
    } else {
      const remaining = thresholdCents - cart.total_price;
      const formattedRemaining = formatMoney(remaining);
      let message = progressTemplate.replace('[amount]', `<strong style="color: var(--color-primary);">${formattedRemaining}</strong>`);
      if (!message.includes(formattedRemaining)) {
        message = `Add <strong style="color: var(--color-primary);">${formattedRemaining}</strong> more for FREE Express Shipping!`;
      }
      shippingBox.innerHTML = `<div style="font-size: 0.85rem; font-weight: 600; text-align: center; color: var(--color-heading);">${message}</div>`;
    }
  }

  // Update Badges
  cartCountBadges.forEach(badge => {
    badge.textContent = cart.item_count;
    badge.style.display = cart.item_count > 0 ? 'flex' : 'none';
  });

  if (cartSubtotal) {
    cartSubtotal.textContent = formatMoney(cart.total_price);
  }

  if (!cartBody) return;

  if (cart.item_count === 0) {
    cartBody.innerHTML = `
      <div class="text-center" style="padding: 60px 20px;">
        <p style="font-size: 1.1rem; color: var(--color-text-muted); margin-bottom: 20px;">Your cart is currently empty.</p>
        <button class="btn btn-primary" data-action="close-cart">Start Shopping</button>
      </div>
    `;
    const startShoppingBtn = cartBody.querySelector('[data-action="close-cart"]');
    if (startShoppingBtn) {
      startShoppingBtn.addEventListener('click', () => {
        document.querySelector('.cart-drawer')?.classList.remove('active');
        document.querySelector('.cart-drawer-overlay')?.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
    return;
  }

  // Render Items
  let itemsHTML = '<div class="cart-items-list" style="display: flex; flex-direction: column; gap: 20px;">';
  cart.items.forEach(item => {
    itemsHTML += `
      <div class="cart-item-row" style="display: flex; gap: 16px; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: 16px;">
        <img src="${item.image || ''}" alt="${escapeHtml(item.title)}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; background: var(--color-card-bg);">
        <div style="flex-grow: 1;">
          <h4 style="font-size: 0.95rem; font-family: var(--font-body); font-weight: 600; margin-bottom: 4px;">${escapeHtml(item.product_title)}</h4>
          ${item.variant_title ? `<p style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 6px;">${escapeHtml(item.variant_title)}</p>` : ''}
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="quantity-controls">
              <button class="qty-btn" data-action="cart-qty-change" data-key="${item.key}" data-qty="${item.quantity - 1}">-</button>
              <span style="font-size: 0.85rem; font-weight: 600; padding: 0 8px;">${item.quantity}</span>
              <button class="qty-btn" data-action="cart-qty-change" data-key="${item.key}" data-qty="${item.quantity + 1}">+</button>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <span style="font-weight: 700; font-size: 0.95rem;">${formatMoney(item.line_price)}</span>
              <button data-action="cart-remove-item" data-key="${item.key}" style="font-size: 0.75rem; color: var(--color-primary); text-decoration: underline; background: none; border: none; cursor: pointer;">Remove</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  itemsHTML += '</div>';
  cartBody.innerHTML = itemsHTML;
}

async function updateCartItemQuantity(key, quantity) {
  try {
    const response = await fetch(getRoute('cart/change.js'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ id: String(key), quantity: quantity })
    });
    const cart = await response.json();
    updateCartDrawerUI(cart);
  } catch (error) {
    console.error('Update quantity error:', error);
  }
}

/* 2. Standard Shopify Product Variant Selector */
function initVariantSelectors() {
  document.querySelectorAll('form[data-product-form]').forEach(form => {
    const rawVariants = form.getAttribute('data-variants');
    if (!rawVariants) return;

    let variants = [];
    try {
      variants = JSON.parse(rawVariants);
    } catch (e) {
      console.error('Variant JSON parse error:', e);
      return;
    }

    const optionSelects = form.querySelectorAll('.product-option-select');
    const variantInput = form.querySelector('[data-variant-input]');
    const submitBtn = form.querySelector('[type="submit"]');

    if (!optionSelects.length || !variantInput) return;

    function onOptionChange() {
      const selectedOptions = Array.from(optionSelects).map(select => select.value);

      // Find matching variant where options array matches selected values
      const matchedVariant = variants.find(v => {
        return v.options.every((optVal, idx) => optVal === selectedOptions[idx]);
      });

      // Update Option Display Labels
      optionSelects.forEach((select, idx) => {
        const displayLabel = form.querySelector(`[data-option-value-display="${idx + 1}"]`);
        if (displayLabel) displayLabel.textContent = select.value;
      });

      const stickyPrice = document.querySelector('[data-sticky-price]');
      const stickyBtn = document.querySelector('[data-sticky-btn]');
      const stickyImg = document.querySelector('[data-sticky-image]');
      const mainImg = document.querySelector('[data-main-image]');

      if (matchedVariant) {
        variantInput.value = matchedVariant.id;
        
        // Update Price & Discount Display
        const container = form.closest('.pdp-info') || form.closest('.featured-product-section') || form.closest('.pdp-buy-box');
        if (container) {
          const priceElem = container.querySelector('.price');
          if (priceElem) priceElem.textContent = formatMoney(matchedVariant.price);

          const compareElem = container.querySelector('.compare-at-price');
          const discountBadge = container.querySelector('.price-discount-badge');

          if (matchedVariant.compare_at_price > matchedVariant.price) {
            if (compareElem) {
              compareElem.textContent = formatMoney(matchedVariant.compare_at_price);
              compareElem.style.display = 'inline';
            }
            if (discountBadge) {
              const discount = Math.round(((matchedVariant.compare_at_price - matchedVariant.price) / matchedVariant.compare_at_price) * 100);
              discountBadge.textContent = `Save ${discount}%`;
              discountBadge.style.display = 'inline';
            }
          } else {
            if (compareElem) compareElem.style.display = 'none';
            if (discountBadge) discountBadge.style.display = 'none';
          }

          // Recalculate Bundle Prices based on active variant price
          const bundleSpans = container.querySelectorAll('.bundle-total-price[data-bundle-multiplier]');
          bundleSpans.forEach(span => {
            const multiplier = parseInt(span.getAttribute('data-bundle-multiplier') || '1', 10);
            span.textContent = formatMoney(matchedVariant.price * multiplier);
          });
        }

        // Update Sticky Bar State
        if (stickyPrice) {
          stickyPrice.textContent = formatMoney(matchedVariant.price);
        }

        // Update Variant Image if available
        if (matchedVariant.featured_image && matchedVariant.featured_image.src) {
          if (mainImg) mainImg.src = matchedVariant.featured_image.src;
          if (stickyImg) stickyImg.src = matchedVariant.featured_image.src;
        }

        // Update Submit Button State
        if (submitBtn) {
          if (matchedVariant.available) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add to Cart';
          } else {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sold Out';
          }
        }
        if (stickyBtn) {
          if (matchedVariant.available) {
            stickyBtn.disabled = false;
            stickyBtn.textContent = 'Add to Cart';
          } else {
            stickyBtn.disabled = true;
            stickyBtn.textContent = 'Sold Out';
          }
        }

        // Update URL parameter on product detail page
        if (window.location.pathname.includes('/products/')) {
          const url = new URL(window.location.href);
          url.searchParams.set('variant', matchedVariant.id);
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Unavailable';
        }
        if (stickyBtn) {
          stickyBtn.disabled = true;
          stickyBtn.textContent = 'Unavailable';
        }
      }
    }

    optionSelects.forEach(select => select.addEventListener('change', onOptionChange));
  });
}

/* 3. Interactive Accordions */
function initAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.closest('.accordion-item');
      if (!parent) return;
      
      const isActive = parent.classList.contains('active');
      const group = parent.closest('.accordion-group');
      if (group) {
        group.querySelectorAll('.accordion-item').forEach(item => item.classList.remove('active'));
      }
      
      if (!isActive) {
        parent.classList.add('active');
      }
    });
  });
}

/* 4. Product Gallery Thumbnail Switching */
function initProductGallery() {
  const mainImg = document.querySelector('[data-main-image]');
  const thumbnails = document.querySelectorAll('[data-thumbnail]');

  if (!mainImg || !thumbnails.length) return;

  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbnails.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const src = thumb.getAttribute('data-full-src');
      if (src) mainImg.src = src;
    });
  });
}

/* 5. Quantity Control Steppers with Bundle Sync */
function initQuantityControls() {
  document.querySelectorAll('[data-quantity-wrapper]').forEach(wrapper => {
    const input = wrapper.querySelector('input[type="number"]');
    const minusBtn = wrapper.querySelector('[data-qty-minus]');
    const plusBtn = wrapper.querySelector('[data-qty-plus]');

    if (!input) return;

    function syncBundleCards(qty) {
      const form = wrapper.closest('form') || document.querySelector('form[data-product-form]');
      if (!form) return;
      const cards = form.querySelectorAll('.bundle-card');
      cards.forEach(card => {
        const cQty = parseInt(card.getAttribute('data-bundle-qty') || '0', 10);
        const isMatch = (cQty === qty);
        card.classList.toggle('active', isMatch);
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = isMatch;
      });
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        let val = parseInt(input.value, 10) || 1;
        if (val > 1) {
          input.value = val - 1;
          syncBundleCards(val - 1);
        }
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        let val = parseInt(input.value, 10) || 1;
        input.value = val + 1;
        syncBundleCards(val + 1);
      });
    }

    input.addEventListener('change', () => {
      let val = parseInt(input.value, 10) || 1;
      if (val < 1) val = 1;
      input.value = val;
      syncBundleCards(val);
    });
  });
}

/* 6. Bundle Cards Selector with Two-Way Synchronization */
function initBundleSelectors() {
  document.querySelectorAll('.bundle-card').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.closest('.bundle-selector-container');
      if (!group) return;

      group.querySelectorAll('.bundle-card').forEach(c => {
        c.classList.remove('active');
        const r = c.querySelector('input[type="radio"]');
        if (r) r.checked = false;
      });

      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const targetQty = card.getAttribute('data-bundle-qty');
      const form = card.closest('form') || document.querySelector('form[data-product-form]');
      if (form && targetQty) {
        form.querySelectorAll('input[name="quantity"]').forEach(input => {
          input.value = targetQty;
        });
      }
    });
  });
}

/* 7. Mobile Drawer Navigation */
function initMobileMenu() {
  const toggleBtns = document.querySelectorAll('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav-drawer');
  const mobileOverlay = document.querySelector('.mobile-nav-overlay');
  const closeBtns = document.querySelectorAll('[data-action="close-mobile-nav"]');

  if (!mobileNav) return;

  function openMobileNav() {
    mobileNav.classList.add('active');
    if (mobileOverlay) mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('active');
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openMobileNav();
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileNav();
    });
  });

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeMobileNav);
  }
}

/* 8. Sticky Add to Cart Bar on Scroll with IntersectionObserver */
function initStickyAddToCart() {
  const stickyBar = document.querySelector('[data-sticky-bar]') || document.querySelector('.sticky-add-to-cart-bar');
  const mainBuyBox = document.querySelector('.pdp-buy-box');

  if (!stickyBar || !mainBuyBox) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          stickyBar.classList.add('visible');
        } else {
          stickyBar.classList.remove('visible');
        }
      });
    }, { threshold: 0.1 });
    observer.observe(mainBuyBox);
  } else {
    window.addEventListener('scroll', () => {
      const boxRect = mainBuyBox.getBoundingClientRect();
      if (boxRect.bottom < 0) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    }, { passive: true });
  }
}

/* 9. Header Search Bar Slide-Down Toggle */
function initHeaderSearch() {
  const searchBar = document.getElementById('HeaderSearchBar');
  const toggleBtn = document.querySelector('[data-action="toggle-header-search"]');
  const closeBtn = document.querySelector('[data-action="close-header-search"]');
  const searchInput = searchBar?.querySelector('input[type="search"]');

  if (!searchBar || !toggleBtn) return;

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    searchBar.classList.toggle('active');
    if (searchBar.classList.contains('active') && searchInput) {
      searchInput.focus();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      searchBar.classList.remove('active');
    });
  }
}

/* 10. Sticky Add to Cart Button Form Submit Trigger */
function initStickyAddToCartSubmit() {
  const stickyBtn = document.querySelector('[data-action="sticky-add-to-cart"]');
  const mainForm = document.querySelector('form[data-product-form]');

  if (stickyBtn && mainForm) {
    stickyBtn.addEventListener('click', () => {
      if (typeof mainForm.requestSubmit === 'function') {
        mainForm.requestSubmit();
      } else {
        mainForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });
  }
}

/* 11. Mobile Footer Accordions */
function initFooterAccordions() {
  document.querySelectorAll('[data-action="toggle-footer-menu"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return;
      e.preventDefault();
      const col = btn.closest('.footer-col-menu');
      if (col) {
        col.classList.toggle('active');
      }
    });
  });
}

/* 12. Standalone Cart Page Reactivity */
function initCartPage() {
  const cartForm = document.getElementById('cart-form');
  if (!cartForm) return;

  cartForm.querySelectorAll('input[name="updates[]"]').forEach(input => {
    input.addEventListener('change', () => {
      cartForm.submit();
    });
  });
}

/* Robust Money Formatter */
function formatMoney(cents) {
  if (typeof cents !== 'number') cents = parseFloat(cents) || 0;
  const dollars = (cents / 100).toFixed(2);
  const format = (window.Shopify && window.Shopify.money_format) || '$' + '{{amount}}';

  if (format.indexOf('{{amount_no_decimals}}') !== -1) {
    return format.replace('{{amount_no_decimals}}', Math.round(cents / 100).toString());
  }
  if (format.indexOf('{{ amount_no_decimals }}') !== -1) {
    return format.replace('{{ amount_no_decimals }}', Math.round(cents / 100).toString());
  }
  if (format.indexOf('{{amount_with_comma_separator}}') !== -1) {
    return format.replace('{{amount_with_comma_separator}}', dollars.replace('.', ','));
  }
  if (format.indexOf('{{ amount_with_comma_separator }}') !== -1) {
    return format.replace('{{ amount_with_comma_separator }}', dollars.replace('.', ','));
  }
  if (format.indexOf('{{amount}}') !== -1) {
    return format.replace('{{amount}}', dollars);
  }
  if (format.indexOf('{{ amount }}') !== -1) {
    return format.replace('{{ amount }}', dollars);
  }
  return '$' + dollars;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
