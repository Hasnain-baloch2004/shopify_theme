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
});

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
      e.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
      }

      try {
        const formData = new FormData(form);
        const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
          method: 'POST',
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
    const response = await fetch(window.Shopify.routes.root + 'cart.js');
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

  // Update Free Shipping Goal
  if (shippingBox && shippingContainer) {
    const thresholdDollars = parseFloat(shippingContainer.getAttribute('data-free-shipping-threshold')) || 50;
    const thresholdCents = thresholdDollars * 100;
    if (cart.total_price >= thresholdCents) {
      shippingBox.innerHTML = `<div style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary); text-align: center;">🎉 Congratulations! You've unlocked FREE Express Shipping!</div>`;
    } else {
      const remaining = thresholdCents - cart.total_price;
      shippingBox.innerHTML = `<div style="font-size: 0.85rem; font-weight: 600; text-align: center; color: var(--color-heading);">Add <strong style="color: var(--color-primary);">${formatMoney(remaining)}</strong> more for FREE Express Shipping!</div>`;
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

  // Render Items using data attributes (No unsafe inline JS!)
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
    const response = await fetch(window.Shopify.routes.root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

      if (matchedVariant) {
        variantInput.value = matchedVariant.id;
        
        // Update Price Display
        const container = form.closest('.pdp-info') || form.closest('.featured-product-section');
        if (container) {
          const priceElem = container.querySelector('.price');
          if (priceElem) priceElem.textContent = formatMoney(matchedVariant.price);

          const compareElem = container.querySelector('.compare-at-price');
          if (compareElem) {
            if (matchedVariant.compare_at_price > matchedVariant.price) {
              compareElem.textContent = formatMoney(matchedVariant.compare_at_price);
              compareElem.style.display = 'inline';
            } else {
              compareElem.style.display = 'none';
            }
          }
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

/* 5. Quantity Control Steppers */
function initQuantityControls() {
  document.querySelectorAll('[data-quantity-wrapper]').forEach(wrapper => {
    const input = wrapper.querySelector('input[type="number"]');
    const minusBtn = wrapper.querySelector('[data-qty-minus]');
    const plusBtn = wrapper.querySelector('[data-qty-plus]');

    if (!input) return;

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        let val = parseInt(input.value) || 1;
        if (val > 1) input.value = val - 1;
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        let val = parseInt(input.value) || 1;
        input.value = val + 1;
      });
    }
  });
}

/* 6. Bundle Cards Selector */
function initBundleSelectors() {
  document.querySelectorAll('.bundle-card').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.closest('.bundle-selector-container');
      if (!group) return;

      group.querySelectorAll('.bundle-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const qtyInput = card.closest('form')?.querySelector('input[name="quantity"]');
      const targetQty = card.getAttribute('data-bundle-qty');
      if (qtyInput && targetQty) {
        qtyInput.value = targetQty;
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

/* 8. Sticky Add to Cart Bar on Scroll */
function initStickyAddToCart() {
  const stickyBar = document.querySelector('.sticky-add-to-cart-bar');
  const mainBuyBox = document.querySelector('.pdp-buy-box');

  if (!stickyBar || !mainBuyBox) return;

  window.addEventListener('scroll', () => {
    const boxRect = mainBuyBox.getBoundingClientRect();
    if (boxRect.bottom < 0) {
      stickyBar.classList.add('visible');
    } else {
      stickyBar.classList.remove('visible');
    }
  });
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

/* Helpers */
function formatMoney(cents) {
  if (typeof cents !== 'number') cents = parseFloat(cents) || 0;
  const dollars = (cents / 100).toFixed(2);
  if (window.Shopify && window.Shopify.money_format) {
    let format = window.Shopify.money_format;
    if (format.includes('{{amount}}')) return format.replace('{{amount}}', dollars);
    if (format.includes('{{ amount }}')) return format.replace('{{ amount }}', dollars);
  }
  return '$' + dollars;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
